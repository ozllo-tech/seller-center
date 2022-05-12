//
//      Product Service
//

import { Product, Variation } from "../models/product"
import { log } from "../utils/loggerUtil"
import { getFunctionName, removeAllTagsExceptBr } from "../utils/util"
import { createNewProduct, createVariation, deleteVariation, findProductById, findProductsByShopId, findVariationById, updateProductById, updateVariationById, findVariationsByProductId, deleteProductById } from "../repositories/productRepository"
import productEventEmitter from "../events/product"
import { ObjectID } from "mongodb"
import { HUB2B_TENANT } from "../utils/consts"
import { getImageKitUrl } from "./uploadService"

/**
 * Save a new product
 *
 * @param body - valid product
 */
export const createProduct = async (body: any): Promise<Product | null> => {

    body.images = body.images.map((url: string) => getImageKitUrl(url.split('/').pop()?.split('?').shift() || ''))

    body.description = removeAllTagsExceptBr(body.description)

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

    const shop_id = body.shop || body.shop_id

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

        log(`Could not create product ${ref_product.name}`, 'EVENT', getFunctionName())

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

    if (!product) log(`Product ${product_id} does not exist.`, 'EVENT', getFunctionName())

    return product
}

/**
 * Find a product by variation id
 *
 * @param variation_id - variation_id
 */
export const findProductByVariation = async (variation_id: any): Promise<Product | null> => {

    if (!ObjectID.isValid(variation_id)) return null

    const variation = await findVariationById(variation_id)

    if (!variation) log(`Variation ${variation_id} could not be found.`, 'EVENT', getFunctionName())

    if (!variation) return null

    const product = await findProductById(variation.product_id)

    if (!product) log(`Product from variation ${variation.product_id} could not be found.`, 'EVENT', getFunctionName())

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
        : log(`Could not find any products for shop ${shop_id}`, 'EVENT', getFunctionName())

    return products
}

/**
 * Update a product by its ID
 *
 * @param _id - product id
 */
export const updateProduct = async (_id: any, patch: any): Promise<Product | null> => {

    if (patch.images) delete patch.images

    delete patch._id

    if (patch.description) patch.description = removeAllTagsExceptBr(patch.description)

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

    patch.images = patch.images.filter(Boolean).map((image: string) => getImageKitUrl(image.split('/').pop()?.split('?').shift()||''))

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

    if (!ObjectID.isValid(_id)) return null

    const { price, price_discounted } = patch

    const product = await updateProductById(_id, { price, price_discounted })

    if (!product) log(`Could not update product ${_id} price`, 'EVENT', getFunctionName())

    productEventEmitter.emit('update_price', product)

    return product
}

/**
 * Update a product's stock by its ID
 *
 * @param _id - product id
 */
export const updateProductVariationStock = async (_id: any, patch: any): Promise<Product | null> => {

    if (!ObjectID.isValid(_id)) return null

    const product = await updateVariationById(_id, patch)

    if (!product) log(`Could not update stock from variation ${_id}.`, 'EVENT', getFunctionName(), 'WARN')

    return product
}

/**
 * Update a variation of product by its ID
 *
 * @param _id - variation id
 */
export const updateProductVariation = async (_id: any, patch: any): Promise<Product | null> => {

    const product = await updateVariationById(_id, patch)

    if (!product) log( `Could not update product ${_id}`, 'EVENT', getFunctionName(), 'WARN' )

    return product
}

/**
 * Find variation by id
 *
 * @param variation_id - variation_id
 */
export const findVariation = async (variation_id: any): Promise<Variation | null> => {

    let variation = await findVariationById(variation_id)

    if (!variation) log(`Variation ${variation_id} does not exist.`, 'EVENT', getFunctionName())

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

    if (variation) {

        const idTenant = body.idTenant | Number(HUB2B_TENANT)

        productEventEmitter.emit( 'update', await findProductByVariation( variation._id ), idTenant )

    }

    return variation
}

// TODO: review or remove this function.
export const deleteVariationById = async ( variation_id: string, patch: any ): Promise<boolean> => {

    let result = await deleteVariation(variation_id)

    result
        ? log(`Variation has been deleted.`, 'EVENT', getFunctionName())
        : log(`Variation could not be deleted.`, 'EVENT', getFunctionName())

    const idTenant = patch.idTenant | Number(HUB2B_TENANT)

    productEventEmitter.emit( 'update', await findProductByVariation( variation_id ), idTenant )

    return result
}

export const updateStockByQuantitySold = async (variationId: any, quantity: any) => {

    const variation = await findVariationById(variationId)

    await updateProductVariationStock(variationId, { stock: Number(variation?.stock) - Number(quantity) })
}

export const deleteProduct = async (productId: any) => {

    const result = await deleteProductById(productId)

    if (!result) return null

    const variations = await findVariationsByProductId(productId)

    if (!variations) return null

    for await (const variation of variations) await deleteVariation(variation._id)

    result
        ? log(`Product ${productId} has been deleted.`, "EVENT", getFunctionName())
        : log(`Could not delete product ${productId}.`, "EVENT", getFunctionName(), "WARN")

    return result
}
