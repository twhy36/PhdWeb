import { Job } from "./job.model";
import { Buyer } from "./buyer.model";
import { Note } from "./note.model";
import { ChangeOrderBuyer, SalesChangeOrderPriceAdjustment, SalesChangeOrderSalesProgram, SalesChangeOrderTrust } from "./sales-change-order.model";
import { ESignEnvelope } from "./esign-envelope.model";

export function isConstructionCO(dto: ChangeOrderGroup): boolean
{
	if (dto)
	{
		if (dto.jobChangeOrders && dto.jobChangeOrders.length)
		{
			const changeOrders = dto.jobChangeOrders.filter(x => ['ChoiceAttribute', 'Elevation', 'Handing'].indexOf(x.jobChangeOrderTypeDescription) !== -1);
			if (changeOrders && changeOrders.length)
			{
				return true;
			}
		} else if (dto.hasOwnProperty('changeOrderTypeDescription'))
		{
			let type = dto['changeOrderTypeDescription'];

			if (type === 'ChoiceAttribute' || type === 'Elevation' || type === 'Handing')
			{
				return true;
			}
		}
	}
	return false;
}

export class ChangeOrderGroup
{
	id?: number;
	jobId: number;
	job?: Job;
	amount?: number;
	jobChangeOrderGroupDescription: string;
	salesStatusDescription: string;
	salesStatusUTCDate: Date;
	salesStatusReason?: string;
	jobChangeOrderGroupSalesStatusHistories?: ChangeOrderGroupSalesStatusHistory[] = [];
	constructionStatusDescription: string;
	constructionStatusUtcDate: Date;
	constructionStatusLastModifiedBy: string;
	contact?: any;
	createdBy: string;
	createdUtcDate: Date;
	createdByContactId: number;
	signedDate?: Date;
	note?: Note;
	jobChangeOrders: Array<ChangeOrder> = [];
	eSignEnvelopes?: Array<ESignEnvelope> = [];
	envelopeId?: string = null;
	overrideNote: string;
	changeOrderGroupSequence?: number;
	changeOrderGroupSequenceSuffix?: string = null;

	constructor(dto?: ChangeOrderGroup)
	{
		if (dto)
		{
			Object.assign(this, dto);

			this.createdUtcDate = new Date(dto.createdUtcDate);
			this.salesStatusUTCDate = new Date(dto.salesStatusUTCDate);
			this.constructionStatusUtcDate = new Date(dto.constructionStatusUtcDate);
			this.signedDate = dto.signedDate ? new Date(dto.signedDate) : null;
			this.amount = dto['changePrice'];

			if (dto.jobChangeOrderGroupSalesStatusHistories)
			{
				this.jobChangeOrderGroupSalesStatusHistories = dto.jobChangeOrderGroupSalesStatusHistories.map(h => new ChangeOrderGroupSalesStatusHistory(h));

				let signed = dto.jobChangeOrderGroupSalesStatusHistories.find(h => h?.salesStatusId === 2);

				if (signed)
				{
					this.signedDate = signed.createdUtcDate;
				}
			}

			if (dto.jobChangeOrders)
			{
				this.jobChangeOrders = dto.jobChangeOrders.map(c => new ChangeOrder(c));
			}

			if (dto.eSignEnvelopes)
			{
				this.eSignEnvelopes = dto.eSignEnvelopes.map(e => new ESignEnvelope(e));
			}

			if (dto.note)
			{
				this.note = new Note(dto.note);
			}

			if (dto['jobChangeOrderGroupSalesAgreementAssocs'] && dto['jobChangeOrderGroupSalesAgreementAssocs'].length)
			{
				this.changeOrderGroupSequence = dto['jobChangeOrderGroupSalesAgreementAssocs'][0].changeOrderGroupSequence;
				this.changeOrderGroupSequenceSuffix = dto['jobChangeOrderGroupSalesAgreementAssocs'][0].changeOrderGroupSequenceSuffix;
			}

			this.createdByContactId = (<any>dto).createdbyContactId; //capitalization is currently incorrect in API
		}
	}
}

export class ChangeOrderGroupSalesStatusHistory
{
	id?: number;
	jobChangeOrderGroupId: number;
	salesStatusId: number;
	salesStatusUtcDate: Date;
	salesStatusReason?: string;
	createdBy?: string;
	createdUtcDate: Date;

