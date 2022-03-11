import { Router, Request, Response, NextFunction } from 'express'
import { badRequest, createHttpStatus, internalServerError, ok } from '../utils/httpStatus'
import { setupWebhookIntegration } from "../services/orderService";
import { updateStatus } from '../services/orderService';
import { authMiddleware, userCanAccessShop, validateSystemPayload } from '../utils/middlewares';
import { activateSystemIntegration, findSystemByShopID, saveSystemIntegrationData } from '../services/integrationService';
import { ObjectID } from 'mongodb';
import { importTinyProduct, updateTinyPrice, updateTinyStock } from '../services/systemTinyService';

const router = Router()

router.post('/order', async (req: Request, res: Response, next: NextFunction) => {

    const result = await updateStatus(req.body.IdOrder, req.body.OrderStatus, true)

    if (!result)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res
        .status(ok.status)
        .send(req.body)
})

router.post('/order/webhook', async (req: Request, res: Response, next: NextFunction) => {

    const webhookIntegration = await setupWebhookIntegration()

    if (!webhookIntegration)
        return res
            .status(internalServerError.status)
            .send(webhookIntegration)

    return res
        .status(ok.status)
        .send(webhookIntegration)
})

router.post('/system', [authMiddleware, userCanAccessShop, validateSystemPayload()],
    async (req: Request, res: Response, next: NextFunction) => {

    const result = await saveSystemIntegrationData(req.shop?._id, req.body)

    if (!result)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res.status(ok.status).send(result)
})

router.get('/system', [authMiddleware, userCanAccessShop], async (req: Request, res: Response, next: NextFunction) => {

    const result = await findSystemByShopID(req.shop?._id)

    if (!result)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res.status(ok.status).send(result)
})

router.post('/system/:id/activate', [authMiddleware, userCanAccessShop], async (req: Request, res: Response, next: NextFunction) => {

    if (!ObjectID.isValid(req.params.id)) return res.status(badRequest.status).send(badRequest)

    const result = await activateSystemIntegration(req.params.id)

    if (!result)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res.status(ok.status).send(result)

})

router.post('/system/tiny/webhook/product', async (req: Request, res: Response, next: NextFunction) => {

    const result = await importTinyProduct(req.body)

    if (!result)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res.status(ok.status).send(JSON.stringify(result))

})

router.post('/system/tiny/webhook/stock', async (req: Request, res: Response, next: NextFunction) => {

    const result = await updateTinyStock(req.body)

    if (!result)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res.status(ok.status).send()

})

router.post('/system/tiny/webhook/price', async (req: Request, res: Response, next: NextFunction) => {

    const result = await updateTinyPrice(req.body)

    if (!result)
        return res
            .status(internalServerError.status)
            .send(createHttpStatus(internalServerError))

    return res.status(ok.status).send()

})

export { router as integrationRouter }
