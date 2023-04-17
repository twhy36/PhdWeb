import { Action } from '@ngrx/store';

import
{
	SalesCommunity, Job, JobChoice, ChangeOrderGroup, ChangeOrderHanding, LotExt, PlanOption,
	TreeVersionRules, SalesAgreement, Tree, OptionImage, SalesAgreementInfo, MyFavorite, DesignToolAttribute,
	MyFavoritesChoice
} from 'phd-common';

import { ErrorAction } from './error.action';

export enum CommonActionTypes
{
	LoadSalesAgreement = 'Load Sales Agreement',
	SalesAgreementLoaded = 'Sales Agreement Loaded',
	ResetFavorites = 'Reset Favorites',
	MyFavoritesChoiceAttributesDeleted = 'My Favorites Choices Attributes Deleted',
	LoadError = 'Load Error',
	PageNotFound = 'Page Not Found',
	SetLatestError = 'Set Latest Error',
	ClearLatestError = 'Clear Latest Error',
	GuardError = 'Guard Error',
	TimeoutError = 'Timeout Error'
};

export class LoadSalesAgreement implements Action
{
	readonly type = CommonActionTypes.LoadSalesAgreement;

	constructor(
		public salesAgreementId: number,
		public clearState: boolean = true,
		public isBuyerPreview: boolean = false
	) { }
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
		public lot: LotExt,
		public myFavorites: MyFavorite[]
	)
	{ }
}

export class ResetFavorites implements Action
{
	readonly type = CommonActionTypes.ResetFavorites;

	constructor() { }
}

export class MyFavoritesChoiceAttributesDeleted implements Action
{
	readonly type = CommonActionTypes.MyFavoritesChoiceAttributesDeleted;

	constructor(public attributes: DesignToolAttribute[], public locations: DesignToolAttribute[], public myFavoritesChoice: MyFavoritesChoice) { }
}

export class LoadError extends ErrorAction
{
	readonly type = CommonActionTypes.LoadError;

	constructor(public error: Error,
		public friendlyMessage?: string,
		public errFrom?: string)
	{ super(error, friendlyMessage, errFrom); }
}
