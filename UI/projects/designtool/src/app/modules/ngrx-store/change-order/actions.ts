import { Action } from '@ngrx/store';
import { ChangeOrderGroup, ChangeInput, ChangeOrderNonStandardOption, ChangeOrderHanding } from '../../shared/models/job-change-order.model';
import { ErrorAction } from '../error.action';
import { SalesChangeOrderPriceAdjustment, SalesChangeOrderSalesProgram, ChangeOrderBuyer } from '../../shared/models/sales-change-order.model';
import { SalesAgreementLoaded, JobLoaded, ESignEnvelopesLoaded, ChangeOrderEnvelopeCreated, ChangeOrdersUpdated } from '../actions';
import { SalesAgreement } from '@shared/models/sales-agreement.model';
import { Note } from '@shared/models/note.model';

export enum ChangeOrderActionTypes
{
	AddChangeOrderCoBuyer = 'Add Change Order Co Buyer',
	CancelJobChangeOrder = 'Cancel Job Change Order',
	CancelNonStandardChangeOrder = "Cancel Non Standard Change Order",
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
	DeleteTermsAndConditions = 'Delete Terms and Conditons'
}

export class SetChangingOrder implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangingOrder;

	constructor(public isChangingOrder: boolean, public changeInput: ChangeInput, public cancel?: boolean, public handing?: ChangeOrderHanding, public changeOrderGroupSequence?: number) { }
}

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

export class ChangeInputInitialized implements Action
{
	readonly type = ChangeOrderActionTypes.ChangeInputInitialized;

	constructor(public changeInput: ChangeInput) { }
}

export class SetChangeOrderTrustName implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderTrustName;

	constructor(public trustName: string) { }
}

export class UpdateChangeOrderBuyer implements Action
{
	readonly type = ChangeOrderActionTypes.UpdateChangeOrderBuyer;

	constructor(public changeOrderBuyer: ChangeOrderBuyer) { }
}

export class AddChangeOrderCoBuyer implements Action
{
	readonly type = ChangeOrderActionTypes.AddChangeOrderCoBuyer;

	constructor(public changeOrderBuyer: ChangeOrderBuyer) { }
}

export class DeleteChangeOrderCoBuyer implements Action
{
	readonly type = ChangeOrderActionTypes.DeleteChangeOrderCoBuyer;

	constructor(public changeOrderBuyer: ChangeOrderBuyer) { }
}

export class SwapChangeOrderPrimaryBuyer implements Action
{
	readonly type = ChangeOrderActionTypes.SwapChangeOrderPrimaryBuyer;

	constructor(public changeOrderBuyer: ChangeOrderBuyer) { }
}

export class ReSortChangeOrderBuyers implements Action
{
	readonly type = ChangeOrderActionTypes.ReSortChangeOrderBuyers;

	constructor(public sourceSortKey: number, public targetSortKey: number) { }
}

export class CurrentChangeOrderCancelled implements Action
{
	readonly type = ChangeOrderActionTypes.CurrentChangeOrderCancelled;

	constructor() { }
}

export class CurrentChangeOrderOutForSignature implements Action
{
	readonly type = ChangeOrderActionTypes.CurrentChangeOrderOutForSignature;

	constructor(public statusUtcDate: Date) { }
}

export class CurrentChangeOrderSigned implements Action
{
	readonly type = ChangeOrderActionTypes.CurrentChangeOrderSigned;

	constructor(public statusUtcDate: Date) { }
}

export class CurrentChangeOrderApproved implements Action
{
	readonly type = ChangeOrderActionTypes.CurrentChangeOrderApproved;

	constructor() { }
}

export class CreateJobChangeOrders implements Action
{
	readonly type = ChangeOrderActionTypes.CreateJobChangeOrders;

	constructor() { }
}

export class ChangeOrdersCreated implements Action
{
	readonly type = ChangeOrderActionTypes.ChangeOrdersCreated;

	constructor(public changeOrders: Array<ChangeOrderGroup>) { }
}

export class SaveError extends ErrorAction
{
	readonly type = ChangeOrderActionTypes.SaveError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

export class CancelJobChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CancelJobChangeOrder;

	constructor() { }
}

export class SetChangeOrderHanding implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderHanding;

	constructor(public handing: ChangeOrderHanding, public dirty: boolean = true) { }
}

