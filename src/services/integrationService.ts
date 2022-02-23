import { System_Integration } from "../models/system"
import { createSystemIntegrationData, findOneSystemIntegrationData } from "../repositories/systemRepository"

export const saveSystemIntegrationData = async (shopID: string, system: any) => {

    const _system : System_Integration = { shop_id: shopID, name: system.name,  data: system.data }

    const newSystemData = await createSystemIntegrationData(_system)

    if (!newSystemData) return null

    const result = await findOneSystemIntegrationData('shop_id', shopID)

    return result
}

export const findSystemByShopID = async (shopID: string) => {

    const system = await findOneSystemIntegrationData('shop_id', shopID)

    if (!system) return null

    return system
}
