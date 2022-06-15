import { ObjectID } from "mongodb"
import productEventEmitter from "../events/product"
import { SUBCATEGORIES } from "../models/category"
import { Catalog_Attributes, HUB2B_Catalog_Product, HUB2B_Integration, HUB2B_Invoice, HUB2B_Order_Webhook, HUB2B_Tracking } from "../models/hub2b"
import { Order } from "../models/order"
import { Product, Variation } from "../models/product"
import { findShopInfoByUserEmail } from "../repositories/accountRepository"
import { retrieveTenants } from "../repositories/hub2TenantRepository"
import { createNewProduct, createVariation, findProductByShopIdAndSku, updateVariationById } from "../repositories/productRepository"
import { PROJECT_HOST } from "../utils/consts"
import { getToken } from "../utils/cryptUtil"
import { log } from "../utils/loggerUtil"
import { getFunctionName, removeAllTagsExceptBr, waitforme } from "../utils/util"
import { getCatalogHub2b, getHub2bIntegration, getInvoiceHub2b, getOrderHub2b, getStockHub2b, getTrackingHub2b, mapskuHub2b, postInvoiceHub2b, postTrackingHub2b, setupIntegrationHub2b } from "./hub2bService"
import { findOrdersByShop, updateStatus } from "./orderService"
import { findProductsByShop, updateProductImages, updateProductVariationStock } from "./productService"
import { getImageKitUrl, sendExternalFileToS3 } from "./uploadService"

// TODO: find out a way to reset the offset to 0 when idTenant or shop_id changes.
let OFFSET = 0

/**
 * Import products hub2b
 *
 * @param idTenant
 */
export const importProduct = async (idTenant: any, shop_id: any, status = '2', offset = OFFSET): Promise<Product[] | null> => {

    const products: Product[] = []

    const variations: Variation[] = []

    const existingHubProducts: HUB2B_Catalog_Product[] = []

    const productsInHub2b = await getProductsInHub2b(idTenant, status, offset)

    const productsWithNoCategory = productsInHub2b?.filter((product: HUB2B_Catalog_Product) => !product?.categorization?.source)

    if ('2' === status && productsWithNoCategory?.length === 10) {

        OFFSET += productsWithNoCategory.length

        log(`Importing products from hub2b. Offset: ${offset}`, 'EVENT', getFunctionName())
    }

    if (!productsInHub2b) return null

    for await (let productHub2b of productsInHub2b) {

        const variation = createVariationFromHub2bAttributes(productHub2b)

        variations.push(variation)

        const productExists = await findProductByShopIdAndSku(shop_id, productHub2b.groupers.parentSKU || productHub2b.skus.source)

        const category = findMatchingCategory(productHub2b)

        const subcategory = findMatchingSubcategory(productHub2b)

        if (!subcategory) continue

        if (!productExists) {

            const images: string[] = []

            productHub2b.images.forEach(async (imageHub2b, index) => {

                const s3File = await sendExternalFileToS3(imageHub2b.url, productHub2b.groupers.parentSKU || productHub2b.skus.source, index)

                if (!s3File) return images.push(imageHub2b.url)

                const imageKitUrl = getImageKitUrl(s3File.replace('/', ''))

                if (imageKitUrl) return images.push(imageKitUrl)
            })

            const product: Product = {
                shop_id: new ObjectID(shop_id),
                images,
                category: category,
                subcategory: subcategory,
                nationality: 1,
                name: productHub2b.name,
                description: removeAllTagsExceptBr(productHub2b.description.sourceDescription || ''),
                brand: productHub2b.brand,
                more_info: '',
                ean: productHub2b.ean,
                sku: productHub2b.groupers.parentSKU || productHub2b.skus.source,
                sourceSKU: productHub2b.skus.source,
                gender: 'U',
                height: productHub2b.dimensions.height * 100,
                width: productHub2b.dimensions.width * 100,
                length: productHub2b.dimensions.length * 100,
                weight: productHub2b.dimensions.weight * 1000,
                price: productHub2b.destinationPrices.priceBase,
                price_discounted: productHub2b.destinationPrices.priceSale,
                is_active: true
            }

            products.push(product)
        }

        if (productExists) existingHubProducts.push(productHub2b)
    }

    const uniqueNewProducts = Array.from(new Set(products.map(a => a.sku))).map(sku => {
        return products.find(a => a.sku === sku)
    })

    const newProducts: Product[] = []

    for await (const product of uniqueNewProducts) {

        if (!product) continue

        const productVariations = variations.filter((variation: any) => variation.parentSKU === product.sku)

        const productInserted = await createNewProduct(product, productVariations )

        if (productInserted) {

            log(`Product ${product.name} has been created.`, 'EVENT', getFunctionName())

            await waitforme(1000)

            productEventEmitter.emit('create', product)

            newProducts.push(productInserted)
        }
    }

    if ('2' === status && products.length > 0) mapSku(products, idTenant)

    const existingProductsUpdated: Product[] = []

    for await (const hubProduct of existingHubProducts) {

        // 1 - GET correspondent product in SellerCenter

        const product = await findProductByShopIdAndSku(shop_id, hubProduct.groupers.parentSKU || hubProduct.skus.source)

        if (!product) continue

        // 2 - Check if variation exists (Find variation by skus.sourceSKU in variation.sourceSKU). Create if not.

        const variationExists = product?.variations?.find((variation: any) => variation.sourceSKU === hubProduct.skus.source)

        if (!variationExists) {

            await waitforme(1000)

            const productWithNewVariation = await createVariationForExistingProduct(product, hubProduct, idTenant)

           if (!productWithNewVariation) continue

            existingProductsUpdated.push(productWithNewVariation)
        }

        await waitforme(1000)

        // Update Stock and Price.

        const patch = {
            price: hubProduct.destinationPrices.priceBase,
            price_discounted: hubProduct.destinationPrices.priceSale,
            stock: hubProduct.stocks.sourceStock
        }

        const productUpdated = await updateVariationById(hubProduct.skus.destination, patch)

        !productUpdated
            ? log(`Could not update stock and price for product ${hubProduct.id}.`, 'EVENT', getFunctionName())
            : existingProductsUpdated.push(productUpdated)
    }

    return products.length ? products : existingProductsUpdated.length ? existingProductsUpdated : []
}

