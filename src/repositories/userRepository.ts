//
//      User Repository
//

import { String } from 'aws-sdk/clients/apigateway'
import { MongoError, ObjectID } from 'mongodb'
import { User } from '../models/user'
import { IS_PRODUCTION_ENV } from '../utils/consts'
import { userCollection, USER_COLLECTION } from '../utils/db/collections'
import { log } from '../utils/loggerUtil'
import { getFunctionName } from '../utils/util'
import { findShopInfoByID } from './accountRepository'

/**
 * Save a new user and creates account
 *
 * @param user - new user
 */
export const createNewUser = async ( user: User ): Promise<User | null> => {

    try {

        const result = await userCollection.insertOne( user )

        const userInserted = result.ops[0] ? result.ops[0] : null

        if ( !userInserted ) return null

        delete userInserted.password

        return userInserted

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

type FindOne = {
    username?: string,
    email?: string
}

/**
 * Find user by email or username
 *
 * @param user
 */
export const findOneUser = async ({ username, email }: FindOne ): Promise<User | null> => {

    try {

        const projection = { username: 1, email: 1, password: 1, role: 1, isActive: 1 }

        let result = null

        if ( email )
            result = await userCollection.findOne({ email }, { projection })

        else if ( username )
            result = await userCollection.findOne({ username }, { projection })

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

/**
 * Find user by email or username
 *
 * @param user
 */
export const findUserByShopId = async ( shop_id: string ): Promise<User | null> => {

    try {

        const shop = await findShopInfoByID( shop_id )

        let result = null

        if ( shop )
            result = await userCollection.findOne({ _id: shop.userId })

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

/**
 * Find all Users with seller role.
 *
 */
export const findAllSellerUsers = async (): Promise<User[] | null> => {

    try {

        const result = await ( await userCollection.find({ role: 'seller' }).toArray() ).map( ( user: User ) => ({ _id: user._id, email: user.email, username: user.username, isActive: user.isActive } as User ) )

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

/**
 * Find user by Id
 *
 * @param _id
 */
export const findUserById = async ( _id: string ): Promise<User | null> => {

    const projection = { username: 1, email: 1, role: 1, isActive: 1 }

    try {

        const user = await userCollection.findOne({ _id: new ObjectID( _id ) }, { projection })

        return user

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

/**
 * Disable user
 *
 * @param  id - User Id
 */
export const disableUser = async ( _id: any ): Promise<User | null> => {

    try {

        const options = {
            '$set': {
                isActive: false,
            }
        }

        const result = await userCollection.findOneAndUpdate({ _id: new ObjectID( _id ) }, options )

        return result.value ? result.value : null

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

/**
 * Enable user
 *
 * @param id - User Id
 */
export const enableUser = async ( _id: any ) => {

    try {

        const options = {
            '$set': {
                isActive: true,
            }
        }

        const result = await userCollection.findOneAndUpdate({ _id: new ObjectID( _id ) }, options )

        return result.value ? result.value : null

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

/**
 * Delete user
 *
 * @param id - User Id
 */
export const deleteUserByID = async ( _id: any ): Promise<User | null> => {

    try {

        const result = await userCollection.findOneAndDelete({ _id: new ObjectID( _id ) })

        return result.value ? result.value : null

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

/**
 * update user password
 *
 * @param id - User Id
 */
export const updatePassword = async ( _id: any, password: string ): Promise<User | null> => {

    try {

        const options = {
            '$set': {
                password,
            }
        }

        const result = await userCollection.findOneAndUpdate({ _id: new ObjectID( _id ) }, options )

        return result.value ? result.value : null

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

export const findUsersByField = async ( field: string, value: any ): Promise<User[] | null> => {
    try {

        const filter = { [field]: value }

        const result = await userCollection.find( filter ).toArray()

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}

export const findOneUserAndModify = async ( where: any, by: any, fields: any ) => {

    try {

        const filter = { [where]: by }

        const result = await userCollection.findOneAndUpdate( filter, { $set: fields }, { returnOriginal: false })

        if ( result.value ) log( `User data updated`, 'EVENT', `User Repository - ${getFunctionName()}`, 'INFO' )

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )
            log( error.message, 'EVENT', `User Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }
}
