import { Action } from '@ngrx/store';
import
{
	ChangeOrderGroup, ChangeInput, ChangeOrderNonStandardOption, ChangeOrderHanding, Note, SalesAgreement,
	SalesChangeOrderPriceAdjustment, SalesChangeOrderSalesProgram, ChangeOrderBuyer, Log
} from 'phd-common';
import { ErrorAction } from '../error.action';
import { SalesAgreementLoaded, JobLoaded, ESignEnvelopesLoaded, ChangeOrderEnvelopeCreated, ChangeOrdersUpdated } from '../actions';

export enum ChangeOrderActionTypes
{
	AddChangeOrderCoBuyer = 'Add Change Order Co Buyer',
	CancelJobChangeOrder = 'Cancel Job Change Order',
	CancelNonStandardChangeOrder = 'Cancel Non Standard Change Order',
	CancelPlanChangeOrder = 'Cancel Plan Change Order',
	CancelLotTransferChangeOrder = 'Cancel Lot Transfer Change Order',
	CancelSalesChangeOrder = 'Cancel Sales Change Order',
	ChangeInputInitialized = 'Change Input Initialized',
	ChangeOrdersCreated = 'Change Orders Created',
	CreateCancellationChangeOrder = 'Create Cancellation Change Order',
	CreateJobChangeOrders = 'Create Job Change Orders',
	CreatePlanChangeOrder = 'Create Plan Change Order',
	CreateNonStandardChangeOrder = 'Create Non Standard Change Order',
	CreateLotTransferChangeOrder = 'Create Lot Transfer Change Order',
	CurrentChangeOrderCancelled = 'Current Change Order Cancelled',
	CurrentChangeOrderOutForSignature = 'Current Change Order Out For Signature',
	CurrentChangeOrderSigned = 'Current Change Order Signed',
	CurrentChangeOrderApproved = 'Current Change Order Approved',
	CurrentChangeOrderLoaded = 'Change Order Loaded',
	CurrentChangeOrderPending = 'Current Change Order Pending',
	DeleteChangeOrderCoBuyer = 'Delete Change Order Co Buyer',
	DeleteSalesChangeOrderPriceAdjustment = 'Delete Sales Change Order Price Adjustment',
	LoadError = 'Load Error',
	ReSortChangeOrderBuyers = 'Resort Change Order Buyers',
	SaveChangeOrderScenario = 'Save Change Order Scenario',
	SavePendingJio = 'Save Pending Jio',
	SetChangeOrderDescription = 'Set Change Order Description',
	SetChangeOrderNote = 'Set Change Order Note',
	SetChangeOrderOverrideNote = 'Set Change Order Override Note',
	SaveError = 'Save Error',
	SetChangeOrderHanding = 'Set Change Order Handing',
	SetChangeOrderTrustName = 'Set Change Order Trust Name',
	SetChangingOrder = 'Set Changing Order',
	SetCurrentChangeOrder = 'Set Current Change Order',
	SwapChangeOrderPrimaryBuyer = 'Swap Change Order Primary Buyer',
	UpdateChangeOrderBuyer = 'Update Change Order Buyer',
	UpdateSalesChangeOrderPriceAdjustment = 'Update Sales Change Order Price Adjustment',
	CreateSalesChangeOrder = 'Create Sales Change Order',
	SetSalesChangeOrderPriceAdjustments = 'Set Sales Change Order Price Adjustments',
	SetSalesChangeOrderSalesPrograms = 'Set Sales Change Order Sales Programs',
	SetChangeOrderLot = 'Set Change Order Lot',
	SetChangeOrderRevertToDirt = 'Set Change Order Revert To Dirt',
	ResubmitChangeOrder = 'Resubmit Change Order',
	SetChangeOrderNonStandardOptions = 'Set Change Order Non Standard Options',
	ChangeOrderOutForSignature = 'Change Order Out For Signature',
	SetChangeOrderPlanId = 'Set Change Order Plan Id',
	SetSalesChangeOrderTermsAndConditions = 'Set change order Terms and Conditions',
	SalesChangeOrderTermsAndConditionsSaved = 'Sales Change Order Terms And Conditions Saved',
	DeleteTermsAndConditions = 'Delete Terms and Conditons',
	SetIsChangeOrderComplete = 'Set Is Change Order Complete'
}

