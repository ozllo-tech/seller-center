//
//      Order Service
//

import { HUB2B_Order, HUB2B_Invoice, HUB2B_Tracking, HUB2B_Integration, HUB2B_Order_Webhook, HUB2B_Status, HUB2B_Product_Order } from "../models/hub2b"
import { Order, OrderIntegration } from "../models/order"
import { findLastIntegrationOrder, findOrderByShopId, newIntegrationHub2b, newOrderHub2b, findOneOrderAndModify } from "../repositories/orderRepository"
import { HUB2B_MARKETPLACE, HUB2B_TENANT, PROJECT_HOST } from "../utils/consts"
import { log } from "../utils/loggerUtil"
import { getFunctionName, nowIsoDateHub2b } from "../utils/util"
import { listAllOrdersHub2b, listOrdersHub2bByTime, postInvoiceHub2b, postTrackingHub2b, getTrackingHub2b, setupIntegrationHub2b, getInvoiceHub2b, getOrderHub2b, postOrderHub2b, updateStatusHub2b } from "./hub2bService"
import { findProductByVariation, updateStockByQuantitySold } from "./productService"
import { getToken } from "../utils/cryptUtil"
import orderEventEmitter from "../events/orders"
import { findTenantfromShopID } from "./hub2bTenantService"
import { renewAccessTokenHub2b } from "./hub2bAuhService"
import { ObjectID } from "mongodb"
import { findIntegrationOrder } from "./integrationService"
import { updateTiny2HubOrderStatus } from "./tiny2HubService"

export const INTEGRATION_INTERVAL = 1000 * 60 * 60 // 1 hour

export const integrateHub2bOrders = async (start?: string, end?: string) => {

    let ordersList

    let lastOrderIntegration: OrderIntegration | null = null

    if (start && end) {

        ordersList = await listOrdersHub2bByTime(start, end)

        lastOrderIntegration = {
            lastUpdate: end,
            updateFrom: start,
            updateTo: end,
        }

        return saveIntegration(lastOrderIntegration, ordersList)
    }

    lastOrderIntegration = await findLastIntegrationOrder()

    const now = nowIsoDateHub2b()

    if (lastOrderIntegration) {

        ordersList = await listOrdersHub2bByTime(lastOrderIntegration.lastUpdate, now)

        if (!ordersList || ordersList.length === 0) return

        lastOrderIntegration = {
            lastUpdate: now,
            updateFrom: lastOrderIntegration.lastUpdate,
            updateTo: now,
        }

    } else {

        ordersList = await listAllOrdersHub2b()

        if (!ordersList || ordersList.length === 0) return

        const firstDate = ordersList[0].createdDate

        const lastDate = ordersList[ordersList.length - 1].createdDate

        lastOrderIntegration = {
            lastUpdate: lastDate,
            updateFrom: firstDate,
            updateTo: lastDate
        }

    }

    return saveIntegration(lastOrderIntegration, ordersList)
}

export const saveIntegration = async (orderIntegration: OrderIntegration, ordersList: []) => {

    if (!ordersList) return

    log(`Integrating orders from ${orderIntegration.updateFrom} to ${orderIntegration.updateTo}`, 'EVENT', getFunctionName())

    saveOrders(ordersList)

    newIntegrationHub2b(orderIntegration)
}

/**
 * List all orders from a shop
 *
 * @param shop_id Shop ID
 */
export const findOrdersByShop = async (shop_id: string): Promise<Order[] | null> => {

    const orders = await findOrderByShopId(shop_id)

    orders
        ? log(`Listing orders from ` + shop_id, 'EVENT', getFunctionName())
        : log(`Could not retrieve orders.`, 'EVENT', getFunctionName())

    return orders
}

/**
 * Save a list of orders
 *
 * @param shop_id Shop ID
 */
export const saveOrders = async (orderList: HUB2B_Order[]) => {

    for (let i = 0; i < orderList.length; i++) {

        const orderHub2 = orderList[i]

        if (!ObjectID.isValid(orderHub2.products[0].sku)) continue

        const product = await findProductByVariation(orderHub2.products[0].sku)

        let shop_id = 'limbo'

        if (product && product.shop_id)
            shop_id = product.shop_id.toString()

        savNewOrder(shop_id, orderHub2)

    }
}

