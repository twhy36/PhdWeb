import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SettingsService } from '../../core/services/settings.service';
import { LoggingService } from "../../core/services/logging.service";
import { Settings } from '../../shared/models/settings.model';

import { Attribute } from '../../shared/models/attribute.model';
import { AttributeGroupMarket } from '../../shared/models/attribute-group-market.model';
import { AttributeGroupCommunity } from '../../shared/models/attribute-group-community.model';
import { Option, IOptionMarket } from '../../shared/models/option.model';
import { IFinancialCommunity } from '../../shared/models/financial-community.model';
import { GroupChoice } from '../../shared/models/group-choice.model';
import { withSpinner } from 'phd-common';

import * as moment from 'moment';
import { orderBy } from "lodash";

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class AttributeService
{
	private _ds: string = encodeURIComponent("$");

	constructor(private _http: HttpClient, private _loggingService: LoggingService) { }

	getAttributesByMarketId(marketId: number, status?: boolean, topRows?: number, skipRows?: number, filterName?: string, keywords?: string): Observable<Array<Attribute>>
	{
		let url = settings.apiUrl;

		const expand = `attributeMarketTags($select=attributeMarketId,tag;)`;
		const select = `id, marketId, name, attributeDescription, manufacturer, sku, imageUrl, startDate, endDate`;
		const orderBy = `name`;
		let filter = `marketId eq ${marketId}`;

		if (keywords)
		{
			let filters = [];
			const keywordArray = keywords.toLowerCase().split(' ');

			keywordArray.map(keyword =>
			{
				if (!filterName)
				{
					filters.push(`indexof(tolower(name), '${keyword}') gt -1`);
					filters.push(`indexof(tolower(sku), '${keyword}') gt -1`);
					filters.push(`indexof(tolower(manufacturer), '${keyword}') gt -1`);
					filters.push(`attributeMarketTags/any(a: (indexof(tolower(a/tag), '${keyword}') gt -1) )`);
				}
				else if (filterName === 'tagsString')
				{
					filters.push(`attributeMarketTags/any(a: (indexof(tolower(a/tag), '${keyword}') gt -1) )`);
				}
				else
				{
					filters.push(`indexof(tolower(${filterName}), '${keyword}') gt -1`);
				}
			});

			const keysfilter = filters.join(' or ');

			filter = `(${keysfilter}) and marketId eq ${marketId}`;
		}

		if (status !== null && status !== undefined)
		{
			const today = moment.utc(new Date()).format('YYYY-MM-DDThh:mm:ssZ');
			const compareOperator = status ? 'ge' : 'lt';

			filter = `(${filter}) and endDate ${compareOperator} ${today}`;
		}

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

		url += `attributeMarkets?${qryStr}`;

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
				let attr = response['value'] as Array<Attribute>;
				let attributes = attr.map(x =>
				{
					return new Attribute(x, this.getGroupsForAttribute(x.id));
				});

				return attributes;
			}),
			catchError(this.handleError));
	}

	getAttributeGroupsByMarketId(marketId: number, status?: boolean, topRows?: number, skipRows?: number, filterName?: string, keywords?: string, filterEmpty?: boolean): Observable<Array<AttributeGroupMarket>>
	{
		let url = settings.apiUrl;

		let expand = `attributeGroupMarketTags($select=attributeGroupMarketId,tag;)`;
		const select = `id, marketId, groupName, description, groupLabel, isActive`;
		const orderBy = `groupName`;
		let filter = `marketId eq ${marketId}`;

		if (keywords)
		{
			let filters = [];
			const keywordArray = keywords.toLowerCase().split(' ');

			keywordArray.map(keyword =>
			{
				if (!filterName)
				{
					filters.push(`indexof(tolower(groupName), '${keyword}') gt -1`);
					filters.push(`attributeGroupMarketTags/any(a: (indexof(tolower(a/tag), '${keyword}') gt -1) )`);
				}
				else if (filterName === 'tagsString')
				{
					filters.push(`attributeGroupMarketTags/any(a: (indexof(tolower(a/tag), '${keyword}') gt -1) )`);
				}
				else
				{
					filters.push(`indexof(tolower(${filterName}), '${keyword}') gt -1`);
				}
			});

			const keysfilter = filters.join(' or ');

			filter = `(${keysfilter}) and marketId eq ${marketId}`;
		}

		if (status !== null && status !== undefined)
		{
			const statusString = status ? 'true' : 'false';
			filter = `(${filter}) and isActive eq ${statusString}`;
		}

		// return only groups with attributes attached
		if (filterEmpty)
		{
			const today = moment.utc(new Date()).format('YYYY-MM-DDThh:mm:ssZ');

			expand += `, attributeGroupAttributeMarketAssocs($select=attributeMarketId; $expand=attributeMarket($select=id, endDate; $filter=endDate gt ${today});)`;
			filter += ` and attributeGroupAttributeMarketAssocs/any(a: a/attributeMarket/endDate gt ${today})`;
		}

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

		url += `attributeGroupMarkets?${qryStr}`;

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
				let attr = response['value'] as Array<AttributeGroupMarket>;
				let attributeGroups = attr.map(g =>
				{
					return new AttributeGroupMarket(g, this.getAttributesForGroup(g));
				});

				return attributeGroups;
			}),
			catchError(this.handleError));
	}

	getAttributesForGroup(group: AttributeGroupMarket): Observable<Array<Attribute>>
	{
		let url = settings.apiUrl;

		const expand = `attributeGroupAttributeMarketAssocs($select=attributeMarketId; $expand=attributeMarket($expand=attributeMarketTags($select=attributeMarketId,tag); $select=id,name,attributeDescription,manufacturer,sku,endDate); $orderby=attributeMarket/name)`;
		const filter = `id eq ${group.id}`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=id`;

		url += `attributeGroupMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let attr = response['value'][0].attributeGroupAttributeMarketAssocs.map(a => a.attributeMarket) as Array<Attribute>;
				let attributes = attr.map(x =>
				{
					return new Attribute(x);
				});

				return attributes;
			}),
			catchError(this.handleError));
	}

	getGroupsForAttribute(id: number): Observable<Array<AttributeGroupMarket>>
	{
		let url = settings.apiUrl;

		const expand = `attributeGroupAttributeMarketAssocs($select=attributeMarketId)`;
		const filter = `attributeGroupAttributeMarketAssocs/any(a: a/attributeMarketId eq ${id})`;
		const select = `id, marketId, groupName`;
		const orderby = `groupName`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `attributeGroupMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let attr = response['value'] as Array<AttributeGroupMarket>;

				let attributeGroups = attr.map(x =>
				{
					return new AttributeGroupMarket(x);
				});

				return attributeGroups;
			}),
			catchError(this.handleError));
	}

	getActiveAttributeGroupsByMarketId(marketId: number): Observable<Array<AttributeGroupMarket>>
	{
		let url = settings.apiUrl;

		const filter = `marketId eq ${marketId} and isActive eq true`;
		const select = `id, groupName`;
		const orderby = `groupName`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `attributeGroupMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let attr = response['value'] as Array<AttributeGroupMarket>;

				let attributeGroups = attr.map(g =>
				{
					return new AttributeGroupMarket(g);
				});

				return attributeGroups;
			}),
			catchError(this.handleError));
	}

	addAttribute(attribute: Attribute): Observable<Attribute>
	{
		let url = settings.apiUrl;

		url += `attributeMarkets`;

		return this._http.post(url, attribute).pipe(
			map(response =>
			{
				let attr = response as Attribute;

				return new Attribute(attr, this.getGroupsForAttribute(attr.id));
			}),
			catchError(this.handleError));
	}

	updateAttribute(attribute: Attribute): Observable<Attribute>
	{
		let url = settings.apiUrl;

		url += `attributeMarkets(${attribute.id})`;

		const data = {
			id: attribute.id,
			name: attribute.name,
			imageUrl: attribute.imageUrl,
			manufacturer: attribute.manufacturer,
			sku: attribute.sku,
			attributeDescription: attribute.attributeDescription,
			startDate: attribute.startDate,
			endDate: attribute.endDate,
			tags: attribute.tags
		} as Attribute;

		return this._http.patch(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let attr = response as Attribute;

				return new Attribute(attr, this.getGroupsForAttribute(attr.id));
			}),
			catchError(this.handleError));
	}

	addAttributeGroup(attributeGroup: AttributeGroupMarket): Observable<AttributeGroupMarket>
	{
		let url = settings.apiUrl;

		url += `attributeGroupMarkets`;

		const data = {
			marketId: attributeGroup.marketId,
			groupName: attributeGroup.groupName,
			description: attributeGroup.description,
			groupLabel: attributeGroup.groupLabel,
			tags: attributeGroup.tags
		};

		return this._http.post(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let attr = response as AttributeGroupMarket;

				return new AttributeGroupMarket(attr);
			}),
			catchError(this.handleError));
	}

	updateAttributeGroup(attributeGroup: AttributeGroupMarket): Observable<AttributeGroupMarket>
	{
		let url = settings.apiUrl;

		url += `attributeGroupMarkets(${attributeGroup.id})`;

		const data = {
			description: attributeGroup.description,
			groupLabel: attributeGroup.groupLabel,
			groupName: attributeGroup.groupName,
			isActive: attributeGroup.isActive,
			id: attributeGroup.id,
			tags: attributeGroup.tags
		} as AttributeGroupMarket;

		return this._http.patch(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let attr = response as AttributeGroupMarket;

				return new AttributeGroupMarket(attr);
			}),
			catchError(this.handleError));
	}

	updateAttributeAssociations(groupId: number, attributeIds: Array<number>, isRemoved: boolean): Observable<AttributeGroupMarket>
	{
		let url = settings.apiUrl + `UpdateAttributeAssociations`;

		let data = {
			'groupId': groupId,
			'attributeIds': attributeIds,
			'isRemoved': isRemoved
		};
		return this._http.patch(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let attr = response as AttributeGroupMarket;

				return new AttributeGroupMarket(attr);
			}),
			catchError(this.handleError));
	}

	updateAssociationsByAttributeId(attributeMarketId: number, addedGroupIds: Array<number>, removedGroupIds: Array<number>): Observable<Attribute>
	{
		let url = settings.apiUrl + `UpdateAssociationsByAttributeId`;

		let data = {
			'attributeMarketId': attributeMarketId,
			'addedGroupIds': addedGroupIds,
			'removedGroupIds': removedGroupIds
		};

		return this._http.patch(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let attr = response as Attribute;

				return new Attribute(attr, this.getGroupsForAttribute(attr.id));
			}),
			catchError(this.handleError));
	}

	getChoiceAttributeGroups(choiceId: number, dTreeVersionId: number): Observable<Array<AttributeGroupCommunity>>
	{
		let url = settings.apiUrl + `GetChoiceAttributeGroups`;

		url += `(choiceId=${choiceId},dTreeVersionId=${dTreeVersionId})`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let groups = response['value'] as Array<AttributeGroupCommunity>;

				return groups;
			}),
			catchError(this.handleError));
	}

	addChoiceAttributeGroupAssocs(choiceId: number, dTreeVersionId: number, communityId: number, sortOrder: number, groupMarketIds: Array<number>): Observable<Array<AttributeGroupCommunity>>
	{
		let url = settings.apiUrl + `AddChoiceAttributeGroupAssocs`;

		let data = {
			'choiceId': choiceId,
			'dTreeVersionId': dTreeVersionId,
			'communityId': communityId,
			'attributeGroupMarketIds': groupMarketIds,
			'sortOrder': sortOrder
		};

		return this._http.post(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let groups = response['value'] as Array<AttributeGroupCommunity>;

				return groups;
			}),
			catchError(this.handleError));
	}

	updateChoiceAttributeGroupAssocs(choiceId: number, treeVersionId: number, groupOrders: Array<any>): Observable<any>
	{
		let url = settings.apiUrl + `UpdateChoiceAttributeGroupAssocs`;

		let data = {
			choiceId: choiceId,
			treeVersionId: treeVersionId,
			groupOrderDtos: groupOrders
		};

		return this._http.patch(url, { choiceAttributeGroupAssocDto: data }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError));
	}

	removeChoiceAttributeGroupAssocs(choiceId: number, dTreeVersionId: number, groupCommunityIds: Array<number>): Observable<Array<number>> {
		let url = settings.apiUrl + `RemoveChoiceAttributeGroupAssocs`;

		let data = {
			'choiceId': choiceId,
			'dTreeVersionId': dTreeVersionId,
			'groupCommunityIds': groupCommunityIds
		};

		return this._http.patch(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response => {
				let groupIds = response['value'] as Array<number>;

				return groupIds;
			}),
			catchError(this.handleError));
	}

	updateAttributeGroupOptionMarketAssocs(optionMarketId: number, groupOrders: Array<any>): Observable<Option>
	{
		let url = settings.apiUrl + `UpdateAttributeGroupOptionMarketAssocs`;

		let data = {
			optionMarketId: optionMarketId,
			groupOrderDtos: groupOrders
		};

		return this._http.patch(url, { optionAttributeGroupAssocDto: data }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let option = response as Option;

				return option;
			}),
			catchError(this.handleError));
	}

	checkOptionAttributeGroups(choiceId: number, dTreeVersionId: number, communityId: number, optionKeys: Array<string>): Observable<Array<AttributeGroupCommunity>>
	{
		let url = settings.apiUrl + `CheckOptionAttributeGroups`;

		let data = {
			'choiceId': choiceId,
			'dTreeVersionId': dTreeVersionId,
			'communityId': communityId,
			'optionKeys': optionKeys
		};

		return this._http.patch(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let groups = response['value'] as Array<AttributeGroupCommunity>;

				return groups;
			}),
			catchError(this.handleError));
	}

	getOptionCommunityAttributeGroups(optionCommunityId: number): Observable<Array<AttributeGroupCommunity>>
	{
		const expand = `attributeGroupOptionCommunityAssocs($select=attributeGroupCommunityId,sortOrder;$expand=attributeGroupCommunity($expand=attributeGroupCommunityTags($select=attributeGroupCommunityId,tag),attributeGroupAttributeCommunityAssocs($select=attributeGroupCommunityId;$expand=attributeCommunity($select=id,name,endDate););$select=id,groupName,groupLabel,description))`;
		const filter = `id eq ${optionCommunityId}`;
		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		let url = settings.apiUrl + `optionCommunities?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let attributeGroups = response['value'][0].attributeGroupOptionCommunityAssocs.map(a =>
				{
					return new AttributeGroupCommunity(a.attributeGroupCommunity, a.sortOrder);
				});

				return orderBy(attributeGroups, 'sortOrder');
			}),
			catchError(this.handleError));
	}

	/**
	 * *Returns a list of associated Communities for the given AttributeGroup
	 * @param group
	 */
	getAttributeGroupCommunities(group: AttributeGroupMarket): Observable<Array<IFinancialCommunity>>
	{
		let url = settings.apiUrl;

		const expand = `attributeGroupCommunities($filter=attributeGroupMarketId eq ${group.id};$select=id, attributeGroupMarketId)`;
		const filter = `attributeGroupCommunities/any(a: a/attributeGroupMarketId eq ${group.id})`;
		const select = `id, number, name`;
		const orderby = `name`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `financialCommunities?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let communities = response['value'] as Array<IFinancialCommunity>;

				return communities;
			}),
			catchError(this.handleError));
	}

	removeAttributeGroupFromOption(optionMarketId: number, groupOrders: Array<any>): Observable<any>
	{
		let url = settings.apiUrl + `RemoveAttributeGroupMarketFromOption`;

		let data = {
			optionMarketId: optionMarketId,
			groupOrderDtos: groupOrders
		};

		return this._http.patch(url, { optionAttributeGroupAssocDto: data }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let option = response as Option;

				return option;
			}),
			catchError(this.handleError));
	}

	getAttributeGroupOptions(group: AttributeGroupMarket): Observable<Array<Option>>
	{
		let url = settings.apiUrl;

		const expand = `option($filter=isActive eq true; $select=id, financialOptionIntegrationKey, isActive), attributeGroupOptionMarketAssocs($select=attributeGroupMarketId;$expand=attributeGroupMarket($select=id;$filter=id eq ${group.id}))`;
		const filter = `attributeGroupOptionMarketAssocs/any(a: a/attributeGroupMarketId eq ${group.id})`;
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

	getAttributeGroupChoices(group: AttributeGroupMarket): Observable<Array<GroupChoice>>
	{
		let url = settings.apiUrl;

		url += `GetAttributeGroupChoices(id=${group.id})`;

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

	updateAttributeGroupsCommunitiesAssocs(optionMarketId: number, associatedCommunityIds: number[], disassociatedCommunityIds: number[], groupMarkets: AttributeGroupMarket[]): Observable<any>
	{
		let url = settings.apiUrl + `UpdateAttributeGroupsCommunitiesAssocs`;

		let data = {
			'optionMarketId': optionMarketId,
			'associatedCommunityIds': associatedCommunityIds,
			'disassociatedCommunityIds': disassociatedCommunityIds,
			'attributeGroupMarketIds': groupMarkets.map(x => x.id)
		};

		return this._http.patch(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
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