@Log(true)
export class SetChangingOrder implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangingOrder;

	constructor(public isChangingOrder: boolean, public changeInput: ChangeInput, public cancel?: boolean, public handing?: ChangeOrderHanding, public changeOrderGroupSequence?: number) { }
}

@Log()
export class CurrentChangeOrderLoaded implements Action
{
	readonly type = ChangeOrderActionTypes.CurrentChangeOrderLoaded;

	constructor(public changeOrder: ChangeOrderGroup, public handing: ChangeOrderHanding) { }
}

export class LoadError extends ErrorAction
{
	readonly type = ChangeOrderActionTypes.LoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

@Log(true)
export class SetChangeOrderDescription implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderDescription;

	constructor(public changeOrderDescription: string) { }
}

export class SetChangeOrderNote implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderNote;

	constructor(public changeOrderNote: string) { }
}

export class SaveChangeOrderScenario implements Action
{
	readonly type = ChangeOrderActionTypes.SaveChangeOrderScenario;

	constructor() { }
}

@Log(true)
export class ChangeInputInitialized implements Action
{
	readonly type = ChangeOrderActionTypes.ChangeInputInitialized;

	constructor(public changeInput: ChangeInput) { }
}

@Log(true)
export class SetChangeOrderTrustName implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderTrustName;

	constructor(public trustName: string) { }
}

@Log(true)
export class UpdateChangeOrderBuyer implements Action
{
	readonly type = ChangeOrderActionTypes.UpdateChangeOrderBuyer;

	constructor(public changeOrderBuyer: ChangeOrderBuyer) { }
}

@Log(true)
export class AddChangeOrderCoBuyer implements Action
{
	readonly type = ChangeOrderActionTypes.AddChangeOrderCoBuyer;

	constructor(public changeOrderBuyer: ChangeOrderBuyer) { }
}

@Log(true)
export class DeleteChangeOrderCoBuyer implements Action
{
	readonly type = ChangeOrderActionTypes.DeleteChangeOrderCoBuyer;

	constructor(public changeOrderBuyer: ChangeOrderBuyer) { }
}

@Log(true)
export class SwapChangeOrderPrimaryBuyer implements Action
{
	readonly type = ChangeOrderActionTypes.SwapChangeOrderPrimaryBuyer;

	constructor(public changeOrderBuyer: ChangeOrderBuyer) { }
}

@Log(true)
export class ReSortChangeOrderBuyers implements Action
{
	readonly type = ChangeOrderActionTypes.ReSortChangeOrderBuyers;

	constructor(public sourceSortKey: number, public targetSortKey: number) { }
}

@Log()
export class CurrentChangeOrderCancelled implements Action
{
	readonly type = ChangeOrderActionTypes.CurrentChangeOrderCancelled;

	constructor() { }
}

@Log(true)
export class CurrentChangeOrderOutForSignature implements Action
{
	readonly type = ChangeOrderActionTypes.CurrentChangeOrderOutForSignature;

	constructor(public statusUtcDate: Date) { }
}

@Log(true)
export class CurrentChangeOrderSigned implements Action
{
	readonly type = ChangeOrderActionTypes.CurrentChangeOrderSigned;

	constructor(public statusUtcDate: Date) { }
}

@Log(true)
export class CurrentChangeOrderApproved implements Action
{
	readonly type = ChangeOrderActionTypes.CurrentChangeOrderApproved;

	constructor() { }
}

@Log(true)
export class CurrentChangeOrderPending implements Action
{
	readonly type = ChangeOrderActionTypes.CurrentChangeOrderPending;

