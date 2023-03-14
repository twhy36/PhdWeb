import { Action } from '@ngrx/store';

import
{
	DesignToolAttribute, SalesCommunity, ChangeOrderHanding, JobChoice, Job, LotExt, PlanOption,
	TreeVersionRules, Scenario, DtoScenarioInfo, TreeFilter, Tree, OptionImage, Choice, Log, TimeOfSaleOptionPrice, LotChoiceRules, DecisionPointFilterType
} from 'phd-common';

import { ErrorAction } from '../error.action';
import { LoadScenario, ScenarioLoaded, SalesAgreementLoaded, JobLoaded } from '../actions';

export enum ScenarioActionTypes
{
	CreateScenario = 'Create Scenario',
	DeleteScenarioInfo = 'Delete Scenario Info',
	IsFloorplanFlippedScenario = 'Scenario Floorplan Flipped Saved',
	LoadError = 'Scenario Load Error',
	LoadPreview = 'Load Preview',
	LoadTree = 'Load Tree',
	LotConflict = 'Lot Conflict',
	MonotonyAdvisementShown = 'Monotony Advisement Shown',
	SaveError = 'Save Error',
	SaveScenario = 'Save Scenario',
	SaveScenarioInfo = 'Save Scenario Info',
	ScenarioInfoSaved = 'Scenario Info Saved',
	ScenarioSaved = 'Scenario Saved',
	SelectChoices = 'Select Choices',
	SetBuildMode = 'Set Build Mode',
	SetFinancialCommunityFilter = 'Set Financial Community Filter',
	SetIsFloorplanFlippedScenario = 'Set Scenario Floorplan Flipped',
	SetPointTypeFilter = 'Set Point Type Filter',
	SetPointViewed = 'Set Point Viewed',
	SetChoicePriceRanges = 'Set Choice Price Ranges',
	SetScenarioLot = 'Set Scenario Lot',
	SetScenarioLotHanding = 'Set Scenario Lot Handing',
	SetScenarioPlan = 'Set Scenario Plan',
	SetScenarioName = 'Set Scenario Name',
	SetTreeFilter = 'Set Tree filter',
	TreeLoaded = 'Tree Loaded',
	TreeLoadedFromJob = 'Tree Loaded From Job',
	SetOverrideReason = 'Set Override Reason',
	SetLockedInChoices = 'Set Locked In Choices',
	SelectRequiredChoiceAttributes = 'Select Required Choice Attributes',
	RequiredChoiceAttributesSelected = 'Required Choice Attributes Selected'
}

export class LoadTree implements Action
{
	readonly type = ScenarioActionTypes.LoadTree;

	constructor(public scenario: Scenario) { }
}

@Log(true)
export class LoadPreview implements Action
{
	readonly type = ScenarioActionTypes.LoadPreview;

	constructor(public treeVersionId: number) { }
}

@Log()
export class LotConflict implements Action
{
	readonly type = ScenarioActionTypes.LotConflict;

	constructor() { }
}

export class TreeLoaded implements Action
{
	readonly type = ScenarioActionTypes.TreeLoaded;

	constructor(public tree: Tree, public rules: TreeVersionRules, public options: PlanOption[], public optionImages: OptionImage[], public lot?: LotExt, public salesCommunity: SalesCommunity = null) { }
}

export class TreeLoadedFromJob implements Action
{
	readonly type = ScenarioActionTypes.TreeLoadedFromJob;

	constructor(public choices: JobChoice[], public tree: Tree, public rules: TreeVersionRules, public options: PlanOption[], public optionImages: OptionImage[], public lot: LotExt, public job: Job, public salesCommunity: SalesCommunity) { }
}

export class LoadError extends ErrorAction
{
	readonly type = ScenarioActionTypes.LoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

@Log(true)
export class SelectChoices implements Action
{
	readonly type = ScenarioActionTypes.SelectChoices;
	public choices: { choiceId: number, overrideNote: string, quantity: number, attributes?: DesignToolAttribute[], timeOfSaleOptionPrices?: TimeOfSaleOptionPrice[], attributeOnly?: boolean, cancellingChangeOrder?: boolean }[];
	public save: boolean;

	constructor(save: boolean, ...choices: { choiceId: number, overrideNote: string, quantity: number, attributes?: DesignToolAttribute[], timeOfSaleOptionPrices?: TimeOfSaleOptionPrice[], attributeOnly?: boolean, cancellingChangeOrder?: boolean }[])
	{
		this.choices = choices;
		this.save = save;
	}
}

@Log(true)
export class CreateScenario implements Action
{
	readonly type = ScenarioActionTypes.CreateScenario;

	constructor(public opportunityId: string, public scenarioName: string) { }
}

@Log(true)
export class SetScenarioPlan implements Action
{
	readonly type = ScenarioActionTypes.SetScenarioPlan;

	constructor(public treeVersionId: number, public planId: number) { }
}

@Log(true)
export class SetScenarioLot implements Action
{
	readonly type = ScenarioActionTypes.SetScenarioLot;

