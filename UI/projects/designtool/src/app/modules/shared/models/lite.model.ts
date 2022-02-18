import { PlanOption, OptionImage, PointStatus, MonotonyRuleType } from 'phd-common';

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
	optionCategoryId: number;
    colorItems: ColorItem[] = [];
    optionCommunityId: number;
    mustHavePlanOptionIds: number[];
    cantHavePlanOptionIds: number[];
}

export class LitePlanOptionUI extends LitePlanOption
{
	isSelected: boolean;
	selectedQuantity: number;
    quantityRange: number[] = [];
    isReadonly: boolean;
}

export interface ScenarioOption
{
	scenarioOptionId: number;
	scenarioId: number;
	edhPlanOptionId: number;
    planOptionQuantity: number;
    scenarioOptionColors: ScenarioOptionColor[];
}

export interface ScenarioOptionColor
{
    scenarioOptionColorId: number;
    scenarioOptionId: number;
    colorItemId: number;
    colorId: number;
}

export class ScenarioOptionColorDto implements ScenarioOptionColor
{
    scenarioOptionColorId: number;
    scenarioOptionId: number;
    colorItemId: number;
    colorId: number;
    isDeleted: boolean;
}

export interface ColorItem
{
    colorItemId: number;
    name: string;
    edhPlanOptionId: number;
    isActive: boolean;
    color: Color[];
}

export interface Color
{
    colorId: number;
    name: string;
    sku: string;
    edhFinancialCommunityId: number;
    edhOptionSubcategoryId: number;
    isActive: boolean;
    colorItemId: number;
}

export class OptionRelation
{
    optionRelationId: number;
    mainEdhOptionCommunityId: number;
    relatedEdhOptionCommunityId: number;
    relationType: number;
}

export enum Elevation
{
	Detached = 361,
	Attached = 362
}

export enum LiteSubMenu
{
    Elevation = -5,
    ColorScheme = -6
}

export const ExteriorSubNavItems: Array<{ label: string, status: any, id: number }> = [
	{ label: "Elevation", status: PointStatus.REQUIRED, id: LiteSubMenu.Elevation },
	{ label: "Color Scheme", status: PointStatus.REQUIRED, id: LiteSubMenu.ColorScheme }
];

export interface IOptionCategory
{
    name: string,
    id: number,
    optionSubCategories: Array<IOptionSubCategory>,
}
export interface IOptionSubCategory
{
    name: string,
    id: number,
    optionCategory: IOptionCategory,
	planOptions?: LitePlanOptionUI[]
}

export enum OptionRelationEnum
{
	CantHave = 1,
	MustHave = 2
}

export enum LiteReportType
{
	PRICE_LIST = 'Price List',
	PRICE_LIST_WITH_SALES_DESCRIPTION = 'Price List with sales description',
	SUMMARY = 'Summary',
}

export interface LiteMonotonyRule {
    edhLotId: number;
    relatedLotsElevationColorScheme: Array<LiteMonotonyRuleLot>;
}

export interface LiteMonotonyRuleLot {
    edhLotId: number;
    edhPlanId: number;
    ruleType: MonotonyRuleType;
    elevationPlanOptionId?: number;
    colorSchemeColorName: string;
    colorSchemeColorItemName: string;
}

export class SummaryReportData {
	configurationName: string;
	community?: string;
	plan?: string;
	lot?: string;
	address?: string;
	basePrice?: number;
	lotPremium?: number;
	optionsTotal?: number;
	totalPrice?: number;
	groups?: Array<SummaryReportGroup>;

}

export class SummaryReportGroup {
	groupName?: string;
	groupSubTotal?: number;
	subGroups?: Array<SummaryReportSubGroup>;
}

export class SummaryReportSubGroup {
	subGroupName?: string;
	options?: Array<SummaryReportOption>
}

export class SummaryReportOption {
	name?: string;
	id?: string;
	quantity?: number;
	listPrice?: number;
	subOptions?: Array<SummaryReportSubOption>;
}

export class SummaryReportSubOption {
	attribute?: string;
	attributeValue?: string;
}
