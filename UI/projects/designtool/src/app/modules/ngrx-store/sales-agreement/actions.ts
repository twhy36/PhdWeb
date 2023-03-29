import { Action } from '@ngrx/store';

import {
	Buyer, Note, SalesAgreement, Realtor, SalesAgreementProgram, SalesAgreementDeposit, SalesAgreementContingency,
	SalesAgreementCancelVoidInfo, Consultant, SalesAgreementInfo, Log
} from 'phd-common';

import { ErrorAction } from '../error.action';
import { SalesAgreementLoaded, LoadSalesAgreement, LoadError, SalesAgreementCancelled, ChangeOrdersUpdated } from '../actions';

export enum SalesAgreementActionTypes
{
	// Sales Agreement
	CreateSalesAgreementForScenario = 'Create Sales Agreement For Scenario',
	SalesAgreementCreated = "Sales Agreement Created",
	SalesAgreementSaved = 'Sales Agreement Saved',
	UpdateSalesAgreement = 'Update Sales Agreement',
	VoidSalesAgreement = 'Void Sales Agreement',
	CancelSalesAgreement = 'Cancel Sales Agreement',
	SalesAgreementOutForSignature = 'Sales Agreement Out For Signature',
	SalesAgreementPending = 'Sales Agreement Pending',
	SignSalesAgreement = 'Sign Sales Agreement',
	ApproveSalesAgreement = 'Approve Sales Agreement',
	// Realtor
	AddUpdateRealtor = 'Add/Update Realtor',
	LoadRealtor = 'Load Realtor',
	RealtorLoaded = 'Realtor Loaded',
	RealtorSaved = 'Realtor Saved',
	// Trust
	SetTrustName = 'Set Trust Name',
	TrustNameSaved = 'Trust Name Saved',
	// Buyer
	AddCoBuyer = 'Add Co-Buyer',
	BuyerSaved = 'Buyer Saved',
	BuyersLoaded = 'Buyers Loaded',
	BuyersSwapped = "Buyers Swapped",
	CoBuyerAdded = 'Co-Buyer Added',
	CoBuyerDeleted = 'Co-Buyer Deleted',
	CoBuyersReSorted = 'Co-Buyers Re-Sorted',
	DeleteCoBuyer = 'Delete Co-Buyer',
	LoadBuyers = 'Load Buyers',
	PrimaryBuyerLoaded = 'Primary Buyer Loaded',
	ReSortCoBuyers = 'Re-Sort Co-Buyers',
	SwapPrimaryBuyer = 'Swap Primary Buyer',
	UpdateCoBuyer = 'Update Co-Buyer',
	UpdatePrimaryBuyer = 'Update Primary Buyer',
	// Program
	DeleteProgram = 'Delete Program',
	ProgramDeleted = 'Program Deleted',
	ProgramSaved = 'Program Saved',
	SaveProgram = 'Save Program',
	// Deposit
	DeleteDeposit = 'Delete Deposit',
	DepositDeleted = 'Deposit Deleted',
	DepositSaved = 'Deposit Saved',
	SaveDeposit = 'Save Deposit',
	// Contingency
	ContingencyDeleted = 'Contingency Deleted',
	ContingencySaved = 'Contingency Saved',
	DeleteContingency = 'Delete Contingency',
	SaveContingency = 'Save Contingency',
	// Notes
	DeleteNote = 'Delete Note',
	NoteDeleted = 'Note Deleted',
	NoteSaved = 'Note Saved',
	SaveNote = 'Save Note',
	// Errors
	SaveError = 'Save Error',
	SalesAgreementLoadError = 'Sales Agreement Load Error',
	//Spec
	CreateJIOForSpec = 'Create Job JIO for Spec',
	JIOForSpecCreated = 'JIO for SPEC Created',
	// Floorplan Flippin
	SetIsFloorplanFlippedAgreement = 'Set Agreement Floorplan Flipped',
	IsFloorplanFlippedAgreement = 'Agreement Floorplan Flipped Saved',
	// Design Complete Flag
	SetIsDesignComplete = 'Set Is Design Complete',
	IsDesignCompleteSaved = 'Is Design Complete Flag Saved',
	// Sales Consultant
	LoadConsultants = 'Load Consultants',
	ConsultantsLoaded = 'Consultants Loaded',
	SaveSalesConsultants = 'Save Sales Consultants',
	SalesConsultantsSaved = 'Sales Consultants Saved',
	// Sales Agreement Info
	SaveSalesAgreementInfoNA = 'Save Sales Agreement Info NA',
	SalesAgreementInfoNASaved = 'Sales Agreement Info NA Saved',
	SalesAgreementInfoViewed = 'Sales Agreement Info Viewed',
	SalesAgreementTerminated = 'Sales Agreement Terminated'
}

