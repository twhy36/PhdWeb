import { Contact } from "./contact.model";
import { Buyer } from "./buyer.model";
import { Note, INote } from "./note.model";
import { ChangeOrderGroup } from "./job-change-order.model";

export interface ISalesAgreement
{
	id?: number;

	// The high number of properties call for sorting
	// ID left out for ease of sorting for quick redux reference

	approvedDate?: Date;
	buyers?: Array<Buyer>;
	jobChangeOrderGroupSalesAgreementAssocs?: Array<ChangeOrderGroupAssoc>;
	consultants?: Array<Consultant>;
	contingencies?: Array<SalesAgreementContingency>;
	createdUtcDate?: Date;
	deposits?: Array<SalesAgreementDeposit>;
	ecoeDate?: Date;
	insuranceQuoteOptIn?: boolean;
	lastModifiedUtcDate?: Date;
	lenderType?: string;
	salesAgreementNoteAssocs?: Array<ISalesAgreementNoteAssoc>;
	salesAgreementNumber?: string;
	programs?: Array<SalesAgreementProgram>;
	propertyType?: string;
	realtors?: Array<Realtor>;
	signedDate?: Date;
	status?: string;
	statusUtcDate?: Date;
	trustName?: string;
	jobSalesAgreementAssocs?: Array<JobSalesAgreementAssoc>;
	cancellations?: SalesAgreementCancelVoidInfo;
	salePrice?: number;
	salesAgreementPriceAdjustmentAssocs?: Array<SalesAgreementPriceAdjustment>;
	salesAgreementName?: string;
	isLockedIn?: boolean;
}

export class SalesAgreement
{
	id?: number = 0;

	approvedDate: Date = null;
	buyers: Array<Buyer> = [];
	changeOrderGroupSalesAgreementAssocs: Array<ChangeOrderGroupAssoc> = [];
	consultants: Array<Consultant> = [];
	contingencies?: Array<SalesAgreementContingency> = [];
	createdUtcDate?: Date = null;
	deposits?: Array<SalesAgreementDeposit> = [];
	ecoeDate: Date = null;
	insuranceQuoteOptIn: boolean = true;
	lastModifiedUtcDate: Date = null;
	lenderType: string = '';
	notes: Array<Note> = [];
	salesAgreementNumber: string = null;
	programs?: Array<SalesAgreementProgram> = [];
	propertyType: string = '';
	realtors: Array<Realtor> = [];
	signedDate: Date = null;
	status: string = '';
	statusUtcDate: Date = null;
	trustName: string = null;
	jobSalesAgreementAssocs?: Array<JobSalesAgreementAssoc> = [];
	cancellations?: SalesAgreementCancelVoidInfo;
	salePrice: number = 0;
	priceAdjustments?: Array<SalesAgreementPriceAdjustment> = [];
	salesAgreementName: string = null;
	isLockedIn: boolean = false;

	constructor(dto: ISalesAgreement | SalesAgreement = null)
	{
		if (dto)
		{
			this.changeOrderGroupSalesAgreementAssocs = dto.hasOwnProperty('jobChangeOrderGroupSalesAgreementAssocs') ? dto['jobChangeOrderGroupSalesAgreementAssocs'] || null : dto['changeOrderGroupSalesAgreementAssocs'] || null;
			this.notes = dto.hasOwnProperty('salesAgreementNoteAssocs') ? (dto['salesAgreementNoteAssocs'] ? dto['salesAgreementNoteAssocs'].map(item => new Note(item.note)) : null) : dto['notes'];
			this.priceAdjustments = dto.hasOwnProperty('salesAgreementPriceAdjustmentAssocs') ? dto['salesAgreementPriceAdjustmentAssocs'] : dto['priceAdjustments'];

			this.id = dto.id;
			this.approvedDate = dto.approvedDate;
			this.buyers = dto.buyers || null;			
			this.consultants = dto.consultants || null;
			this.contingencies = dto.contingencies || null;
			this.createdUtcDate = dto.createdUtcDate || null;
			this.deposits = dto.deposits || null;
			this.ecoeDate = dto.ecoeDate;
			this.insuranceQuoteOptIn = dto.insuranceQuoteOptIn;
			this.lastModifiedUtcDate = dto.lastModifiedUtcDate || null;
			this.lenderType = dto.lenderType;			
			this.salesAgreementNumber = dto.salesAgreementNumber;
			this.programs = dto.programs || null;
			this.propertyType = dto.propertyType;
			this.realtors = dto.realtors || null;
			this.signedDate = dto.signedDate;
			this.status = dto.status;
			this.statusUtcDate = dto.statusUtcDate;
			this.trustName = dto.trustName;
			this.cancellations = dto.cancellations;
			this.salePrice = dto.salePrice;			
			this.salesAgreementName = dto.salesAgreementName;
			this.isLockedIn = dto.isLockedIn;

			if (dto.jobSalesAgreementAssocs)
			{
				this.jobSalesAgreementAssocs = dto.jobSalesAgreementAssocs.map(a => new JobSalesAgreementAssoc(a));
			}
		}
	}
}

