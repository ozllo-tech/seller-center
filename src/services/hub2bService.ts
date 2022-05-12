//
//      HUB2B Service
//

import axios, { Method } from "axios"
import { HUB2B_Invoice, HUB2B_Product, HUB2B_Status, HUB2B_Tracking, HUB2B_Order, HUB2B_Integration, HUB2B_Catalog_Product } from "../models/hub2b"
import { Product } from "../models/product"
import { SALES_CHANNEL_HUB2B } from "../models/salesChannelHub2b"
import { findTenantCredential } from "../repositories/hub2TenantCredentialRepository"
import { HUB2B_ACCESS_KEY_V1, HUB2B_URL_V2, PROJECT_HOST, HUB2B_TENANT, HUB2B_URL_V1, HUB2B_MARKETPLACE, HUB2B_SALES_CHANEL } from "../utils/consts"
import { log } from "../utils/loggerUtil"
import { getFunctionName, logAxiosError, logResponse, nowIsoDate, waitforme } from "../utils/util"
import { HUB2B_CREDENTIALS, renewAccessTokenHub2b, TENANT_CREDENTIALS } from "./hub2bAuhService"

// Default
export const HUB2B_DEFAULT_HEADERS = {
    'Content-Type': 'application/json'
}

// API v1 -- Integração de produtos e categorias
export const HUB2B_HEADERS_V1 = {
    ...HUB2B_DEFAULT_HEADERS,
    "auth": HUB2B_ACCESS_KEY_V1
}

// API v2 -- Integração de preço/estoque e pedidos

export const optionsV2 = {
    grant_type: "password",
    scope: "inventory orders catalog agency"
}

export const requestHub2B = async (URL: string, type?: Method, body?: any, headers?: any) => {

    if (!type) type = 'GET'

    if (!headers) headers = { headers: HUB2B_DEFAULT_HEADERS }

    try {

        const response = await axios({
            method: type,
            url: URL,
            data: body,
            headers
        })

        response
            ? log("Request success", "EVENT", getFunctionName(3))
            : log("Request failed", "EVENT", getFunctionName(3), "WARN")

        return response

    } catch (error) {

        if (axios.isAxiosError(error)) {
            log(error.response?.data?.errors, "EVENT", getFunctionName(), "ERROR")
            logAxiosError(error)
        }

        if (error instanceof Error) {
            log(error.message, "EVENT", getFunctionName(3), "ERROR")
        }

        if (axios.isAxiosError(error)) {
            error.response?.data?.error &&
                log(error.response?.data?.error, "EVENT", getFunctionName(3), "ERROR")
            error.response?.data?.error_description &&
                log(error.response?.data?.error_description, "EVENT", getFunctionName(3), "ERROR")
            error.response?.data?.message &&
                log(error.response?.data?.message, "EVENT", getFunctionName(3), "ERROR")
            error.response?.data?.errors &&
                log(error.response?.data?.errors, "EVENT", getFunctionName(3), "ERROR")
        }

        return null
    }
}

export const setupIntegrationHub2b = async (integration: HUB2B_Integration, method: Method, idTenant: any = false) => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const accessToken = idTenant ? TENANT_CREDENTIALS.access_token : HUB2B_CREDENTIALS.access_token

    const SETUP_URL = `${HUB2B_URL_V2}/Setup/integration?access_token=${accessToken}`

    const response = await requestHub2B(SETUP_URL, method, integration)

    if (!response) return null

    const setup = response.data

    setup
        ? log("Setup realizado com sucesso", "EVENT", getFunctionName())
        : log("Não foi passível obter o token de acesso", "EVENT", getFunctionName(), "WARN")

    return setup
}

export const getHub2bIntegration = async (system: string, idTenant: any = false) => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const accessToken = idTenant ? TENANT_CREDENTIALS.access_token : HUB2B_CREDENTIALS.access_token

    const INTEGRATION_URL = `${HUB2B_URL_V2}/Setup/integration/${idTenant}?access_token=${accessToken}`

    const response = await requestHub2B(INTEGRATION_URL, 'GET', null, {system: system})

    if (!response) return null

    return response.data
}

