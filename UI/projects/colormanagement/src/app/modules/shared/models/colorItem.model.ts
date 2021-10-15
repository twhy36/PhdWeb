import { IColor } from './color.model';
export interface IColorItem
{
    colorItemId: number,
    name: string,
    edhPlanOptionId: number,
    isActive: boolean,
    colorItemColorAssoc: IColorItemColorAssoc
}
export interface IColorItemDto
{
    colorItemId: number,
    name: string,
    isActive: boolean,
    edhPlanOptionId: number,
    colors: Array<IColor>   
}
export interface IColorItemColorAssoc
{
    colorId: number,
    colorItemId: number,
    color: IColor
}