export interface ISalesAgreementNoteAssoc
{
	salesAgreementId: number;
	noteId: number;
	note: INote;
}

export interface ISalesAgreementInfo
{
	edhSalesAgreementId: number;
	isRealtorNa?: boolean;
	isTrustNa?: boolean;
	isProgramNa?: boolean;
	isContingenciesNa?: boolean;
	isFloorplanFlipped?: boolean;
	isNoteNa?: boolean;
	isCoBuyerNa?: boolean;
	isDesignComplete?: boolean;
}

export class SalesAgreementInfo
{
	edhSalesAgreementId = 0;
	isRealtorNa?: boolean = null;
	isTrustNa?: boolean = null;
	isProgramNa?: boolean = null;
	isContingenciesNa?: boolean = null;
	isFloorplanFlipped?: boolean = null;
	isNoteNa?: boolean = null;
	isCoBuyerNa?: boolean = null;
	isDesignComplete?: boolean = null;

	constructor(dto: ISalesAgreementInfo = null)
	{
		if (dto)
		{
			this.edhSalesAgreementId = dto.edhSalesAgreementId;
			this.isRealtorNa = dto.isRealtorNa;
			this.isTrustNa = dto.isTrustNa;
			this.isProgramNa = dto.isProgramNa;
			this.isContingenciesNa = dto.isContingenciesNa;
			this.isFloorplanFlipped = dto.isFloorplanFlipped;
			this.isNoteNa = dto.isNoteNa;
			this.isCoBuyerNa = dto.isCoBuyerNa;
			this.isDesignComplete = dto.isDesignComplete;
		}
	}
}

export interface IRealtor
{
	contact: Contact,
	brokerName: string,
	salesAgreementId: number;
}

export class Realtor
{
	contact: Contact;
	brokerName: string = null;
	salesAgreementId: number;

	constructor(dto: IRealtor = null)
	{
		if (dto)
		{
			this.contact = new Contact(dto.contact);
			this.brokerName = dto.brokerName;
			this.salesAgreementId = dto.salesAgreementId;
		}
		else
		{
			this.contact = new Contact();
		}
	}
}

export interface ISalesProgram
{
	id?: number;
	salesProgramType?: string;
	name?: string;
}

export interface ISalesAgreementProgram
{
	id?: number;
	salesAgreementId?: number;
	salesProgramId?: number;
	salesProgramDescription?: string;
	amount?: number;
	salesProgram?: ISalesProgram;
}

export class SalesAgreementProgram
{
	id?: number;
	salesAgreementId?: number;
	salesProgramId?: number;
	salesProgramDescription?: string;
	amount?: number;
	salesProgram?: ISalesProgram;

	constructor(dto: ISalesAgreementProgram = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.salesAgreementId = dto.salesAgreementId;
			this.salesProgramId = dto.salesProgramId;
			this.salesProgramDescription = dto.salesProgramDescription;
			this.amount = dto.amount;
			this.salesProgram = dto.salesProgram ? dto.salesProgram : null;
		}
	}
}

export class SalesAgreementContingency
{
	id?: number = 0;
	salesAgreementId?: number = 0;
	contingencyTypeDesc?: string = "";
	completionDate?: Date;
	expirationDate: Date;

	constructor(dto: SalesAgreementContingency = null)
	{
		if (dto)
		{
			for (const prop in dto)
			{
				this[prop] = dto[prop];
			}
		}
	}
}

export class SalesAgreementDeposit
{
	id?: number = 0;
	salesAgreementId?: number = 0;
	depositTypeDesc?: string = null;
	description: string = "";
	dueDate?: Date = new Date();
	paidDate?: Date = null;
	amount: number = 0;