const createVariationForExistingProduct = async (product: Product, hubProduct: HUB2B_Catalog_Product, idTenant: any): Promise <Product|null> => {

    const variation = createVariationFromHub2bAttributes(hubProduct)

    // 2.5 - Prepare and save variation.

    variation.product_id = product._id

    variation.parentSKU = product.sku

    variation.sourceSKU = hubProduct.skus.source

    const newVariation = await createVariation(variation)

    if (!newVariation) return null

    product.variations?.push(newVariation)

    // 3 - Update product images.

    hubProduct.images.forEach((imageHub2b) => product.images.push(imageHub2b.url))

    await waitforme(1000)

    updateProductImages(product._id, product)

    // 4 - Map skus if skus.destinationSKU is null.

    mapskuHub2b([{ sourceSKU: variation.sourceSKU, destinationSKU: newVariation._id }], idTenant)

    return product
}

/**
 * Get Products
 *
 * @returns
 */
export const getProductsInHub2b = async (idTenant: any, status = '2', offset = 0): Promise<HUB2B_Catalog_Product[] | null> => {

    const productsHub2b = await getCatalogHub2b(status, offset, idTenant)

    if (!productsHub2b) log(`Could not get orders from tenant ${idTenant}`, "EVENT", getFunctionName(), "WARN")

    if (!productsHub2b) return null

    return productsHub2b
}

export const mapSku = async (products: Product[], idTenant: any) => {

    const data: any[] = []

    for await (const product of products) {

        if (!product?.variations) data.push({ sourceSKU: product.sourceSKU, destinationSKU: product._id })

        if (!product.variations) continue

        for await (const variation of product.variations) {

            if (!variation._id) continue

            data.push({ sourceSKU: variation.sourceSKU, destinationSKU: variation._id })
        }
    }

    // TODO: if data.length < 2, remove array and send only one object.

    // TODO validate mapping before:

    // https://developershub2b.gitbook.io/hub2b-api/api-para-seller-erp/produto/mapeamento-de-sku-ja-existente-no-canal-de-venda
    // TODO: filter products with sku already mapped. (skus.destination.length > 0 || status.id === 3)

    const mapping = await mapskuHub2b(data, idTenant)

    // TODO: if not SUCCESS = code in for each mapping, log error.

    mapping
        ? log(`SKUs from Tenant ${idTenant} has been mapped.`, "EVENT", getFunctionName())
        : log(`Could not map SKUs from Tenant ${idTenant}.`, "EVENT", getFunctionName(), "WARN")

    if (!mapping) return null

    return mapping
}