	constructor(public statusUtcDate: Date, public eSignEnvelopeId: number) { }
}

@Log()
export class CreateJobChangeOrders implements Action
{
	readonly type = ChangeOrderActionTypes.CreateJobChangeOrders;

	constructor() { }
}

@Log()
export class ChangeOrdersCreated implements Action
{
	readonly type = ChangeOrderActionTypes.ChangeOrdersCreated;

	constructor(public changeOrders: Array<ChangeOrderGroup>) { }
}

@Log(true)
export class SaveError extends ErrorAction
{
	readonly type = ChangeOrderActionTypes.SaveError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

@Log()
export class CancelJobChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CancelJobChangeOrder;

	constructor(public isChangeDirty: boolean = true) { }
}

@Log(["handing"])
export class SetChangeOrderHanding implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderHanding;

	constructor(public handing: ChangeOrderHanding, public dirty: boolean = true) { }
}

@Log(true)
export class CreateSalesChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CreateSalesChangeOrder;

	constructor(public specSales: boolean = false) { }
}

@Log(true)
export class CreateNonStandardChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CreateNonStandardChangeOrder;

	constructor(public options: Array<ChangeOrderNonStandardOption>) { }
}

@Log()
export class CreatePlanChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CreatePlanChangeOrder;

	constructor() { }
}

@Log()
export class CancelPlanChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CancelPlanChangeOrder;

	constructor() { }
}

@Log(true)
export class SetSalesChangeOrderPriceAdjustments implements Action
{
	readonly type = ChangeOrderActionTypes.SetSalesChangeOrderPriceAdjustments;

	constructor(public salesChangeOrderPriceAdjustments: Array<SalesChangeOrderPriceAdjustment>) { }
}

@Log(true)
export class SetSalesChangeOrderSalesPrograms implements Action
{
	readonly type = ChangeOrderActionTypes.SetSalesChangeOrderSalesPrograms;

	constructor(public action: string, public salesChangeOrderSalesPrograms: Array<SalesChangeOrderSalesProgram>, public agreement?: SalesAgreement, public originalProgramId?: number) { }
}

@Log()
export class CancelLotTransferChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CancelLotTransferChangeOrder;

	constructor() { }
}

@Log()
export class CancelSalesChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CancelSalesChangeOrder;

	constructor() { }
}

@Log()
export class DeleteSalesChangeOrderPriceAdjustment implements Action
{
	readonly type = ChangeOrderActionTypes.DeleteSalesChangeOrderPriceAdjustment;

	constructor() { }
}

@Log(true)
export class UpdateSalesChangeOrderPriceAdjustment implements Action
{
	readonly type = ChangeOrderActionTypes.UpdateSalesChangeOrderPriceAdjustment;

	constructor(public priceAdjustment: SalesChangeOrderPriceAdjustment, public position: number) { }
}

@Log(true)
export class SetCurrentChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.SetCurrentChangeOrder;

	constructor(public changeOrderId: number) { }
}

@Log(true)
export class SetChangeOrderOverrideNote implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderOverrideNote;

	constructor(public overrideNote: string) { }
}

@Log()
export class CancelNonStandardChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CancelNonStandardChangeOrder;

	constructor() { }
}

@Log(true)
export class SavePendingJio implements Action
{
	readonly type = ChangeOrderActionTypes.SavePendingJio;

	constructor(public handing?: ChangeOrderHanding) { }
}

@Log()
export class CreateCancellationChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CreateCancellationChangeOrder;

	constructor() { }
}

@Log()
export class CreateLotTransferChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CreateLotTransferChangeOrder;

	constructor() { }
}

@Log(true)
export class SetChangeOrderLot implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderLot;

	constructor(public lotId: number) { }
}

@Log(true)
export class SetChangeOrderRevertToDirt implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderRevertToDirt;

	constructor(public revertToDirt: boolean) { }
}

