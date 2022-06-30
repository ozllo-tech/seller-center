//
//      Order Event Manager
//

import events from 'events'
import { Order } from '../models/order'
import { sendOrderEmailToSeller } from '../services/mailService'
import { sendOrderToTenant } from '../services/orderService'
import { sendTinyOrder, updateTinyOrderStatus } from '../services/tiny2HubService'
import { log } from '../utils/loggerUtil'

const orderEventEmitter = new events.EventEmitter()

orderEventEmitter.on( 'updated', ( order: Order, status ) => {

    log( `Order ${order.order.reference.id} has changed to ${status}.`, 'EVENT', 'onOrderUpdatedEvent', 'INFO' )

    updateTinyOrderStatus( order )

})

orderEventEmitter.on( 'approved', ( order: Order ) => {

    sendOrderEmailToSeller( order )

    log( `Order ${order.order.reference.id} is now approved.`, 'EVENT', 'onOrderApprovedEvent', 'INFO' )

})

orderEventEmitter.on( 'invoiced', ( orderId, invoice ) => {

    log( `Order ${orderId} has been invoiced.`, 'EVENT', 'onOrderInvoicedEvent', 'INFO' )

})

orderEventEmitter.on( 'shipped', ( orderId, tracking ) => {

    log( `Order ${orderId} has been shipped.`, 'EVENT', 'onOrderShippedEvent', 'INFO' )

})

orderEventEmitter.on( 'delivered', ( orderId, status ) => {

    log( `Order ${orderId} has been delivered.`, 'EVENT', 'onOrderDeliveredEvent', 'INFO' )

})

orderEventEmitter.on( 'new_from_tenant', ( order, tenantID ) => {

    sendOrderToTenant( order.order, tenantID )

})

orderEventEmitter.on( 'new_from_system', ( order, system ) => {

    if ( 'tiny' === system.name ) sendTinyOrder( order, system.data.token )

})

export default orderEventEmitter