export const updateIntegrationProducts = async () => {

    const accounts = await retrieveTenants()

    if (!accounts) return null

    log(`Start integration products update.`, "EVENT", getFunctionName())

    for await (const account of accounts) {

        const shopInfo = await findShopInfoByUserEmail(account.ownerEmail)

        if (!shopInfo) continue

        // Keep looping and incrementing offset 50 by 50 until all products are retrieved.

        let products

        let offset = 0

        do {

            await waitforme(1000)

            products = await importProduct(account.idTenant, shopInfo._id, '3', offset)

            offset += 50

        } while (products?.length)
    }

    log(`Finish integration products update.`, "EVENT", getFunctionName())
}

export const findMatchingCategory = (productHub2b: HUB2B_Catalog_Product): number => {

    if (!productHub2b?.categorization?.source?.name) return 0

    return SUBCATEGORIES.filter(subcategory => {
        // TODO: trim stings before compare.
        return subcategory.value.toLowerCase() === productHub2b.categorization.source.name.toLowerCase()
    })[0]?.categoryCode || 0
}

export const findMatchingSubcategory = (productHub2b: HUB2B_Catalog_Product): number => {

    if (!productHub2b?.categorization?.source?.name) return 0

    return SUBCATEGORIES.filter(subcategory => {
        // TODO: trim stings before compare.
        return subcategory.value.toLowerCase() === productHub2b.categorization.source.name.toLowerCase()
    })[0]?.code || 0
}

export const createVariationFromHub2bAttributes = (productHub2b: HUB2B_Catalog_Product): Variation => {

    const variation: Variation = {
        stock: productHub2b.stocks.sourceStock,
        sourceSKU: productHub2b.skus.source,
        ...productHub2b.groupers.parentSKU ? { parentSKU: productHub2b.groupers.parentSKU } : { parentSKU: productHub2b.skus.source }
    }

    productHub2b.attributes.forEach((attribute: Catalog_Attributes) => {

        if (attribute.name.toLowerCase().indexOf("tamanho" || "size" || 'tam') != -1) variation.size = attribute.value

        if (attribute.name.toLowerCase().indexOf("cor" || "color") != -1) variation.color = attribute.value

        if (attribute.name.toLowerCase().indexOf("sabor" || "flavor") != -1) variation.flavor = attribute.value
    })

    return variation
}

export const updateIntegrationStock = async () => {

    const accounts = await retrieveTenants()

    if (!accounts) return null

    log(`Start integration stocks update.`, "EVENT", getFunctionName())

    for await (const account of accounts) {

        const shopInfo = await findShopInfoByUserEmail(account.ownerEmail)

        if (!shopInfo) continue

        const products = await findProductsByShop(shopInfo._id) || []

        for await (const product of products) {

            if (!product.variations) continue

            for await (const variation of product.variations) {

                await waitforme(1000)

                const hub2bStock = await getStockHub2b(variation._id, account.idTenant)

                if (!hub2bStock) continue

                if (variation.stock == hub2bStock.available) continue

                await updateProductVariationStock(variation._id, { stock: hub2bStock.available })

            }
        }
    }

    log(`Finish integration stocks update.`, "EVENT", getFunctionName())
}

export const sendInvoice2Hub = async (order: Order, idTenant: any): Promise<HUB2B_Invoice|null> => {

    if (!order?.tenant?.order) return null

    // Get order from tenant.

    const tenantOrder = await getOrderHub2b(order.tenant.order, idTenant)

    if (!tenantOrder) return null

    if ("Invoiced" !== tenantOrder?.status?.status) return null

    // Get invoice from tenant.

    const tenantInvoice = await getInvoiceHub2b(order.tenant.order, idTenant)

    if (!tenantInvoice) return null

    // Send it to correspondent hub order.

    if (!order?.order?.reference?.id) return null

    const hubInvoice = await postInvoiceHub2b(order.order.reference.id.toString(), tenantInvoice, false)

    if (!hubInvoice) return null

    // Change order status to Invoiced.

    updateStatus(order.order.reference.id.toString(), "Invoiced")

    return hubInvoice
}