@Log(true)
export class ResubmitChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.ResubmitChangeOrder;

	constructor(public changeInput: ChangeInput, public sequence: number, public sequenceSuffix: string) { }
}

@Log(true)
export class SetChangeOrderNonStandardOptions implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderNonStandardOptions;

	constructor(public changeOrderNonStandardOption: ChangeOrderNonStandardOption) { }
}

@Log(true)
export class ChangeOrderOutForSignature implements Action
{
	readonly type = ChangeOrderActionTypes.ChangeOrderOutForSignature;

	constructor(
		public changeOrder: any,
		public envelopeSent: boolean,
		public isWetSign: boolean,
		public setChangeOrder: boolean = false
	) { }
}

@Log(true)
export class SetChangeOrderPlanId implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderPlanId;

	constructor(public planId: number) { }
}

@Log(true)
export class SetSalesChangeOrderTermsAndConditions implements Action
{
	readonly type = ChangeOrderActionTypes.SetSalesChangeOrderTermsAndConditions;

	constructor(public termsAndConditionsNote: Note, public agreementNote: boolean = false) { }
}

@Log(true)
export class SalesChangeOrderTermsAndConditionsSaved implements Action
{
	readonly type = ChangeOrderActionTypes.SalesChangeOrderTermsAndConditionsSaved;

	constructor(public termsAndConditionsNote: Note) { }
}

@Log(true)
export class DeleteTermsAndConditions implements Action
{
	readonly type = ChangeOrderActionTypes.DeleteTermsAndConditions;

	constructor(public termsAndConditionsNote: Note) { }
}

@Log(true)
export class SetIsChangeOrderComplete implements Action
{
	readonly type = ChangeOrderActionTypes.SetIsChangeOrderComplete;

	constructor(public isChangeOrderComplete: boolean) { }
}


export type ChangeOrderActions =
	AddChangeOrderCoBuyer |
	CancelJobChangeOrder |
	CancelPlanChangeOrder |
	CancelLotTransferChangeOrder |
	CancelSalesChangeOrder |
	ChangeInputInitialized |
	ChangeOrdersCreated |
	CreateJobChangeOrders |
	CancelNonStandardChangeOrder |
	CreatePlanChangeOrder |
	CreateNonStandardChangeOrder |
	CurrentChangeOrderCancelled |
	CurrentChangeOrderOutForSignature |
	CurrentChangeOrderSigned |
	CurrentChangeOrderApproved |
	CurrentChangeOrderLoaded |
	CurrentChangeOrderPending |
	DeleteChangeOrderCoBuyer |
	DeleteSalesChangeOrderPriceAdjustment |
	LoadError |
	ReSortChangeOrderBuyers |
	SaveChangeOrderScenario |
	SavePendingJio |
	SetChangeOrderDescription |
	SetChangeOrderNote |
	SetChangeOrderOverrideNote |
	SaveError |
	SetChangeOrderHanding |
	SetChangeOrderTrustName |
	SetChangingOrder |
	SetCurrentChangeOrder |
	SwapChangeOrderPrimaryBuyer |
	UpdateChangeOrderBuyer |
	UpdateSalesChangeOrderPriceAdjustment |
	CreateSalesChangeOrder |
	SetSalesChangeOrderPriceAdjustments |
	SetSalesChangeOrderSalesPrograms |
	SalesAgreementLoaded |
	JobLoaded |
	CreateCancellationChangeOrder |
	CreateLotTransferChangeOrder |
	SetChangeOrderLot |
	ESignEnvelopesLoaded |
	ChangeOrderEnvelopeCreated |
	SetChangeOrderRevertToDirt |
	ChangeOrdersUpdated |
	ResubmitChangeOrder |
	SetChangeOrderNonStandardOptions |
	ChangeOrderOutForSignature |
	SetChangeOrderPlanId |
	SetSalesChangeOrderTermsAndConditions |
	SalesChangeOrderTermsAndConditionsSaved |
	DeleteTermsAndConditions |
	SetIsChangeOrderComplete;