export const parseProdutoToProdutoHub2 = (produto: Product): HUB2B_Product[] => {

    const produtosHub2b: HUB2B_Product[] = []

    const imageList = produto.images.map(url => {
        return { url }
    })

    produto.variations?.forEach(variation => {

        const _variation: any = { ...variation }

        if (_variation._id) delete _variation._id

        if (_variation.stock) delete _variation.stock

        if (_variation.product_id) delete _variation.product_id

        const attributes: { name: string, value: string, type: number }[] = []

        for (const [key, value] of Object.entries<string>(_variation)) {

            attributes.push({ name: key, value: value, type: 2 })
        }

        const productHub2: HUB2B_Product = {
            sku: variation._id.toString(),
            parentSKU: produto._id.toString(),
            ean13: produto.ean,
            warrantyMonths: 3,
            handlingTime: 2,
            stock: `${variation.stock}`,
            weightKg: `${produto.weight / 1000}`,
            url: `${PROJECT_HOST}/product/${variation._id.toString()}`,
            sourceId: variation._id.toString(),
            categoryCode: `${produto.subcategory}`,
            name: produto.name,
            sourceDescription: produto.description,
            description: produto.description,
            brand: produto.brand,
            videoURL: "",
            ncm: "",
            idProductType: 1,
            idTypeCondition: 1,
            shippingType: "me1;me2",
            height_m: `${produto.height / 100}`,
            width_m: `${produto.width / 100}`,
            length_m: `${produto.length / 100}`,
            priceBase: `${produto.price}`,
            priceSale: `${produto.price_discounted ? produto.price_discounted : produto.price}`,
            images: [... new Set(imageList)],
            specifications: attributes
        }

        produtosHub2b.push(productHub2)
    })

    return produtosHub2b
}

export const criarProdutoHub2b = async ( hub2productList: HUB2B_Product[], idTenant: any ) => {

    const URL = HUB2B_URL_V1 + "/setsku/" + (idTenant || HUB2B_TENANT)

    await waitforme(1000)

    const response = await requestHub2B(URL, 'POST', hub2productList, HUB2B_HEADERS_V1)

    if (response?.data.error) {

        log("Não foi possível cadastrar produto no HUB2B", "EVENT", getFunctionName(), "WARN")

        return null
    }

    log("Produto cadastrado com sucesso no HUB2B", "EVENT", getFunctionName())

    response && logResponse(response)
}

export const updateProdutoHub2b = async ( patch: any[], idTenant: any ) => {

    const URL = HUB2B_URL_V1 + "/setsku/" + (idTenant || HUB2B_TENANT)

    await waitforme(1000)

    const response = await requestHub2B(URL, 'POST', patch, HUB2B_HEADERS_V1)

    if (!response) return null

    if (response?.data.error) {

        log("Não foi possível atualizar produto no HUB2B", "EVENT", getFunctionName(), "WARN")

        return null
    }

    log("Produto atualizado com sucesso no HUB2B", "EVENT", getFunctionName())

    response && logResponse(response)

}

export const deleteProdutoHub2b = async ( product_id: string, idTenant: any ) => {

    const URL = HUB2B_URL_V1 + "/removeproduct/" + (idTenant || HUB2B_TENANT)

    const body = SALES_CHANNEL_HUB2B.map(channel => {
        return {
            itemId: product_id,
            salesChannel: channel.code
        }
    })

    const response = await requestHub2B(URL, 'POST', body, HUB2B_HEADERS_V1)

    if (!response) return null

    if (response?.data.error) {

        log("Não foi possível deletar SKU na HUB2B", "EVENT", getFunctionName(), "WARN")

        return null
    }

    log("SKU deletado com sucesso na HUB2B", "EVENT", getFunctionName())

    response && logResponse(response)
}

export const updateHub2bSkuStatus = async (id: string, status: number, channel: number, idTenant = null) => {

    let HUB2B_TENANT_HEADERS_V1

    if (idTenant) {

        const credential = await findTenantCredential(idTenant)

        HUB2B_TENANT_HEADERS_V1 = {
            ...HUB2B_DEFAULT_HEADERS,
            "auth": credential?.apiV1.authToken
        }
    }

    const URL = HUB2B_URL_V1 + "/setproductstatus/" + idTenant || HUB2B_TENANT

    const body = [
        {
            'itemId': id,
            'salesChannel': channel,
            'status': status
        }
    ]

    const response = await requestHub2B(URL, 'POST', body, HUB2B_TENANT_HEADERS_V1 || HUB2B_HEADERS_V1)

    if (!response) return null

    if (response.data.error) {

        log("Não foi possível atualizar status do SKU na HUB2B", "EVENT", getFunctionName(), "WARN")

        return null
    }

    log("Status do SKU atualizado com sucesso na HUB2B", "EVENT", getFunctionName())

    response && logResponse(response)

}

