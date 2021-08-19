import { Action } from '@ngrx/store';

import {
	SalesCommunity, ESignEnvelope, ChangeOrderGroup, ChangeOrderHanding, Job, JobChoice, LotExt,
	OpportunityContactAssoc, PlanOption, TreeVersionRules, SalesAgreement, SalesAgreementInfo, Scenario,
	Tree, OptionImage, MyFavorite
} from 'phd-common';

import { ErrorAction } from './error.action';
import { Stopwatch } from './stopwatch';

export enum CommonActionTypes {
    LoadScenario = "Load Scenario",
    ScenarioLoaded = "Scenario Loaded",
    LoadSalesAgreement = 'Load Sales Agreement',
    SalesAgreementLoaded = 'Sales Agreement Loaded',
    LoadSpec = 'Load Spec',
    JobLoaded = 'Job Loaded',
    LoadError = 'Load Error',
	ChangeOrderEnvelopeCreated = 'Change Order Envelope Created',
    ESignEnvelopesLoaded = 'ESign Envelopes Loaded',
	SalesAgreementCancelled = 'Sales Agreement Cancelled',
	ChangeOrdersUpdated = 'Change Orders Updated'
};

export class LoadError extends ErrorAction
{
	readonly type = CommonActionTypes.LoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

@Stopwatch([CommonActionTypes.ScenarioLoaded, CommonActionTypes.LoadError])
export class LoadScenario implements Action
{
	readonly type = CommonActionTypes.LoadScenario;

	constructor(public scenarioId: number) { }
}

export class ScenarioLoaded implements Action
{
	readonly type = CommonActionTypes.ScenarioLoaded;

	constructor(
		public scenario: Scenario,
		public tree: Tree,
		public rules: TreeVersionRules,
		public options: PlanOption[],
		public optionImages: OptionImage[],
		public lot: LotExt,
		public salesCommunity: SalesCommunity,
		public lotNoLongerAvailable: boolean,
		public opportunity: OpportunityContactAssoc,
		public marketingPlanId: number[],
		public overrideReason: string,
		public job: Job) { }
}

@Stopwatch([CommonActionTypes.SalesAgreementLoaded, CommonActionTypes.LoadError])
export class LoadSalesAgreement implements Action
{
	readonly type = CommonActionTypes.LoadSalesAgreement;

	constructor(public salesAgreementId: number, public clearState: boolean = true) { }
}

export class SalesAgreementLoaded implements Action
{
	readonly type = CommonActionTypes.SalesAgreementLoaded;

	public opportunity: OpportunityContactAssoc;

	constructor(
		public salesAgreement: SalesAgreement,
		public info: SalesAgreementInfo,
		public job: Job,
		public salesCommunity: SalesCommunity,
		public choices: JobChoice[],
		public selectedPlanId: number,
		public handing: ChangeOrderHanding,
		public tree: Tree,
		public rules: TreeVersionRules,
		public options: PlanOption[],
		public optionImages: OptionImage[],
		public webPlanMappings: number[],
		public changeOrder: ChangeOrderGroup,
		public lot: LotExt,
		public myFavorites: MyFavorite[]
	)
	{
		this.opportunity = this.salesAgreement.buyers && this.salesAgreement.buyers.length ? this.salesAgreement.buyers.find(t => t.isPrimaryBuyer).opportunityContactAssoc : null;
	}
}

@Stopwatch([CommonActionTypes.JobLoaded, CommonActionTypes.LoadError])
export class LoadSpec implements Action
{
	readonly type = CommonActionTypes.LoadSpec;

	constructor(public job: Job) { }
}

export class JobLoaded implements Action
{
	readonly type = CommonActionTypes.JobLoaded;

	constructor(
		public job: Job,
		public salesAgreement: SalesAgreement,
		public salesCommunity: SalesCommunity,
		public choices: JobChoice[],
		public selectedPlanId: number,
		public handing: ChangeOrderHanding,
		public tree: Tree,
		public rules: TreeVersionRules,
		public options: PlanOption[],
		public optionImages: OptionImage[],
		public webPlanMappings: number[],
		public changeOrder: ChangeOrderGroup,
		public lot: LotExt
	) { }
}

export class ESignEnvelopesLoaded implements Action
{
	readonly type = CommonActionTypes.ESignEnvelopesLoaded;

	constructor(public jobChangeOrderEnvelopes: ESignEnvelope[], public checkExpiredEnvelopes: boolean = false) { }
}

export class ChangeOrderEnvelopeCreated implements Action {
	readonly type = CommonActionTypes.ChangeOrderEnvelopeCreated;

	constructor(public changeOrder: any, public eSignEnvelope: ESignEnvelope) { }
}

export class SalesAgreementCancelled implements Action
{
	readonly type = CommonActionTypes.SalesAgreementCancelled;

	constructor(public salesAgreement: SalesAgreement, public job: Job, public buildType: string) { }
}

export class ChangeOrdersUpdated implements Action {
	readonly type = CommonActionTypes.ChangeOrdersUpdated;

	constructor(public changeOrders: Array<ChangeOrderGroup>) { }
}