export const savNewOrder = async (shop_id: string, order: HUB2B_Order) => {

    const shop_orders = await findOrderByShopId(shop_id)

    if (!Array.isArray(shop_orders)) return

    for (let i = 0; i < shop_orders.length; i++) {

        const orderStatus = order.status.status

        const orderId = order.reference.id

        const shopOrderStatus = shop_orders[i].order.status.status

        const shopOrderId = shop_orders[i].order.reference.id || 0

        if (orderId == shopOrderId && orderStatus != shopOrderStatus) {

            updateStatus(shopOrderId.toString(), orderStatus)
        }
    }

    if (shop_orders.filter(_order => _order.order.reference.id == order.reference.id).length) return

    const newOrder = await newOrderHub2b({ order, shop_id })

    newOrder
        ? log(`Order ${order.reference.id} saved.`, 'EVENT', getFunctionName())
        : log(`Could not save order ${order.reference.id}.`, 'EVENT', getFunctionName(), 'ERROR')

    if (newOrder) {

        const tenant = await findTenantfromShopID(newOrder.shop_id)

        if (tenant) return orderEventEmitter.emit('new_from_tenant', newOrder, tenant.idTenant)

        const system = await findIntegrationOrder(newOrder)

        if (system) return orderEventEmitter.emit('new_from_system', newOrder, system)
    }
}

export const sendInvoice = async (order: any, data: any) : Promise<HUB2B_Invoice | null> => {

    const invoice: HUB2B_Invoice = {
        issueDate: data.issueDate || nowIsoDateHub2b(),
        key: data.key,
        number: data.number,
        cfop: data.cfop,
        series: data.series,
        totalAmount: order.payment.totalAmount,
    }

    // TODO: maybe check if product has available stock before send invoice.

    const res = await postInvoiceHub2b(order.reference.id, invoice, false)

    if (res) {

        const status: HUB2B_Status = {
            status: 'Invoiced',
            updatedDate: nowIsoDateHub2b(),
            active: true,
            message: ''
        }

        await findOneOrderAndModify("order.reference.id", order.reference.id, { "order.status": status })

        // Foreach SKU in order, decrease stock by quantity sold.
        order.products.forEach((product:HUB2B_Product_Order) => updateStockByQuantitySold(product.sku, product.quantity))

    }

    res
        ? log(`Invoice sent`, 'EVENT', getFunctionName())
        : log(`Could not send invoice.`, 'EVENT', getFunctionName(), 'ERROR')

    return res
}

export const sendTracking = async (order_id: string, data: any): Promise<HUB2B_Tracking | null> => {

    const tracking: HUB2B_Tracking = {
        code: data.code,
        url: data.url,
        shippingDate: data.shippingDate,
        shippingProvider: data.shippingProvider,
        shippingService: data.shippingService
    }

    const orderTracking = await postTrackingHub2b(order_id, tracking, false)

    if (orderTracking) {

        const status: HUB2B_Status = {
            status: 'Shipped',
            updatedDate: nowIsoDateHub2b(),
            active: true,
            message: ''
        }

        await findOneOrderAndModify("order.reference.id", order_id, { "order.status": status })

    }

    orderTracking
        ? log(`Tracking sent`, 'EVENT', getFunctionName())
        : log(`Could not send tracking`, 'EVENT', getFunctionName(), 'ERROR')

    return orderTracking
}

export const retrieveTracking = async (order_id: string): Promise<HUB2B_Tracking | null> => {

    const orderTracking = await getTrackingHub2b(order_id)

    orderTracking
        ? log(`Tracking retrieved`, 'EVENT', getFunctionName())
        : log(`Could not retrieve tracking`, 'EVENT', getFunctionName(), 'ERROR')

    return orderTracking
}

export const retrieveInvoice = async (order_id: string): Promise<HUB2B_Order | null> => {

    const invoice = await getInvoiceHub2b(order_id)

    invoice
        ? log(`Invoice from order ${order_id} retrieved`, 'EVENT', getFunctionName(), 'INFO')
        : log(`Could not retrieve order ${order_id} invoice`, 'EVENT', getFunctionName(), 'ERROR')

    return invoice
}

export const setupWebhookIntegration = async(): Promise<HUB2B_Order_Webhook | null> => {
    const integration : HUB2B_Integration = {
        system: "ERPOrdersNotification",
        idTenant: Number(HUB2B_TENANT),
        responsibilities: [
            {
                type: "Orders",
                flow: "HubTo"
            }
        ],
        apiKeys: [
            {
                key: "URL_ERPOrdersNotification",
                value: PROJECT_HOST + "/integration/order"
            },
            {
                key: "authToken_ERPOrdersNotification",
                value: getToken('hub2b')
            },
            {
                key: "AuthKey_ERPOrdersNotification",
                value: "Authorization"
            },
            {
                key: "HUB_ID_ERPOrdersNotification",
                value: HUB2B_TENANT
            }
        ]
    }

    const setup = await setupIntegrationHub2b(integration, 'POST')

    if (!setup) return await setupIntegrationHub2b(integration, 'PUT')

    return setup
}

