import { PlanOption, OptionImage, PointStatus } from 'phd-common';

export class LitePlanOption implements PlanOption
{
    // Implement PlanOption interface
    id: number;
    name: string;
    description: string;
    communityId: number;
    planId: number;
    maxOrderQuantity: number;
    listPrice: number;
    isActive: boolean;
    isBaseHouse: boolean;
    calculatedPrice: number;
    isBaseHouseElevation: boolean;
    attributeGroups: number[];
    locationGroups: number[];
    financialOptionIntegrationKey: string;
    optionImages: OptionImage[];

    // Lite
    optionSubCategoryId: number;
}

export interface ScenarioOption
{
	scenarioOptionId: number;
	scenarioId: number;
	edhPlanOptionId: number;
    planOptionQuantity: number;
}

export enum Elevation
{
	Detached = 361,
	Attached = 362
}

export enum LiteSubMenu
{
    Elevation = 5,
    ColorScheme = 6
}

export const ExteriorSubNavItems: Array<{ label: string, status: any, id: number }> = [
	{ label: "Elevation", status: PointStatus.REQUIRED, id: LiteSubMenu.Elevation },
	{ label: "Color Scheme", status: PointStatus.REQUIRED, id: LiteSubMenu.ColorScheme }
];