	constructor(dto: SalesAgreementDeposit = null)
	{
		if (dto)
		{
			for (const prop in dto)
			{
				this[prop] = dto[prop];
			}
		}
	}
}

export class SalesAgreementPriceAdjustment
{
	id?: number = 0;
	priceAdjustmentType: string = null;
	amount: number = 0;
}

export class Consultant
{
	id: number;
	contact: Contact;
	commission: number;
	isPrimary: boolean;

	constructor(dto: Consultant = null)
	{
		if (dto)
		{
			for (const prop in dto)
			{
				this[prop] = dto[prop];
			}
		}
	}
}

export interface ISalesAgreementSalesConsultantDto
{
	id: number;
	contactId: number;
	commission: number;
	isPrimary: boolean;
}

export class ChangeOrderGroupAssoc
{
	changeOrderGroup: ChangeOrderGroup;
}

export class JobSalesAgreementAssoc
{
	jobId: number;
	isActive: boolean;

	constructor(dto?: JobSalesAgreementAssoc)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class SalesAgreementCancelVoidInfo
{
	salesAgreementId?: number;
	cancelReasonDesc?: string;
	voidReasonDesc?: string;
	noteId?: number;
	note?: Note = null;

	constructor(dto: ISalesAgreementCancelVoidInfo = null)
	{
		if (dto)
		{
			this.salesAgreementId = dto.salesAgreementId;
			this.cancelReasonDesc = dto.cancelReasonDesc;
			this.voidReasonDesc = dto.voidReasonDesc;
			this.noteId = dto.noteId;
			this.note = dto.note;
		}
	}
}

export interface ISalesAgreementCancelVoidInfo
{
	salesAgreementId: number;
	cancelReasonDesc: string;
	voidReasonDesc: string;
	noteId?: number;
	note?: Note;
}

export enum SalesAgreementCancelReason
{
	BuyersRemorse = 'Buyers Remorse',
	IllnessOrDeath = 'Illness or Death',
	FamilyIssues = 'Family Issues',
	CommunityTransfer = 'Community Transfer',
	ContingencyNotSatisfied = 'Contingency Not Satisfied',
	FinancialDifficulties = 'Financial Difficulties',
	FinancingRejected = 'Financing Rejected',
	ConstructionObjection = 'Construction Objection',
	EmploymentStatus = 'Employment Status',
	BoughtFromCompetitor = 'Bought From Competitor',
	BreachOfContract = 'Breach of Contract',
	WithinRightsToRescindPeriod = 'Within Rights to Rescind Period',
	BoughtResale = 'Bought Resale',
	FinalProductDidNotMeetExpectations = 'Final Product Did Not Meet Expectations',
	DivisionInitiated = 'Division Initiated',
	FailedLotPurchase = 'Failed Lot Purchase',
	FullDepositNotReceived = 'Full Deposit Not Received',
	NaturalDisaster = 'Natural Disaster',
	LotTransfer = 'Lot Transfer Within Community'
}

export enum SalesAgreementVoidReason
{
	BuyersRemorse = 'Buyers Remorse',
	IllnessOrDeath = 'Illness or Death',
	FamilyIssues = 'Family Issues',
	ConsideringAnotherPulteGroupCommunity = 'Considering Another PulteGroup Community',
	ContingencyRequestNotApproved = 'Contingency Request Not Approved',
	FinancialDifficulties = 'Financial Difficulties',
	//FinancingRejected = 7,
	ConstructionOrOptionObjection = 'Construction or Option Objection',
	EmploymentStatus = 'Employment Status',
	BoughtFromCompetitor = 'Bought from Competitor',
	BreachOfContract = 'Breach of Contract',
	WithinRightsToRescindPeriod = 'Within Rights to Rescind Period',
	BoughtResale = 'Bought Resale',
	DivisionInitiated = 'Division Initiated',
	DepositNotReceived = 'Deposit Not Received',
	NaturalDisaster = 'Natural Disaster',
	LotTransferWithinCommunity = 'Lot Transfer Within Community',
	FailedToSignInTime = 'Failed to Sign in Time',
	FinancingGateNotAchieved = 'Financing Gate Not Achieved',
	PurchaseAgreementCorrectionNeeded = 'Purchase Agreement Correction Needed'
}
