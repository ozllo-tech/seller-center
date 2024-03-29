import { Request, Response, NextFunction } from 'express'
import { ObjectID } from 'mongodb'
import { findProductById } from '../repositories/productRepository'
import { findUserById } from '../repositories/userRepository'
import { findShop } from '../services/accountService'
import { findVariation } from '../services/productService'
import { findById } from '../services/userService'
import { getOrderHub2b } from '../services/hub2bService'
import { decodeJWT, isJWTTokenValid } from './cryptUtil'
import { invalidOrderStatusReferenceToInvoice, invalidOrderStatusReferenceToShip, invalidProductReference, invalidTrackingFields, invalidVariationReference } from './errors/errors'
import { notFound, createHttpStatus, HttpStatusResponse, unauthorized, internalServerError, badRequest } from './httpStatus'
import { logger, log } from './loggerUtil'
import { celebrate, Segments, Joi } from 'celebrate'

/**
 * Middleware para capturar status 404 e criar error
 */
export const notFountMiddleware = ( req: Request, res: Response, next: NextFunction ) => {
    next( createHttpStatus( notFound ) )
}

/**
 * Exports middleware para tratar erros internos do servidor express
 */
export const errorMiddleware = ( error: HttpStatusResponse, req: Request, res: Response, next: NextFunction ) => {
    if ( res.headersSent ) return

    res.statusMessage = error.message

    log( res.statusMessage, 'EVENT', 'Error Middleware', 'ERROR' )

    try {
        return res
            .status( error.status | 400 )
            .send( error )

    } catch ( error ) {
        if ( error instanceof Error ) {
            console.error( error.message )
            log( error.message, 'EVENT', 'Error Middleware', 'CRITICAL' )
        }
    }
}

/**
 * Middleware function to handle authorization
 */
export const corsMiddleware = ( req: Request, res: Response, next: NextFunction ) => {

    res.header( 'Access-Control-Allow-Origin', '*' )

    res.header( 'Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS' )

    res.header( 'Access-Control-Allow-Headers', 'Origin, Accept, Content-Type, Authorization, shop_id' )

    if ( req.method === 'OPTIONS' ) {
        return res.status( 200 ).end()
    }

    next()
}

/**
 * Middleware to handle authorization
 */
export const authMiddleware = async ( req: Request, res: Response, next: NextFunction ) => {

    // get token from request header Authorization
    const token = req.headers.authorization

    // Catch the JWT Expired or Invalid errors
    if ( !token || !isJWTTokenValid( token ) )
        return next( createHttpStatus( unauthorized ) )

    const user_decoded = decodeJWT( token )

    if ( !user_decoded ||
        typeof user_decoded === 'string' ||
        !user_decoded.data ||
        typeof user_decoded.data === 'string' ) {
        return next( createHttpStatus( internalServerError ) )
    }

    const user = await findById( user_decoded.data._id )

    if ( !user || !user.isActive )
        return next( createHttpStatus( unauthorized ) )

    req.user = user

    next()
}

/**
 * Middleware para logar as requests
 */
export const loggerRequest = logger( 'from :remote-addr - :method :url HTTP/:http-version', {
    immediate: true,
    stream: {
        write: ( message: string ) => {
            log( message.trim(), 'REQUEST' )
        }
    }
})

/**
 * Middleware para logar os responses
 */
export const loggerResponse = logger( 'to :remote-addr - STATUS :status in :response-time ms', {
    stream: {
        write: ( message: string ) => {
            log( message.trim(), 'RESPONSE' )
        }
    }
})

/**
 * Verifies whether the user can access shop
 *
 * @param req.headers.shop_id
 * @param req.user._id
 * @returns an unauthorized response in negative case
 */
export const userCanAccessShop = async ( req: Request, res: Response, next: NextFunction ) => {

    const user_id = req.user?._id

    const shop_id = req.headers.shop_id

    if ( !user_id || !shop_id || Array.isArray( shop_id ) || !ObjectID.isValid( shop_id ) ) return next( createHttpStatus( unauthorized ) )

    const [user, shop] = await Promise.all([findUserById( user_id ), findShop( shop_id )])

    if ( !user || !shop ) return next( createHttpStatus( unauthorized ) )

    if ( !user._id.equals( shop.userId ) ) return next( createHttpStatus( unauthorized ) )

    req.shop = shop

    next()
}

/**
 * Verifies whether the product belongs to shop
 *
 * @param req.shop
 * @param req.params.product_id
 * @returns an unauthorized response in negative case
 */