export const updateIntegrationInvoices = async () => {

    const accounts = await retrieveTenants()

    if (!accounts) return null

    log(`Start integration invoices update.`, "EVENT", getFunctionName())

    for await (const account of accounts) {

        const shopInfo = await findShopInfoByUserEmail(account.ownerEmail)

        if (!shopInfo) continue

        const orders = await findOrdersByShop(shopInfo._id.toString()) || []

        for await (const order of orders) {

            if (order.order.status.status !== 'Approved') continue

            if (!order?.tenant?.order)  continue

            await waitforme(1000)

            await sendInvoice2Hub(order, account.idTenant)
        }
    }

    log(`Finish integration invoices update.`, "EVENT", getFunctionName())
}

export const sendTracking2Hub = async (order: Order, idTenant: any): Promise<HUB2B_Tracking | null> => {

    if (!order?.tenant?.order) return null

    // Get order from tenant.

    const tenantOrder = await getOrderHub2b(order.tenant.order, idTenant)

    if (!tenantOrder) return null

    if ("Shipped" !== tenantOrder?.status?.status) return null

    // Get tracking from tenant.

    const tenantTracking = await getTrackingHub2b(order.tenant.order, idTenant)

    if (!tenantTracking) return null

    // Send it to correspondent hub order.

    if (!order?.order?.reference?.id) return null

    const hubTracking = await postTrackingHub2b(order.order.reference.id.toString(), tenantTracking, false)

    if (!hubTracking) return null

    // Change order status to Invoiced.

    updateStatus(order.order.reference.id.toString(), "Shipped")

    return hubTracking
}

export const updateIntegrationTrackingCodes = async () => {

    const accounts = await retrieveTenants()

    if (!accounts) return null

    log(`Start integration tracking update.`, "EVENT", getFunctionName())

    for await (const account of accounts) {

        const shopInfo = await findShopInfoByUserEmail(account.ownerEmail)

        if (!shopInfo) continue

        const orders = await findOrdersByShop(shopInfo._id.toString()) || []

        for await (const order of orders) {

            if (order.order.status.status !== 'Invoiced') continue

            if (!order?.tenant?.order) continue

            await waitforme(1000)

            await sendTracking2Hub(order, account.idTenant)
        }
    }

    log(`Finish integration tracking update.`, "EVENT", getFunctionName())
}

export const setupOrderIntegrationWebhook = async (idTenant: any): Promise<HUB2B_Order_Webhook | null> => {
    const integration: HUB2B_Integration = {
        system: "ERPOrdersNotification",
        idTenant: Number(idTenant),
        responsibilities: [
            {
                type: "Orders",
                flow: "HubTo"
            }
        ],
        apiKeys: [
            {
                key: "URL_ERPOrdersNotification",
                value: PROJECT_HOST + "/integration/order"
            },
            {
                key: "authToken_ERPOrdersNotification",
                value: getToken('hub2b')
            },
            {
                key: "AuthKey_ERPOrdersNotification",
                value: "Authorization"
            },
            {
                key: "HUB_ID_ERPOrdersNotification",
                value: idTenant.toString()
            }
        ]
    }

    const existingSetup = await getHub2bIntegration('ERPOrdersNotification', idTenant)

    const method = existingSetup?.length ? 'PUT' : 'POST'

    const setup = await setupIntegrationHub2b(integration, method, idTenant)

    if (!setup) return null

    return setup
}

export const setupIntegrationWebhooks = async () => {

    const accounts = await retrieveTenants()

    if (!accounts) return null

    log(`Start integration webhooks setup.`, "EVENT", getFunctionName())

    for await (const account of accounts) await setupOrderIntegrationWebhook(account.idTenant)

    log(`Finish Start integration webhooks setup.`, "EVENT", getFunctionName())
}