	constructor(public lotId: number, public handing: ChangeOrderHanding, public premium: number, public lotChoiceRules?: LotChoiceRules[]) { }
}

@Log(true)
export class SetScenarioLotHanding implements Action
{
	readonly type = ScenarioActionTypes.SetScenarioLotHanding;

	constructor(public handing: ChangeOrderHanding) { }
}

@Log(true)
export class SetScenarioName implements Action
{
	readonly type = ScenarioActionTypes.SetScenarioName;

	constructor(public scenarioName: string) { }
}

export class SaveScenario implements Action
{
	readonly type = ScenarioActionTypes.SaveScenario;

	constructor() { }
}

export class ScenarioSaved implements Action
{
	readonly type = ScenarioActionTypes.ScenarioSaved;

	constructor(public scenario: Scenario) { }
}

export class SaveError extends ErrorAction
{
	readonly type = ScenarioActionTypes.SaveError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export class SetPointViewed implements Action
{
	readonly type = ScenarioActionTypes.SetPointViewed;

	constructor(public pointId: number) { }
}

export class SaveScenarioInfo implements Action
{
	readonly type = ScenarioActionTypes.SaveScenarioInfo;

	constructor(public scenarioInfo: DtoScenarioInfo) { }
}

export class ScenarioInfoSaved implements Action
{
	readonly type = ScenarioActionTypes.ScenarioInfoSaved;

	constructor(public scenarioInfo: DtoScenarioInfo) { }
}

export class SetPointTypeFilter implements Action
{
	readonly type = ScenarioActionTypes.SetPointTypeFilter;

	constructor(public pointTypeFilter: DecisionPointFilterType) { }
}

export class MonotonyAdvisementShown implements Action
{
	readonly type = ScenarioActionTypes.MonotonyAdvisementShown;

	constructor() { }
}

export class DeleteScenarioInfo implements Action
{
	readonly type = ScenarioActionTypes.DeleteScenarioInfo;

	constructor() { }
}

export class SetBuildMode implements Action
{
	readonly type = ScenarioActionTypes.SetBuildMode;

	constructor(public buildMode: 'buyer' | 'spec' | 'model' | 'preview') { }
}

export class SetFinancialCommunityFilter implements Action
{
	readonly type = ScenarioActionTypes.SetFinancialCommunityFilter;

	constructor(public financialCommunityId: number) { }
}

export class SetTreeFilter implements Action
{
	readonly type = ScenarioActionTypes.SetTreeFilter;

	constructor(public treeFilter: TreeFilter) { }
}

export class IsFloorplanFlippedScenario implements Action
{
	readonly type = ScenarioActionTypes.IsFloorplanFlippedScenario;

	constructor(public flipped: boolean) { }
}

export class SetIsFloorplanFlippedScenario implements Action
{
	readonly type = ScenarioActionTypes.SetIsFloorplanFlippedScenario;

	constructor(public isFlipped: boolean) { }
}

@Log(true)
export class SetOverrideReason implements Action
{
	readonly type = ScenarioActionTypes.SetOverrideReason;
	constructor(public overrideReason: string) { }
}

export class SetChoicePriceRanges implements Action
{
	readonly type = ScenarioActionTypes.SetChoicePriceRanges;

	constructor(public priceRanges: { choiceId: number, min: number, max: number }[]) { }
}

export class SetLockedInChoices implements Action
{
	readonly type = ScenarioActionTypes.SetLockedInChoices;

	constructor(public choices: Choice[]) { }
}

@Log()
export class SelectRequiredChoiceAttributes implements Action
{
	readonly type = ScenarioActionTypes.SelectRequiredChoiceAttributes;

	constructor(public choices?: Choice[]) { }
}

@Log()
export class RequiredChoiceAttributesSelected implements Action
{
	readonly type = ScenarioActionTypes.RequiredChoiceAttributesSelected;

	constructor(public tree: Tree) { }
}

export type ScenarioActions =
	CreateScenario |
	DeleteScenarioInfo |
	IsFloorplanFlippedScenario |
	LoadError |
	LoadPreview |
	LoadScenario |
	LoadTree |
	LotConflict |
	MonotonyAdvisementShown |
	SaveError |
	SaveScenario |
	SaveScenarioInfo |
	ScenarioInfoSaved |
	ScenarioLoaded |
	ScenarioSaved |
	SelectChoices |
	SetBuildMode |
	SetFinancialCommunityFilter |
	SetIsFloorplanFlippedScenario |
	SetPointTypeFilter |
	SetPointViewed |
	SetScenarioLot |
	SetScenarioLotHanding |
	SetScenarioPlan |
	SetScenarioName |
	SetTreeFilter |
	TreeLoaded |
	TreeLoadedFromJob |
	SetOverrideReason |
	SalesAgreementLoaded |
	JobLoaded |
	SetChoicePriceRanges |
	SetLockedInChoices |
	SelectRequiredChoiceAttributes |
	RequiredChoiceAttributesSelected;
