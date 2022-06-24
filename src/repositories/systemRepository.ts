import { MongoError } from 'mongodb'
import { System_Integration } from '../models/system'
import { systemIntegrationCollection } from '../utils/db/collections'
import { log } from '../utils/loggerUtil'
import { getFunctionName } from '../utils/util'

export const updateSystemIntegrationData = async ( system: System_Integration ): Promise<boolean> => {

    try {

        const result = await systemIntegrationCollection.updateOne({shop_id: system.shop_id}, {$set: system }, {upsert: true})

        return result.result.ok === 1

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )

            log( error.message, 'EVENT', `System Repository - ${getFunctionName()}`, 'ERROR' )

        return false
    }

}

export const findOneSystemIntegrationData = async ( where: any, by: any ): Promise<any|null> => {

    try {

        const filter = { [where]: by }

        const result = await systemIntegrationCollection.findOne( filter )

        return result

    } catch ( error ) {

        if ( error instanceof MongoError || error instanceof Error )

            log( error.message, 'EVENT', `System Repository - ${getFunctionName()}`, 'ERROR' )

        return null
    }

}
