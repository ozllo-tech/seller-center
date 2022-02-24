//
//      Product Event Manager
//

import events from 'events'
import { Product, Variation } from '../models/product'
import { criarProdutoHub2b, deleteProdutoHub2b, parseProdutoToProdutoHub2, updatePriceHub2b, updateProdutoHub2b, updateStockHub2b } from '../services/hub2bService'
import { log } from '../utils/loggerUtil'

const productEventEmitter = new events.EventEmitter()

productEventEmitter.on( 'create', ( product: Product, idTenant: any ) => {

    log( `Criando produto ${ product._id } na hub2b.`, 'EVENT', 'ProductEventEmitter' )

    criarProdutoHub2b( parseProdutoToProdutoHub2( product ), idTenant )
} )

productEventEmitter.on( 'update', ( product: Product, idTenant: any ) => {

    log( `Updating produto ${ product._id } na hub2b.`, 'EVENT', 'ProductEventEmitter' )

    updateProdutoHub2b( parseProdutoToProdutoHub2( product ), idTenant )

} )

productEventEmitter.on( 'delete', ( productId: any, idTenant: any ) => {

    log( `Deletando produto ${ productId } na hub2b.`, 'EVENT', 'ProductEventEmitter' )

    deleteProdutoHub2b( productId, idTenant )

})

productEventEmitter.on( 'update_stock', ( variation: Variation ) => {

    log( `Updating stock from SKU ${ variation._id } in HUB2B.`, 'EVENT', 'ProductEventEmitter' )

    updateStockHub2b( variation._id, Number(variation.stock ))

})

productEventEmitter.on( 'update_price', ( product: Product ) => {

    log( `Updating price produto ${ product._id } na hub2b.`, 'EVENT', 'ProductEventEmitter' )

    product.variations && Array.isArray( product.variations ) && product.variations.forEach( variation => {
        updatePriceHub2b( variation._id, product.price, product.price_discounted )
    } )

} )

export default productEventEmitter
