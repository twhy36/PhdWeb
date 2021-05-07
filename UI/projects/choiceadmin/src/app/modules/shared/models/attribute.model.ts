import * as moment from 'moment';
import { Observable } from 'rxjs';

import { AttributeMarketTag } from './attribute-market-tag.model';
import { AttributeGroupMarket } from './attribute-group-market.model';

export class Attribute
{
	id: number;
	marketId: number;
	name: string;
	imageUrl: string;
	manufacturer: string;
	sku: string;
	attributeMarketTags: Array<AttributeMarketTag>;
	attributeDescription: string;
	startDate: Date;
	endDate: Date;
	tags: Array<string>;

	attributeGroups$: Observable<Array<AttributeGroupMarket>>;

	get formattedStartDate(): string
	{
		return this.startDate ? this.convertToUtcString(this.startDate) : '';
	}

	get formattedEndDate(): string
	{
		return (this.endDate && !this.isDefaultEndDate()) ? this.convertToUtcString(this.endDate) : '';
	}

	get formattedTags(): string
	{
		return this.joinTags("; ");
	}

	get tagsString(): string
	{
		return this.joinTags(" ");
	}

	get defaultEndDate(): Date
	{
		return new Date(9998, 10, 30);
	}

	get active(): boolean
	{
		const today = new Date();

		return !this.endDate || this.endDate.getTime() > today.getTime();
	}

	set active(isActive: boolean)
	{
		if (isActive)
		{
			this.endDate = this.defaultEndDate;
		}
		else
		{
			this.endDate = new Date();

			this.endDate.setDate(this.endDate.getDate() - 1);
		}
	}

	private joinTags(delimiter: string): string
	{
		if (this.attributeMarketTags && this.attributeMarketTags.length > 0)
		{
			let tags = this.attributeMarketTags.map(t => t.tag);

			return tags.join(delimiter);
		}
		else if (this.tags && this.tags.length > 0)
		{
			return this.tags.join(delimiter);
		}
		else
		{
			return '';
		}
	}

	constructor(att?: Attribute, attributeGroups$?: Observable<Array<AttributeGroupMarket>>)
	{
		if (att)
		{
			Object.assign(this, att);

			if (!this.tags)
			{
				this.tags = (this.attributeMarketTags && this.attributeMarketTags.length) ? this.attributeMarketTags.map(t => t.tag) : new Array<string>();
			}

			if (att.startDate)
			{
				this.startDate = new Date(this.convertToUtcString(att.startDate));
			}

			if (att.endDate)
			{
				this.endDate = new Date(this.convertToUtcString(att.endDate));
			}
		}
		else
		{
			this.attributeMarketTags = new Array<AttributeMarketTag>();
			this.tags = new Array<string>();
		}

		if (attributeGroups$)
		{
			this.attributeGroups$ = attributeGroups$;
		}
	}

	isDefaultEndDate(): boolean
	{
		return !this.endDate || this.convertToUtcString(this.endDate) === this.convertToUtcString(this.defaultEndDate);
	}

	convertToUtcString(date: Date): string
	{
		return moment.utc(date).format('L');
	}
}
