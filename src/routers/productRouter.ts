//
//      Rota de produtos
//

import { Router, Request, Response } from 'express'
import { findPaginatedProductsByShopId } from '../repositories/productRepository'
import { getAdsByProduyct } from '../services/adService'
import { createNewVariation, createProduct, updateProduct, updateProductImages, updateProductPrice, updateProductVariation, updateProductVariationStock, deleteProduct, deleteVariationById } from '../services/productService'
import { importProduct } from '../services/tenant2HubService'
import { uploadProductPicture } from '../services/uploadService'
import { badRequest, createHttpStatus, internalServerError, noContent, ok } from '../utils/httpStatus'
import { log } from '../utils/loggerUtil'
import { isProductFromShop, isVariationFromProduct } from '../utils/middlewares'
import { isNewProductValid, isNewVariationValid, isProductImagesPatchValid, isProductPatchValid, isProductPricePatchValid, isProductStockPatchValid, isVariationPatchValid } from '../validations/productValidation'
const router = Router()

const uploadMultiple = uploadProductPicture.array( 'images', 6 )

/**
 * POST -> Send images to S3 and return the file location
 */
router.post( '/upload', async ( req, res ) => {
    try {
        uploadMultiple( req, res, err => {

            if ( err ) return log( err.message, 'EVENT', 'UPLOAD', 'ERROR' )

            const filesLocation: string[] = []

            if ( Array.isArray( req.files ) )
                req.files.forEach( ( file: any ) => {
                    filesLocation.push( file.location )
                })

            return res.send({
                message: 'Successfully uploaded ' + req.files?.length + ' files!',
                urls: filesLocation
            })
        })
    } catch ( error ) {
        return res.send({
            message: 'Erro trying to upload ' + req.files?.length + ' files!',
            error
        })
    }
})

/**
 * POST -> cria um novo produto vinculado a loja
 */
router.post( '/', async ( req: Request, res: Response ) => {

    const body = req.body

    const errors = await isNewProductValid( body )

    if ( errors.length > 0 )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest, errors ) )

    body.shop = req.shop?._id

    const product = await createProduct( body )

    if ( !product )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( product )
})

router.delete( '/:product_id', isProductFromShop, async ( req: Request, res: Response ) => {

    const result = await deleteProduct( req.params.product_id )

    if ( !result )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( result )

})

/**
 * GET -> produto details
 */
router.get( '/:product_id', isProductFromShop, async ( req: Request, res: Response ) => {

    return res
        .status( ok.status )
        .send( req.product )
})

/**
 * PATCH -> atualiza produto
 */
router.patch( '/:product_id', isProductFromShop, async ( req: Request, res: Response ) => {

    const body = req.body

    const product_id = req.product?._id

    const errors = await isProductPatchValid( body )

    if ( errors.length > 0 )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest, errors ) )

    const product = await updateProduct( product_id, body )

    if ( !product )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( product )
})

/**
 * PATCH -> atualiza imagens do produto
 */
router.patch( '/:product_id/images', isProductFromShop, async ( req: Request, res: Response ) => {

    const body = req.body

    const product_id = req.product?._id

    const errors = await isProductImagesPatchValid( body )

    if ( errors.length > 0 )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest, errors ) )

    const product = await updateProductImages( product_id, body )

    if ( !product )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( product )
})

/**
 * PATCH -> atualiza preço produto
 */
router.patch( '/:product_id/price', isProductFromShop, async ( req: Request, res: Response ) => {

    const body = req.body

    const product_id = req.product?._id

    const errors = await isProductPricePatchValid( body )

    if ( errors.length > 0 )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest, errors ) )

    const product = await updateProductPrice( product_id, body )

    if ( !product )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( product )
})

/**
 * GET -> variação do produto
 */
router.get( '/:product_id/variation/:variation_id', isProductFromShop, isVariationFromProduct, async ( req: Request, res: Response ) => {

    if ( !req.product || !req.variation )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    req.product.variations = [req.variation]

    return res
        .status( ok.status )
        .send( req.product )
})

/**
 * POST -> cria variação do produto
 */
router.post( '/:product_id/variation', isProductFromShop, async ( req: Request, res: Response ) => {

    const body = req.body

    body.product_id = req.product?._id

    const errors = await isNewVariationValid( body )

    if ( errors.length > 0 )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest, errors ) )

    const variation = await createNewVariation( body )

    if ( !variation )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( variation )
})

/**
 * PATCH -> atualiza variação do produto
 */
router.patch( '/:product_id/variation/:variation_id', isProductFromShop, isVariationFromProduct, async ( req: Request, res: Response ) => {

    const body = req.body

    const variation_id = req.params.variation_id

    const errors = await isVariationPatchValid( body )

    if ( errors.length > 0 )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest, errors ) )

    const product = await updateProductVariation( variation_id, body )

    if ( !product )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( product )
})

/**
 * PATCH -> atualiza estoque da variação
 */
router.patch( '/:product_id/variation/:variation_id/stock', isProductFromShop, isVariationFromProduct, async ( req: Request, res: Response ) => {

    const body = req.body

    const variation_id = req.params.variation_id

    const errors = await isProductStockPatchValid( body )

    if ( errors.length > 0 )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest, errors ) )

    const product = await updateProductVariationStock( variation_id, body )

    if ( !product )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( product )
})

/**
 * DELETE -> Exclui variação do produto
 */
router.delete( '/:product_id/variation/:variation_id', isProductFromShop, isVariationFromProduct, async ( req: Request, res: Response ) => {

    if ( !req.product || !req.variation )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    const result = await deleteVariationById( req.variation._id )

    if ( !result )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( result )
})

/**
 * GET -> Retrieve all products for a given shop
 */
router.get( '/', async ( req: Request, res: Response ) => {

    const page = Number( req.query.page ) || 1

    const limit = Number( req.query.limit ) || 300

    const search = req.query.search?.toString() || ''

    const products = await findPaginatedProductsByShopId( req.shop?._id, page, limit, search )

    if ( !products )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( products.total > 0 ? ok.status : noContent.status )
        .send( products )
})

/**
 * POST -> importa produtos cadastrados na hub2b
 */
router.post( '/import/hub2b/:shop_id/:tenant_id', async ( req: Request, res: Response ) => {

    const tenant_id = req.params.tenant_id
    const shop_id = req.params.shop_id

    if ( !tenant_id || !shop_id )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest ) )

    const products = await importProduct( tenant_id, shop_id )

    if ( !products )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( products )
})


router.get( '/:id/ad', async ( req: Request, res: Response ) => {

    const ad = await getAdsByProduyct( req.params.id )

    if ( !ad )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )

    return res
        .status( ok.status )
        .send( ad )

})

export { router as productRouter }