export const getSKU = async ( sku: string, idTenant: any ) => {

    await renewAccessTokenHub2b(false, false)

    const URL_STOCK = `https://eb-api-sandbox.plataformahub.com.br/RestServiceImpl.svc/listskus/${(idTenant || HUB2B_TENANT) }?filter=sku:${ sku }`

    const response = await requestHub2B(URL_STOCK)

    if (!response) return null

    const product = response.data

    product
        ? log("Get List Orders success", "EVENT", getFunctionName())
        : log("Get List Orders error", "EVENT", getFunctionName(), "WARN")

    return product
}

export const getStockHub2b = async (sku: any, idTenant: any) => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const credential = idTenant ? TENANT_CREDENTIALS : HUB2B_CREDENTIALS

    const URL_STOCK = HUB2B_URL_V2 + `/inventory/${sku}/stocks` + "?access_token=" + credential.access_token

    const response = await requestHub2B(URL_STOCK)

    if (!response) return null

    const stock = response.data

    if (!stock) log(`Get stock from SKU ${sku} error`, "EVENT", getFunctionName(), "WARN")

    return stock[0]
}

export const updateStockHub2b = async (variation_id: any, stock: number) => {

    await renewAccessTokenHub2b(false, false)

    const URL_STOCK = HUB2B_URL_V2 + `/inventory/${variation_id}/stocks` + "?access_token=" + HUB2B_CREDENTIALS.access_token

    const body = {
        available: stock,
        warehouseId: 0
    }

    const response = await requestHub2B(URL_STOCK, 'PUT', body)

    if (!response) return null

    const update_stock = response.data

    if (!update_stock) log(`SKU ${variation_id} stock update fail`, "EVENT", getFunctionName(), "WARN")

    return update_stock
}

export const updatePriceHub2b = async (variation_id: any, price: number, price_discounted: number) => {

    await renewAccessTokenHub2b(false, false)

    const URL_PRICE = HUB2B_URL_V2 + `/inventory/${variation_id}/price` + "?access_token=" + HUB2B_CREDENTIALS.access_token

    const body = {
        base: price,
        sale: price_discounted
    }

    const response = await requestHub2B(URL_PRICE, 'PUT', body)

    if (!response) return null

    if (!response.data) log(`Could not update price from SKU ${variation_id}`, "EVENT", getFunctionName(), "WARN")

    return response.data
}

export const postOrderHub2b = async (order: HUB2B_Order, idTenant: number|string) => {

    await renewAccessTokenHub2b(false, idTenant)

    const URL_ORDERS = HUB2B_URL_V2 + "/Orders" + "?access_token=" + TENANT_CREDENTIALS.access_token

    const response = await requestHub2B(URL_ORDERS, 'POST', order)

    if (!response) return null

    const orderHub2b = response.data

    orderHub2b
        ? log(`Order sent`, "EVENT", getFunctionName())
        : log(`Can't sent order`, "EVENT", getFunctionName(), "WARN")

    return orderHub2b
}

export const getOrderHub2b = async (order_id: string, idTenant = false) => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const accessToken = idTenant ? TENANT_CREDENTIALS.access_token : HUB2B_CREDENTIALS.access_token

    const URL_ORDER = HUB2B_URL_V2 + "/Orders/" + order_id + "?access_token=" + accessToken

    const body = {}

    const response = await requestHub2B(URL_ORDER, 'GET', body)

    if (!response) return null

    const order = response.data

    if (!order) log(`Order ${order_id} could not be found.`, "EVENT", getFunctionName(), "WARN")

    return order
}

export const listOrdersHub2bByOrderNumbers = async (ordersNumber: string[]) => {

    await renewAccessTokenHub2b(false, false)

    let orderParam = ''

    for (const orderNumber of ordersNumber) {
        orderParam += orderNumber + ","
    }

    orderParam = orderParam.substring(0, orderParam.length - 1)

    const URL_ORDERS = HUB2B_URL_V2 + "/Orders" + "?number=" + orderParam + "&access_token=" + HUB2B_CREDENTIALS.access_token

    const response = await requestHub2B(URL_ORDERS)

    if (!response) return null

    const orders = response.data.response

    orders
        ? log("Get List Orders success", "EVENT", getFunctionName())
        : log("Get List Orders error", "EVENT", getFunctionName(), "WARN")

    return orders
}

