export interface Product {
    _id?: any,
    shop_id: any,
    images: string[],
    category: number,
    subcategory: number,
    nationality: number,
    name: string,
    brand: string,
    gender: 'M' | 'F' | 'U',
    description: string,
    more_info: string,
    height: number,
    width: number,
    length: number,
    weight: number,
    price: number,
    price_discounted: number,
    ean: string,
    sku: string,
    sourceSKU?: string,
    variations?: Variation[] | null,
    is_active: boolean,
    validation?: {
        errors: Validation_Errors[]
    }
}

export interface Validation_Errors {
    field: string
    conditions: string[],
}

export interface Variation {
    _id?: any,
    product_id?: any,
    size?: string | null,
    voltage?: string | null,
    stock: number,
    color?: string,
    flavor?: string,
    gluten_free?: boolean,
    lactose_free?: boolean,
    mapping_id?: string,
    tiny_id?: string,
    parentSKU?: string,
    sourceSKU?: string
}

