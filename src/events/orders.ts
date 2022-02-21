//
//      Order Event Manager
//

import events from 'events'
import { postInvoiceHub2b, updateStatusHub2b } from '../services/hub2bService'
import { sendOrderEmailToSeller } from '../services/mailService'
import { sendOrderToTenant, sendTracking } from '../services/orderService'
import { log } from '../utils/loggerUtil'

const orderEventEmitter = new events.EventEmitter()

orderEventEmitter.on('updated', (orderId,status) => log(`Atualizando status do pedido ${orderId} para ${status}`,'EVENT', 'onOrderUpdatedEvent', 'INFO'))

orderEventEmitter.on( 'approved', ( order ) => {

    sendOrderEmailToSeller(order.shop_id)

    log(`Order ${order.order.reference.id} is now approved.`, 'EVENT', 'onOrderApprovedEvent', 'INFO' )
})

orderEventEmitter.on( 'invoiced', ( orderId, invoice ) => postInvoiceHub2b(orderId, invoice ) )

orderEventEmitter.on( 'shipped', ( orderId, tracking ) => sendTracking(orderId, tracking ) )

orderEventEmitter.on('delivered', (orderId, status) => updateStatusHub2b(orderId, status) )

orderEventEmitter.on('integration', (order, tenantID) => sendOrderToTenant(order.order, tenantID))

export default orderEventEmitter
