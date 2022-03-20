//
//      Order Event Manager
//

import events from 'events'
import { Order } from '../models/order'
import { findIntegrationOrder } from '../services/integrationService'
import { sendOrderEmailToSeller } from '../services/mailService'
import { sendOrderToTenant } from '../services/orderService'
import { updateTinyOrderStatus } from '../services/systemTinyService'
import { log } from '../utils/loggerUtil'

const orderEventEmitter = new events.EventEmitter()

orderEventEmitter.on('updated', (order: Order, status) => {

    log(`Order ${order.order.reference.id} has changed to ${status}.`, 'EVENT', 'onOrderUpdatedEvent', 'INFO')

    updateTinyOrderStatus(order)

})

orderEventEmitter.on('approved', ( order ) => {

    sendOrderEmailToSeller(order.shop_id)

    log(`Order ${order.order.reference.id} is now approved.`, 'EVENT', 'onOrderApprovedEvent', 'INFO' )

})

orderEventEmitter.on('invoiced', (orderId, invoice) => {

    log(`Order ${orderId} has been invoiced.`, 'EVENT', 'onOrderInvoicedEvent', 'INFO')

})

orderEventEmitter.on('shipped', ( orderId, tracking ) => {

    log(`Order ${orderId} has been shipped.`, 'EVENT', 'onOrderShippedEvent', 'INFO')

})

orderEventEmitter.on('delivered', (orderId, status) => {

    log(`Order ${orderId} has been delivered.`, 'EVENT', 'onOrderDeliveredEvent', 'INFO')

})

orderEventEmitter.on('new', (order, tenantID) => {

    sendOrderToTenant(order.order, tenantID)

    findIntegrationOrder(order)

})

export default orderEventEmitter
