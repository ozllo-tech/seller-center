import axios, { Method } from "axios"
import { findOneSystemIntegrationData } from "../repositories/systemRepository"
import { log } from "../utils/loggerUtil"
import { getFunctionName, logAxiosError, nowIsoDateHub2b } from "../utils/util"
import { Product, Variation } from "../models/product"
import { ObjectID } from "mongodb"
import { Tiny_Product, Tiny_Product_Map, Tiny_Variacoes } from "../models/tinyProduct"
import { createProduct, findProduct, updateProductPrice, updateProductVariationStock } from "./productService"
import { createVariation, deleteVariation, findVariationById, updateProductById, updateVariationById } from "../repositories/productRepository"
import { SUBCATEGORIES } from "../models/category"
import { COLORS } from "../models/color"
import { SIZES_DEFAULT } from "../models/size"
import { FLAVORS } from "../models/flavors"
import { Tiny_Stock } from "../models/tinyStock"
import { Tiny_Price } from "../models/tinyPrice"
import { Item, ORDER_STATUS_HUB2B_TINY, Tiny_Order_Request, Tiny_Order_Response } from "../models/tinyOrder"
import { Order } from "../models/order"
import { findOneOrderAndModify, findOrderByField } from "../repositories/orderRepository"
import format from "date-fns/format"
import { HUB2B_Invoice, HUB2B_Status, HUB2B_Tracking } from "../models/hub2b"
import { postInvoiceHub2b, postTrackingHub2b, updateStatusHub2b } from "./hub2bService"

