import { Job } from "./job.model";

export class ChangeOrderGroup
{
	id?: number;
	jobId: number;
	salesStatusDescription: string;
	salesStatusUTCDate: Date;
	constructionStatusDescription: string;
	constructionStatusUtcDate: Date;
	changePrice?: number;
	createdUtcDate: Date;
	job?: Job;
	jobChangeOrders: Array<ChangeOrder> = [];

	constructor(dto?: ChangeOrderGroup)
	{
		if (dto)
		{
			Object.assign(this, dto);

			this.createdUtcDate = new Date(dto.createdUtcDate);
			this.salesStatusUTCDate = new Date(dto.salesStatusUTCDate);
			this.constructionStatusUtcDate = new Date(dto.constructionStatusUtcDate);
			this.changePrice = dto.changePrice;

			if (dto.jobChangeOrders)
			{
				this.jobChangeOrders = dto.jobChangeOrders.map(c => new ChangeOrder(c));
			}
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

			if (dto.jobChangeOrderHandings) {
				this.jobChangeOrderHandings = dto.jobChangeOrderHandings.map(h => new ChangeOrderHanding(h));
			}

			if (dto.jobChangeOrderNonStandardOptions) {
				this.jobChangeOrderNonStandardOptions = dto.jobChangeOrderNonStandardOptions.map(o => new ChangeOrderNonStandardOption(o));
			}

			if (dto.jobChangeOrderPlans)
			{
				this.jobChangeOrderPlans = dto.jobChangeOrderPlans.map(o => new ChangeOrderPlan(o));
			}

			if (dto.jobChangeOrderLots) {
				this.jobChangeOrderLots = dto.jobChangeOrderLots.map(o => new ChangeOrderLot(o));
			}
		}
	}
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

export class ChangeOrderHanding {
	id: number;
	handing: string;
	action: string;
	overrideNote?: string;
	overrideNoteId: number;

	constructor(dto?: ChangeOrderHanding) {
		if (dto) {
			Object.assign(this, dto);
		}
	}
}

export class ChangeOrderNonStandardOption {
	id: number;
	nonStandardOptionName: string;
	nonStandardOptionDescription: string;
	financialOptionNumber: string;
	action: string;
	qty: number;
	unitPrice: number;

	constructor(dto?: ChangeOrderNonStandardOption) {
		if (dto) {
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

export class ChangeOrderLot {
	id: number;
	lotId: number;
	action: string;
	revertToDirt: boolean;

	constructor(dto?: ChangeOrderLot) {
		if (dto) {
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
