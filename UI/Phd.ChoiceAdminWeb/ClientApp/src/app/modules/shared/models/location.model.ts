import { Observable } from 'rxjs';

import { LocationMarketTag } from './location-market-tag.model';
import { LocationGroupMarket } from './location-group-market.model';

export class Location
{
	id: number;
	marketId: number;
	locationName: string;
	locationMarketTags: Array<LocationMarketTag>;
	locationDescription: string;
	isActive: boolean;
	tags: Array<string>;

	locationGroups$: Observable<Array<LocationGroupMarket>>;

	get formattedTags(): string
	{
		return this.joinTags('; ');
	}

	get tagsString(): string
	{
		return this.joinTags(' ');
	}

	private joinTags(delimiter: string): string
	{
		if (this.locationMarketTags && this.locationMarketTags.length > 0)
		{
			let tags = this.locationMarketTags.map(t => t.tag);

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

	constructor(att?: Location, locationGroups$?: Observable<Array<LocationGroupMarket>>)
	{
		if (att)
		{
			Object.assign(this, att);

			if (!this.tags)
			{
				this.tags = (this.locationMarketTags && this.locationMarketTags.length) ? this.locationMarketTags.map(t => t.tag) : new Array<string>();
			}
		}
		else
		{
			this.locationMarketTags = new Array<LocationMarketTag>();
			this.tags = new Array<string>();
		}

		if (locationGroups$)
		{
			this.locationGroups$ = locationGroups$;
		}
	}
}
