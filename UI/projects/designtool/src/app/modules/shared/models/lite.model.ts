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
    scenarioOption: ScenarioOption;
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

export const ExteriorSubNavItems: Array<{ label: string, status: any, id: number }> = [
	{ label: "Elevation", status: PointStatus.REQUIRED, id: 1 },
	{ label: "Color Scheme", status: PointStatus.REQUIRED, id: 2 }
];
