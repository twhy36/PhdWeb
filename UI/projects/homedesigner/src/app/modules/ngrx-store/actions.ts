import { Action } from '@ngrx/store';

import { SalesAgreement, SalesAgreementInfo, Job, SalesCommunity, JobChoice, ChangeOrderHanding,
	Tree, TreeVersionRules, PlanOption, OptionImage, ChangeOrderGroup, LotExt, MyFavorite } from 'phd-common';
import { SalesAgreementLoaded as CommonSalesAgreementLoaded } from 'phd-store';

export enum RootActionTypes {
	ResetFavorites = 'Reset Favorites'
};

export class ResetFavorites implements Action
{
	readonly type = RootActionTypes.ResetFavorites;

	constructor() {	}
}

export class SalesAgreementLoaded extends CommonSalesAgreementLoaded {
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
		public myFavorites: MyFavorite[]) {
			super(salesAgreement, info, job, salesCommunity, choices, selectedPlanId, handing,
				tree, rules, options, optionImages, webPlanMappings, changeOrder, lot);
		}
}
