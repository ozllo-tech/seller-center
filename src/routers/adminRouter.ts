//
//      Admin Router
//

import { NextFunction, Request, Response, Router } from 'express'
import { findUserById } from '../repositories/userRepository'
import { loginUser } from '../services/loginService'
import { findUsers, isUserAdmin } from '../services/userService'
import { isJWTTokenValid } from '../utils/cryptUtil'
import { loginFail } from '../utils/errors/errors'
import { badRequest, createHttpStatus, internalServerError, ok } from '../utils/httpStatus'

const router = Router()


/**
 * GET -> Retrieve all users
 */
router.get( '/users', async ( req: Request, res: Response, next: NextFunction ) => {

    const users = await findUsers()

    if( !users ){
        console.log( 'Erro' )
        return res
            .status( internalServerError.status )
            .send( createHttpStatus( internalServerError ) )
    }

    return res
        .status( ok.status )
        .send( users )
})

/**
 * Post -> Verifies if can log in user
 */
router.post( '/login', async ( req: Request, res: Response, next: NextFunction ) => {

    const admin = req.body.admin
    const userId = req.body.userId
    const token = req.headers.authorization

    const result = await isJWTTokenValid( token )

    if ( !result )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest, loginFail ) )

    const isAdmin = await isUserAdmin( admin )

    if( !isAdmin )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest, loginFail ) )

    const user = await findUserById( userId )
    console.log( userId )
    if( !user )
        return res
            .status( badRequest.status )
            .send( createHttpStatus( badRequest, loginFail ) )

    return res
        .status( ok.status )
        .send( await loginUser( user ) )
})

export { router as adminRouter }

