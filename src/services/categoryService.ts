//
//      Token Service
//

import { log } from "../utils/loggerUtil"
import { getFunctionName } from "../utils/util"
import { CATEGORIES, Category, SUBCATEGORIES } from "../models/category"

/**
 * List category
 * 
 */
export const getAllCategories = async (): Promise<Category[]> => {

    const categories = CATEGORIES

    categories
        ? log( `Listing categories`, 'EVENT', getFunctionName() )
        : log( `Could not retrieve category list.`, 'EVENT', getFunctionName(), 'ERROR' )

    return categories
}

/**
 * List subcategories from category
 * 
 * @param category_code  `category_code`
 */
export const getAllSubCategories = async ( category_code: number ): Promise<Category[]> => {

    const subcategories = SUBCATEGORIES.filter( subcategory => subcategory.categoryCode === category_code )

    subcategories
        ? log( `Listing sub categories`, 'EVENT', getFunctionName() )
        : log( `Could not retrieve sub category list.`, 'EVENT', getFunctionName(), 'ERROR' )

    return subcategories
}

/**
 * Retrieve a category that has the same code
 * 
 * @param code  `code`
 */
export const getCategory = async ( code: number ): Promise<Category[]> => {

    const category = CATEGORIES.filter( category => category.code === code )

    category
        ? log( `Category ${ category } found`, 'EVENT', getFunctionName() )
        : log( `Could not retrieve category.`, 'EVENT', getFunctionName(), 'ERROR' )

    return category
}


/**
 * Retrieve a subcategory that has the same code
 * 
 * @param code  `code`
 */
export const getSubCategory = async ( code: number ): Promise<Category[]> => {

    const subcategory = SUBCATEGORIES.filter( subcategory => subcategory.code === code )

    subcategory
        ? log( `Subcategory ${ subcategory } found`, 'EVENT', getFunctionName() )
        : log( `Could not retrieve subcategory.`, 'EVENT', getFunctionName(), 'ERROR' )

    return subcategory
}
