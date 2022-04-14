//
//      Tenant Service
//

import { HUB2B_Tenants } from "../models/hub2b"
import { saveTenant, updateTenant, findHub2bTenantByIdTenant, findTenantByOwnerEmail, retrieveTenants } from "../repositories/hub2TenantRepository"
import { saveUser } from "../repositories/hub2UserRepository"
import { saveTenantCredential } from "../repositories/hub2TenantCredentialRepository"
import { log } from "../utils/loggerUtil"
import { getFunctionName, waitforme } from "../utils/util"
import { HUB2B_URL_V2, HUB2B_TENANT, HUB2B_AGENCY } from "../utils/consts"
import { AGENCY_CREDENTIALS, renewAccessTokenHub2b } from "./hub2bAuhService"
import { requestHub2B } from "./hub2bService"
import { findUserByShopId } from "../repositories/userRepository"
import { findAddressByUserID, findContactByUserID, findPersonalInfoByUserID } from "../repositories/accountRepository"
import { randomUUID } from "crypto"

/**
 * Save a new Tenant
 *
 * @param shopInfo passed through userCanAccessShop middleware.
 */
export const createTenant = async ( shopInfo: any ): Promise<HUB2B_Tenants | null> => {

    if (!shopInfo) return null

    const [ user, personalInfo, contact, address ] = await Promise.all([
        findUserByShopId(shopInfo._id),
        findPersonalInfoByUserID(shopInfo.userId),
        findContactByUserID(shopInfo.userId),
        findAddressByUserID(shopInfo.userId),
    ])

    if ( !user || !personalInfo || !contact || !address ) return null

    const personal: any = personalInfo

    const data: any = {
        name: shopInfo.name,
        website: contact.url,
        documentNumber: personal?.cnpj || personal?.cpf || randomUUID(),
        companyName: personal?.name || shopInfo.name,
        ownerName: personal?.name || shopInfo.name,
        ownerEmail: user.email,
        ownerPhoneNumber: contact.phone || contact.whatsapp,
        idAgency: HUB2B_AGENCY,
        address: {
            zipCode: address.cep,
            street: address.address,
            neighborhood: address.district,
            number: Number(address.number) || 0,
            city: address.city,
            state: 'XX',
            country: 'XX',
            reference: ''
        }
    }

    const newTenant = await setupTenantsHub2b( data )

    if ( !newTenant ) {
        log( `Could not create new Tenant ${ data.name } in the hub2b`, 'EVENT', getFunctionName(), 'ERROR' )
        return null
    }

    data.idTenant = newTenant.idTenant

    const savedTenant = await saveTenant( data )

    // Save a new User
    await saveUser( newTenant.users[0] )

    // Save Tenant Credentials
    const tenantCredential = await getTenantCredentialsInHub2b( newTenant.idTenant )

    tenantCredential.idTenant = newTenant.idTenant

    await saveTenantCredential( tenantCredential )

    if ( !savedTenant ) {
        log( `Could not create new Tenant ${ newTenant.name }`, 'EVENT', getFunctionName(), 'ERROR' )
        return null
    }

    log( `Tenant ${ newTenant.name } has been created.`, 'EVENT', getFunctionName() )

    return newTenant
}

/**
 * Get Tenant
 *
 * @returns
 */
 export const getTenantInHub2b = async (idTenant: any): Promise<HUB2B_Tenants | null> => {

    await renewAccessTokenHub2b(false, null, true)

    const SETUP_URL = HUB2B_URL_V2 +
      "/Setup/Tenants/" + idTenant + "?access_token=" + AGENCY_CREDENTIALS.access_token

    const response = await requestHub2B( SETUP_URL, 'GET' )
    if ( !response ) return null

    const tenant = response.data

    tenant
        ? log( "GET Tenant in hub2b success", "EVENT", getFunctionName() )
        : log( "GET Tenant in hub2b error", "EVENT", getFunctionName(), "WARN" )

    return tenant
}

/**
 * Create a new Tenant in the hub2b
 *
 * @param body
 * @returns
 */
