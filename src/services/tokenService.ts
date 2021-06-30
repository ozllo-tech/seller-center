//
//      Token Service
//

import { User } from "../models/user"
import { AccessToken } from "../models/token"
import { createAccessToken, deleteAccessToken, findAccessTokenByToken, retrieveAllAccessToken } from "../repositories/tokenRepository"
import { log } from "../utils/loggerUtil"
import { create_UUID, getFunctionName, nowInSeconds } from "../utils/util"

/**
 * Crea
 * 
 * @param user  `User`
 */
export const generateAccessToken = async ( user: User ): Promise<AccessToken | null> => {

    const expiration = nowInSeconds() + 86400

    const token = create_UUID()

    if ( !user._id ) {
        log( `User id is missing.`, 'EVENT', getFunctionName(), 'ERROR' )
        return null
    }

    const activationToken: AccessToken = {
        token,
        user_id: user._id,
        expires_at: expiration
    }

    const generatedToken = await createAccessToken( activationToken )

    generatedToken
        ? log( `New activation token generated for ${ user.email } `, 'EVENT', getFunctionName() )
        : log( `Could not generate new token.`, 'EVENT', getFunctionName(), 'ERROR' )

    return generatedToken
}

export const removeAccessToken = async ( token: string ): Promise<boolean | null> => {

    const deletedToken = await deleteAccessToken( token )

    deletedToken
        ? log( `Token ${ token } deleted.`, 'EVENT', getFunctionName() )
        : log( `Could not delete token.`, 'EVENT', getFunctionName(), 'ERROR' )

    return deletedToken
}


export const isTokenValid = async ( token: string ): Promise<AccessToken | null> => {

    if ( !token ) return null

    const activateToken = await findAccessTokenByToken( token )

    if ( !activateToken ) return null

    if ( nowInSeconds() > activateToken.expires_at ) return null

    return activateToken

}

export const deleteAllInvalid = async () => {

    const tokens = await retrieveAllAccessToken()

    if ( !tokens ) return

    tokens.forEach( token => {
        if ( !isTokenValid( token.token ) ) deleteAccessToken( token.token )
    } )
}

setTimeout( deleteAllInvalid, 2 * 60 * 1000 )
