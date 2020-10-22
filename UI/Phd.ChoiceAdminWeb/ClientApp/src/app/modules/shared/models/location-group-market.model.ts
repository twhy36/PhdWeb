import { LocationGroupMarketTag } from './location-group-market-tag.model';
import { Location } from './location.model';

import { Observable } from 'rxjs';
import { LocationGroupCommunity } from './location-group-community.model';

export class LocationGroupMarket
{
	id: number;
	marketId: number;
	locationGroupName: string;
	locationGroupMarketTags: Array<LocationGroupMarketTag>;
	locationGroupDescription: string;
	groupLabel: string;
	isActive: boolean;
	tags: Array<string>;
	locationGroupCommunities: Array<LocationGroupCommunity>;
	locationMarkets: Array<Location>;
	locationMarkets$: Observable<Array<Location>>;

	locationGroupLocationMarketAssocs: ILocationGroupLocationMarketAssoc[];

	get formattedTags(): string
	{
		return this.joinTags("; ");
	}

	get tagsString(): string
	{
		return this.joinTags(" ");
	}

	private joinTags(delimiter: string): string
	{
		if (this.locationGroupMarketTags && this.locationGroupMarketTags.length > 0)
		{
			let tags = this.locationGroupMarketTags.map(t => t.tag);

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

	constructor(loc?: LocationGroupMarket, locations$?: Observable<Array<Location>>)
	{
		if (loc)
		{
			Object.assign(this, loc);

			if (loc.locationGroupCommunities && loc.locationGroupCommunities.length)
			{
				this.locationGroupCommunities = loc.locationGroupCommunities.map(a =>
				{
					return new LocationGroupCommunity(a);
				});
			}
			else
			{
				this.locationGroupCommunities = new Array<LocationGroupCommunity>();
			}

			if (loc.locationMarkets)
			{
				this.locationMarkets = loc.locationMarkets.map(x =>
				{
					return new Location(x);
				});
			}
			else
			{
				this.locationMarkets = new Array<Location>();
			}

			this.tags = this.locationGroupMarketTags ? this.locationGroupMarketTags.map(t => t.tag) : new Array<string>();
		}
		else
		{
			this.locationGroupMarketTags = new Array<LocationGroupMarketTag>();
			this.tags = new Array<string>();
		}

		if (locations$)
		{
			this.locationMarkets$ = locations$;
		}
	}
}

export function isLocationGroup(obj: any): obj is LocationGroupMarket
{
	return typeof obj.locationGroupName !== 'undefined';
}

export interface ILocationGroupLocationMarketAssoc
{
	locationMarketId: number;
	locationGroupMarketId: number;
	locationMarket: Location;
}