export const setupTenantsHub2b = async (body: any) => {

    await renewAccessTokenHub2b(false, null, true)

    // TODO: send email password only when requires manual authentication (Tray).

    const SETUP_URL = HUB2B_URL_V2 +
        "/Setup/Tenants?SendPasswordEmail=false&access_token=" + AGENCY_CREDENTIALS.access_token

    const response = await requestHub2B( SETUP_URL, 'POST', body )
    if ( !response ) return null

    const create_tenant = response.data

    create_tenant
        ? log( "create new Tenant success", "EVENT", getFunctionName() )
        : log( "create new Tenant error", "EVENT", getFunctionName(), "WARN" )

    return create_tenant
}

/**
 * Get Tenant Credentials
 *
 * @param body
 * @returns
 */
 export const getTenantCredentialsInHub2b = async (idTenant: any) => {

    await renewAccessTokenHub2b(false, null, true)

    const SETUP_URL = HUB2B_URL_V2 +
        "/Setup/Tenants/" + idTenant + "/Credentials?access_token=" + AGENCY_CREDENTIALS.access_token

    const response = await requestHub2B( SETUP_URL, 'POST' )
    if ( !response ) return null

    const tenantCredentials = response.data

    tenantCredentials
        ? log( "POST Tenant Credentials success", "EVENT", getFunctionName() )
        : log( "POST Tenant Credentials error", "EVENT", getFunctionName(), "WARN" )

    return tenantCredentials
}

/**
 * Update Tenant
 *
 * @param body
 */
 export const updateHub2bTenant = async ( body: any ): Promise<HUB2B_Tenants | null> => {

    if ( !body.idAgency ) {
        const agency = await getTenantInHub2b(HUB2B_TENANT)

        if ( !agency ) {
            log( `Agency ${ body.idAgency } not found in the hub2b`, 'EVENT', getFunctionName(), 'ERROR' )
            return null
        }

        body.idAgency = agency.idAgency
    }

    const tenant = await updateTenantsInHub2b( body )

    if ( !tenant ) {
        log( `Could not update Tenant ${ tenant.name } in the hub2b`, 'EVENT', getFunctionName(), 'ERROR' )
        return null
    }

    const updatedTenant = await updateTenant( body )

    if ( !updatedTenant ) {
        log( `Could not update Tenant ${ tenant.name }`, 'EVENT', getFunctionName(), 'ERROR' )
        return null
    }

    log( `Tenant ${ tenant.name } has been updated.`, 'EVENT', getFunctionName() )

    return tenant
}

/**
 * Update Tenant in the hub2b
 *
 * @param body
 * @returns
 */
 export const updateTenantsInHub2b = async (body: any) => {

    await renewAccessTokenHub2b(false, null, true)

    const SETUP_URL = HUB2B_URL_V2 +
        "/Setup/Tenants/" + body.idTenant + "?access_token=" + AGENCY_CREDENTIALS.access_token

    const response = await requestHub2B( SETUP_URL, 'PUT', body )
    if ( !response ) return null

    const tenant = response.data

    tenant
        ? log( "update Tenant success", "EVENT", getFunctionName() )
        : log( "update Tenant error", "EVENT", getFunctionName(), "WARN" )

    return tenant
}

/**
 * Get Tenant
 *
 * @param idTenant
 */
 export const getHub2bTenant = async ( idTenant: any ): Promise<HUB2B_Tenants | null> => {

    const tenant = await findHub2bTenantByIdTenant( idTenant )

    if ( !tenant ) {
        log( `Tenant not found`, 'EVENT', getFunctionName(), 'ERROR' )
        return null
    }

    return tenant
}

export const findTenantfromShopID = async (shopID: string): Promise<HUB2B_Tenants | null> => {

    const user = await findUserByShopId(shopID)

    if ( !user ) return null

    const tenant = findTenantByOwnerEmail(user.email)

    if ( !tenant ) return null

    return tenant
}

export const getTenantAuths = async () => {

    const accounts = await retrieveTenants()

    if ( !accounts ) return null

    for await (let account of accounts) {

        await waitforme(1000)

        await renewAccessTokenHub2b(false, account.idTenant)
    }

}
