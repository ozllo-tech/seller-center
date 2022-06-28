//
//      Rota de pedidos
//

import { Router, Request, Response } from 'express'
import { findPaginatedOrdersByShopId } from '../repositories/orderRepository'
import { sendInvoice, retrieveInvoice, sendTracking, retrieveTracking, getOrderAverageShippingTime, retrieveOrderShippingLabel, getOrdersStatusCount } from '../services/orderService'
import { createHttpStatus, internalServerError, noContent, ok } from '../utils/httpStatus'
import { isOrderInvoiceable } from '../utils/middlewares'
const router = Router()

/**
 * GET -> lista de pedidos
 */
router.get( '/all', async ( req: Request, res: Response ) => {

    const page = Number( req.query.page ) || 1

    const limit = Number( req.query.limit ) || 300

    const search = req.query.search?.toString() || ''

    const orders = await findPaginatedOrdersByShopId( req.shop?._id.toString(), page, limit, search )

    if ( !orders )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( orders )
})

router.get( '/status/:status', async ( req: Request, res: Response ) => {

    const page = Number( req.query.page ) || 1

    const limit = Number( req.query.limit ) || 300

    const search = req.query.search?.toString() || ''

    const orders = await findPaginatedOrdersByShopId( req.shop?._id.toString(), page, limit, search, req.params.status )

    if ( !orders )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( orders )
})

router.post( '/:id/invoice', isOrderInvoiceable, async ( req: Request, res: Response ) => {

    const invoice = await sendInvoice( req?.order, req.body )

    if ( !invoice )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( invoice )
})

router.get( '/:id/invoice', async ( req: Request, res: Response ) => {

    const invoice = await retrieveInvoice( req.params.id )

    if ( !invoice )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( invoice )
})

router.get( '/:id/tracking', async ( req: Request, res: Response ) => {

    const tracking = await retrieveTracking( req.params.id )

    if ( !tracking )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( tracking )
})

router.post( '/:id/tracking', async ( req: Request, res: Response ) => {

    const tracking = await sendTracking( req.params.id, req.body )

    if ( !tracking )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( tracking )
})

router.get( '/insigths', async ( req: Request, res: Response ) => {

    const averageShippingTime = await getOrderAverageShippingTime( req.shop?._id )

    const orderStatusCount = await getOrdersStatusCount( req.shop?._id.toString() )

    const result = [averageShippingTime, orderStatusCount]

    if ( !result )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( result )
})

router.get( '/:id/shippingLabel', async ( req: Request, res: Response ) => {

    const result = await retrieveOrderShippingLabel( req.params.id )

    if ( !result ) return res.status( internalServerError.status ).send( createHttpStatus( internalServerError ) )

    if ( 'url not available yet' === result?.error ) return res.status( noContent.status ).send( result )

    return res.status( ok.status ).send( result )

})

export { router as orderRouter }
