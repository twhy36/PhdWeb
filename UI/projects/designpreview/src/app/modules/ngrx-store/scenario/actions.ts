import { Action } from '@ngrx/store';

import { TreeFilter, DesignToolAttribute, Tree, TreeVersionRules, PlanOption, OptionImage, LotExt, SalesCommunity } from 'phd-common';
import { LoadSalesAgreement, SalesAgreementLoaded, MyFavoritesChoiceAttributesDeleted, LoadError } from '../actions';

export enum ScenarioActionTypes
{
	LoadPreview = 'Load Preview',
	LoadPresale = 'Load Presale',
	SelectChoices = 'Select Choices',
	SetTreeFilter = 'Set Tree filter',
	SetStatusForPointsDeclined = 'Set Status For Points Declined',
	SetPresalePricingEnabled = 'Set Presale Pricing Enabled',
	TreeLoaded = 'Tree Loaded',
	SetChoicePriceRanges = 'Set Choice Price Ranges'
}

export class LoadPreview implements Action
{
	readonly type = ScenarioActionTypes.LoadPreview;

	constructor(public treeVersionId: number, public clearState: boolean = true) { }
}

export class LoadPresale implements Action
{
	readonly type = ScenarioActionTypes.LoadPresale;

	constructor(public planCommunityId: number, public clearState: boolean = true) { }
}

export class SelectChoices implements Action
{
	readonly type = ScenarioActionTypes.SelectChoices;
	public choices: { choiceId: number, divChoiceCatalogId: number, quantity: number, attributes?: DesignToolAttribute[] }[];
	public isDesignComplete: boolean;

	constructor(isDesignComplete: boolean, ...choices: { choiceId: number, divChoiceCatalogId: number, quantity: number, attributes?: DesignToolAttribute[] }[])
	{
		this.choices = choices;
		this.isDesignComplete = isDesignComplete;
	}
}

export class SetTreeFilter implements Action
{
	readonly type = ScenarioActionTypes.SetTreeFilter;

	constructor(public treeFilter: TreeFilter) { }
}

export class SetStatusForPointsDeclined implements Action
{
	readonly type = ScenarioActionTypes.SetStatusForPointsDeclined;

	constructor(public divPointCatalogIds: number[], public removed: boolean) { }
}

export class TreeLoaded implements Action
{
	readonly type = ScenarioActionTypes.TreeLoaded;

	constructor(public tree: Tree, public rules: TreeVersionRules, public options: PlanOption[], public optionImages: OptionImage[], public salesCommunity: SalesCommunity, public lot?: LotExt) { }
}

export class SetPresalePricingEnabled implements Action
{
	readonly type = ScenarioActionTypes.SetPresalePricingEnabled;

	constructor(public isEnabled: boolean) { }
}
export class SetChoicePriceRanges implements Action
{
	readonly type = ScenarioActionTypes.SetChoicePriceRanges;

	constructor(public priceRanges: { choiceId: number, min: number, max: number }[]) { }
}

export type ScenarioActions =
	LoadPreview |
	LoadPresale |
	LoadSalesAgreement |
	SelectChoices |
	SetTreeFilter |
	SalesAgreementLoaded |
	SetStatusForPointsDeclined |
	SetPresalePricingEnabled |
	TreeLoaded |
	MyFavoritesChoiceAttributesDeleted |
	LoadError |
	SetChoicePriceRanges;