	constructor(dto?: ChangeOrderGroupSalesStatusHistory)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrder
{
	id: number;
	jobChangeOrderTypeDescription: string;
	jobChangeOrderChoices: Array<ChangeOrderChoice> = [];
	jobChangeOrderPlanOptions: Array<ChangeOrderPlanOption> = [];
	jobChangeOrderHandings: Array<ChangeOrderHanding> = [];
	jobChangeOrderNonStandardOptions: Array<ChangeOrderNonStandardOption> = [];
	jobChangeOrderPlans: Array<ChangeOrderPlan> = [];
	jobChangeOrderLots: Array<ChangeOrderLot> = [];
	jobSalesChangeOrderBuyers: Array<ChangeOrderBuyer> = [];
	jobSalesChangeOrderTrusts: Array<SalesChangeOrderTrust> = [];
	jobSalesChangeOrderPriceAdjustments: Array<SalesChangeOrderPriceAdjustment> = [];
	jobSalesChangeOrderSalesPrograms: Array<SalesChangeOrderSalesProgram> = [];
	salesNotesChangeOrders: Array<SalesNotesChangeOrders> = []

	constructor(dto?: ChangeOrder)
	{
		if (dto)
		{
			Object.assign(this, dto);

			if (dto.jobChangeOrderPlanOptions)
			{
				this.jobChangeOrderPlanOptions = dto.jobChangeOrderPlanOptions.map(p => new ChangeOrderPlanOption(p));
			}

			if (dto.jobChangeOrderChoices)
			{
				this.jobChangeOrderChoices = dto.jobChangeOrderChoices.map(c => new ChangeOrderChoice(c));
			}

			if (dto.jobChangeOrderHandings)
			{
				this.jobChangeOrderHandings = dto.jobChangeOrderHandings.map(h => new ChangeOrderHanding(h));
			}

			if (dto.jobChangeOrderNonStandardOptions)
			{
				this.jobChangeOrderNonStandardOptions = dto.jobChangeOrderNonStandardOptions.map(o => new ChangeOrderNonStandardOption(o));
			}

			if (dto.jobChangeOrderPlans)
			{
				this.jobChangeOrderPlans = dto.jobChangeOrderPlans.map(o => new ChangeOrderPlan(o));
			}

			if (dto.jobChangeOrderLots)
			{
				this.jobChangeOrderLots = dto.jobChangeOrderLots.map(o => new ChangeOrderLot(o));
			}

			if (dto.jobSalesChangeOrderBuyers)
			{
				this.jobSalesChangeOrderBuyers = dto.jobSalesChangeOrderBuyers.map(o => new ChangeOrderBuyer(o));
			}

			if (dto.jobSalesChangeOrderTrusts)
			{
				this.jobSalesChangeOrderTrusts = dto.jobSalesChangeOrderTrusts.map(o => new SalesChangeOrderTrust(o));
			}

			if (dto.jobSalesChangeOrderPriceAdjustments)
			{
				this.jobSalesChangeOrderPriceAdjustments = dto.jobSalesChangeOrderPriceAdjustments.map(o => new SalesChangeOrderPriceAdjustment(o));
			}

			if (dto.jobSalesChangeOrderSalesPrograms)
			{
				this.jobSalesChangeOrderSalesPrograms = dto.jobSalesChangeOrderSalesPrograms.map(o => new SalesChangeOrderSalesProgram(o));
			}

			if (dto.salesNotesChangeOrders && dto.salesNotesChangeOrders.length > 0)
			{
				this.salesNotesChangeOrders = dto.salesNotesChangeOrders.map(o => new SalesNotesChangeOrders(o));
			}

		}
	}
}

export interface IActionType
{
	id?: number;
	value?: string;
}

export enum SalesStatusEnum
{
	Pending = 1,
	Signed = 2,
	Approved = 3,
	Rejected = 4,
	Withdrawn = 5,
	OutforSignature = 6
}

export class ChangeInput
{
	type: ChangeTypeEnum;
	isDirty: boolean;
	trustName: string;
	isTrustNa: boolean;
	buyers: Array<Buyer> = [];
	handing: ChangeOrderHanding;
	changeOrderPlanId: number = 0;

	constructor(type?: ChangeTypeEnum)
	{
		this.type = type;
	}
}

export class ChangeOrderChoice
{
	id: number;
	decisionPointChoiceID: number;
	quantity: number;
	decisionPointChoiceCalculatedPrice: number;
	choiceLabel: string;
	divChoiceCatalogId: number;
	overrideNoteId: number;
	overrideNote?: string = null;
	jobChangeOrderChoiceAttributes?: Array<ChangeOrderChoiceAttribute>;
	jobChangeOrderChoiceLocations?: Array<ChangeOrderChoiceLocation>;
	jobChangeOrderChoiceChangeOrderPlanOptionAssocs?: Array<ChangeOrderChoiceChangeOrderPlanOption>;
	action: string;
	decisionPointLabel?: string = null;
	groupLabel?: string = null;
	subgroupLabel?: string = null;
	isColorScheme?: boolean = false;
	isElevation?: boolean = false;
	outForSignatureDate?: Date;

	get dpChoiceId(): number
	{
		return this.decisionPointChoiceID;
	};

