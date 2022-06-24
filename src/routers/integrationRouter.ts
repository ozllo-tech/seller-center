import { Router, Request, Response, NextFunction } from 'express'
import { badRequest, createHttpStatus, internalServerError, noContent, ok } from '../utils/httpStatus'
import { setupWebhookIntegration } from '../services/orderService'
import { updateStatus } from '../services/orderService'
import { authMiddleware, isTinyOrderInvoiceable, isTinyOrderTrackable, userCanAccessShop, validateSystemPayload } from '../utils/middlewares'
import { activateSystemIntegration, findSystemByShopID, saveSystemIntegrationData } from '../services/integrationService'
import { ObjectID } from 'mongodb'
import { importTinyProduct, sendTinyInvoiceToHub, sendTinyTrackingToHub, updateTinyPrice, updateTinyStock } from '../services/tiny2HubService'
import { ORDER_STATUS_TINY_HUB2B } from '../models/tinyOrder'
import { findOrderByField } from '../repositories/orderRepository'

const router = Router()

router.post( '/order', async ( req: Request, res: Response, next: NextFunction ) => {

    if ( req.body.idOrder == '0' || req.body.IdOrder == '0' ) return res.status( ok.status ).send( req.body )

    const result = await updateStatus( req.body.IdOrder, req.body.OrderStatus )

    return res.status( ok.status ).send( result )
})

router.post( '/order/webhook', async ( req: Request, res: Response, next: NextFunction ) => {

    const webhookIntegration = await setupWebhookIntegration()

    if ( !webhookIntegration ) return res.status( internalServerError.status ).send( webhookIntegration )

    return res.status( ok.status ).send( webhookIntegration )
})

router.post( '/system', [authMiddleware, userCanAccessShop, validateSystemPayload()],
    async ( req: Request, res: Response, next: NextFunction ) => {

        const result = await saveSystemIntegrationData( req.shop?._id, req.body )

        if ( !result ) return res.status( internalServerError.status ).send( createHttpStatus( internalServerError ) )

        return res.status( ok.status ).send( result )
    })

router.get( '/system', [authMiddleware, userCanAccessShop], async ( req: Request, res: Response, next: NextFunction ) => {

    const result = await findSystemByShopID( req.shop?._id )

    if ( !result ) return res.status( noContent.status ).send( createHttpStatus( noContent ) )

    return res.status( ok.status ).send( result )
})

router.post( '/system/:id/activate', [authMiddleware, userCanAccessShop], async ( req: Request, res: Response, next: NextFunction ) => {

    if ( !ObjectID.isValid( req.params.id ) ) return res.status( badRequest.status ).send( badRequest )

    const result = await activateSystemIntegration( req.params.id )

    if ( !result ) return res.status( internalServerError.status ).send( createHttpStatus( internalServerError ) )

    return res.status( ok.status ).send( result )
})

router.post( '/system/tiny/webhook/product', async ( req: Request, res: Response, next: NextFunction ) => {

    const result = await importTinyProduct( req.body )

    if ( !result ) return res.status( internalServerError.status ).send( createHttpStatus( internalServerError ) )

    return res.status( ok.status ).send( result )
})

router.post( '/system/tiny/webhook/stock', async ( req: Request, res: Response, next: NextFunction ) => {

    const result = await updateTinyStock( req.body )

    if ( !result ) return res.status( internalServerError.status ).send( createHttpStatus( internalServerError ) )

    return res.status( ok.status ).send( result )
})

router.post( '/system/tiny/webhook/price', async ( req: Request, res: Response, next: NextFunction ) => {

    const result = await updateTinyPrice( req.body )

    if ( !result ) return res.status( internalServerError.status ).send( createHttpStatus( internalServerError ) )

    return res.status( ok.status ).send( result )
})

router.post( '/system/tiny/webhook/order', async ( req: Request, res: Response, next: NextFunction ) => {

    const tinyOrderReferenceId = req.body?.dados?.idPedidoEcommerce

    const order = await findOrderByField( 'order.reference.id', Number( tinyOrderReferenceId ) )

    const orderID = order?.order.reference.id?.toString()

    if ( !orderID ) return res.status( ok.status ).send()

    const tinyStatus: string = req.body?.dados?.situacao

    const hub2bStatus = Object.entries( ORDER_STATUS_TINY_HUB2B ).find( ([key]) => key === tinyStatus )

    if ( !hub2bStatus?.[1]) return res.status( ok.status ).send()

    const result = await updateStatus( orderID, hub2bStatus[1])

    if ( !result ) return res.status( internalServerError.status ).send( createHttpStatus( internalServerError ) )

    return res.status( ok.status ).send( result )
})

router.post( '/system/tiny/webhook/invoice', isTinyOrderInvoiceable, async ( req: Request, res: Response ) => {

    if ( !req.body?.dados ) return res.status( badRequest.status ).send( badRequest )

    const result = await sendTinyInvoiceToHub( req.body.dados )

    if ( !result ) return res.status( internalServerError.status ).send( createHttpStatus( internalServerError ) )

    return res.status( ok.status ).send( result )
})

router.post( '/system/tiny/webhook/tracking', isTinyOrderTrackable, async ( req: Request, res: Response ) => {

    if ( !req.body?.dados ) return res.status( badRequest.status ).send( badRequest )

    const result = await sendTinyTrackingToHub( req.body.dados )

    if ( !result ) return res.status( internalServerError.status ).send( createHttpStatus( internalServerError ) )

    return res.status( ok.status ).send( result )
})

export { router as integrationRouter }
