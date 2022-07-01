import { Advertisement } from '../models/advertisement'
import { USED_CHANNELS } from '../models/salesChannelHub2b'
import { getHubSku } from './hub2bService'

export const getAdsByProduyct = async ( productId: string ): Promise<Advertisement[]|null> => {

    const skus = await getHubSku( productId )

    if ( !skus ) return null

    const ads: Advertisement[] = []

    for ( const sku of skus ) {

        const marketplace = USED_CHANNELS.find( sc => sc.code === Number( sku.salesChannel ) )?.name || ''

        if ( marketplace.length ) ads.push({
            salesChannel: sku.salesChannel,
            marketplace,
            status: sku.status,
            statusMessage: sku.statusMessage,
            sku: sku.sku,
            size: sku.specifications.find( ( s: { name: string }) => s.name === 'size' )?.value || ''
        })
    }

    return ads
}
