//
//      Product Service
//

import { Product, Variation } from "../models/product"
import { log } from "../utils/loggerUtil"
import { getFunctionName } from "../utils/util"
import { createNewProduct, createVariation, deleteVariation, findProductByShopIdAndName, findProductById, findProductsByShopId, findVariationById, updateProductById, updateVariationById, createManyProducts, findVariationsByProductId } from "../repositories/productRepository"
import productEventEmitter from "../events/product"
import { renewAccessTokenHub2b, TENANT_CREDENTIALS } from "./hub2bAuhService"
import { getStockHub2b, requestHub2B, updateHub2bSkuStatus } from "./hub2bService"
import { HUB2B_URL_V2, HUB2B_MARKETPLACE, HUB2B_SALES_CHANEL } from "../utils/consts"
import { HUB2B_Catalog_Product } from "../models/hub2b"
import { ObjectID } from "mongodb"
import { CATEGORIES, SUBCATEGORIES } from "../models/category"
import { HUB2B_TENANT } from "../utils/consts"
import { retrieveTenants } from "../repositories/hub2TenantRepository"
import { findShopInfoByUserEmail } from "../repositories/accountRepository"

/**
 * Save a new product
 *
 * @param body - valid product
 */
export const createProduct = async (body: any): Promise<Product | null> => {

    const {
        images,
        category,
        subcategory,
        nationality,
        name,
        description,
        brand,
        more_info,
        ean,
        sku,
        gender,
        height,
        width,
        length,
        weight,
        price,
        price_discounted,
        variations
    } = body

    const shop_id = body.shop

    const ref_product: Product = {
        shop_id,
        images,
        category,
        subcategory,
        nationality,
        name,
        description,
        brand,
        more_info,
        ean,
        sku,
        gender,
        height,
        width,
        length,
        weight,
        price,
        price_discounted,
        is_active: true
    }

    const product = await createNewProduct(ref_product, variations)

    if (!product) {
        log(`Product ${product} has been created.`, 'EVENT', getFunctionName())
        return null
    }

    log(`Product ${product.name} has been created.`, 'EVENT', getFunctionName())

    const idTenant = body.idTenant | Number(HUB2B_TENANT)

    productEventEmitter.emit( 'create', product, idTenant )

    return product
}

/**
 * Find a product by its id
 *
 * @param product_id - product_id
 */
export const findProduct = async (product_id: any): Promise<Product | null> => {

    let product = await findProductById(product_id)

    product
        ? log(`Product ${product.name} has been found.`, 'EVENT', getFunctionName())
        : log(`Product ${product_id} does not exist.`, 'EVENT', getFunctionName())

    return product
}

/**
 * Find a product by variation id
 *
 * @param variation_id - variation_id
 */
export const findProductByVariation = async (variation_id: any): Promise<Product | null> => {

    const variation = await findVariationById(variation_id)

    variation
        ? log(`Variation ${variation._id} has been found.`, 'EVENT', getFunctionName())
        : log(`Variation ${variation_id} could not be found.`, 'EVENT', getFunctionName())

    if (!variation) return null

    const product = await findProductById(variation.product_id)

    product
        ? log(`Product ${product._id} has been found.`, 'EVENT', getFunctionName())
        : log(`Product ${variation.product_id} could not be found.`, 'EVENT', getFunctionName())

    return product
}

/**
 * Find all products for a given shop id
 *
 * @param shop_id - shop_id
 */
export const findProductsByShop = async (shop_id: any): Promise<Product[] | null> => {

    const products = await findProductsByShopId(shop_id)

    products
        ? log(`Found ${products.length} products for shop ${shop_id}`, 'EVENT', getFunctionName())
        : log(`Could not find any products`, 'EVENT', getFunctionName())

    return products
}

/**
 * Update a product by its ID
 *
 * @param _id - product id
 */