@Log(true)
export class SalesAgreementTerminated implements Action
{
	readonly type = SalesAgreementActionTypes.SalesAgreementTerminated;

	constructor(public cancelReason: SalesAgreementCancelVoidInfo) { }
}

export class SalesAgreementInfoViewed implements Action
{
	readonly type = SalesAgreementActionTypes.SalesAgreementInfoViewed;

	constructor() { }
}

@Log(true)
export class SaveSalesAgreementInfoNA implements Action
{
	readonly type = SalesAgreementActionTypes.SaveSalesAgreementInfoNA;

	constructor(public salesAgreementInfo: SalesAgreementInfo, public naType: string) { }
}

export class SalesAgreementInfoNASaved implements Action
{
	readonly type = SalesAgreementActionTypes.SalesAgreementInfoNASaved;

	constructor(public salesAgreementInfo: SalesAgreementInfo, public naType: string) { }
}

export class SalesAgreementLoadError extends ErrorAction
{
	readonly type = SalesAgreementActionTypes.SalesAgreementLoadError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

@Log(true)
export class CreateSalesAgreementForScenario implements Action
{
	readonly type = SalesAgreementActionTypes.CreateSalesAgreementForScenario;

	constructor(public scenarioId: number) { }
}

@Log()
export class SalesAgreementCreated implements Action
{
	readonly type = SalesAgreementActionTypes.SalesAgreementCreated;

	constructor(public salesAgreement: SalesAgreement) { }
}

@Log()
export class UpdateSalesAgreement implements Action
{
	readonly type = SalesAgreementActionTypes.UpdateSalesAgreement;

	constructor(public salesAgreement: SalesAgreement) { }
}

export class SalesAgreementSaved implements Action
{
	readonly type = SalesAgreementActionTypes.SalesAgreementSaved;

	constructor(public salesAgreement: SalesAgreement) { }
}

@Log(true)
export class VoidSalesAgreement implements Action
{
	readonly type = SalesAgreementActionTypes.VoidSalesAgreement;

	constructor(public reasonKey: string) { }
}

@Log(true)
export class CancelSalesAgreement implements Action
{
	readonly type = SalesAgreementActionTypes.CancelSalesAgreement;

	constructor(public buildType: string, public noteContent: string, public reasonKey: string) { }
}

@Log(true)
export class SalesAgreementOutForSignature implements Action
{
	readonly type = SalesAgreementActionTypes.SalesAgreementOutForSignature;

	constructor(public isWetSign: boolean, public isEdit: boolean) { }
}

@Log()
export class SalesAgreementPending implements Action
{
	readonly type = SalesAgreementActionTypes.SalesAgreementPending;

	constructor() { }
}

@Log(true)
export class SignSalesAgreement implements Action
{
	readonly type = SalesAgreementActionTypes.SignSalesAgreement;

	constructor(public signedDate: Date) { }
}

@Log()
export class ApproveSalesAgreement implements Action
{
	readonly type = SalesAgreementActionTypes.ApproveSalesAgreement;

	constructor() { }
}

@Log(true)
export class AddUpdateRealtor implements Action
{
	readonly type = SalesAgreementActionTypes.AddUpdateRealtor;

	constructor(public realtor: Realtor) { }
}

export class RealtorSaved implements Action
{
	readonly type = SalesAgreementActionTypes.RealtorSaved;

	constructor(public realtor: Realtor) { }
}

@Log(true)
export class SetTrustName implements Action
{
	readonly type = SalesAgreementActionTypes.SetTrustName;

	constructor(public trustName: string) { }
}

export class TrustNameSaved implements Action
{
	readonly type = SalesAgreementActionTypes.TrustNameSaved;

	constructor(public trustName: string) { }
}

@Log(true)
export class SwapPrimaryBuyer implements Action
{
	readonly type = SalesAgreementActionTypes.SwapPrimaryBuyer;

	constructor(public coBuyer: Buyer) { }
}

export class BuyersSwapped implements Action
{
	readonly type = SalesAgreementActionTypes.BuyersSwapped;

	constructor(public oldPrimaryBuyer: Buyer, public newPrimaryBuyer: Buyer) { }
}

@Log(true)
export class DeleteCoBuyer implements Action
{
	readonly type = SalesAgreementActionTypes.DeleteCoBuyer;

	constructor(public coBuyer: Buyer) { }
}

export class CoBuyerDeleted implements Action
{
	readonly type = SalesAgreementActionTypes.CoBuyerDeleted;

