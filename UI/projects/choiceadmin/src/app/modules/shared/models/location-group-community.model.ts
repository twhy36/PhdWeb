import { LocationCommunity } from './location-community.model';
import { LocationGroupCommunityTag } from './location-group-community-tag.model';
import { Option } from './option.model';

export class LocationGroupCommunity
{
	id: number;
	marketId: number;
	locationGroupName: string;
	locationGroupDescription: string;
	groupLabel: string;
	isActive: boolean;
	tags: Array<string>;
	financialCommunityId: number;
	locationGroupMarketId: number;
	locationCommunities: Array<LocationCommunity>;
	locationGroupCommunityTags: Array<LocationGroupCommunityTag>;
	optionCommunities: Array<Option>;

	locationGroupOptionCommunityAssocs: ILocationGroupOptionCommunityAssoc[];
	locationGroupLocationCommunityAssocs: ILocationGroupLocationCommunityAssoc[];

	get formattedTags(): string
	{
		return this.locationGroupCommunityTags.map(t => t.tag).join('; ');
	}

	constructor(group?: LocationGroupCommunity)
	{
		if (group)
		{
			Object.assign(this, group);

			if (group.locationGroupOptionCommunityAssocs && group.locationGroupOptionCommunityAssocs.length)
			{
				this.optionCommunities = group.locationGroupOptionCommunityAssocs.map(l =>
				{
					return l.optionCommunity as Option;
				});
			}
			else
			{
				this.optionCommunities = new Array<Option>();
			}
		}
		else
		{
			this.locationGroupCommunityTags = new Array<LocationGroupCommunityTag>();
		}
	}
}

export interface ILocationGroupOptionCommunityAssoc
{
	optionCommunityId: number;
	locationGroupCommunityId: number;
	optionCommunity: Option;
}

export interface ILocationGroupLocationCommunityAssoc
{
	locationCommunityId: number;
	locationGroupCommunityId: number;
	locationGroupCommunity: LocationGroupCommunity;
}