export class CreateSalesChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CreateSalesChangeOrder;

	constructor(public specSales: boolean = false) { }
}

export class CreateNonStandardChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CreateNonStandardChangeOrder;

	constructor(public options: Array<ChangeOrderNonStandardOption>) { }
}

export class CreatePlanChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CreatePlanChangeOrder;

	constructor() { }
}

export class CancelPlanChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CancelPlanChangeOrder;

	constructor() { }
}

export class SetSalesChangeOrderPriceAdjustments implements Action
{
	readonly type = ChangeOrderActionTypes.SetSalesChangeOrderPriceAdjustments;

	constructor(public salesChangeOrderPriceAdjustments: Array<SalesChangeOrderPriceAdjustment>) { }
}

export class SetSalesChangeOrderSalesPrograms implements Action
{
	readonly type = ChangeOrderActionTypes.SetSalesChangeOrderSalesPrograms;

	constructor(public action: string, public salesChangeOrderSalesPrograms: Array<SalesChangeOrderSalesProgram>, public agreement?: SalesAgreement, public originalProgramId?: number) { }
}

export class CancelLotTransferChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CancelLotTransferChangeOrder;

	constructor() { }
}

export class CancelSalesChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CancelSalesChangeOrder;

	constructor() { }
}

export class DeleteSalesChangeOrderPriceAdjustment implements Action
{
	readonly type = ChangeOrderActionTypes.DeleteSalesChangeOrderPriceAdjustment;

	constructor() { }
}

export class UpdateSalesChangeOrderPriceAdjustment implements Action
{
	readonly type = ChangeOrderActionTypes.UpdateSalesChangeOrderPriceAdjustment;

	constructor(public priceAdjustment: SalesChangeOrderPriceAdjustment, public position: number) { }
}

export class SetCurrentChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.SetCurrentChangeOrder;

	constructor(public changeOrderId: number) { }
}

export class SetChangeOrderOverrideNote implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderOverrideNote;

	constructor(public overrideNote: string) { }
}

export class CancelNonStandardChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CancelNonStandardChangeOrder;

	constructor() { }
}

export class SavePendingJio implements Action
{
	readonly type = ChangeOrderActionTypes.SavePendingJio;

	constructor(public handing?: ChangeOrderHanding) { }
}

export class CreateCancellationChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CreateCancellationChangeOrder;

	constructor() { }
}

export class CreateLotTransferChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.CreateLotTransferChangeOrder;

	constructor() { }
}

export class SetChangeOrderLot implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderLot;

	constructor(public lotId: number) { }
}

export class SetChangeOrderRevertToDirt implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderRevertToDirt;

	constructor(public revertToDirt: boolean) { }
}

export class ResubmitChangeOrder implements Action
{
	readonly type = ChangeOrderActionTypes.ResubmitChangeOrder;

	constructor(public changeInput: ChangeInput, public sequence: number, public sequenceSuffix: string) { }
}

export class SetChangeOrderNonStandardOptions implements Action
{
	readonly type = ChangeOrderActionTypes.SetChangeOrderNonStandardOptions;

	constructor(public changeOrderNonStandardOption: ChangeOrderNonStandardOption) { }
}

export class ChangeOrderOutForSignature implements Action
{
	readonly type = ChangeOrderActionTypes.ChangeOrderOutForSignature;

	constructor(public changeOrder: any, public isWetSign: boolean, public setChangeOrder: boolean = false) { }
}

export class SetChangeOrderPlanId implements Action {
	readonly type = ChangeOrderActionTypes.SetChangeOrderPlanId;

	constructor(public planId: number) { }
}


export class SetSalesChangeOrderTermsAndConditions implements Action
{
	readonly type = ChangeOrderActionTypes.SetSalesChangeOrderTermsAndConditions;

	constructor(public termsAndConditionsNote: Note, public agreementNote: boolean = false) { }
}

export class SalesChangeOrderTermsAndConditionsSaved implements Action
{
	readonly type = ChangeOrderActionTypes.SalesChangeOrderTermsAndConditionsSaved;

	constructor(public termsAndConditionsNote: Note) { }
}

export class DeleteTermsAndConditions implements Action
{
	readonly type = ChangeOrderActionTypes.DeleteTermsAndConditions;

	constructor(public termsAndConditionsNote: Note) { }
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
	DeleteTermsAndConditions;
