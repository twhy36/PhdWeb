import { Action } from '@ngrx/store';
import { ErrorAction } from './error.action';
import { TreeVersionRules } from '../shared/models/rule.model';
import { Tree, OptionImage } from '../shared/models/tree.model';
import { PlanOption } from '../shared/models/option.model';
import { SalesCommunity } from '../shared/models/community.model';
import { Stopwatch } from './stopwatch';
import { SalesAgreement } from '../shared/models/sales-agreement.model';
import { Job, JobChoice } from '../shared/models/job.model';
import { ChangeOrderGroup, ChangeOrderHanding } from '../shared/models/job-change-order.model';
import { LotExt } from '../shared/models/lot.model';

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
