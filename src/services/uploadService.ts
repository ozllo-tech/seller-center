
//
//      Upload Service
//

import aws, { AWSError } from 'aws-sdk'
import axios from 'axios'
import fs from 'fs'
import { ObjectID } from 'mongodb'
import multer from 'multer'
import multerS3 from 'multer-s3'
import { AWS_ACCESS_KEY, AWS_ACCESS_SECRET, AWS_REGION, IMPORT_FOLDER } from '../utils/consts'
import { HttpStatusResponse } from '../utils/httpStatus'
import { log } from '../utils/loggerUtil'
import { getFunctionName, getUrlExtension, makeNiceURL, waitforme } from '../utils/util'
import { findProductsByShop, updateProductImages } from './productService'

const s3 = new aws.S3()

s3.config.update( {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_ACCESS_SECRET,
    region: AWS_REGION,
    signatureVersion: 'v4'
} )

type MuterCallback = ( error: any, key?: boolean | undefined ) => void

const error1: HttpStatusResponse = {
    message: "Invalid file type, only JPG, JPEG and PNG is allowed.",
    status: 400
}

const error2: HttpStatusResponse = {
    message: "Invalid file type, only xls and xlsx allowed.",
    status: 400
}

const productImageFilter = ( req: Express.Request, file: Express.Multer.File, cb: MuterCallback ) => {

    if ( file.mimetype !== "image/jpg" && file.mimetype !== "image/jpeg" && file.mimetype !== "image/png" )
        cb( error1, false )

    cb( null, true )
}


const excelFilter = ( req: Express.Request, file: Express.Multer.File, cb: MuterCallback ) => {

    if (
        file.mimetype !== "application/vnd.ms-excel" &&
        file.mimetype !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
        cb( error2, false )

    cb( null, true )
}

export const uploadProductPicture = multer( {
    fileFilter: productImageFilter,
    storage: multerS3( {
        s3: s3,
        bucket: 'ozllo-seller-center-photos',
        acl: 'public-read',
        metadata: function ( req, file, cb ) {
            cb( null, { fieldName: file.fieldname } )
        },
        key: function ( req, file, cb ) {
            cb( null, Date.now().toString() + '_' + req.shop?._id + '_' + makeNiceURL(file.originalname) )
        },
    } )
} )

export const uploadProfilePicture = multer( {
    storage: multerS3( {
        s3: s3,
        bucket: 'ozllo-seller-center-photos',
        acl: 'public-read',
        metadata: function ( req, file, cb ) {
            cb( null, { fieldName: file.fieldname } )
        },
        key: function ( req, file, cb ) {
            cb( null, Date.now().toString() + '_' + req.user?._id )
        },
    } )
} )

const storage = multer.diskStorage( {
    destination: ( req, file, cb ) => {
        cb( null, IMPORT_FOLDER )
    },
    filename: ( req, file, cb ) => {
        cb( null, file.originalname )
    }
} )

export const importXLSX = multer( {
    fileFilter: excelFilter,
    storage
} )

export const deleteFile = ( filePath: string ) => {
    fs.unlinkSync( filePath )
}

export const sendExternalFileToS3 = async ( url: string, productId: string, index: number ): Promise<string|null> => {

    // https://stackoverflow.com/questions/22186979/download-file-from-url-and-upload-it-to-aws-s3-without-saving-node-js
    // https://stackoverflow.com/questions/61605078/axios-get-a-file-from-url-and-upload-to-s3
    // https://dev.to/vikasgarghb/streaming-files-to-s3-using-axios-h32

    if (url.startsWith('https://ik.imagekit.io/3m391sequ/')) return null

    const key = url.split('/').pop()?.split('?').shift()

    if (!key) return null

    try {

        const response = await axios.get(url, {
            responseType: 'arraybuffer',
        })

        if (!response.data.length) return null

        const image = s3.putObject({
            'ACL': 'public-read',
            'Body': response.data,
            'Bucket': 'ozllo-seller-center-photos',
            'Key': `${key.substring(0, 38)}_${productId}_${index}.${getUrlExtension(url)}`,
        }, function (error: AWSError, data) {

            if (error) {

                log(error.message, 'EVENT', getFunctionName(), "ERROR")

                return null
            }

            return data
        })

        if (!image) return null

        // https://stackoverflow.com/questions/44400227/how-to-get-the-url-of-a-file-on-aws-s3-using-aws-sdk
        return image.httpRequest.path

    } catch (error: any) {

        // console.log({ key })
        // console.log({ encode: encodeURI(key) })
        // console.log({ decode: decodeURI(key) })
        // console.log(error)

        log(`Could not send image ${url} to S3`, 'EVENT', getFunctionName(), "ERROR")

        return null
    }
}

export const getImageKitUrl = ( s3ImageKey : string ): string => {

    // TODO/*  */ if empty string, insert placeholder image.

    return `https://ik.imagekit.io/3m391sequ/${s3ImageKey.replace(/\+/g, '%20')}?tr=w-1000,h-1000,f-jpg,fo-auto`
}

/**
 * https://stackoverflow.com/questions/30782693/run-function-in-script-from-command-line-node-js/36480927#36480927
 *
 * npx node -e "import('./dist/services/uploadService.js').then(a => a.applyImageTransformations('61b3b1726911dc2ab33ed9cb'));"
 *
 * @param shopId
 * @returns
 */
export const applyImageTransformations = async ( shopId: string): Promise<any> => {

    console.log(`Start applying image transformations for ${shopId}`)

    const products = await findProductsByShop(new ObjectID(shopId))

    if (!products) {

        console.log(`Could not find products for shop ${shopId}`)

        return null
    }

    for await (const product of products) {

        for await ( const [index, url] of product.images.entries()) {

            if (!url) continue

            const s3Image = await sendExternalFileToS3(url, product._id.toString(), index)

            s3Image
                ? console.log(`Image ${index + 1} of ${product.images.length} for ${product._id}`)
                : console.log(`Could not send image ${index +1} of ${product.images.length} for ${product._id}`)

            if (!s3Image) continue

            product.images[index] = s3Image
        }

        await waitforme(1000)

        const updatedProduct = await updateProductImages(product._id, product)

        updatedProduct
            ? console.log(`Updated product ${product._id}`)
            : console.log(`Could not update product ${product._id}`)

        if (!updatedProduct) continue
    }

    return console.log(`Finish applying image transformations for ${shopId}`)
}
