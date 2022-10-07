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
	TreeLoaded = 'Tree Loaded',
}

export class LoadPreview implements Action
{
	readonly type = ScenarioActionTypes.LoadPreview;

	constructor(public treeVersionId: number) { }
}

export class LoadPresale implements Action
{
	readonly type = ScenarioActionTypes.LoadPresale;

	constructor(public financialCommunityNumber: number, public lawsonPlanId: number) { }
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

export type ScenarioActions =
	LoadPreview |
	LoadPresale |
	LoadSalesAgreement |
	SelectChoices |
	SetTreeFilter |
	SalesAgreementLoaded |
	SetStatusForPointsDeclined |
	TreeLoaded |
	MyFavoritesChoiceAttributesDeleted |
	LoadError;
