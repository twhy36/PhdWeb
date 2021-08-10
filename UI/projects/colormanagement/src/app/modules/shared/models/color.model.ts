export interface IColor
{
    name:string,
    colorId:number,
    sku:string,
    edhOptionSubcategoryId:number,
    edhFinancialCommunityId:number,
    isActive:boolean
}

export interface IColorDto{
    name:string,
    colorId:number,
    sku:string,
    optionSubCategoryName:string,
    optionCategoryName:string,
    isActive:boolean
}