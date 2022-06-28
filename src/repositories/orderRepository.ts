//
//      Order Repository
//

import { MongoError } from 'mongodb'
import { Order, OrderIntegration } from '../models/order'
import { PaginatedResults } from '../models/others'
import { orderCollection, orderIntegrationCollection } from '../utils/db/collections'
import { log } from '../utils/loggerUtil'
import { getFunctionName } from '../utils/util'

/**
 * Save a new hub2b integration
 *
 * @param orderIntegration -orderIntegration
 */
export const newIntegrationHub2b = async ( orderIntegration: OrderIntegration ): Promise<boolean> => {

    try {

        const result = await orderIntegrationCollection.insertOne( orderIntegration )

        return result.ops[0] ? true : false

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Order Repository - ${getFunctionName()}`, 'ERROR' )

        return false
    }
}

/**
 * Find last hub2b integration
 *
 */
export const findLastIntegrationOrder = async (): Promise<OrderIntegration | null> => {

    try {

        const result = await orderIntegrationCollection.find({}).sort({ _id: -1 }).limit( 1 ).toArray()

        return result ? result[0] : null

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Order Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

/**
 * Save orders
 *
 * @param user - new user
 */
export const newOrderHub2b = async ( orderIntegration: Order ): Promise<Order | null> => {

    try {

        const result = await orderCollection.insertOne( updateOrderMeta( orderIntegration ) )

        return result.ops[0] ? result.ops[0] : null

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Order Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

/**
 * Find orders by shop_id
 *
 * @param shop_id
 * @param filter optional filter fields.
 */
export const findOrderByShopId = async ( shop_id: string, filter = {}): Promise<Order[] | null> => {

    try {

        const result = orderCollection.find({ shop_id: shop_id, ...filter }).sort( '_id', -1 ).limit( 300 )

        const orders = await result.toArray()

        return orders

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

export const findPaginatedOrdersByShopId = async ( shop_id: string, page = 1, limit = 300, search = '', status = 'all' ): Promise<PaginatedResults | null> => {

    try {

        const total = await orderCollection.countDocuments({
            shop_id: shop_id,
            ...( 'all' !== status ? { 'order.status.status':  { $regex: status, $options: 'i' }} : {}),
            ...( search.length ? { 'order.products': { $elemMatch: { name: { $regex: search, $options: 'i' } } } } : {}), // Search for product name.
        })

        const results: PaginatedResults = {total}

        const query = orderCollection.find({
            shop_id: shop_id,
            ...( 'all' !== status ? { 'order.status.status':  { $regex: status, $options: 'i' } } : {}),
            ...( search.length ? { 'order.products': { $elemMatch: { name: { $regex: search, $options: 'i' } } } } : {}) // Search for product name.
        }).sort( '_id', -1 ).skip( ( page - 1 ) * limit ).limit( limit )

        results.items = await query.toArray()

        return results

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

export const findOneOrderAndModify = async ( where: any, by: any, fields: any ) => {

    try {

        const filter = { [where]: Number( by ) }

        const result = await orderCollection.findOneAndUpdate( filter, { $set: fields }, { returnOriginal: false })

        if ( result.value ) log( `Order field updated`, 'EVENT', `Order Repository - ${getFunctionName()}`, 'INFO' )

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `Order Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

export const findOrderByField = async ( field: any, value: any ) => {

    try {

        const filter = { [field]: value }

        const result = await orderCollection.findOne( filter )

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

export const findOrdersByFields = async ( filter: object ): Promise<Order[]|null> => {

    try {

        const result = orderCollection.find( filter )

        const orders = await result.toArray()

        return orders

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

export const updateOrderMeta = ( order: Order ): Order => {

    if ( 'Approved' == order.order.status.status ) order.meta = {...order.meta, approved_at: order.order.status.updatedDate}

    if ( 'Invoiced' == order.order.status.status ) order.meta = {...order.meta, invoiced_at: order.order.status.updatedDate}

    if ( 'Shipped' == order.order.status.status ) order.meta = {...order.meta, shipped_at: order.order.status.updatedDate}

    if ( 'Delivered' == order.order.status.status ) order.meta = {...order.meta, delivered_at: order.order.status.updatedDate}

    return order
}

export const getOrdersCountByStatus = async ( shop_id: string, status: string ): Promise<number|null> => {

    try {

        const result = await orderCollection.countDocuments({shop_id, 'order.status.status': status})

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