	constructor(public deletedCoBuyerId: number, public deletedCoBuyerSortKey: number) { }
}

@Log(true)
export class UpdatePrimaryBuyer implements Action
{
	readonly type = SalesAgreementActionTypes.UpdatePrimaryBuyer;

	constructor(public buyer: Buyer) { }
}

@Log(true)
export class UpdateCoBuyer implements Action
{
	readonly type = SalesAgreementActionTypes.UpdateCoBuyer;

	constructor(public coBuyer: Buyer) { }
}

export class BuyerSaved implements Action
{
	readonly type = SalesAgreementActionTypes.BuyerSaved;

	constructor(public buyer: Buyer) { }
}

@Log(true)
export class AddCoBuyer implements Action
{
	readonly type = SalesAgreementActionTypes.AddCoBuyer;

	constructor(public coBuyer: Buyer) { }
}

export class CoBuyerAdded implements Action
{
	readonly type = SalesAgreementActionTypes.CoBuyerAdded;

	constructor(public coBuyer: Buyer) { }
}

@Log(true)
export class ReSortCoBuyers implements Action
{
	readonly type = SalesAgreementActionTypes.ReSortCoBuyers;

	constructor(public sourceSortKey: number, public targetSortKey: number) { }
}

export class CoBuyersReSorted implements Action
{
	readonly type = SalesAgreementActionTypes.CoBuyersReSorted;

	constructor(public coBuyers: Array<Buyer>) { }
}

export class LoadBuyers implements Action
{
	readonly type = SalesAgreementActionTypes.LoadBuyers;

	constructor(public salesAgreementId: number) { }
}

export class BuyersLoaded implements Action
{
	readonly type = SalesAgreementActionTypes.BuyersLoaded;

	constructor(public buyers: Array<Buyer>) { }
}

export class PrimaryBuyerLoaded implements Action
{
	readonly type = SalesAgreementActionTypes.PrimaryBuyerLoaded;

	constructor(public buyer: Buyer) { }
}

@Log(true)
export class DeleteProgram implements Action
{
	readonly type = SalesAgreementActionTypes.DeleteProgram;

	constructor(public program: SalesAgreementProgram) { }
}

export class ProgramDeleted implements Action
{
	readonly type = SalesAgreementActionTypes.ProgramDeleted;

	constructor(public deletedProgramId: number) { }
}

@Log(true)
export class SaveProgram implements Action
{
	readonly type = SalesAgreementActionTypes.SaveProgram;

	constructor(public program: SalesAgreementProgram, public salesProgramName: string) { }
}

export class ProgramSaved implements Action
{
	readonly type = SalesAgreementActionTypes.ProgramSaved;

	constructor(public program: SalesAgreementProgram, public programName: string) { }
}

export class LoadRealtor implements Action
{
	readonly type = SalesAgreementActionTypes.LoadRealtor;

	constructor(public salesAgreementId: number) { }
}

export class RealtorLoaded implements Action
{
	readonly type = SalesAgreementActionTypes.RealtorLoaded;

	constructor(public realtor: Realtor) { }
}

@Log(true)
export class DeleteDeposit implements Action
{
	readonly type = SalesAgreementActionTypes.DeleteDeposit;

	constructor(public deposit: SalesAgreementDeposit) { }
}

export class DepositDeleted implements Action
{
	readonly type = SalesAgreementActionTypes.DepositDeleted;

	constructor(public deletedDepositId: number) { }
}

@Log(true)
export class SaveDeposit implements Action
{
	readonly type = SalesAgreementActionTypes.SaveDeposit;

	constructor(public deposit: SalesAgreementDeposit, public processElectronically: boolean) { }
}

export class DepositSaved implements Action
{
	readonly type = SalesAgreementActionTypes.DepositSaved;

	constructor(public deposit: SalesAgreementDeposit) { }
}

@Log(true)
export class DeleteContingency implements Action
{
	readonly type = SalesAgreementActionTypes.DeleteContingency;

	constructor(public contingency: SalesAgreementContingency) { }
}

export class ContingencyDeleted implements Action
{
	readonly type = SalesAgreementActionTypes.ContingencyDeleted;

	constructor(public deletedContingencyId: number) { }
}

@Log(true)
export class SaveContingency implements Action
{
	readonly type = SalesAgreementActionTypes.SaveContingency;

	constructor(public contingency: SalesAgreementContingency) { }
}

export class ContingencySaved implements Action
{
	readonly type = SalesAgreementActionTypes.ContingencySaved;

	constructor(public contingency: SalesAgreementContingency) { }
}

@Log(true)
export class DeleteNote implements Action
{
	readonly type = SalesAgreementActionTypes.DeleteNote;

