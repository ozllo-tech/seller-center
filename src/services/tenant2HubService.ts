import { ObjectID } from "mongodb"
import productEventEmitter from "../events/product"
import { SUBCATEGORIES } from "../models/category"
import { Catalog_Attributes, HUB2B_Catalog_Product } from "../models/hub2b"
import { Product, Variation } from "../models/product"
import { findShopInfoByUserEmail } from "../repositories/accountRepository"
import { retrieveTenants } from "../repositories/hub2TenantRepository"
import { createNewProduct, findProductByShopIdAndSku, updateProductById, updateVariationById } from "../repositories/productRepository"
import { log } from "../utils/loggerUtil"
import { getFunctionName } from "../utils/util"
import { renewAccessTokenHub2b } from "./hub2bAuhService"
import { getCatalogHub2b, getStockHub2b, mapskuHub2b } from "./hub2bService"
import { findProductsByShop, updateProductVariationStock } from "./productService"

// TODO: find out a way to reset the offset to 0 when idTenant or shop_id changes.
let offset = 0

/**
 * Import products hub2b
 *
 * @param idTenant
 */
export const importProduct = async (idTenant: any, shop_id: any, status = '2'): Promise<Product[] | null> => {

    const products: Product[] = []

    const productsInHub2b = await getProductsInHub2b(idTenant, status, offset)

    const productsWithNoCategory = productsInHub2b?.filter((product: HUB2B_Catalog_Product) => !product?.categorization?.source)

    if ('2' === status && productsWithNoCategory?.length === 10) {

        offset += productsWithNoCategory.length

        log(`Importing products from hub2b. Offset: ${offset}`, 'EVENT', getFunctionName())
    }

    if (!productsInHub2b) return null

    for await (let productHub2b of productsInHub2b) {

        const variations: Variation[] = [createVariationFromHub2bAttributes(productHub2b)]

        const productExists = await findProductByShopIdAndSku(shop_id, productHub2b.skus.source)

        const category = findMatchingCategory(productHub2b)

        const subcategory = findMatchingSubcategory(productHub2b)

        if (!subcategory) continue

        if (!productExists) {

            const images: string[] = []

            productHub2b.images.forEach((imageHub2b) => images.push(imageHub2b.url))

            const product: Product = {
                shop_id: new ObjectID(shop_id),
                images,
                category: category,
                subcategory: subcategory,
                nationality: 0,
                name: productHub2b.name,
                description: productHub2b.description.sourceDescription,
                brand: productHub2b.brand,
                more_info: '',
                ean: productHub2b.ean,
                sku: productHub2b.skus.source,
                gender: 'U',
                height: productHub2b.dimensions.height * 100,
                width: productHub2b.dimensions.width * 100,
                length: productHub2b.dimensions.length * 100,
                weight: productHub2b.dimensions.weight * 1000,
                price: productHub2b.destinationPrices.priceBase,
                price_discounted: productHub2b.destinationPrices.priceSale,
                is_active: true
            }

            const productInserted = await createNewProduct(product, variations)

            if (productInserted) {

                log(`Product ${product.name} has been created.`, 'EVENT', getFunctionName())

                productEventEmitter.emit('create', product)

                products.push(productInserted)
            }
        }

        if (productExists) {

            if (!productHub2b.skus?.destination) products.push(productExists)

            // Update description.

            if (productExists.description !== productHub2b.description.sourceDescription) {

                const productUpdated = await updateProductById(productExists._id, {
                    description: productHub2b.description.sourceDescription
                })

                if (productUpdated) products.push(productUpdated)
            }

            // Update base price and sales price.

            if (productExists.price !== productHub2b.destinationPrices.priceBase || productExists.price_discounted !== productHub2b.destinationPrices.priceSale) {

                await updateProductById(productExists._id, {
                    price: productHub2b.destinationPrices.priceBase,
                    price_discounted: productHub2b.destinationPrices.priceSale
                })
            }

            // Update stock.

            if (Array.isArray(productExists.variations)) {
                productExists.variations.forEach(async (variation) => {
                    if (variation.stock !== productHub2b.stocks.sourceStock) {
                        await updateVariationById(variation._id, { stock: productHub2b.stocks.sourceStock })
                    }
                })
            }

            // Update category.

            if (productExists.subcategory !== Number(productHub2b?.categorization?.source?.code)) {

                const productUpdated = await updateProductById(productExists._id, {
                    category: findMatchingCategory(productHub2b),
                    subcategory: findMatchingSubcategory(productHub2b)
                })

                if (productUpdated) products.push(productUpdated)
            }
        }
    }

    if ('2' === status && products.length > 0) mapSku(products, idTenant)

    return products
}

/**
 * Get Products
 *
 * @returns
 */
export const getProductsInHub2b = async (idTenant: any, status = '2', offset = 0): Promise<HUB2B_Catalog_Product[] | null> => {

    const productsHub2b = await getCatalogHub2b(status, offset, idTenant)

    productsHub2b
        ? log("GET Products in hub2b success", "EVENT", getFunctionName())
        : log("GET Products in hub2b error", "EVENT", getFunctionName(), "WARN")

    if (!productsHub2b) return null

    return productsHub2b
}

export const mapSku = async (products: Product[], idTenant: any) => {

    const data = products.map(item => ({ sourceSKU: item.sku, destinationSKU: item._id }))

    // TODO validate mapping before:
    // https://developershub2b.gitbook.io/hub2b-api/api-para-seller-erp/produto/mapeamento-de-sku-ja-existente-no-canal-de-venda

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

        await renewAccessTokenHub2b(false, account.idTenant)

        const shopInfo = await findShopInfoByUserEmail(account.ownerEmail)

        // TODO: deal with default getProductsInHub2b() results limit (50).

        if (shopInfo) await importProduct(account.idTenant, shopInfo._id, '3')
    }

    log(`Finish integration products update.`, "EVENT", getFunctionName())
}

export const findMatchingCategory = (productHub2b: HUB2B_Catalog_Product): number => {

    if (!productHub2b?.categorization?.source?.name) return 0

    return SUBCATEGORIES.filter(subcategory => {
        return subcategory.value.toLowerCase() === productHub2b.categorization.source.name.toLowerCase()
    })[0]?.categoryCode || 0
}

export const findMatchingSubcategory = (productHub2b: HUB2B_Catalog_Product): number => {

    if (!productHub2b?.categorization?.source?.name) return 0

    return SUBCATEGORIES.filter(subcategory => {
        return subcategory.value.toLowerCase() === productHub2b.categorization.source.name.toLowerCase()
    })[0]?.code || 0
}


export const createVariationFromHub2bAttributes = (productHub2b: HUB2B_Catalog_Product): Variation => {

    const variation: Variation = { stock: productHub2b.stocks.sourceStock }

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

        await renewAccessTokenHub2b(false, account.idTenant)

        const shopInfo = await findShopInfoByUserEmail(account.ownerEmail)

        if (!shopInfo) continue

        const products = await findProductsByShop(shopInfo._id) || []

        for await (const product of products) {

            if (!product.variations) continue

            for await (const variation of product.variations) {

                const hub2bStock = await getStockHub2b(variation._id, account.idTenant)

                if (!hub2bStock) continue

                if (variation.stock == hub2bStock.available) continue

                await updateProductVariationStock(variation._id, { stock: hub2bStock.available })

            }
        }
    }

    log(`Finish integration stocks update.`, "EVENT", getFunctionName())

}
