import { Contact, IContact } from './contact.model';

export interface IOpportunity
{
	id: number,
	dynamicsOpportunityId: string,
	salesCommunityId: number
}

export interface IOpportunityContactAssoc
{
	id: number,
	contactId: number,
	opportunity: IOpportunity,
	contact: IContact,
	isPrimary: boolean
}

export class OpportunityContactAssoc
{
	id: number = 0;
	contactId: number = 0;
	opportunity: Opportunity;
	contact: Contact;
	isPrimary: boolean;

	constructor(dto: IOpportunityContactAssoc = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.contactId = dto.contactId;
			this.opportunity = new Opportunity(dto.opportunity);
			this.contact = new Contact(dto.contact);
			this.isPrimary = dto.isPrimary;
		}
		else
		{
			this.contact = new Contact();
		}
	}
}

export class Opportunity
{
	id: number;
	dynamicsOpportunityId: string;
	salesCommunityId: number;

	constructor(dto: IOpportunity = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.dynamicsOpportunityId = dto.dynamicsOpportunityId;
			this.salesCommunityId = dto.salesCommunityId;
		}
	}
}
