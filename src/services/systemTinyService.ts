import axios, { Method } from "axios"
import { findOneSystemIntegrationData } from "../repositories/systemRepository"
import { log } from "../utils/loggerUtil"
import { getFunctionName, logAxiosError } from "../utils/util"
import { Product, Variation } from "../models/product"
import { ObjectID } from "mongodb"
import { Tiny_Product, Tiny_Product_Map, Tiny_Variacoes } from "../models/tinyProduct"
import { createProduct, findProduct, updateProductVariationStock } from "./productService"
import { createVariation, deleteVariation, findVariationById, updateProductById, updateVariationById } from "../repositories/productRepository"
import { SUBCATEGORIES } from "../models/category"
import { COLORS } from "../models/color"
import { SIZES_DEFAULT } from "../models/size"
import { FLAVORS } from "../models/flavors"
import { Tiny_Stock } from "../models/tinyStock"

export const requestTiny = async (url: string, method: Method, token: string, body?: any): Promise<any> => {

    try {

        const response = await axios({
            method: method,
            url: url,
            data: body,
            params: {
                token: token,
                formato: 'json',
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
        price_discounted: parseFloat(tinyProduct.dados.precoPromocional),
        ean: tinyProduct.dados.gtin,
        sku: tinyProduct.dados.idMapeamento,
        variations: [],
        is_active: true
    }

    if (tinyProduct.dados.variacoes.length == 0) {
        // TODO: map product without variations.
        product.variations?.push({
            stock: tinyProduct.dados.estoqueAtual,
            size: '',
            voltage: '',
            color: '',
            flavor: '',
            gluten_free: false,
            lactose_free: false
        })
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
            mapping_id: tinyVariation.idMapeamento
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
        mapping_id: tinyVariation.idMapeamento
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

    let updatedProduct = await updateProductById(existingProduct._id, parseTinyProduct(tinyProduct, shopID))

    if (!updatedProduct) return null

    // Delete no longer existing tinyVariations.

    if (Array.isArray(existingProduct.variations) && tinyProduct.dados.variacoes.length < existingProduct.variations.length) {
        existingProduct.variations?.forEach( (variation, index) => {
            if (variation._id.toString() !== tinyProduct.dados.variacoes[index]?.skuMapeamento) {
                deleteVariation(variation._id)
            }
        })
    }

    for await (const variation of tinyProduct.dados.variacoes) {

        const existingVariation = await findVariationById(variation.skuMapeamento)

        if (existingVariation) {

            updatedProduct = await updateVariationById(existingVariation._id, {
                ...existingVariation,
                ...parseTinyVariation(variation, existingProduct._id)
            })
        }

        if (!existingVariation) {

            const newVariation = await createVariation(parseTinyVariation(variation, existingProduct._id))

            if (newVariation) updatedProduct?.variations?.push(newVariation)
        }
    }

    if (!updatedProduct) return null

    return mapTinyProduct(updatedProduct, tinyProduct)
}

export const updateTinyStock = async (stock: Tiny_Stock): Promise<Product|null> => {

    const updatedStock = await updateProductVariationStock(stock.dados.skuMapeamento, { stock: stock.dados.saldo })

    if (!updatedStock) return null

    return updatedStock

}
