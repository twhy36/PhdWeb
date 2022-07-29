export interface IOptionCategory
{
    name:string,
    id:number,
    optionSubCategories:Array<IOptionSubCategory>
}
export interface IOptionSubCategory
{
    name:string,
    id:number,
    optionCategory:IOptionCategory
}
export interface IOptionCommunity
{
  id: number,
  financialCommunityId: number,
  optionSubCategory:IOptionSubCategory
}

export interface OptionPackageListItemDto 
{
    id: number;
    financialCommunityId: number;
    optionSubCategoryId: number;
    optionSalesName: string;
    planOptionCommunities:
    {
        id: number;
        planId: number;
        maxOrderQty: number;
    }[];
    optionSubCategory: 
    {
        name:string;
        id:number;
        optionCategory: 
        {
            id: number;
            name: string;
          }
    };
}

//This is for the dummy attribute group
export enum AttributeGroupKey
{
    MarketKey = '9997',
    FinancialCommunityKey = '8997'
}
