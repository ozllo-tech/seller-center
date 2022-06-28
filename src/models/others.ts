import { Order } from './order'
import { Product } from './product'

export interface MuterFile {
    fieldname: string,
    originalname: string,
    encoding: string,
    mimetype: string,
    size: number,
    bucket: string,
    key: string,
    acl: string,
    contentType: string,
    contentDisposition: string | null,
    storageClass: string,
    serverSideEncryption: string | null,
    metadata: { fieldName: string },
    location: string,
    etag: string,
    versionId?: any
}

export interface PaginatedResults {
    items?: Product[] | Order[],
    total: number,
    next?: PaginatedResultsPage,
    previous?: PaginatedResultsPage,
}

export interface PaginatedResultsPage {
    page: number,
    limit: number,
}
