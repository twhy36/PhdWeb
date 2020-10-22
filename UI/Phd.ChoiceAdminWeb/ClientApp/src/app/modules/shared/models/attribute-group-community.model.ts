import { Attribute } from './attribute.model';
import { AttributeGroupCommunityTag } from './attribute-group-community-tag.model';
import { Option } from './option.model';

export class AttributeGroupCommunity
{
	id: number;
	marketId: number;
	groupName: string;
	description: string;
	groupLabel: string;
	tags: Array<string>;
	name: string;
	isActive: boolean;
	financialCommunityId: number;
	attributeGroupMarketId: number;
	attributeCommunities: Array<Attribute>;
	attributeGroupCommunityTags: Array<AttributeGroupCommunityTag>;
	optionCommunities: Array<Option>;

	attributeGroupOptionCommunityAssocs: IAttributeGroupOptionCommunityAssoc[];
	attributeGroupAttributeCommunityAssocs: IAttributeGroupAttributeCommunityAssoc[];

	sortOrder: number;

	get formattedTags(): string
	{
		return this.attributeGroupCommunityTags.map(t => t.tag).join('; ');
	}

	constructor(group?: AttributeGroupCommunity, sortOrder?: number)
	{
		if (group)
		{
			Object.assign(this, group);

			if (group.attributeGroupOptionCommunityAssocs && group.attributeGroupOptionCommunityAssocs.length)
			{
				this.optionCommunities = group.attributeGroupOptionCommunityAssocs.map(a =>
				{
					return a.optionCommunity as Option;
				});
			}
			else
			{
				this.optionCommunities = new Array<Option>();
			}

			if (group.attributeCommunities && group.attributeCommunities.length)
			{
				this.attributeCommunities = [];
				group.attributeCommunities.map(x => this.attributeCommunities.push(new Attribute(x)));
			}
		}
		else
		{
			this.attributeGroupCommunityTags = new Array<AttributeGroupCommunityTag>();
		}

		this.sortOrder = sortOrder || 0;
	}
}

export interface IAttributeGroupOptionCommunityAssoc
{
	optionCommunityId: number;
	attributeGroupCommunityId: number;
	optionCommunity: Option;
}

export interface IAttributeGroupAttributeCommunityAssoc
{
	attributeCommunityId: number;
	attributeGroupCommunityId: number;
	attributeGroupCommunity: AttributeGroupCommunity;
}
