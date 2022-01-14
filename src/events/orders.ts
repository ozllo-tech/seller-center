//
//      Order Event Manager
//

import events from 'events'
import { postInvoiceHub2b, updateStatusHub2b } from '../services/hub2bService'
import { sendTracking } from '../services/orderService'
import { log } from '../utils/loggerUtil'
import { getFunctionName } from '../utils/util'

const orderEventEmitter = new events.EventEmitter()

orderEventEmitter.on('updated', (orderId,status) => log(`Atualizando status do pedido ${orderId} para ${status}`,'EVENT', getFunctionName(), 'INFO'))

// Notify Seller by email.
orderEventEmitter.on( 'approved', ( orderId ) => {
    log( `Order ${orderId} is now approved.`, 'EVENT', getFunctionName(), 'INFO' )
})

orderEventEmitter.on( 'invoiced', ( orderId, invoice ) => postInvoiceHub2b(orderId, invoice ) )

orderEventEmitter.on( 'shipped', ( orderId, tracking ) => sendTracking(orderId, tracking ) )

orderEventEmitter.on('delivered', (orderId, status) => updateStatusHub2b(orderId, status) )

export default orderEventEmitter