export const listOrdersHub2bByTime = async (purchaseFrom: string, purchaseTo: string) => {

    await renewAccessTokenHub2b(false, false)

    const URL_ORDERS = HUB2B_URL_V2 + "/Orders" + "?purchaseFrom=" + purchaseFrom + "&purchaseTo=" + purchaseTo + "&access_token=" + HUB2B_CREDENTIALS.access_token

    const response = await requestHub2B(URL_ORDERS)

    if (!response) return null

    const orders = response.data.response

    if (!orders) log(`Could not get orders from ${purchaseFrom} to ${purchaseTo}`, "EVENT", getFunctionName(), "WARN")

    return orders
}

export const listAllOrdersHub2b = async (): Promise<HUB2B_Order[] | null> => {

    await renewAccessTokenHub2b(false, false)

    const URL_ORDERS = HUB2B_URL_V2 + "/Orders" + "?access_token=" + HUB2B_CREDENTIALS.access_token

    const response = await requestHub2B(URL_ORDERS)

    if (!response) return null

    const orders = response.data.response

    if (!orders) log("Get List Orders error", "EVENT", getFunctionName(), "WARN")

    return orders
}

export const postInvoiceHub2b = async (order_id: string, _invoice: any, idTenant: any) => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const accessToken = idTenant ? TENANT_CREDENTIALS.access_token : HUB2B_CREDENTIALS.access_token

    const URL_INVOICE = HUB2B_URL_V2 + `/Orders/${order_id}/Invoice` + "?access_token=" + accessToken

    const body = _invoice

    const response = await requestHub2B(URL_INVOICE, "POST", body)

    if (!response) return null

    const invoice = response.data

    invoice
        ? log("POST Invoice success", "EVENT", getFunctionName())
        : log("POST Invoice error", "EVENT", getFunctionName(), "WARN")

    return invoice
}

export const getInvoiceHub2b = async (order_id: string, idTenant = false) => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const accessToken = idTenant ? TENANT_CREDENTIALS.access_token : HUB2B_CREDENTIALS.access_token

    const URL_INVOICE = HUB2B_URL_V2 + `/Orders/${order_id}/Invoice` + "?access_token=" + accessToken

    const response = await requestHub2B(URL_INVOICE)

    if (!response) return null

    const invoice = response.data

    invoice
        ? log("Get Invoice success", "EVENT", getFunctionName())
        : log("Get Invoice error", "EVENT", getFunctionName(), "WARN")

    return invoice
}

// Não é permitido enviar os dados de rastreio sem antes ter enviado a nota fiscal.
export const postTrackingHub2b = async (order_id: string, _tracking: HUB2B_Tracking, idTenant: any) => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const accessToken = idTenant ? TENANT_CREDENTIALS.access_token : HUB2B_CREDENTIALS.access_token

    const URL_TRACKING = HUB2B_URL_V2 + `/Orders/${order_id}/Tracking` + "?access_token=" + accessToken

    const body = _tracking

    const response = await requestHub2B(URL_TRACKING, "POST", body)

    if (!response) return null

    const tracking = response.data

    tracking
        ? log("POST Tracking success", "EVENT", getFunctionName())
        : log("POST Tracking error", "EVENT", getFunctionName(), "WARN")

    return tracking
}

export const getTrackingHub2b = async (order_id: string, idTenant = false) => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const accessToken = idTenant ? TENANT_CREDENTIALS.access_token : HUB2B_CREDENTIALS.access_token

    const URL_TRACKING = HUB2B_URL_V2 + `/Orders/${order_id}/Tracking` + "?access_token=" + accessToken

    const response = await requestHub2B(URL_TRACKING)

    if (!response) return null

    const tracking = response.data

    tracking
        ? log("Get Tracking success", "EVENT", getFunctionName())
        : log("Get Tracking error", "EVENT", getFunctionName(), "WARN")

    return tracking
}

export const updateStatusHub2b = async (order_id: string, status: any, idTenant = false) => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const accessToken = idTenant ? TENANT_CREDENTIALS.access_token : HUB2B_CREDENTIALS.access_token

    const URL_STATUS = HUB2B_URL_V2 + `/Orders/${order_id}/Status` + "?access_token=" + accessToken

    const response = await requestHub2B(URL_STATUS, 'PUT', status)

    if (!response) return null

    response.data
        ? log(`Order ${order_id} status has been updated.`, "EVENT", getFunctionName())
        : log(`Could not update order ${order_id} status.`, "EVENT", getFunctionName(), "WARN")

    return response.data
}