export const updateProduct = async (_id: any, patch: any): Promise<Product | null> => {

    if (patch.images) delete patch.images

    const product = await updateProductById(_id, patch)

    product
    ? log(`Update product ${_id}`, 'EVENT', getFunctionName())
    : log(`Could not update product`, 'EVENT', getFunctionName())

    return product
}

/**
 * Update a product's images by its ID
 *
 * @param _id - product id
 */
export const updateProductImages = async (_id: any, patch: any): Promise<Product | null> => {

    patch.images = patch.images.filter(Boolean)

    const { images } = patch

    const product = await updateProductById(_id, { images })

    product
        ? log(`Update product ${_id}`, 'EVENT', getFunctionName())
        : log(`Could not update product`, 'EVENT', getFunctionName())

    return product
}

/**
 * Update a product's price by its ID
 *
 * @param _id - product id
 */
export const updateProductPrice = async (_id: any, patch: any): Promise<Product | null> => {

    const { price, price_discounted } = patch

    const product = await updateProductById(_id, { price, price_discounted })

    product
        ? log(`Update product ${_id} price`, 'EVENT', getFunctionName())
        : log(`Could not update product ${_id} price`, 'EVENT', getFunctionName())

    productEventEmitter.emit('update_price', product)

    return product
}

/**
 * Update a product's stock by its ID
 *
 * @param _id - product id
 */
export const updateProductVariationStock = async (_id: any, patch: any): Promise<Product | null> => {

    const product = await updateVariationById(_id, patch)

    product
        ? log(`Stock from variation ${_id} has been updated.`, 'EVENT', getFunctionName())
        : log(`Could not update stock from variation ${_id}.`, 'EVENT', getFunctionName(), 'WARN')

    return product
}

/**
 * Update a variation of product by its ID
 *
 * @param _id - variation id
 */
export const updateProductVariation = async (_id: any, patch: any): Promise<Product | null> => {

    const product = await updateVariationById(_id, patch)

    product
        ? log( `Update product variation ${ _id }`, 'EVENT', getFunctionName() )
        : log( `Could not update product`, 'EVENT', getFunctionName() )

    return product
}

/**
 * Find variation by id
 *
 * @param variation_id - variation_id
 */
export const findVariation = async (variation_id: any): Promise<Variation | null> => {


    let variation = await findVariationById(variation_id)

    variation
        ? log(`Variation ${variation._id} has been found.`, 'EVENT', getFunctionName())
        : log(`Variation ${variation_id} does not exist.`, 'EVENT', getFunctionName())

    return variation
}

export const createNewVariation = async (body: any): Promise<Variation | null> => {

    const { product_id, stock, color, size, voltage, flavor, gluten_free, lactose_free } = body

    let ref_variation: Variation = { product_id, stock }

    if (color) ref_variation = Object.assign(ref_variation, { color })

    if (size) ref_variation = Object.assign(ref_variation, { size })

    if (voltage) ref_variation = Object.assign(ref_variation, { voltage })

    if (flavor) ref_variation = Object.assign(ref_variation, { flavor })

    if (gluten_free) ref_variation = Object.assign(ref_variation, { gluten_free })

    if (lactose_free) ref_variation = Object.assign(ref_variation, { lactose_free })

    let variation = await createVariation(ref_variation)

    variation
        ? log( `Variation ${ variation._id } has been created.`, 'EVENT', getFunctionName() )
        : log( `Variation could not be created.`, 'EVENT', getFunctionName() )

    const idTenant = body.idTenant | Number(HUB2B_TENANT)

    productEventEmitter.emit( 'update', await findProductByVariation( variation?._id ), idTenant )

    return variation
}

export const deleteVariationById = async ( variation_id: string, patch: any ): Promise<boolean> => {

    let result = await deleteVariation(variation_id)

    result
        ? log(`Variation has been deleted.`, 'EVENT', getFunctionName())
        : log(`Variation could not be deleted.`, 'EVENT', getFunctionName())

    const idTenant = patch.idTenant | Number(HUB2B_TENANT)

    productEventEmitter.emit( 'update', await findProductByVariation( variation_id ), idTenant )

    return result
}

