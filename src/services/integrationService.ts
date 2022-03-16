import { ObjectID } from "mongodb"
import { Order } from "../models/order"
import { System_Integration } from "../models/system"
import { updateSystemIntegrationData, findOneSystemIntegrationData } from "../repositories/systemRepository"
import { getTinyInfo, sendTinyOrder } from "./systemTinyService"

export const saveSystemIntegrationData = async (shopID: string, system: any) => {

    const _system : System_Integration = { shop_id: shopID, name: system.name,  data: system.data, active: false }

    const newSystemData = await updateSystemIntegrationData(_system)

    if (!newSystemData) return null

    const result = await findOneSystemIntegrationData('shop_id', shopID)

    return result
}

export const findSystemByShopID = async (shopID: string) => {

    const system = await findOneSystemIntegrationData('shop_id', shopID)

    if (!system) return null

    return system
}

export const activateSystemIntegration = async (systemID: string) => {

    const system = await findOneSystemIntegrationData('_id', new ObjectID(systemID))

    if (!system  || 'tiny' !== system.name) return null

    // Test system integration

    const tinyInfo = await getTinyInfo(system.data.token)

    system.active = 'OK' == tinyInfo.retorno?.status ? true : false

    // If pass, change system active status to true

    const result = await updateSystemIntegrationData(system)

    if (!tinyInfo || !result) return null

    return tinyInfo
}

export const findIntegrationOrder = async (order: Order) => {

    const system = await findOneSystemIntegrationData('shop_id', new ObjectID(order.shop_id))

    if (!system) return null

    if ('tiny' === system.name) return sendTinyOrder(order, system.data.token)

}
