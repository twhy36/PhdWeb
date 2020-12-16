import { OpportunityContactAssoc, IOpportunityContactAssoc } from "./opportunity.model";

export interface IBuyer
{
	id: number,
	isPrimaryBuyer: boolean,
	isOriginalSigner?: boolean,
	sortKey: number,
	opportunityContactAssoc?: IOpportunityContactAssoc
}

export class Buyer
{
	id = 0;
	isPrimaryBuyer = false;
	isOriginalSigner = false;
	sortKey = 0;

	opportunityContactAssoc: OpportunityContactAssoc;

	constructor(dto: IBuyer = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.isPrimaryBuyer = dto.isPrimaryBuyer;
			this.isOriginalSigner = dto.isOriginalSigner;
			this.sortKey = dto.sortKey;
			this.opportunityContactAssoc = new OpportunityContactAssoc(dto.opportunityContactAssoc);
		}
		else
		{
			this.opportunityContactAssoc = new OpportunityContactAssoc();
		}
	}
}