/**
 * Import products hub2b
 *
 * @param idTenant
 */
 export const importProduct = async (idTenant: any, shop_id: any): Promise<Product[] | null> => {

    const products: Product[] = []
    const productsWithoutVariation: Product[] = []
    const productsInHub2b = await getProductsInHub2b(idTenant)

    if (productsInHub2b) {

        for await (let productHub2b of productsInHub2b) {
            const variations: Variation[] = []
            // TODO: search by skus.source or skus.source.destination
            const productExists = await findProductByShopIdAndName(shop_id, productHub2b.name)
            if (!productExists) {
                const images: string[] = []

                productHub2b.images.forEach((imageHub2b) => {
                    images.push(imageHub2b.url)
                })

                if (productHub2b.attributes.length > 0) {
                    let size: string = ''
                    let color: string = ''

                    productHub2b.attributes.forEach((attribute) => {
                        if (attribute.name.indexOf("tamanho" || "size") != -1) {
                            size = attribute.value
                        }
                        if (attribute.name.indexOf("cor" || "color") != -1) {
                            size = attribute.value
                        }
                        const variation: Variation = {
                            size,
                            voltage: null,
                            stock: productHub2b.stocks.sourceStock,
                            color,
                            flavor: '',
                            gluten_free: false,
                            lactose_free: false,
                        }
                        variations.push(variation)
                    })
                }

                const product: Product = {
                    shop_id: new ObjectID(shop_id),
                    images,
                    category: productHub2b.categorization ?
                        CATEGORIES.filter( category =>
                            category.value === productHub2b?.categorization?.source?.name )[0]?.code : 0,
                    subcategory: productHub2b.categorization ?
                        SUBCATEGORIES.filter(
                            subcategory => subcategory.value === productHub2b?.categorization?.destination?.name )[0]?.code : 0,
                    nationality: 0,
                    name: productHub2b.name,
                    description: productHub2b.description.sourceDescription,
                    brand: productHub2b.brand,
                    more_info: '',
                    ean: productHub2b.ean,
                    sku: '',
                    gender: 'U',
                    height: productHub2b.dimensions.height,
                    width: productHub2b.dimensions.width,
                    length: productHub2b.dimensions.length,
                    weight: productHub2b.dimensions.weight,
                    price: productHub2b.destinationPrices.priceBase,
                    price_discounted: productHub2b.destinationPrices.priceSale,
                    variations,
                    is_active: true
                }

                if(product) {
                    log(`Product ${product.name} has been created.`, 'EVENT', getFunctionName())
                    if (variations.length > 0) {
                        const productInserted = await createNewProduct( product, variations )
                        if (productInserted) {
                            const productId = productInserted._id
                            const productUpdated = await updateProductById(productId, { sku: productHub2b.skus.source })
                            if (productUpdated) {
                                productEventEmitter.emit('update', productUpdated, HUB2B_TENANT )
                                products.push(productUpdated)
                            }
                        }
                    } else {
                        productsWithoutVariation.push(product)
                    }
                }
            }

            if (productExists) {

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
                        if (variation.stock !== productHub2b.stocks.virtualStock) { // stocks.sourceStock ?
                            await updateVariationById(variation._id, { stock: productHub2b.stocks.virtualStock }) // stocks.sourceStock ?
                        }
                    })
                }
            }
        }

        if (productsWithoutVariation.length > 0) {
            const createdProducts = await createManyProducts( productsWithoutVariation )

            if ( !createdProducts ) {
                log( 'Could not create Products', 'EVENT', getFunctionName(), 'ERROR' )
            } else {
                products.push.apply(products, productsWithoutVariation)
            }
        }
    }

    // TODO: filter products[]
    // check if productsInHub2b[i].skus.destination is already filled
    // or if productsInHub2b[i].status.id != 3 before call mapsku.
    if (products.length > 0) await mapSku(products, idTenant)

    return products
}