export const requestTiny = async (url: string, method: Method, token: string, params?: any): Promise<any> => {

    try {

        const response = await axios({
            method: method,
            url: url,
            headers: {"Developer-Id": "QAS4PlUW/9qBA4SwKdlz/A==" },
            params: {
                token: token,
                formato: 'json',
                ...params
            }
        })

        response
            ? log("Request Success", "EVENT", getFunctionName(3))
            : log("Request Failed", "EVENT", getFunctionName(3), "WARN")

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

export const getTinyInfo = async (token: string) => {

    const response = await requestTiny('https://api.tiny.com.br/api2/info.php', 'post', token)

    if (!response) return null

    return response.data
}

export const importTinyProduct = async (tinyProduct: Tiny_Product) => {

    const tinyData = await findTinyDataByEcommerceID(tinyProduct.idEcommerce.toString())

    if (!tinyData) return null

    const existingProduct = tinyProduct.dados.skuMapeamento ? await findProduct(tinyProduct.dados.skuMapeamento) : null

    if (existingProduct) return await updateExistingProduct(tinyProduct, existingProduct, tinyData.shop_id)

    const newProduct = parseTinyProduct(tinyProduct, tinyData.shop_id)

    const product =  await createProduct(newProduct)

    if (!product) return null

    return mapTinyProduct(product, tinyProduct)
}

export const findTinyDataByEcommerceID = async (ecommerceID: string) => {

    const system = await findOneSystemIntegrationData('data.ecommerce_id', ecommerceID)

    if (!system) return null

    return system
}

function parseTinyProduct(tinyProduct: Tiny_Product, shop_id: ObjectID): Product {

    // WARN: "brand" field can't be empty. Hub2b will not accept without it.
    // TODO: get brand from shopInfo.

    const product: Product = {
        shop_id: shop_id,
        images: tinyProduct.dados.anexos.map(anexo => anexo.url),
        category: findMarchingCategory(tinyProduct),
        subcategory: findMatchingSubcategory(tinyProduct),
        nationality: parseInt(tinyProduct.dados.origem) || 0,
        name: tinyProduct.dados.nome,
        brand: tinyProduct.dados.marca,
        gender: 'U',
        description: tinyProduct.dados.descricaoComplementar,
        more_info: '',
        height: parseFloat(tinyProduct.dados.alturaEmbalagem),
        width: parseFloat(tinyProduct.dados.larguraEmbalagem),
        length: parseFloat(tinyProduct.dados.comprimentoEmbalagem) || parseFloat(tinyProduct.dados.diametroEmbalagem),
        weight: parseFloat(tinyProduct.dados.pesoLiquido) || parseFloat(tinyProduct.dados.pesoBruto),
        price: parseFloat(tinyProduct.dados.preco),
        price_discounted: parseFloat(tinyProduct.dados.precoPromocional) || parseFloat(tinyProduct.dados.preco),
        ean: tinyProduct.dados.gtin,
        sku: tinyProduct.dados.idMapeamento,
        variations: [
            {
                stock: tinyProduct.dados.estoqueAtual,
                size: '',
                voltage: '',
                color: '',
                flavor: '',
                gluten_free: false,
                lactose_free: false,
                mapping_id: tinyProduct.dados.idMapeamento,
                tiny_id: tinyProduct.dados.codigo
            }
        ],
        is_active: true
    }

    tinyProduct.dados.variacoes.forEach(tinyVariation => {

        product.variations?.push({
            stock: tinyVariation.estoqueAtual,
            size: findMatchingSize(tinyVariation),
            voltage: '',
            color: findMatchingColor(tinyVariation),
            flavor: findMatchingFlavor(tinyVariation),
            gluten_free: false,
            lactose_free: false,
            mapping_id: tinyVariation.idMapeamento,
            tiny_id: tinyVariation.codigo
        })

        if (tinyVariation.anexos.length) product.images.push(...tinyVariation.anexos.map(anexo => anexo.url))
    })

    return product
}

function parseTinyVariation(tinyVariation: Tiny_Variacoes, product_id: ObjectID): Variation {

    const variation: Variation = {
        stock: tinyVariation.estoqueAtual,
        size: findMatchingSize(tinyVariation),
        voltage: '',
        color: findMatchingColor(tinyVariation),
        flavor: findMatchingFlavor(tinyVariation),
        gluten_free: false,
        lactose_free: false,
        product_id: product_id,
        mapping_id: tinyVariation.idMapeamento,
        tiny_id: tinyVariation.codigo
    }

    return variation
}

function findMatchingSubcategory(tinyProduct: Tiny_Product) {

    if (!tinyProduct.dados.descricaoCategoria) return 0

    const tinySubcategory = tinyProduct.dados.descricaoCategoria.toLowerCase()

    return SUBCATEGORIES.filter(subcategory => subcategory.value.toLowerCase() == tinySubcategory)[0]?.code || 0
}

function findMarchingCategory(tinyProduct: Tiny_Product) {

    if (!tinyProduct.dados.descricaoCategoria) return 0

    const tinyCategory = tinyProduct.dados.descricaoCategoria.toLowerCase()

    return SUBCATEGORIES.filter(subcategory => subcategory.value.toLocaleLowerCase() == tinyCategory)[0]?.categoryCode || 0
}

function findMatchingColor(tinyVariation: Tiny_Variacoes) {

    const tinyColor = tinyVariation.grade.filter(grade => grade.chave.toLocaleLowerCase() == 'cor')[0]?.valor || ''

    return COLORS.filter(color => color.toLocaleLowerCase() == tinyColor.toLocaleLowerCase())[0] || ''
}

function findMatchingFlavor(tinyVariation: Tiny_Variacoes) {

    const tinyFlavor = tinyVariation.grade.filter(grade => grade.chave.toLocaleLowerCase() == 'sabor')[0]?.valor || ''

    return FLAVORS.filter(flavor => flavor.toLocaleLowerCase() == tinyFlavor.toLocaleLowerCase())[0] || ''
}

function findMatchingSize(tinyVariation: Tiny_Variacoes) {

    const tinySize = tinyVariation.grade.filter(grade => grade.chave.toLocaleLowerCase() == 'tamanho')[0]?.valor || ''

    // TODO: switch size type accordly to the product's category.

    return SIZES_DEFAULT.filter(size => size.toLocaleLowerCase() == tinySize.toLocaleLowerCase())[0] || ''
}

function mapTinyProduct(product: Product, tinyProduct: Tiny_Product): Tiny_Product_Map[] {

    // 1 - Map Product skuMapeamento to product_id.
    const tinyProductMap: Tiny_Product_Map[] = [
        {
            idMapeamento: product.sku,
            skuMapeamento: product._id.toString()
        }
    ]

    // 2 - Map Variation skuMapeamento to variation_id.
    if (tinyProduct.dados.variacoes.length > 0 ) {
        product.variations?.forEach(variation => {
            if (variation.mapping_id) {
                tinyProductMap.push({ idMapeamento: variation.mapping_id, skuMapeamento: variation._id.toString() })
            }
        })
    }

    // 3 - Return full mapping
    return tinyProductMap
}

async function updateExistingProduct(tinyProduct: Tiny_Product, existingProduct: Product, shopID: ObjectID) {

    const product = parseTinyProduct(tinyProduct, shopID)

    delete product.variations

    let updatedProduct = await updateProductById(existingProduct._id, product)

    if (!updatedProduct) return null

    // Delete no longer existing tinyVariations.

    if (Array.isArray(existingProduct.variations) && tinyProduct.dados.variacoes.length < existingProduct.variations.length) {
        existingProduct.variations?.forEach((variation, index) => {
            if (variation._id.toString() !== tinyProduct.dados.variacoes[index]?.skuMapeamento) {
                deleteVariation(variation._id)
            }
        })
    }

    for await (const variation of tinyProduct.dados.variacoes) {

        const existingVariation = await findVariationById(variation.skuMapeamento)

        if (existingVariation) {

            updatedProduct = await updateVariationById(existingVariation._id, parseTinyVariation(variation, existingProduct._id))

        } else {

            const newVariation = await createVariation(parseTinyVariation(variation, existingProduct._id))

            if (newVariation) updatedProduct?.variations?.push(newVariation)
        }
    }

    if (!updatedProduct) return null

    return mapTinyProduct(updatedProduct, tinyProduct)
}

export const updateTinyStock = async (stock: Tiny_Stock): Promise<Product|null> => {

    const updatedProduct = await updateProductVariationStock(stock.dados.skuMapeamento, { stock: stock.dados.saldo })

    if (!updatedProduct) return null

    return updatedProduct

}

export const updateTinyPrice = async (price: Tiny_Price): Promise<Product|null> => {

    const productID = price.dados.skuMapeamentoPai.length ? price.dados.skuMapeamentoPai : price.dados.skuMapeamento

    const priceDiscounted = parseFloat(price.dados.precoPromocional) || parseFloat(price.dados.preco)

    const patch = { price: parseFloat(price.dados.preco), price_discounted: priceDiscounted }

    const updatedProduct = await updateProductPrice(productID, patch)

    if (!updatedProduct) return null

    return updatedProduct

}

export const sendTinyOrder = async (order: Order, token: string): Promise<Tiny_Order_Response|null> => {

    const orderID = order.order.reference.id

    const tinyOrder = await parseTinyOrder(order)

    const orderRequest = JSON.stringify(tinyOrder)

    const orderResponse = await requestTiny('https://api.tiny.com.br/api2/pedido.incluir.php', 'POST', token, {pedido: orderRequest})

    if (!orderResponse) return null

    // TODO: handle tiny response errors.
    // https://tiny.com.br/api-docs/api2-tabelas-processamento

    if (!orderResponse.data?.retorno?.registros?.registro?.id) return orderResponse.data

    // Update order with tiny order id.

    const orderUpdate = await findOneOrderAndModify('order.reference.id', orderID, {tiny_order_id: orderResponse.data.retorno.registros.registro.id})

    // TODO: handle order update error

    orderUpdate?.value
        ? log(`Order ${orderID} updated with Tiny order ${orderResponse.data.retorno.registros.registro.id}`, 'EVENT', getFunctionName() )
        : log(`Order ${orderID} not updated with Tiny order ${orderResponse.data.retorno.registros.registro.id}`, 'EVENT', getFunctionName())

    return orderResponse.data

}

export const parseTinyOrder = async(order: Order): Promise<Tiny_Order_Request> => {

    const hub2bOrder = order.order

    // Unidade	Informe a unidade corresponde ao produto. Ex:(Un,Pç,Kg).

    const items:Item[] = []

    for await (const product of hub2bOrder.products) {

        const variation = await findVariation(product.sku)
        items.push( {
            item: {
                codigo: variation?.tiny_id,
                descricao: product.name,
                unidade: '',
                quantidade: product.quantity,
                valor_unitario: product.price
            }
        })
    }

    const tinyOrderRequest: Tiny_Order_Request = {
        pedido: {
            data_pedido: format(Date.parse(hub2bOrder.shipping.shippingDate), 'dd/MM/yyyy'),
            data_prevista: format(Date.parse(hub2bOrder.shipping.estimatedDeliveryDate), 'dd/MM/yyyy'),
            cliente: {
                nome: hub2bOrder.customer.name,
                cpf_cnpj: hub2bOrder.customer.documentNumber,
                email: hub2bOrder.customer.email,
                fone: hub2bOrder.customer.mobileNumber,
            },
            endereco_entrega: {
                endereco: hub2bOrder.shipping.address.address,
                numero: hub2bOrder.shipping.address.number,
                complemento: hub2bOrder.shipping.address.additionalInfo,
                cep: hub2bOrder.shipping.address.zipCode,
                cidade: hub2bOrder.shipping.address.city,
                bairro: hub2bOrder.shipping.address.neighborhood,
                uf: hub2bOrder.shipping.address.state,
                nome_destinatario: hub2bOrder.shipping.receiverName
            },
            itens: items,
            nome_transportador: hub2bOrder.shipping.provider,
            valor_frete: hub2bOrder.shipping.price,
            valor_desconto: hub2bOrder.payment.totalDiscount,
            situacao: ORDER_STATUS_HUB2B_TINY[hub2bOrder.status.status],
            forma_frete: hub2bOrder.shipping.service,
            ...(hub2bOrder.payment.method.length ? {forma_pagamento: hub2bOrder.payment.method} : {}),
            ...(hub2bOrder.reference.id ? {numero_pedido_ecommerce: hub2bOrder.reference.id.toString()} : {})
        },
    }

    // TODO: map situacao with hub2b.order.status.status
    // https://tiny.com.br/api-docs/api2-tabelas-pedidos

    return tinyOrderRequest
}

export const updateTinyOrderStatus = async (order: Order): Promise<Tiny_Order_Response|null> => {

    const tinyOrderId = order?.tiny_order_id

    if (!tinyOrderId) return null

    const system = await findOneSystemIntegrationData('shop_id', new ObjectID(order.shop_id))

    if (!system) return null

    const tinyOrderStatus = ORDER_STATUS_HUB2B_TINY[order.order.status.status]

    const data = { situacao: tinyOrderStatus, id: tinyOrderId }

    const orderResponse = await requestTiny(`https://api.tiny.com.br/api2/pedido.alterar.situacao.php`, 'POST', system.data.token, data)

    if (!orderResponse) return null

    // TODO: handle tiny response errors.
    // https://tiny.com.br/api-docs/api2-tabelas-processamento

    if (!orderResponse.data?.retorno?.registros?.registro?.id) return orderResponse.data

    orderResponse
        ? log(`Order ${order.order.reference.id} status updated with Tiny order status ${tinyOrderStatus}`, 'EVENT', getFunctionName())
        : log(`Order ${order.order.reference.id} status not updated with Tiny order status ${tinyOrderStatus}`, 'EVENT', getFunctionName())

    return orderResponse.data

}

export const updateTiny2HubOrderStatus = async (orderID: string, status: string): Promise<Boolean> => {

    const hub2bOrderStatus = {
        active: true,
        message: '',
        status: status,
        updatedDate: nowIsoDateHub2b()
    }

    // TODO: check which status can be updated.

    if ('Invoiced' === status || 'Shipped' === status) return false

    const hub2bOrderStatusUpdate = await updateStatusHub2b(orderID, hub2bOrderStatus)

    if (!hub2bOrderStatusUpdate) return false

    return true
}

export const sendTinyInvoiceToHub = async (tinyInvoice: any): Promise<Boolean> => {

    // TODO: Get and send cfop from XML. Send the XML file as well.

    const invoiceHub: HUB2B_Invoice = {
        key: tinyInvoice.chaveAcesso,
        number: tinyInvoice.numero,
        series: tinyInvoice.serie,
        issueDate: tinyInvoice.dataEmissao,
        totalAmount: tinyInvoice.valorNota
    }

    const order = await findOrderByField('order.reference.id', Number(tinyInvoice.idPedidoEcommerce))

    if (!order) return false

    const hub2bInvoiceResponse = await postInvoiceHub2b(tinyInvoice.idPedidoEcommerce, invoiceHub, false)

    const fields = { "order.status.status": 'Invoiced', "order.status.updatedDate": nowIsoDateHub2b() }

    if (hub2bInvoiceResponse) findOneOrderAndModify('order.reference.id', Number(tinyInvoice.idPedidoEcommerce), fields )

    hub2bInvoiceResponse
        ? log(`Tiny invoice ${tinyInvoice.chaveAcesso} sent to Hub2B`, 'EVENT', getFunctionName(), 'INFO')
        : log(`Tiny Invoice ${tinyInvoice.chaveAcesso} not sent to Hub2B with key`, 'EVENT', getFunctionName(), 'WARN')

    if (!hub2bInvoiceResponse) return false

    return true
}

export const sendTinyTrackingToHub = async (tracking: any): Promise<HUB2B_Tracking | null> => {

    const now = nowIsoDateHub2b()

    const data: HUB2B_Tracking = {
        code: tracking.codigoRastreio,
        url: tracking.urlRastreio,
        shippingDate: now,
        shippingProvider: tracking.formaEnvio || tracking.transportadora,
        shippingService: tracking.formaFrete
    }

    const orderTracking = await postTrackingHub2b(tracking.idPedidoEcommerce, data, false)

    if (orderTracking) {

        const status: HUB2B_Status = {
            status: 'Shipped',
            updatedDate: now,
            active: true,
            message: ''
        }

        await findOneOrderAndModify("order.reference.id", tracking.idPedidoEcommerce, { "order.status": status })
    }

    orderTracking
        ? log(`Tracking sent`, 'EVENT', getFunctionName())
        : log(`Could not send tracking`, 'EVENT', getFunctionName(), 'ERROR')

    return orderTracking
}