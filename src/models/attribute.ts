import { CATEGORIES } from './category'
import { COLORS } from './color'
import { FLAVORS } from './flavors'
import { SIZES_ALIMENTOS_BEBIDAS, SIZES_BEACHWEAR, SIZES_BEAUTY, SIZES_CALCADOS, SIZES_DEFAULT, SIZES_FITNESS, SIZES_HOME, SIZES_PET } from './size'

export interface Attribute {
    name: string,
    type: string,
    values?: any[]
}

export interface Category_Attribute {
    category: number,
    value: string,
    attributes: Attribute[]
}

export const ATTRIBUTE_SIZE: Attribute = {
    name: 'size',
    type: 'string',
}

export const ATTRIBUTE_COLOR: Attribute = {
    name: 'color',
    type: 'string',
    values: COLORS
}

export const ATTRIBUTE_FLAVOR: Attribute = {
    name: 'flavor',
    type: 'string',
    values: FLAVORS
}

export const ATTRIBUTE_GLUTEN_FREE: Attribute = {
    name: 'gluten_free',
    type: 'boolean',
    values: [true, false]
}

export const ATTRIBUTE_LACTOSE_FREE: Attribute = {
    name: 'lactose_free',
    type: 'boolean',
    values: [true, false]
}

export const ATTRIBUTE_VOLTAGE: Attribute = {
    name: 'voltage',
    type: 'string',
    values: ['110', '220', 'bivolt']
}

export const ATTRIBUTES_ACCESSORY: Category_Attribute = {
    category: 281,
    value: CATEGORIES.find( category => category.code === 281 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_DEFAULT
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_BEACHWEAR: Category_Attribute = {
    category: 282,
    value: CATEGORIES.find( category => category.code === 282 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_BEACHWEAR
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_CALCADOS: Category_Attribute = {
    category: 283,
    value: CATEGORIES.find( category => category.code === 283 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_CALCADOS
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_UNDERWEAR: Category_Attribute = {
    category: 284,
    value: CATEGORIES.find( category => category.code === 284 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_DEFAULT
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_FITNESS: Category_Attribute = {
    category: 285,
    value: CATEGORIES.find( category => category.code === 285 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_FITNESS
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_ROUPAS: Category_Attribute = {
    category: 286,
    value: CATEGORIES.find( category => category.code === 286 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_DEFAULT
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_HOME: Category_Attribute = {
    category: 288,
    value: CATEGORIES.find( category => category.code === 288 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_HOME
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_BEAUTY: Category_Attribute = {
    category: 289,
    value: CATEGORIES.find( category => category.code === 289 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_BEAUTY
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_KIDS_TEEN: Category_Attribute = {
    category: 407,
    value: CATEGORIES.find( category => category.code === 407 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_DEFAULT
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_JOIAS: Category_Attribute = {
    category: 426,
    value: CATEGORIES.find( category => category.code === 426 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_DEFAULT
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_BIJOUX: Category_Attribute = {
    category: 435,
    value: CATEGORIES.find( category => category.code === 435 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_DEFAULT
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_PET: Category_Attribute = {
    category: 449,
    value: CATEGORIES.find( category => category.code === 449 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_PET
        },
        ATTRIBUTE_COLOR
    ]
}

export const ATTRIBUTES_ALIMENTOS_BEBIDAS: Category_Attribute = {
    category: 450,
    value: CATEGORIES.find( category => category.code === 450 )!.value,
    attributes: [
        {
            ...ATTRIBUTE_SIZE,
            values: SIZES_ALIMENTOS_BEBIDAS
        },
        ATTRIBUTE_FLAVOR,
        ATTRIBUTE_GLUTEN_FREE,
        ATTRIBUTE_LACTOSE_FREE
    ]
}

export const ATTRIBUTES = [
    ATTRIBUTES_ACCESSORY,
    ATTRIBUTES_ALIMENTOS_BEBIDAS,
    ATTRIBUTES_BEACHWEAR,
    ATTRIBUTES_UNDERWEAR,
    ATTRIBUTES_ROUPAS,
    ATTRIBUTES_BEAUTY,
    ATTRIBUTES_CALCADOS,
    ATTRIBUTES_FITNESS,
    ATTRIBUTES_HOME,
    ATTRIBUTES_JOIAS,
    ATTRIBUTES_BIJOUX,
    ATTRIBUTES_KIDS_TEEN,
    ATTRIBUTES_PET
]