export const isProductFromShop = async ( req: Request, res: Response, next: NextFunction ) => {

    const shop_id = req.shop?._id

    const product_id = req.params.product_id

    if ( !product_id || !shop_id || !ObjectID.isValid( product_id ) ) return next( createHttpStatus( unauthorized, invalidProductReference ) )

    const [product, shop] = await Promise.all([findProductById( product_id ), findShop( shop_id )])

    if ( !product || !shop ) return next( createHttpStatus( unauthorized, invalidProductReference ) )

    if ( !product.shop_id.equals( shop._id ) ) return next( createHttpStatus( unauthorized, invalidProductReference ) )

    req.product = product

    next()
}

/**
 * Verifies whether the variation belongs to product
 *
 * @param req.product
 * @param req.params.variation_id
 * @returns an unauthorized response in negative case
 */
export const isVariationFromProduct = async ( req: Request, res: Response, next: NextFunction ) => {

    const product_id = req.product?._id

    const variation_id = req.params.variation_id

    if ( !variation_id || !product_id || !ObjectID.isValid( variation_id ) ) return next( createHttpStatus( unauthorized, invalidVariationReference ) )

    const variation = await findVariation( variation_id )

    if ( !variation ) return next( createHttpStatus( unauthorized, invalidVariationReference ) )

    if ( !variation.product_id.equals( product_id ) ) return next( createHttpStatus( unauthorized, invalidVariationReference ) )

    req.variation = variation

    next()
}

/**
 * Middleware para validar payload de update tenant
 */
export const validatePayloadUpdateTenant = () => {
    return celebrate({
        [Segments.PARAMS]: {
            idTenant: Joi.number().required(),
        },
        [Segments.BODY]: {
            name: Joi.string().required(),
            website: Joi.string().required(),
            documentNumber: Joi.string().required(),
            companyName: Joi.string().required(),
            ownerName: Joi.string().required(),
            ownerEmail: Joi.string().required(),
            ownerPhoneNumber: Joi.string().required(),
            idAgency: Joi.number(),
            address: {
                zipCode: Joi.string().required(),
                street: Joi.string().required(),
                neighborhood: Joi.string().required(),
                number: Joi.number().required(),
                city: Joi.string().required(),
                state: Joi.string().required(),
                country: Joi.string().required(),
                reference: Joi.string()
            }
        },
    })
}

/**
 * Middleware para validar payload de get tenant
 */
export const validatePayloadGetTenant = () => {
    return celebrate({
        [Segments.PARAMS]: {
            idTenant: Joi.number().required(),
        },
    })
}

export const isOrderInvoiceable = async ( req: Request, res: Response, next: NextFunction ) => {

    const order = await getOrderHub2b( req.params.id )

    if ( !order ) return next( createHttpStatus( notFound ) )

    if ( 'Approved' !== order.status.status ) return next( createHttpStatus( unauthorized ) )

    req.order = order

    next()
}

export const validateSystemPayload = () => {

    const names = ['bseller', 'idealeware', 'ihub', 'infracommerce' , 'loja_integrada' , 'magento' , 'magento_2' , 'opencart' , 'tray' , 'vtex' , 'bling' , 'eccosys' , 'linx_emillenium' , 'linx_commerce' , 'linx_oms' , 'softvar' , 'tiny', 'woocommerce']

    // https://stackoverflow.com/questions/59861503/joi-validator-conditional-schema

    return celebrate({
        [Segments.BODY]: {
            name: Joi.string().required().valid( ...names ),
            data: Joi.object().required()
        }
    })
}

export const isTinyOrderInvoiceable = async ( req: Request, res: Response, next: NextFunction ) => {

    const order = await getOrderHub2b( req.body.dados.idPedidoEcommerce )

    if ( !order ) return next( createHttpStatus( badRequest ) )

    if ( 'Approved' !== order.status.status ) return next( createHttpStatus( badRequest, invalidOrderStatusReferenceToInvoice ) )

    req.order = order

    next()
}

export const isTinyOrderTrackable = async ( req: Request, res: Response, next: NextFunction ) => {

    const order = await getOrderHub2b( req.body.dados.idPedidoEcommerce )

    if ( !order ) return next( createHttpStatus( badRequest ) )

    if ( 'Invoiced' !== order.status.status ) return next( createHttpStatus( badRequest, invalidOrderStatusReferenceToShip ) )

    if ( !req.body?.dados?.formaFrete?.length ) return next( createHttpStatus( badRequest, invalidTrackingFields ) )

    if ( !req.body?.dados?.urlRastreio?.length ) return next( createHttpStatus( badRequest, invalidTrackingFields ) )

    req.order = order

    next()
}
