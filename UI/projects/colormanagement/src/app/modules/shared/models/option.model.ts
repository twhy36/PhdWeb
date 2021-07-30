export interface IOptionCategory
{
    name:string,
    id:number
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