	constructor(public noteId: number) { }
}

export class NoteDeleted implements Action
{
	readonly type = SalesAgreementActionTypes.NoteDeleted;

	constructor(public noteId: number) { }
}

@Log(true)
export class SaveNote implements Action
{
	readonly type = SalesAgreementActionTypes.SaveNote;

	constructor(public note: Note) { }
}

export class NoteSaved implements Action
{
	readonly type = SalesAgreementActionTypes.NoteSaved;

	constructor(public note: Note) { }
}

export class SaveError extends ErrorAction
{
	readonly type = SalesAgreementActionTypes.SaveError;

	constructor(public error: Error, public friendlyMessage?: string) { super(error, friendlyMessage); }
}

@Log()
export class CreateJIOForSpec implements Action
{
	readonly type = SalesAgreementActionTypes.CreateJIOForSpec;

	constructor() { }
}

export class JIOForSpecCreated implements Action
{
	readonly type = SalesAgreementActionTypes.JIOForSpecCreated;

	constructor() { }
}

export class IsFloorplanFlippedAgreement implements Action
{
	readonly type = SalesAgreementActionTypes.IsFloorplanFlippedAgreement;

	constructor(public flipped: boolean) { }
}

@Log(true)
export class SetIsFloorplanFlippedAgreement implements Action
{
	readonly type = SalesAgreementActionTypes.SetIsFloorplanFlippedAgreement;

	constructor(public isFlipped: boolean) { }
}

export class IsDesignCompleteSaved implements Action
{
	readonly type = SalesAgreementActionTypes.IsDesignCompleteSaved;

	constructor(public isDesignComplete: boolean) { }
}

@Log(true)
export class SetIsDesignComplete implements Action
{
	readonly type = SalesAgreementActionTypes.SetIsDesignComplete;

	constructor(public isDesignComplete: boolean) { }
}

export class LoadConsultants implements Action
{
	readonly type = SalesAgreementActionTypes.LoadConsultants;

	constructor(public salesAgreementId: number) { }
}

export class ConsultantsLoaded implements Action
{
	readonly type = SalesAgreementActionTypes.ConsultantsLoaded;

	constructor(public consultants: Array<Consultant>) { }
}

@Log(true)
export class SaveSalesConsultants implements Action
{
	readonly type = SalesAgreementActionTypes.SaveSalesConsultants;

	constructor(public consultants: Consultant[]) { }
}

export class SalesConsultantsSaved implements Action
{
	readonly type = SalesAgreementActionTypes.SalesConsultantsSaved;

	constructor(public consultants: Consultant[]) { }
}

export type SalesAgreementActions =
	SalesAgreementLoadError |
	AddCoBuyer |
	AddUpdateRealtor |
	ApproveSalesAgreement |
	BuyerSaved |
	BuyersLoaded |
	BuyersSwapped |
	ChangeOrdersUpdated |
	CoBuyerAdded |
	CoBuyerDeleted |
	CoBuyersReSorted |
	ContingencyDeleted |
	ContingencySaved |
	CreateJIOForSpec |
	CreateSalesAgreementForScenario |
	DeleteCoBuyer |
	DeleteContingency |
	DeleteDeposit |
	DeleteNote |
	DeleteProgram |
	DepositDeleted |
	DepositSaved |
	IsFloorplanFlippedAgreement |
	IsDesignCompleteSaved |
	JIOForSpecCreated |
	LoadBuyers |
	LoadRealtor |
	LoadSalesAgreement |
	LoadError |
	NoteDeleted |
	NoteSaved |
	PrimaryBuyerLoaded |
	ProgramDeleted |
	ProgramSaved |
	RealtorLoaded |
	RealtorSaved |
	ReSortCoBuyers |
	SalesAgreementCreated |
	SalesAgreementLoaded |
	SalesAgreementOutForSignature |
	SalesAgreementPending |
	SalesAgreementSaved |
	SaveContingency |
	SaveDeposit |
	SaveError |
	SaveNote |
	SaveProgram |
	SetIsFloorplanFlippedAgreement |
	SetIsDesignComplete |
	SetTrustName |
	SignSalesAgreement |
	SwapPrimaryBuyer |
	TrustNameSaved |
	UpdateCoBuyer |
	UpdatePrimaryBuyer |
	UpdateSalesAgreement |
	VoidSalesAgreement |
	CancelSalesAgreement |
	SalesAgreementCancelled |
	LoadConsultants |
	ConsultantsLoaded |
	SaveSalesConsultants |
	SalesConsultantsSaved |
	SaveSalesAgreementInfoNA |
	SalesAgreementInfoNASaved |
	SalesAgreementInfoViewed |
	SalesAgreementTerminated;
