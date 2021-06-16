import { Action } from '@ngrx/store';

import {
	SalesCommunity, Job, JobChoice, ChangeOrderGroup, ChangeOrderHanding, LotExt, PlanOption, 
	TreeVersionRules, SalesAgreement, Tree, OptionImage, SalesAgreementInfo
} from 'phd-common';

import { ErrorAction } from './error.action';
import { Stopwatch } from './stopwatch';

export enum CommonActionTypes {
    LoadSalesAgreement = 'Load Sales Agreement',
	SalesAgreementLoaded = 'Sales Agreement Loaded',
    LoadError = 'Load Error'
};

export class LoadError extends ErrorAction
{
	readonly type = CommonActionTypes.LoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
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
		public lot: LotExt
	)
	{}
}
