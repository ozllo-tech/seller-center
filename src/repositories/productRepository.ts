//
//      Activation Token Repository
//

import { MongoError, ObjectID, TransactionOptions } from 'mongodb'
import productEventEmitter from '../events/product'
import { PaginatedResults } from '../models/others'
import { Product, Variation } from '../models/product'
import { HUB2B_TENANT } from '../utils/consts'
import { productCollection, variationCollection, VARIATION_COLLECTION } from '../utils/db/collections'
import { getMongoSession } from '../utils/db/mongoConnector'
import { log } from '../utils/loggerUtil'
import { equalArray, getFunctionName, isSubset } from '../utils/util'

const transactionOptions: TransactionOptions = {
    readPreference: 'primary',
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' }
}

/**
 * Create new Product
 *
 * @param product - the product to be saved
 */
export const createNewProduct = async ( product: Product, variations: Variation[]): Promise<Product | null> => {

    const session = getMongoSession()

    let productResult: Product | null = null

    try {

        await session.withTransaction( async () => {

            const productResults = await productCollection.insertOne( product, { session })

            productResult = productResults.ops[0] ? productResults.ops[0] : null

            if ( !productResult ) throw new MongoError( 'Could not save product.' )

            variations.forEach( variation => variation.product_id = productResults.insertedId )

            const variationResults = await variationCollection.insertMany( variations, { session })

            productResult.variations = variationResults.ops ? variationResults.ops : null

        }, transactionOptions )

        return productResult

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Product Repository - ${ getFunctionName() }`, 'ERROR' )

        return null

    } finally {

        await session.endSession()
    }
}

/**
 * Save many products
 *
 * @param products
 */
export const createManyProducts = async ( products: Product[]): Promise<boolean> => {

    try {
        const result = await productCollection.insertMany( products )

        return result.ops[0] ? true : false

    } catch ( error ) {
        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Prooduct Repository - ${ getFunctionName() }`, 'ERROR' )
        return false
    }
}

/**
 * Update a product
 *
 * @param product
 */
export const updateProductById = async ( _id: any, patch: any ): Promise<Product | null> => {

    try {

        const filter = { _id: new ObjectID( _id ) }

        const update = {
            $set: { ...patch }
        }

        const result = await productCollection.findOneAndUpdate( filter, update )

        if ( !result.value ) return null

        const product = await findProductById( result.value._id )

        // TODO: this isSubset function is causing errors. Remove it or move it to Service layer.

        if ( !isSubset( result.value, patch ) || patch.images && !equalArray( result.value.images, patch.images ) ) {

            const idTenant = patch.idTenant | Number( HUB2B_TENANT ) // TODO: remove idTenant?

            if ( patch.price || patch.price_discounted ) productEventEmitter.emit( 'update_price', product, idTenant )

            productEventEmitter.emit( 'update', product, idTenant )
        }

        return product

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Product Repository - ${ getFunctionName() }`, 'ERROR' )

        return null
    }
}

/**
 * Update a variation
 *
 * @param patch -
 */
export const updateVariationById = async ( _id: any, patch: any ): Promise<Product | null> => {

    try {

        const options = {
            $set: { ...patch }
        }

        const query = { _id: new ObjectID( _id ) }

        const result = await variationCollection.findOneAndUpdate( query, options )

        if ( !result.value ) return null

        if ( patch.stock ) {

            result.value.stock = patch.stock

            productEventEmitter.emit( 'update_stock', result.value )
        }

        const product = await findProductById( result.value.product_id )

        const idTenant = patch.idTenant | Number( HUB2B_TENANT ) // TODO: review this patch.idTenant

        if ( !isSubset( result.value, patch ) ) productEventEmitter.emit( 'update', product, idTenant )

        return product

    } catch ( error ) {

        if ( error instanceof MongoError )
            log( error.message, 'EVENT', `Product Repository - ${ getFunctionName() }`, 'ERROR' )

        return null
    }
}

/**
 * Find product by id
 *
 * @param productId
 */
export const findProductById = async ( productId: string ): Promise<Product | null> => {

    try {

        const query = { _id: new ObjectID( productId ) }

        const productsCursor = await productCollection.aggregate([
            {
                $lookup:
                {
                    from: VARIATION_COLLECTION,
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variations'
                }
            },
            { $match: query }
        ])

        if ( !productsCursor ) throw new MongoError( 'Could not retrieve product.' )

        const product = await productsCursor.toArray()

        return product[0]

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Product Repository - ${ getFunctionName() }`, 'ERROR' )

        return null
    }
}

/**
 * Find shop products
 *
 * @param shop_id
 */
