//
//      Rota de pedidos
//

import { Router, Request, Response, NextFunction } from 'express'
import { findOrdersByShop, sendInvoice, retrieveInvoice, sendTracking, retrieveTracking, getOrderAverageShippingTime } from '../services/orderService'
import { createHttpStatus, internalServerError, ok } from '../utils/httpStatus'
import { isOrderInvoiceable } from "../utils/middlewares"
const router = Router()

/**
 * GET -> lista de pedidos
 */
router.get('/all', async (req: Request, res: Response, next: NextFunction) => {

    const orders = await findOrdersByShop(req.shop?._id.toString())

    if (!orders)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res
        .status(ok.status)
        .send(orders)
})

router.post('/:id/invoice', isOrderInvoiceable, async (req: Request, res: Response, next: NextFunction) => {

    const invoice = await sendInvoice(req?.order, req.body)

    if (!invoice)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res
        .status(ok.status)
        .send(invoice)
})

router.get('/:id/invoice', async (req: Request, res: Response, next: NextFunction) => {

    const invoice = await retrieveInvoice(req.params.id)

    if (!invoice)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res
        .status(ok.status)
        .send(invoice)
})

router.get('/:id/tracking', async (req: Request, res: Response, next: NextFunction) => {

    const tracking = await retrieveTracking(req.params.id)

    if (!tracking)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res
        .status(ok.status)
        .send(tracking)
})

router.post('/:id/tracking', async (req: Request, res: Response, next: NextFunction) => {

    const tracking = await sendTracking(req.params.id, req.body)

    if (!tracking)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res
        .status(ok.status)
        .send(tracking)
})

router.get('/insigths', async (req: Request, res: Response, next: NextFunction) => {

    const result = await getOrderAverageShippingTime(req.shop?._id)

    if (!result)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res
        .status(ok.status)
        .send(result)
})

export { router as orderRouter }
