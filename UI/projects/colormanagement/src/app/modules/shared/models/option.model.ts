export interface IOptionCategory
{
    name:string,
    id:number,
    optionSubCategory:Array<IOptionSubCategory>
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
