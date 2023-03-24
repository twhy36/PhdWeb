import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, of, throwError as _throw } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import { SettingsService } from '../../core/services/settings.service';
import { OrganizationService } from './organization.service';

import { Settings } from '../../shared/models/settings.model';
import { Location } from '../../shared/models/location.model';
import { LocationGroupMarket } from '../../shared/models/location-group-market.model';
import { Option, IOptionMarket } from '../../shared/models/option.model';
import { LocationGroupCommunity } from '../../shared/models/location-group-community.model';
import { GroupChoice } from '../../shared/models/group-choice.model';
import { TableSort } from '../../../../../../phd-common/src/lib/components/table/phd-table.model';
import { IFinancialCommunity } from '../../shared/models/financial-community.model';

import { withSpinner } from 'phd-common';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class LocationService
{
	private _ds: string = encodeURIComponent("$");

	constructor(private _http: HttpClient, private _orgService: OrganizationService) { }

	getLocationsByMarketId(marketId: number, status?: boolean, topRows?: number, skipRows?: number, filterName?: string, keywords?: string, tableSort?: TableSort): Observable<Array<Location>>
	{
		let url = settings.apiUrl;

		const expand = `locationMarketTags($select=locationMarketId,tag;)`;
		const select = `id, marketId, locationName, locationDescription, isActive`;
		let orderby = tableSort?.sortField ?? `locationName`;
		let filter = `marketId eq ${marketId}`;

		if (tableSort?.sortField)
		{
			orderby += ` ${tableSort.sortOrderText}`;
		}

		if (keywords)
		{
			var keywordFilter = '';

			if (!filterName)
			{
				keywordFilter += `indexof(tolower(locationName), '${keywords}') gt -1`;
				keywordFilter += ` or locationMarketTags/any(a: (indexof(tolower(a/tag), '${keywords}') gt -1) )`;
			}
			else if (filterName === 'tagsString')
			{
				keywordFilter += `locationMarketTags/any(a: (indexof(tolower(a/tag), '${keywords}') gt -1) )`;
			}
			else
			{
				keywordFilter += `indexof(tolower(${filterName}), '${keywords}') gt -1`;
			}

			filter += ` and (${keywordFilter})`;
		}

		if (status !== null && status !== undefined)
		{
			const statusString = status ? 'true' : 'false';

			filter = `(${filter}) and isActive eq ${statusString}`;
		}

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `locationMarkets?${qryStr}`;

		if (topRows)
		{
			url += `&${this._ds}top=${topRows}`;
		}

		if (skipRows)
		{
			url += `&${this._ds}skip=${skipRows}`;
		}

		return (skipRows ? this._http : withSpinner(this._http)).get(url).pipe(
			map(response =>
			{
				let loco = response['value'] as Array<Location>;

				let locations = loco.map(x =>
				{
					return new Location(x, this.getGroupsForLocation(x.id));
				});

				return locations;
			}),
			catchError(this.handleError));
	}

	getLocationGroupsByMarketId(marketId: number, status?: boolean, topRows?: number, skipRows?: number, filterName?: string, keywords?: string, filterEmpty?: boolean, tableSort?: TableSort): Observable<Array<LocationGroupMarket>>
	{
		let url = settings.apiUrl;

		let expand = `locationGroupMarketTags($select=locationGroupMarketId,tag;)`;
		const select = `id, marketId, locationGroupName, locationGroupDescription, groupLabel, isActive`;
		let orderby = tableSort?.sortField ?? `locationGroupName`;
		let filter = `marketId eq ${marketId}`;

		if (tableSort?.sortField)
		{
			orderby += ` ${tableSort.sortOrderText}`;
		}

		if (keywords)
		{
			var keywordFilter = '';
						
			if (!filterName)
			{
				keywordFilter += `indexof(tolower(locationGroupName), '${keywords}') gt -1`;
				keywordFilter += ` or locationGroupMarketTags/any(a: (indexof(tolower(a/tag), '${keywords}') gt -1) )`;
			}
			else if (filterName === 'tagsString')
			{
				keywordFilter += `locationGroupMarketTags/any(a: (indexof(tolower(a/tag), '${keywords}') gt -1) )`;
			}
			else
			{
				keywordFilter += `indexof(tolower(${filterName}), '${keywords}') gt -1`;
			}

			filter += ` and (${keywordFilter})`;
		}

		if (status !== null && status !== undefined)
		{
			const statusString = status ? 'true' : 'false';

			filter = `(${filter}) and isActive eq ${statusString}`;
		}

		// return only groups with locations attached
		if (filterEmpty)
		{
			expand += `, locationGroupLocationMarketAssocs($select=locationMarketId; $expand=locationMarket($select=id, isActive; $filter=isActive eq true);)`;
			filter += ` and locationGroupLocationMarketAssocs/any(a: a/locationMarket/isActive eq true)`;
		}

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `locationGroupMarkets?${qryStr}`;

		if (topRows)
		{
			url += `&${this._ds}top=${topRows}`;
		}

		if (skipRows)
		{
			url += `&${this._ds}skip=${skipRows}`;
		}

		return (skipRows ? this._http : withSpinner(this._http)).get(url).pipe(
			map(response =>
			{
				let loco = response['value'] as Array<LocationGroupMarket>;
				let locationGroups = loco.map(g =>
				{
					return new LocationGroupMarket(g, this.getLocationsForGroup(g));
				});

				return locationGroups;
			}),
			catchError(this.handleError));
	}

	getLocationGroupCommunitiesByFinancialCommunityIds(financialCommunityIds: number[]): Observable<LocationGroupCommunity[]>
	{
		let url = settings.apiUrl;

		const select = `id, locationGroupMarketId, financialCommunityId, locationGroupName`;
		const filter = `financialCommunityId in (${financialCommunityIds.join(',')})`;

		const qryStr = `${this._ds}select=${encodeURIComponent(select)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		url += `locationGroupCommunities?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let attr = response['value'] as LocationGroupCommunity[];

				let locationGroupCommunities = attr.map(x =>
				{
					return new LocationGroupCommunity(x);
				});

				return locationGroupCommunities;
			}),
			catchError(this.handleError));
	}

	getLocationsForGroup(group: LocationGroupMarket): Observable<Array<Location>>
	{
		let url = settings.apiUrl;

		const expand = `locationGroupLocationMarketAssocs($select=locationMarketId; $expand=locationMarket($expand=locationMarketTags($select=locationMarketId,tag); $select=id,locationName,locationDescription, isActive); $orderby=locationMarket/locationName)`;
		const filter = `id eq ${group.id}`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=id`;

		url += `locationGroupMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let loco = response['value'][0].locationGroupLocationMarketAssocs.map(a => a.locationMarket) as Array<Location>;
				let locations = loco.map(x =>
				{
					return new Location(x);
				});

				return locations;
			}),
			catchError(this.handleError));
	}

	getGroupsForLocation(id: number): Observable<Array<LocationGroupMarket>>
	{
		let url = settings.apiUrl;

		const expand = `locationGroupLocationMarketAssocs($select=locationMarketId)`;
		const filter = `locationGroupLocationMarketAssocs/any(a: a/locationMarketId eq ${id})`;
		const select = `id, marketId, locationGroupName`;
		const orderby = `locationGroupName`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `locationGroupMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let loco = response['value'] as Array<LocationGroupMarket>;

				let locationGroups = loco.map(x =>
				{
					return new LocationGroupMarket(x);
				});

				return locationGroups;
			}),
			catchError(this.handleError));
	}

	getActiveLocationGroupsByMarketId(marketId: number): Observable<Array<LocationGroupMarket>>
	{
		let url = settings.apiUrl;

		const filter = `marketId eq ${marketId} and isActive eq true`;
		const select = `id, locationGroupName`;
		const orderby = `locationGroupName`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `locationGroupMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let loco = response['value'] as Array<LocationGroupMarket>;
				let locationGroups = loco.map(g =>
				{
					return new LocationGroupMarket(g);
				});

				return locationGroups;
			}),
			catchError(this.handleError));
	}

	/**
	 * Gets a list of location group market data for a set of LocationGroupMarketIds
	 * @param locationGroupMarketIds The IDs for which to retrieve the data.
	 */
	getLocationGroupMarketForIds(locationGroupMarketIds: number[]): Observable<Array<LocationGroupMarket>>
	{
		let url = settings.apiUrl;

		const expand = `locationGroupMarketTags($select=locationGroupMarketId,tag;)`;
		const filter = `id in (${locationGroupMarketIds.join(',')}) and isActive eq true`;
		const select = `id, locationGroupName, groupLabel, locationGroupDescription`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `locationGroupMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let loc = response['value'] as Array<LocationGroupMarket>;

				let locationGroups = loc.map(g =>
				{
					return new LocationGroupMarket(g);
				});

				return locationGroups;
			}),
			catchError(this.handleError));
	}

	addLocation(location: Location): Observable<Location>
	{
		let url = settings.apiUrl;

		url += `locationMarkets`;

		return this._http.post(url, location).pipe(
			map(response =>
			{
				let loco = response as Location;

				return new Location(loco, this.getGroupsForLocation(loco.id));
			}),
			catchError(this.handleError));
	}

	patchLocation(location: Location): Observable<Location>
	{
		let url = settings.apiUrl;

		url += `locationMarkets(${location.id})`;

		return this._http.patch(url, location, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let loc = response as Location;

				return new Location(loc, this.getGroupsForLocation(loc.id));
			}),
			catchError(this.handleError));
	}

	addLocationGroup(locationGroup: LocationGroupMarket): Observable<LocationGroupMarket>
	{
		let url = settings.apiUrl;

		url += `locationGroupMarkets`;

		return this._http.post(url, locationGroup).pipe(
			map(response =>
			{
				let loco = response as LocationGroupMarket;

				return new LocationGroupMarket(loco);
			}),
			catchError(this.handleError));
	}

	patchLocationGroup(group: LocationGroupMarket): Observable<LocationGroupMarket>
	{
		let url = settings.apiUrl;

		url += `locationGroupMarkets(${group.id})`;

		return this._http.patch(url, group, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let loc = response as LocationGroupMarket;

				return new LocationGroupMarket(loc);
			}),
			catchError(this.handleError));
	}

	updateLocationAssociations(groupId: number, locationIds: Array<number>, isRemoved: boolean): Observable<LocationGroupMarket>
	{
		let url = settings.apiUrl + `UpdateLocationAssociations`;
		let data = {
			'groupId': groupId,
			'locationIds': locationIds,
			'isRemoved': isRemoved
		};

		return withSpinner(this._http).patch(url, data).pipe(
			map(response =>
			{
				let loco = response as LocationGroupMarket;

				return new LocationGroupMarket(loco);
			}),
			catchError(this.handleError));
	}

	updateAssociationsByLocationId(locationMarketId: number, addedGroupIds: Array<number>, removedGroupIds: Array<number>): Observable<Location>
	{
		let url = settings.apiUrl + `UpdateAssociationsByLocationId`;
		let data = {
			'locationMarketId': locationMarketId,
			'addedGroupIds': addedGroupIds,
			'removedGroupIds': removedGroupIds
		};

		return this._http.patch(url, data).pipe(
			map(response =>
			{
				let loco = response as Location;

				return new Location(loco, this.getGroupsForLocation(loco.id));
			}),
			catchError(this.handleError));
	}

	getChoiceLocationGroups(choiceId: number, dTreeVersionId: number): Observable<Array<LocationGroupCommunity>>
	{
		let url = settings.apiUrl + `GetChoiceLocationGroups`;

		url += `(choiceId=${choiceId},dTreeVersionId=${dTreeVersionId})`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let groups = response['value'] as Array<LocationGroupCommunity>;

				return groups;
			}),
			catchError(this.handleError));
	}

	addChoiceLocationGroupAssocs(choiceId: number, dTreeVersionId: number, communityId: number, groupMarketIds: Array<number>): Observable<Array<LocationGroupCommunity>>
	{
		let url = settings.apiUrl + `AddChoiceLocationGroupAssocs`;

		let data = {
			'choiceId': choiceId,
			'dTreeVersionId': dTreeVersionId,
			'communityId': communityId,
			'locationGroupMarketIds': groupMarketIds
		};

		return this._http.post(url, data).pipe(
			map(response =>
			{
				let groups = response['value'] as Array<LocationGroupCommunity>;

				return groups;
			}),
			catchError(this.handleError));
	}

	removeChoiceLocationGroupAssocs(choiceId: number, dTreeVersionId: number, groupCommunityIds: Array<number>): Observable<Array<number>>
	{
		let url = settings.apiUrl + `RemoveChoiceLocationGroupAssocs`;

		let data = {
			'choiceId': choiceId,
			'dTreeVersionId': dTreeVersionId,
			'groupCommunityIds': groupCommunityIds
		};

		return this._http.patch(url, data).pipe(
			map(response =>
			{
				let groupIds = response['value'] as Array<number>;

				return groupIds;
			}),
			catchError(this.handleError));
	}

	updateLocationGroupOptionMarketAssocs(optionMarketId: number, groupMarketIds: Array<number>, isRemoved: boolean): Observable<Option>
	{
		let url = settings.apiUrl + `UpdateLocationGroupOptionMarketAssocs`;

		let data = {
			'optionMarketId': optionMarketId,
			'groupMarketIds': groupMarketIds,
			'isRemoved': isRemoved
		};

		return withSpinner(this._http).patch(url, data).pipe(
			map(response =>
			{
				let option = response as Option;

				return option;
			}),
			catchError(this.handleError));
	}

	updateLocationGroupChoiceMarketAssocs(divChoiceCatalogId: number, groupIds: Array<any>, isRemoved: boolean): Observable<any>
	{
		let url = settings.apiUrl + `UpdateLocationGroupChoiceMarketAssocs`;

		let data = {
			divChoiceCatalogId: divChoiceCatalogId,
			groupIds: groupIds,
			isRemoved: isRemoved
		};

		return withSpinner(this._http).patch(url, { divisionalChoiceLocationGroupAssocDto: data }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let ret = response as any;

				return ret;
			}),
			catchError(this.handleError));
	}

	checkOptionLocationGroups(choiceId: number, dTreeVersionId: number, communityId: number, optionKeys: Array<string>): Observable<Array<LocationGroupCommunity>>
	{
		let url = settings.apiUrl + `CheckOptionLocationGroups`;

		let data = {
			'choiceId': choiceId,
			'dTreeVersionId': dTreeVersionId,
			'communityId': communityId,
			'optionKeys': optionKeys
		};

		return this._http.patch(url, data).pipe(
			map(response =>
			{
				let groups = response['value'] as Array<LocationGroupCommunity>;

				return groups;
			}),
			catchError(this.handleError));
	}

	/**
	 * *Returns a list of Financial Communities for the given LocationGroup
	 * @param group
	 */
	getFinancialCommunitiesRelatedByLocationGroup(group: LocationGroupMarket): Observable<IFinancialCommunity[]>
	{
		let url = settings.apiUrl;

		const filter = `locationGroupMarketId eq ${group.id}`;
		const select = `id, financialCommunityId, locationGroupMarketId`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `locationGroupCommunities?${qryStr}`;

		return this._http.get(url).pipe(
			switchMap(response =>
			{
				let communities = response['value'] as LocationGroupCommunity[];
				let financialCommunityIds = communities?.map(x => x.financialCommunityId);
				
				return financialCommunityIds.length ? this._orgService.getFinancialCommunitiesByIds(financialCommunityIds) : of([] as IFinancialCommunity[]);
			}),
			map(communities =>
			{
				return communities;
			}),
			catchError(this.handleError));
	}

	getLocationGroupOptions(group: LocationGroupMarket): Observable<Array<Option>>
	{
		let url = settings.apiUrl;

		const expand = `option($select=id, financialOptionIntegrationKey), locationGroupOptionMarketAssocs($select=locationGroupMarketId;$expand=locationGroupMarket($select=id;$filter=id eq ${group.id}))`;
		const filter = `locationGroupOptionMarketAssocs/any(a: a/locationGroupMarketId eq ${group.id})`;
		const select = `id, optionId, marketId, optionSalesName, optionDescription, isActive`;
		const orderby = `optionSalesName`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `optionMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let optionsDto = response['value'] as Array<IOptionMarket>;

				let options = optionsDto.map(om =>
				{
					return {
						id: om.id,
						optionId: om.optionId,
						marketId: om.marketId,
						financialOptionIntegrationKey: om.option.financialOptionIntegrationKey,
						optionSalesName: om.optionSalesName,
						optionDescription: om.optionDescription
					} as Option;
				});

				return options;
			}),
			catchError(this.handleError));
	}

	getLocationGroupChoices(group: LocationGroupMarket)
	{
		let url = settings.apiUrl;

		url += `GetLocationGroupChoices(id=${group.id})`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let choices = [];

				if (response.hasOwnProperty('value'))
				{
					choices = response['value'] as Array<GroupChoice>;
				}
				else if (response.hasOwnProperty('result'))
				{
					choices = response['result'] as Array<GroupChoice>;
				}

				return choices;
			}),
			catchError(this.handleError));
	}

	removeLocationGroupFromOption(optionMarketId: number, groupMarketIds: number[]): Observable<any>
	{
		let url = settings.apiUrl + `RemoveLocationGroupMarketFromOption`;

		let data = {
			'optionMarketId': optionMarketId,
			'groupMarketIds': groupMarketIds
		};

		return this._http.patch(url, data).pipe(
			map(response =>
			{
				let option = response as Option;

				return option;
			}),
			catchError(this.handleError));
	}

	updateLocationGroupsCommunitiesAssocs(optionMarketId: number, associatedCommunityIds: number[], disassociatedCommunityIds: number[], groupMarkets: LocationGroupMarket[]): Observable<any>
	{
		let url = settings.apiUrl + `UpdateLocationGroupsCommunitiesAssocs`;

		let data = {
			'optionMarketId': optionMarketId,
			'associatedCommunityIds': associatedCommunityIds,
			'disassociatedCommunityIds': disassociatedCommunityIds,
			'locationGroupMarketIds': groupMarkets.map(x => x.id)
		};

		return this._http.patch(url, data).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError));
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}
