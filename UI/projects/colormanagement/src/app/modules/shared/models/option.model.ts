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

//This is for the dummy attribute group
export enum AttributeGroupKey
{
    MarketKey = '9997',
    FinancialCommunityKey = '8997'
}