export const findProductsByShopId = async ( shop_id: string  ): Promise<Product[] | null> => {

    try {

        const query = { shop_id }

        const productsCursor = productCollection.aggregate([
            {
                $lookup:
                {
                    from: VARIATION_COLLECTION,
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variations'
                }
            },
            { $match: query },
            { $sort: { _id: -1 } },
            { $limit: 300 }
        ])

        if ( !productsCursor ) throw new MongoError( 'Could not retrieve products.' )

        const results = await productsCursor.toArray()

        return results

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Product Repository - ${ getFunctionName() }`, 'ERROR' )

        return null
    }
}

export const findPaginatedProductsByShopId = async ( shop_id: string, page = 1, limit = 300, search = '' ): Promise<PaginatedResults | null> => {

    try {

        const query = { ...{ shop_id }, ...( search.length ? { name: { $regex: search, $options: 'i' } } : {}) }

        const total = await productCollection.countDocuments( query )

        const startIndex = ( page - 1 ) * limit

        const endIndex = page * limit

        const results: PaginatedResults = {total}

        if ( endIndex < total ) {
            results.next = {
                page: page + 1,
                limit: limit
            }
        }

        if ( startIndex > 0 ) {
            results.previous = {
                page: page - 1,
                limit: limit
            }
        }

        const productsCursor = productCollection.aggregate([
            {
                $lookup:
                {
                    from: VARIATION_COLLECTION,
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variations'
                }
            },
            { $match: query },
            { $sort: { _id: -1 } },
            { $skip: startIndex },
            { $limit: limit }
        ])

        if ( !productsCursor ) throw new MongoError( 'Could not retrieve products.' )

        results.items = await productsCursor.toArray()

        return results

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Product Repository - ${ getFunctionName() }`, 'ERROR' )

        return null
    }
}

/**
 * Find product by shop and name
 *
 * @param shopId
 * @param name
 * @returns Product
 */
export const findProductByShopIdAndName = async ( shopId: string, name: string ): Promise<Product | null> => {

    try {

        const query = { shop_id: new ObjectID( shopId ), name }

        const productsCursor = await productCollection.aggregate([
            {
                $lookup:
                {
                    from: VARIATION_COLLECTION,
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variations'
                }
            },
            { $match: query }
        ])

        if ( !productsCursor ) throw new MongoError( 'Could not retrieve product.' )

        const product = await productsCursor.toArray()

        return product[0]

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Product Repository - ${ getFunctionName() }`, 'ERROR' )

        return null
    }
}

export const findProductByShopIdAndSku = async ( shopId: string, sku: string ): Promise<Product | null> => {

    try {

        const query = { shop_id: new ObjectID( shopId ), sku }

        const productsCursor = productCollection.aggregate([
            {
                $lookup:
                {
                    from: VARIATION_COLLECTION,
                    localField: '_id',
                    foreignField: 'product_id',
                    as: 'variations'
                }
            },
            { $match: query }
        ])

        if ( !productsCursor ) throw new MongoError( 'Could not retrieve product.' )

        const product = await productsCursor.toArray()

        return product[0]

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Product Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

/**
 * Find variations by product id
 *
 * @param product_id
 */
export const findVariationsByProductId = async ( product_id: string ): Promise<Variation[] | null> => {

    try {

        const query = { product_id: new ObjectID( product_id ) }

        const variationsCursor = await variationCollection.find( query )

        const variations = await variationsCursor.toArray()

        return variations

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Product Repository - ${ getFunctionName() }`, 'ERROR' )

        return null
    }
}

/**
 * Find variation by id
 *
 * @param variation_id
 */
export const findVariationById = async ( variation_id: string ): Promise<Variation | null> => {

    if ( !ObjectID.isValid( variation_id ) ) return null

    try {

        const query = { _id: new ObjectID( variation_id ) }

        const variation = await variationCollection.findOne( query )

        return variation

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Product Repository - ${ getFunctionName() }`, 'ERROR' )

        return null
    }
}

/**
 * Creates a variation
 *
 * @param variation
 */
export const createVariation = async ( variation: Variation ): Promise<Variation | null> => {

    try {

        const result = await variationCollection.insertOne( variation )

        const variationInserted = result.ops[0] ? result.ops[0] : null

        if ( !variationInserted ) throw new Error( 'Could not save into database' )

        return variationInserted

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${ getFunctionName() }`, 'ERROR' )

        return null
    }
}


/**
 * Creates a variation
 *
 * @param variation
 */
export const deleteVariation = async ( variation_id: string ): Promise<boolean> => {

    try {

        const query = await variationCollection.deleteOne({ _id: variation_id })

        const result = query.deletedCount ? query.deletedCount >= 1 : false

        if ( result ) productEventEmitter.emit( 'delete', variation_id )

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Activation Token Repository - ${ getFunctionName() }`, 'ERROR' )

        return false
    }
}

export const deleteProductById = async ( product_id: string ): Promise<boolean> => {

    try {
        const query = await productCollection.deleteOne({ _id: new ObjectID( product_id )})

        const result = query.deletedCount ? query.deletedCount >= 1 : false

        if ( result ) productEventEmitter.emit( 'delete', product_id )

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )

            log( error.message, 'EVENT', `Product Repository - ${getFunctionName()}`, 'ERROR' )

        return false
    }
}
