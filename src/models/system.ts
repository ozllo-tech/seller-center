export interface BSELLER {
    api_key: string,
}

export interface IDEALEWARE {
    domain: string,
    user_email: string,
    user_password: string,
}

export interface IHUB {
    host: string,
    jwt: string,
    seller_id: string,
}

export interface INFRACOMMERCE {
    store_name: string,
    domain: string,
    user_email: string,
    password: string,
}

export interface LOJA_INTEGRADA {
    api_key: string,
}

export interface MAGENTO {
    url_v1: string,
    user_id: string,
    api_key: string,
    website_id: string,
    store_view: string,
}

export interface MAGENTO_2 {
    token: string,
    domain: string,
}

export interface OPENCART {
    store_domain: string,
    rest_admin: string,
}

export interface TRAY {
    url: string
}

export interface VTEX {
    url: string,
    admin_app_key: string,
    admin_api_token: string,
    seller_id: string,
    sales_policy_id: string,
    warehouse_id?: string,
}

export interface BLING {
    api_key: string,
}

export interface ECCOSYS {
    url: string,
    api_key: string,
    secret_key: string,
    store_url: string,
}

export interface LINX_EMILLENIUM {
    store_url: string,
    user_name: string,
    password: string,
    showcase: string,
    wts_type?: string,
}

export interface LINX_COMMERCE {
    user_name: string,
    user_password: string,
}

export interface LINX_OMS {
    user_name: string,
    user_password: string,
    domain: string,
    client_id: string,
    channel_id: string,
}

export interface SOFTVAR {
    api_key: string,
    user_id: string,
    store_payload_id: string,
    store_stock_id: string,
}

export interface TINY {
    token: string,
    ecommerce_id: string,
}

export interface WOOCOMMERCE {
    store_url: string,
    key: string,
    secret: string,
}

export type SystemName = 'bseller' | 'idealeware' | 'ihub' | 'infracommerce' | 'loja_integrada' | 'magento' | 'magento_2' | 'opencart' | 'tray' | 'vtex' | 'bling' | 'eccosys' | 'linx_emillenium' | 'linx_commerce' | 'linx_oms' | 'softvar' | 'tiny' | 'woocommerce'

export interface System_Integration {
    shop_id: string,
    name: SystemName,
    data: BSELLER | IDEALEWARE | IHUB | INFRACOMMERCE | LOJA_INTEGRADA | MAGENTO | MAGENTO_2 | OPENCART | TRAY | VTEX | BLING | ECCOSYS | LINX_EMILLENIUM | LINX_COMMERCE | LINX_OMS | SOFTVAR | TINY | WOOCOMMERCE,
    active: boolean,
}