export const updateStatus = async (order_id: string, status: string) => {

    const orderHub2b: HUB2B_Order = await getOrderHub2b(order_id)

    const fields = { "order.status.status": status, "order.status.updatedDate": nowIsoDateHub2b() }

    const update = await findOneOrderAndModify("order.reference.id", order_id, fields) // update.value = Order

    if (!update?.value && orderHub2b) saveOrders([orderHub2b]) // Check if this is a new order and save it.

    if (!update?.value) return update

    const order = update.value

    if (order) orderEventEmitter.emit('updated', order, status)

    if ("Approved" == status) orderEventEmitter.emit('approved', order)

    if ("Delivered" == status) {

        const status: HUB2B_Status = {
            active: true,
            message: '',
            status: 'Completed',
            updatedDate: nowIsoDateHub2b()
        }

        orderEventEmitter.emit('delivered', order_id, status)
    }

    await syncIntegrationOrderStatus(order, status)

    if (status !== orderHub2b.status.status && order?.tiny_order_id) updateTiny2HubOrderStatus(order_id, status)

    return update
}

export const sendOrderToTenant = async (order: HUB2B_Order, tenantID: any): Promise<HUB2B_Order | null> => {

    await renewAccessTokenHub2b(false, tenantID)

    order.reference.system.source = HUB2B_MARKETPLACE

    order.reference.idTenant = tenantID

    for (const [index, item] of order.products.entries()) {

        const product = await findProductByVariation(item.sku)

        order.products[index].sku = product?._id?.toString()
    }

    const orderID = order.reference.id

    delete order.reference.id

    const orderHub2b = await postOrderHub2b(order)

    if (orderHub2b) {

        const fields = {
            tenant : {
                id: tenantID,
                order: orderHub2b.reference.id,
            }
        }

        await findOneOrderAndModify('order.reference.id', orderID, fields)
    }

    orderHub2b
        ? log(`Order ${orderID} sent to tenant ${tenantID} as ${orderHub2b.reference.id}`, 'EVENT', getFunctionName())
        : log(`Could not send order ${orderID} to tenant ${tenantID}`, 'EVENT', getFunctionName(), 'ERROR')

    return order
}

export const syncIntegrationOrderStatus = async (order: Order, status: string) => {

    if (!order?.tenant) return null

    const order_id = order.order.reference.id?.toString()

    if (!order_id) return null

    const orderHub2b: HUB2B_Order = await getOrderHub2b(order.tenant.order, order.tenant.id)

    if (!orderHub2b) return null

    if ("Invoiced" == status && "Approved" == orderHub2b.status.status) {

        const invoice = await getInvoiceHub2b(order_id)

        if (!invoice) {

            log(`Could not retrieve invoice for order ${order_id}`, 'EVENT', getFunctionName(), 'ERROR')

            return null
        }

        const invoiced = await postInvoiceHub2b(order.tenant.order, invoice, order.tenant.id)

        if (invoiced) return orderEventEmitter.emit('invoiced', order.tenant.order, invoiced)
    }

    if ("Shipped" == status && "Invoiced" == orderHub2b.status.status) {

        const tracking = await getTrackingHub2b(order_id)

        if (!tracking) {

            log(`Could not retrieve tracking for order ${order_id}`, 'EVENT', getFunctionName(), 'ERROR')

            return null
        }

        const tracked = await postTrackingHub2b(order.tenant.order, tracking, order.tenant.id)

        if (tracked) return orderEventEmitter.emit('shipped', order.tenant.order, tracked)
    }

    // TODO: review this segmment. It's a mess!

    if (status !== orderHub2b.status.status && !order.tiny_order_id) {

        const updated = await updateStatusHub2b(order.tenant.order, order.order.status)

        if (updated) orderEventEmitter.emit('updated', order, status)

        updated
            ? log(`Order ${order_id} is in sync with order ${order.tenant.order} from tenant ${order.tenant.id}.`, 'EVENT', getFunctionName())
            : log(`Couldn't sync order ${order_id} with order ${order.tenant.order} from tenant ${order.tenant.id}.`, 'EVENT', getFunctionName(), 'ERROR')
    }
}