	get dpChoiceQuantity(): number
	{
		return this.quantity;
	}

	get dpChoiceCalculatedPrice(): number
	{
		return this.decisionPointChoiceCalculatedPrice;
	}

	constructor(dto?: ChangeOrderChoice)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrderChoiceAttribute
{
	id: number;
	attributeGroupCommunityId?: number;
	attributeCommunityId?: number;
	attributeName: string;
	attributeGroupLabel: string;
	action: string;
	manufacturer: string;
	sku: string;
	imageUrl?: string;

	constructor(dto?: ChangeOrderChoiceAttribute)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrderChoiceLocation
{
	id: number;
	locationGroupCommunityId?: number;
	locationCommunityId?: number;
	locationName?: string;
	locationGroupLabel?: string;
	quantity: number;
	action: string;
	jobChangeOrderChoiceLocationAttributes?: Array<ChangeOrderChoiceAttribute>;

	constructor(dto?: ChangeOrderChoiceLocation)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrderPlanOption
{
	id: number;
	planOptionId: number;
	listPrice: number;
	optionSalesName: string;
	optionDescription: string;
	action: string;
	qty: number;
	integrationKey: string;
	jobChangeOrderPlanOptionAttributes?: Array<ChangeOrderPlanOptionAttribute>;
	jobChangeOrderPlanOptionLocations?: Array<ChangeOrderPlanOptionLocation>;
	outForSignatureDate?: Date;

	constructor(dto?: ChangeOrderPlanOption)
	{
		if (dto)
		{
			Object.assign(this, dto);

			this.integrationKey = dto['planOptionCommunity']['optionCommunity']['option']['financialOptionIntegrationKey'];

			if (dto.jobChangeOrderPlanOptionAttributes && dto.jobChangeOrderPlanOptionAttributes.length) {
				this.jobChangeOrderPlanOptionAttributes = this.jobChangeOrderPlanOptionAttributes.map(a => new ChangeOrderPlanOptionAttribute(a));
			}

			if (dto.jobChangeOrderPlanOptionLocations && dto.jobChangeOrderPlanOptionLocations.length) {
				this.jobChangeOrderPlanOptionLocations = this.jobChangeOrderPlanOptionLocations.map(l => new ChangeOrderPlanOptionLocation(l));
			}
		}
	}
}

export class ChangeOrderPlanOptionAttribute {
	id: number;
	attributeGroupCommunityId: number;
	attributeCommunityId: number;
	attributeName: string;
	attributeGroupLabel: string;
	manufacturer: string;
	sku: string;
	action: string;

	constructor(dto?: ChangeOrderPlanOptionAttribute) {
		if (dto) {
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrderPlanOptionLocation {
	id: number;
	locationGroupCommunityId: number;
	locationCommunityId: number;
	action: string;

	constructor(dto?: ChangeOrderPlanOptionLocation) {
		if (dto) {
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrderHanding
{
	id: number;
	handing: string;
	action: string;
	overrideNote?: string;
	overrideNoteId: number;

	constructor(dto?: ChangeOrderHanding)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrderNonStandardOption
{
	id: number;
	nonStandardOptionName: string;
	nonStandardOptionDescription: string;
	financialOptionNumber: string;
	action: string;
	qty: number;
	unitPrice: number;

	constructor(dto?: ChangeOrderNonStandardOption)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrderPlan
{
	id: number;
	planCommunityId: number;
	action: string;

	constructor(dto?: ChangeOrderPlan)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrderLot
{
	id: number;
	lotId: number;
	action: string;
	revertToDirt: boolean;

	constructor(dto?: ChangeOrderLot)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrderChoiceChangeOrderPlanOption
{
	jobChangeOrderPlanOptionId: number;
	jobChoiceEnabledOption: boolean;

	constructor(dto?: ChangeOrderChoiceChangeOrderPlanOption)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class SalesNotesChangeOrders
{
	id: number;
	changeOrderId: number;
	noteId: number;
	note: Note;
	action: string;
	constructor(dto?: SalesNotesChangeOrders)
	{
		if (dto)
		{
			Object.assign(this, dto);
			if (dto.note)
			{
				this.note = new Note(dto.note);
			}
		}
	}
}

export enum ChangeTypeEnum
{
	CONSTRUCTION,
	SALES,
	PLAN,
	NON_STANDARD,
	LOT_TRANSFER
}

export interface IPendingJobSummary
{
	jobId: number;
	planPrice: number;
	elevationPlanOptionId: number;
	elevationPrice: number;
	totalOptionsPrice: number;
	salesProgramAmount: number;
	totalDiscounts: number;
	totalPriceAdjustmentsAmount: number;
	totalNonStandardOptionsPrice: number;
	totalBuyerClosingCosts: number;
	netHousePrice: number;	
}
