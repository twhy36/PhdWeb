import { Observable } from 'rxjs';

import { AttributeGroupMarketTag } from './attribute-group-market-tag.model';
import { Attribute } from './attribute.model';
import { AttributeGroupCommunity } from './attribute-group-community.model';

export class AttributeGroupMarket
{
	id: number;
	marketId: number;
	groupName: string;
	attributeGroupMarketTags: Array<AttributeGroupMarketTag>;
	description: string;
	groupLabel: string;
	tags: Array<string>;
	name: string;
	isActive: boolean;
	attributeGroupCommunities: Array<AttributeGroupCommunity>;
	attributeMarkets: Array<Attribute>;
	attributeMarkets$: Observable<Array<Attribute>>;
	isDivisional: boolean;

	attributeGroupAttributeMarketAssocs: IAttributeGroupAttributeMarketAssoc[];

	sortOrder: number;

	get formattedTags(): string
	{
		return joinTags(this.attributeGroupMarketTags, this.tags, "; ");
	}

	get tagsString(): string
	{
		return joinTags(this.attributeGroupMarketTags, this.tags, " ");
	}

	constructor(att?: AttributeGroupMarket, attributes$?: Observable<Array<Attribute>>, sortOrder?: number)
	{
		if (att)
		{
			Object.assign(this, att);

			if (att.attributeGroupCommunities && att.attributeGroupCommunities.length)
			{
				this.attributeGroupCommunities = att.attributeGroupCommunities.map(a =>
				{
					return new AttributeGroupCommunity(a);
				});
			}
			else
			{
				this.attributeGroupCommunities = new Array<AttributeGroupCommunity>();
			}

			if (att.attributeMarkets)
			{
				this.attributeMarkets = att.attributeMarkets.map(x =>
				{
					return new Attribute(x);
				});
			}
			else
			{
				this.attributeMarkets = new Array<Attribute>();
			}

			if (att.attributeGroupMarketTags)
			{
				this.attributeGroupMarketTags = att.attributeGroupMarketTags.map(x =>
				{
					return { attributeGroupMarketId: x.attributeGroupMarketId, tag: x.tag } as AttributeGroupMarketTag;
				});
			}
			else
			{
				this.attributeGroupMarketTags = new Array<AttributeGroupMarketTag>();
			}
		}
		else
		{
			this.attributeGroupMarketTags = new Array<AttributeGroupMarketTag>();
			this.tags = new Array<string>();
		}

		if (attributes$)
		{
			this.attributeMarkets$ = attributes$;
		}

		this.name = this.groupName;
		this.sortOrder = sortOrder || 0;
	}

}

export function isAttributeGroup(obj: any): obj is AttributeGroupMarket
{
	return typeof obj.groupName !== 'undefined';
}

function joinTags(attributeGroupMarketTags: Array<AttributeGroupMarketTag>, tags: Array<string>, delimiter: string): string
{
	if (attributeGroupMarketTags && attributeGroupMarketTags.length > 0)
	{
		const attrGroupMarketTags = attributeGroupMarketTags.map(t => t.tag);

		return attrGroupMarketTags.join(delimiter);
	}
	else if (tags && tags.length > 0)
	{
		return tags.join(delimiter);
	}
	else
	{
		return '';
	}
}

export interface IAttributeGroupAttributeMarketAssoc
{
	attributeMarketId: number;
	attributeGroupMarketId: number;
	attributeMarket: Attribute;
}
