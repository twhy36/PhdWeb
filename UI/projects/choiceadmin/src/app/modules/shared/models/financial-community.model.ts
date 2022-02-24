import { IFinancialMarket } from './financial-market.model';
import { AttributeGroupCommunity } from './attribute-group-community.model';
import { LocationGroupCommunity } from './location-group-community.model';
import { IPlan } from './plan.model';
import { BaseNode } from './base.model';

export interface IFinancialCommunity
{
    id: number;
	number: string;
	name: string;
    market?: IFinancialMarket;
	salesCommunityId: string;
	optionAssociated: boolean;
	attributeGroupCommunities: Array<AttributeGroupCommunity>;
	locationGroupCommunities: Array<LocationGroupCommunity>;
	planCommunities?: IPlan[];
	financialBrandId?: number;
}

export class FinancialCommunity extends BaseNode<IFinancialCommunity>
{
	get id(): number
	{
		return this.dto.id;
	}

	get name(): string
	{
		return this.dto.name;
	}

	get number(): string
	{
		return this.dto.number;
	}

	get planCommunities(): IPlan[]
	{
		return this.dto.planCommunities;
	}

	get financialBrandId(): number
	{
		return this.dto.financialBrandId;
	}
}
