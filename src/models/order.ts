//
//      Interface Order
//

import { HUB2B_Order } from "./hub2b"

export interface Order {
    _id?: any,
    shop_id: any,
    order: HUB2B_Order,
    tenant?: Tenant_Order,
    tiny_order_id?: any,
    meta?: {
        approved_at?: string,
        invoiced_at?: string,
        shipped_at?: string,
        delivered_at?: string
    }
}

export interface OrderIntegration {
    _id?: any,
    lastUpdate: string,
    updateFrom: string,
    updateTo: string,
}

export interface Tenant_Order {
    id: any,
    order: any,
}
