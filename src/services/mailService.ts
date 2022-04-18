//
//      Mail Service
//

import { log } from "../utils/loggerUtil"
import { getFunctionName } from "../utils/util"
import nodemailer from "nodemailer"
import { EMAIL_PASSWORD, FRONT_END_URL, PROJECT_EMAIL, PROJECT_NAME } from "../utils/consts"
import { activationEmailContent } from "../models/emails/activationEmail"
import { User } from "../models/user"
import { generateAccessToken } from "./tokenService"
import { resetPasswordContent } from "../models/emails/resetPassword"
import { findUserByShopId } from "../repositories/userRepository"
import { orderEmailContent } from "../models/emails/orderEmail"
import { lowStockEmailContent } from "../models/emails/lowStockEmail"
import { lateShippingEmailContent } from "../models/emails/lateShippingEmail"
import { noProductsEmailContent } from "../models/emails/noProductsEmail"
import { Variation } from "../models/product"
import { findProductByVariation } from "./productService"

const transporter = nodemailer.createTransport( {
    service: 'gmail',
    auth: {
        user: PROJECT_EMAIL,
        pass: EMAIL_PASSWORD,
    }
} )

/**
 * Save a new user and creates account
 *
 * @param email
 * @param password
 */
export const sendEmail = async ( email: string, subject: string, content: any = '' ): Promise<any> => {

    log( `Sending email to ${ email }`, 'EVENT', getFunctionName() )

    const mailOptions = {
        from: `${ PROJECT_NAME } <${ PROJECT_EMAIL }>`,
        to: email,
        subject,
        html: content
    }

    try {
        // send mail with defined transport object
        return await transporter.sendMail( mailOptions )
    } catch ( error ) {
        if ( error instanceof Error )
            log( error.message, 'EVENT', getFunctionName(), 'ERROR' )
        return null
    }
}

export const sendEmailToActiveAccount = async ( user: User ): Promise<void> => {

    const PATH = '/verify/'

    const uri = FRONT_END_URL + PATH

    const activationToken = await generateAccessToken( user )

    if ( !activationToken || !activationToken.token ) {
        log( `Could not send activation email to ${ user.email }`, 'EVENT', getFunctionName(), 'ERROR' )
        return
    }

    const content = activationEmailContent( user, uri + activationToken.token )

    const result = await sendEmail( user.email, 'Active your account', content )

    result
        ? log( `Activation email sent to ${ user.email }`, 'EVENT', getFunctionName() )
        : log( `Could not send activation email to ${ user.email }`, 'EVENT', getFunctionName(), 'ERROR' )
}

export const sendEmailToResetPassword = async ( user: User ): Promise<any> => {

    const PATH = '/resetPassword/'

    const uri = FRONT_END_URL + PATH

    const activationToken = await generateAccessToken( user )

    if ( !activationToken || !activationToken.token ) {
        log( `Could not send activation email to ${ user.email }`, 'EVENT', getFunctionName(), 'ERROR' )
        return
    }

    const content = resetPasswordContent( user, uri + activationToken.token )

    const result = await sendEmail( user.email, 'Reset seu password', content )

    result
        ? log( `Reset password email sent to ${ user.email }`, 'EVENT', getFunctionName() )
        : log( `Could not send email to ${ user.email }`, 'EVENT', getFunctionName(), 'ERROR' )

    return result
}

export const sendOrderEmailToSeller = async ( shop_id: string ): Promise<any> => {

    const user = await findUserByShopId( shop_id )

    if ( !user ) {
        log(`Could not send order email for shop_id ${shop_id}. User not found.`, 'EVENT', getFunctionName(), 'ERROR' )
        return
    }

    const content = orderEmailContent()

    const result = await sendEmail( user.email, 'OZLLO360 | Boas notícias: você vendeu!', content )

    result
        ? log( `Order email sent to ${ user.email }`, 'EVENT', getFunctionName() )
        : log( `Could not send order email to ${ user.email }`, 'EVENT', getFunctionName(), 'ERROR' )

    return result
}

export const sendLowStockEmailToSeller = async ( variation: Variation ): Promise<any> => {

    const product = await findProductByVariation( variation._id)

    if (! product ) return null

    const user = await findUserByShopId( product.shop_id )

    if (!user) return null

    const variationName = `${product.name} | Tamanho ${variation.size} | ${variation.color || variation.flavor}`

    const result = await sendEmail(user.email, 'OZLLO360 | Atenção: seu estoque está quase acabando!', lowStockEmailContent(variationName) )

    result
        ? log(`Stock low email sent to ${user.email}`, 'EVENT', getFunctionName())
        : log(`Could not send stock low email to ${user.email}`, 'EVENT', getFunctionName(), 'ERROR')

    return result
}

export const sendLateShippingEmailToSeller = async (shop_id: string): Promise<any> => {

    const user = await findUserByShopId(shop_id)

    if (!user) return null

    // TODO: pass order id to template.

    const result = await sendEmail(user.email, 'OZLLO360 | Atenção: um pedido está atrasado para o despacho!', lateShippingEmailContent())

    result
        ? log(`Late shipping email sent to ${user.email}`, 'EVENT', getFunctionName())
        : log(`Could not send late shipping email to ${user.email}`, 'EVENT', getFunctionName(), 'ERROR')

    return result
}

export const sendNoProductsEmailToSeller = async (shop_id: string): Promise<any> => {

    const user = await findUserByShopId(shop_id)

    if (!user) return null

    // TODO: pass product and variation to template.

    const result = await sendEmail(user.email, 'OZLLO360 | Ainda não cadastrou nenhum produto?', noProductsEmailContent())

    result
        ? log(`No products email sent to ${user.email}`, 'EVENT', getFunctionName())
        : log(`Could not send no pproducts email to ${user.email}`, 'EVENT', getFunctionName(), 'ERROR')

    return result
}