/**
 * Get Products
 *
 * @returns
 */
 export const getProductsInHub2b = async (idTenant: any): Promise<HUB2B_Catalog_Product[] | null> => {

    const access = await renewAccessTokenHub2b(false, idTenant)

    if ('object' === typeof(access)) { // TODO: solve gambiarra.
        log(`Could not get access token from tenant ${idTenant}`, 'EVENT', getFunctionName(), 'ERROR')
        return null
    }

    // TODO: Filter by more than one status in order to get stock and price updates (2,3 status).

    const CATALOG_URL = HUB2B_URL_V2 +
      "/catalog/product/" + HUB2B_MARKETPLACE + "/" + idTenant +
        "?idProductStatus=2&onlyWithDestinationSKU=false&access_token=" + TENANT_CREDENTIALS.access_token

    const response = await requestHub2B( CATALOG_URL, 'GET' )
    if ( !response ) return null

    const productsHub2b: HUB2B_Catalog_Product[] = response.data

    productsHub2b
        ? log( "GET Products in hub2b success", "EVENT", getFunctionName() )
        : log( "GET Products in hub2b error", "EVENT", getFunctionName(), "WARN" )

    return productsHub2b
}

export const mapSku = async (products: Product[], idTenant: any) => {

    await renewAccessTokenHub2b(false, idTenant)

    const CATALOG_URL = HUB2B_URL_V2 +
        "/catalog/product/mapsku/" + HUB2B_SALES_CHANEL + "?access_token=" + TENANT_CREDENTIALS.access_token

    let data = new Array()

    products.forEach( item => data.push({ sourceSKU: item.sku, destinationSKU: item._id }))

    const response = await requestHub2B(CATALOG_URL, 'POST', JSON.stringify(data), { "Content-type": "application/json" } )

    if ( !response ) return null

    // TODO: testar chamar todos os skus de uma vez
    response.data.forEach( (item: any) => {
        if ('ERROR_EXISTING_MAP' == item?.code) updateHub2bSkuStatus(item.sourceSKU, 3, Number(HUB2B_SALES_CHANEL), idTenant)
    })

    response
        ? log(`SKUs from Tenant ${idTenant} has been mapped.`, "EVENT", getFunctionName() )
        : log(`Could not map SKUs from Tenant ${idTenant}.`, "EVENT", getFunctionName(), "WARN" )

    return response.data

}

export const updateStockByQuantitySold = async (variationId: any, quantity: any) => {

    const variation = await findVariationById(variationId)

    await updateProductVariationStock(variationId, { stock: Number(variation?.stock) - Number(quantity) })
}

export const updateIntegrationStock = async() => {

    // 1 - For each tenant account GET all variations in repository.
    const accounts = await retrieveTenants()

    if (!accounts) return null

    accounts.forEach(async (account:any) => {

        await renewAccessTokenHub2b( false, account.idTenant)

        // 2 - Call GET v2/inventory/{sku}/stocks for each variation/sku.
        const products = await getProductsInHub2b(account.idTenant)

        if (!products) return null

        products.forEach(async (product: any) => {

            const stock = await getStockHub2b(product.skus.source)

            const variation = await findVariationsByProductId(product.skus.destination)

            if (!variation || !stock) return null

            variation.forEach(async (variation: any) => {
                // 3 - If stock in HUB2B is different from varriations in seller center, call updateProductVariationStock.
                if (variation.stock != stock.available) await updateProductVariationStock(variation._id, { stock: stock.available })
            })
        })
    })
}

export const updateIntegrationProducts = async() => {

    const accounts = await retrieveTenants()

    if (!accounts) return null

    accounts.forEach(async (account: any) => {

        await renewAccessTokenHub2b(false, account.idTenant)

        const shopInfo = await findShopInfoByUserEmail(account.email)

        if (!shopInfo) return null

        importProduct(account.idTenant, shopInfo._id)
    })
}

// setInterval(updateIntegrationStock, 1000 * 60) // 1min

// setInterval(updateIntegrationProducts, 500 * 60 * 60) // 30min