export const getCatalogHub2b = async (status: string, offset: number,  idTenant: any): Promise<HUB2B_Catalog_Product[] | null> => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const accessToken = idTenant ? TENANT_CREDENTIALS.access_token : HUB2B_CREDENTIALS.access_token

    let CATALOG_URL = HUB2B_URL_V2
        + `/catalog/product/${HUB2B_MARKETPLACE}/${idTenant}`
        + `?access_token=${accessToken}`
        + `&idProductStatus=${status}`
        + `&onlyWithDestinationSKU=false`
        + `&offset=${offset}`

    if ('2' === status) CATALOG_URL += `&limit=10`

    const response = await requestHub2B(CATALOG_URL, 'GET')

    if (!response) return null

    const productsHub2b: HUB2B_Catalog_Product[] = response.data

    return productsHub2b
}

export const mapskuHub2b = async (data: any, idTenant: any) : Promise<any|null> => {

    idTenant
        ? await renewAccessTokenHub2b(false, idTenant)
        : await renewAccessTokenHub2b(false, false)

    const accessToken = idTenant ? TENANT_CREDENTIALS.access_token : HUB2B_CREDENTIALS.access_token

    const CATALOG_URL = HUB2B_URL_V2 + "/catalog/product/mapsku/" + HUB2B_SALES_CHANEL + "?access_token=" + accessToken

    const response = await requestHub2B(CATALOG_URL, 'POST', JSON.stringify(data), { "Content-type": "application/json" })

    if (!response) return null

    return response.data
}

export const getShippingLabel = async (orderChannelId: string) => {

    await renewAccessTokenHub2b(false, false)

    const URL_SHIPPING_LABEL = `${HUB2B_URL_V1}/shippinglabel/${HUB2B_TENANT}?order=${orderChannelId}`

    const response = await requestHub2B(URL_SHIPPING_LABEL, 'GET', null, HUB2B_HEADERS_V1)

    if (!response) return null

    response.data
        ? log("Get shipping label success", "EVENT", getFunctionName())
        : log("Get shipping label error", "EVENT", getFunctionName(), "WARN")

    return response.data
}

// #############################################################
// ##############           HOMOLOGAÇÃO         ################
// #############################################################

const sku = '60f761e79a36eb4e309d67bc'

const pedido1 = 'TESTE-637624551852328025'
const pedido2 = 'TESTE-637624551893312614'
const pedido3 = 'TESTE-637624551908384251'
const pedido4 = 'TESTE-637624551921954283'
const pedido5 = 'TESTE-637624551935945533'

const listaPedidos = [pedido1, pedido2, pedido3, pedido4, pedido5]

const orderId1 = 797209119
const orderId2 = 797209118
const orderId3 = 797209117
const orderId4 = 797209116
const orderId5 = 797209115

const ordersIds = [orderId1, orderId2, orderId3, orderId4, orderId5]

const patch = { sku, warrantyMonths: 1 }

const invoice: HUB2B_Invoice = {
    cfop: '1.111',
    issueDate: nowIsoDate(),
    key: '11111111111111111111111111111111111111111111',
    number: '111111111',
    packages: 1,
    series: '11111111111111',
    totalAmount: 1,
    xmlReference: '',
}

const rastreio: HUB2B_Tracking = {
    code: 'AR-1849-SIY',
    shippingDate: nowIsoDate(),
    shippingProvider: 'Correrios',
    shippingService: 'AR',
    url: 'http://track.product'
}

const status: HUB2B_Status = {
    active: true,
    message: 'Mensagem de teste',
    status: 'Delivered',
    updatedDate: nowIsoDate()
}

const getTestInvoice = () => {
    return getInvoiceHub2b(pedido1)
}

const getTestTracking = () => {
    return getTrackingHub2b(pedido1)
}


const homologHub2b = async () => {

    const upProduct = await updateProdutoHub2b( [patch], HUB2B_TENANT )

    const upPrice = await updatePriceHub2b(sku, 50, 45)

    const upStock = await updateStockHub2b(sku, 50)

    const listarPedidos = await listAllOrdersHub2b()

    const upNFe = await postInvoiceHub2b(pedido1, invoice, false)

    const track = await postTrackingHub2b(pedido1, rastreio, false)

    const upStatus = await updateStatusHub2b(pedido1, status)

}
