import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import * as odataUtils from '../../shared/classes/odata-utils.class';
import { orderBy } from "lodash";

import { IFinancialCommunity } from '../../shared/models/financial-community.model';
import { IOptionMarket, Option, IOptionMarketImageDto, OptionMarketImage } from '../../shared/models/option.model';
import { Settings } from '../../shared/models/settings.model';
import { AttributeGroupMarket } from '../../shared/models/attribute-group-market.model';
import { LocationGroupMarket } from '../../shared/models/location-group-market.model';
import { TableSort } from '../../../../../../phd-common/src/lib/components/table/phd-table.model';

import { LoggingService } from '../../core/services/logging.service';
import { SettingsService } from '../../core/services/settings.service';
import { withSpinner } from 'phd-common';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class DivisionalOptionService
{
	private _ds: string = encodeURIComponent('$');
	private _batch = "$batch";

	constructor(private _http: HttpClient, private _loggingService: LoggingService) { }

	getDivisionalOptions(marketId: number, top?: number, skip?: number, filterName?: string, keywords?: string, tableSort?: TableSort): Observable<Array<Option>>
	{
		let url = settings.apiUrl;

		const expand = `option($select=id, financialOptionIntegrationKey), optionMarketImages($select=id), optionSubCategory($select=id, name; $expand=optionCategory($select=id, name)), attributeGroupOptionMarketAssocs($select=attributeGroupMarketId; $top=1), locationGroupOptionMarketAssocs($select=locationGroupMarketId; $top=1)`;
		const select = `id, optionId, marketId, optionSalesName, isActive`;
		let orderby = `optionSubCategory/optionCategory/name, optionSubCategory/name, optionSalesName`;
		let filter = `marketId eq ${marketId} and isActive eq true and option/financialOptionIntegrationKey ne '00001'`;

		if (tableSort?.sortField)
		{
			switch (tableSort.sortField)
			{
				case 'financialOptionIntegrationKey':
					orderby = 'option/financialOptionIntegrationKey';

					break;
				case 'optionSalesName':
					orderby = 'optionSalesName';

					break;
				case 'category':
					orderby = 'optionSubCategory/optionCategory/name';

					break;
				case 'subCategory':
					orderby = 'optionSubCategory/name';

					break;
			}

			orderby += ` ${tableSort.sortOrderText}`;
		}

		if (keywords)
		{
			var keywordFilter = '';

			if (!filterName)
			{
				keywordFilter += `indexof(tolower(optionSalesName), '${keywords}') gt -1`;
				keywordFilter += ` or indexof(tolower(option/financialOptionIntegrationKey), '${keywords}') gt -1`;
				keywordFilter += ` or indexof(tolower(optionSubCategory/optionCategory/name), '${keywords}') gt -1`;
				keywordFilter += ` or indexof(tolower(optionSubCategory/name), '${keywords}') gt -1`;
			}
			else if (filterName === 'financialOptionIntegrationKey')
			{
				keywordFilter += `indexof(tolower(option/financialOptionIntegrationKey), '${keywords}') gt -1`;
			}
			else if (filterName === 'category')
			{
				keywordFilter += `indexof(tolower(optionSubCategory/optionCategory/name), '${keywords}') gt -1`;
			}
			else if (filterName === 'subCategory')
			{
				keywordFilter += `indexof(tolower(optionSubCategory/name), '${keywords}') gt -1`;
			}
			else
			{
				keywordFilter += `indexof(tolower(${filterName}), '${keywords}') gt -1`;
			}

			filter += ` and (${keywordFilter})`;
		}

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `optionMarkets?${qryStr}`;

		if (top)
		{
			url += `&${this._ds}top=${top}`;
		}

		if (skip)
		{
			url += `&${this._ds}skip=${skip}`;
		}

		return (skip ? this._http : withSpinner(this._http)).get(url).pipe(
			map(response =>
			{
				let optionMarkets = response['value'] as Array<IOptionMarket>;
				let options = this.mapOptions(optionMarkets);

				return options;
			}
			),
			catchError(this.handleError));
	}

	getDivisionalOptionImages(optionMarketId: number): Observable<OptionMarketImage[]>
	{
		const entity = `optionMarketImages`;
		const expand = `optionCommunityImages($select=id, optionCommunityId)`;
		const filter = `optionMarketId eq ${optionMarketId}`;
		const orderby = `sortKey`;
		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(response =>
			{
				const optionMarketImages = response.value.map(x => {
					return new OptionMarketImage(x);
				});

				return orderBy(optionMarketImages, 'sortKey');
			})
		);
	}

	saveDivisionalOptionImages(images: IOptionMarketImageDto[]): Observable<IOptionMarketImageDto[]>
	{
		// calling unbound odata action 
		const body = {
			'optionMarketImages': images
		};

		const action = `SaveOptionMarketImages`;
		const endpoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endpoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response.value as Array<IOptionMarketImageDto>;
			})
		);
	}

	getAttributeGroupsForOption(option: IOptionMarket): Observable<Array<AttributeGroupMarket>>
	{
		let url = settings.apiUrl;

		const expand = `attributeGroupOptionMarketAssocs($select=attributeGroupMarketId,sortOrder; $expand=attributeGroupMarket($expand=attributeGroupMarketTags($select=attributeGroupMarketId,tag); $select=id, groupName, groupLabel, description))`;
		const filter = `id eq ${option.id}`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=id`;

		url += `optionMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let attributeGroups = response['value'][0].attributeGroupOptionMarketAssocs.map(x =>
				{
					return new AttributeGroupMarket(x.attributeGroupMarket, null, x.sortOrder);
				});

				return orderBy(attributeGroups, 'sortOrder');
			}),
			catchError(this.handleError));
	}

	getLocationGroupsForOption(option: IOptionMarket): Observable<Array<LocationGroupMarket>>
	{
		let url = settings.apiUrl;

		const expand = `locationGroupOptionMarketAssocs($select=locationGroupMarketId; $expand=locationGroupMarket($expand=locationGroupMarketTags($select=locationGroupMarketId,tag); $select=id, locationGroupName, groupLabel, locationGroupDescription))`;
		const filter = `id eq ${option.id}`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=id`;

		url += `optionMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let groups = response['value'][0].locationGroupOptionMarketAssocs.map(a => a.locationGroupMarket) as Array<LocationGroupMarket>;

				let locationGroups = groups.map(x =>
				{
					return new LocationGroupMarket(x);
				});

				return locationGroups;
			}),
			catchError(this.handleError));
	}

	getAssociationsForCommunity(optionMarket: Option, financialCommunityId: number): Observable<Option>
	{
		let url = settings.apiUrl;

		let expand = `attributeGroupOptionMarketAssocs($select=attributeGroupMarketId,sortOrder;$expand=attributeGroupMarket($expand=attributeGroupCommunities($expand=attributeGroupOptionCommunityAssocs($select=attributeGroupCommunityId;$expand=optionCommunity($filter=optionId eq ${optionMarket.optionId}; $select=id, financialCommunityId;)); $filter=financialCommunityId eq ${financialCommunityId}; $select=id, financialCommunityId;$filter=attributeGroupOptionCommunityAssocs/any(a : a/optionCommunity/optionId eq ${optionMarket.optionId})); $select=id, groupName; $orderby=groupName)),`;
		expand += `locationGroupOptionMarketAssocs($select=locationGroupMarketId;$expand=locationGroupMarket($expand=locationGroupCommunities($expand=locationGroupOptionCommunityAssocs($select=locationGroupCommunityId;$expand=optionCommunity($filter=optionId eq ${optionMarket.optionId}; $select=id, financialCommunityId;)); $filter=financialCommunityId eq ${financialCommunityId}; $select=id, financialCommunityId;$filter=locationGroupOptionCommunityAssocs/any(a : a/optionCommunity/optionId eq ${optionMarket.optionId})); $select=id, locationGroupName; $orderby=locationGroupName)),`;
		expand += `optionMarketImages($select=id,optionMarketId,imageUrl,sortKey;$expand=optionCommunityImages($expand=optionCommunity($select=financialCommunityId)))`;
		const filter = `id eq ${optionMarket.id}`;
		const select = `id, optionId`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `optionMarkets?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let option = response['value'];

				//Odata filtering within expand seems to have some issues
				//remove if it resolves itself at some point
				option.forEach(opt =>
				{
					opt.attributeGroupOptionMarketAssocs.forEach(agom =>
					{
						agom.attributeGroupMarket.attributeGroupCommunities = agom.attributeGroupMarket.attributeGroupCommunities.filter(comm => comm.financialCommunityId === financialCommunityId);
						agom.attributeGroupMarket.sortOrder = agom.sortOrder;
					});
					opt.locationGroupOptionMarketAssocs.forEach(lgom =>
					{
						lgom.locationGroupMarket.locationGroupCommunities = lgom.locationGroupMarket.locationGroupCommunities.filter(comm => comm.financialCommunityId === financialCommunityId);
					});
					opt.optionMarketImages.forEach(omi => {
						omi.optionCommunityImages = omi.optionCommunityImages.filter(oci => oci.optionCommunity.financialCommunityId === financialCommunityId);
					});
				});

				let optionAssociations = option.map(opt =>
				{
					// needs to be NEW Attr not as
					return {
						id: opt.id,
						attributeGroups: opt.attributeGroupOptionMarketAssocs.map(a => new AttributeGroupMarket(a.attributeGroupMarket, null, a.attributeGroupMarket.sortOrder)),
						locationGroups: opt.locationGroupOptionMarketAssocs.map(l => new LocationGroupMarket(l.locationGroupMarket)),
						optionMarketImages: opt.optionMarketImages.map(omi => new OptionMarketImage(omi))
					} as Option;
				});

				return optionAssociations;
			}),
			catchError(this.handleError));
	}

	saveDivisionalOptionImageSortOrder(images: IOptionMarketImageDto[]): Observable<any>
	{
		const batchRequestsImage = odataUtils.createBatchPatchWithAuth<IOptionMarketImageDto>(images, "id", "optionMarketImages", "sortKey");

		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequestsImage]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		const endPoint = `${settings.apiUrl}${this._batch}`;

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(response =>
			{
				//todo: parse batch response for errors and throw any
				return response;
			})
		);
	}

	deleteDivisionalOptionImages(optionMarketImages: Array<IOptionMarketImageDto>): Observable<any> {
		const url = `${settings.apiUrl}DeleteOptionMarketImages`;

		return this._http.post(url, { optionMarketImageIds: optionMarketImages.map(x => x.id) }).pipe(
			map(response => {
				return response;
			}),
			catchError(this.handleError)
		);
	}

	associateItemsToCommunity(optionMarketId: number, financialCommunityId: number, selectedAttributes: AttributeGroupMarket[], selectedLocations: LocationGroupMarket[], selectedOptionMarketImages: OptionMarketImage[]): Observable<any>
	{
		let url = settings.apiUrl + `AssociateItemsToCommunity`;

		let data = {
			'optionMarketId': optionMarketId,
			'financialCommunityId': financialCommunityId,
			'groupOrderDtos': selectedAttributes.map(x =>
			{
				return {
					attributeGroupId: x.id,
					sortOrder: x.sortOrder
				}
			}),
			'selectedLocations': selectedLocations.map(x => x.id),
			'selectedOptionMarketImages': selectedOptionMarketImages.map(x => x.id)
		};

		return this._http.post(url, { optionAttributeGroupAssocDto: data }).pipe(
			map(response =>
			{
				let option = response as Option;

				return option;
			}),
			catchError(this.handleError));
	}

	updateOptionAttributeGroupAssocs(optionMarketId: number, groups: AttributeGroupMarket[]): Observable<any>
	{
		let url = settings.apiUrl + `UpdateOptionAttributeGroupAssocs`;

		let data = {
			'optionMarketId': optionMarketId,
			'groupOrderDtos': groups.map(x =>
			{
				return {
					attributeGroupId: x.id,
					sortOrder: x.sortOrder
				}
			})
		};

		return withSpinner(this._http).patch(url, { optionAttributeGroupAssocDto: data }).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError));
	}

	/**
	 * Maps optionMarket results
	 * @param optionMarkets
	 */
	mapOptions(optionMarkets: Array<IOptionMarket>)
	{
		let options = optionMarkets.map(om =>
		{
			const imageCount = om['optionMarketImages'].length;

			return {
				id: om.id,
				optionId: om.optionId,
				marketId: om.marketId,
				financialOptionIntegrationKey: om.option.financialOptionIntegrationKey,
				optionSalesName: om.optionSalesName,
				subCategory: om.optionSubCategory.name,
				category: om.optionSubCategory.optionCategory.name,
				hasImages: imageCount > 0,
				imageCount: imageCount,
				attributeGroups$: this.getAttributeGroupsForOption(om),
				locationGroups$: this.getLocationGroupsForOption(om),
				communities$: this.getCommunitiesForOption(om),
				optionMarketImages$: this.getDivisionalOptionImages(om.id),
				hasAttributeLocationAssoc: om['attributeGroupOptionMarketAssocs'].length > 0 || om['locationGroupOptionMarketAssocs'].length > 0
			} as Option;
		});

		return options;
	}

	//gets communities for option
	getCommunitiesForOption(optionMarket: IOptionMarket): Observable<Array<IFinancialCommunity>>
	{
		let expand = `option($select=id,financialOptionIntegrationKey),financialCommunity($select=id,number,name,marketId),`;
		expand += `attributeGroupOptionCommunityAssocs($select=attributeGroupCommunityId;$expand=attributeGroupCommunity($select=id,attributeGroupMarketId)),`;
		expand += `locationGroupOptionCommunityAssocs($select=locationGroupCommunityId;$expand=locationGroupCommunity($select=id,locationGroupMarketId,locationGroupName)),`;
		expand += `planOptionCommunities($select=id;$expand=optionCommunity($select=id, financialCommunityId))`;
		const filter = `option/financialOptionIntegrationKey eq '${optionMarket.option.financialOptionIntegrationKey}' and financialCommunity/marketId eq ${optionMarket.marketId} and (financialCommunity/salesStatusDescription eq 'New' or financialCommunity/salesStatusDescription eq 'Active')`;
		const select = `id,optionId,financialCommunityId`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=financialCommunity/name`;
		let url = `${settings.apiUrl}optionCommunities?${qryStr}`;

		return withSpinner(this._http).get(url).pipe(
			map(response =>
			{
				let optionCommunities = response['value'];

				let communities = optionCommunities.map(c =>
				{
					const attributeGroupCommunities = c.attributeGroupOptionCommunityAssocs ? c.attributeGroupOptionCommunityAssocs.map(a => a.attributeGroupCommunity) : null;
					const locationGroupCommunities = c.locationGroupOptionCommunityAssocs ? c.locationGroupOptionCommunityAssocs.map(a => a.locationGroupCommunity) : null;
					const optionCommunities = c.planOptionCommunities ? c.planOptionCommunities.map(a => a.optionCommunity) : null;

					return {
						id: c.financialCommunity.id,
						number: c.financialCommunity.number,
						name: c.financialCommunity.name,
						optionAssociated: ((attributeGroupCommunities && attributeGroupCommunities.length > 0) || (locationGroupCommunities && locationGroupCommunities.length > 0)),
						attributeGroupCommunities: attributeGroupCommunities,
						locationGroupCommunities: locationGroupCommunities,
						optionCommunities: optionCommunities
					} as IFinancialCommunity;
				});

				return communities as Array<IFinancialCommunity>;
			})
		);
	}

	/**
	 * Updates the communities associated to a collection of OptionMarketImages.
	 * @param optionMarketId The ID of the Option Market in which the image(s) exist.
	 * @param associatedCommunityIds The communities to be associated with the image(s).
	 * @param disassociatedCommunityIds The communities to be disassociated with the image(s).
	 * @param optionImages The image(s) for which the communities are to be updated.
	 */
	updateOptionMarketImagesCommunitiesAssocs(optionMarketId: number, associatedCommunityIds: number[], disassociatedCommunityIds: number[], optionImages: OptionMarketImage[]): Observable<any> {
		const url = settings.apiUrl + `UpdateOptionMarketImagesCommunitiesAssocs`;

		const data = {
			'optionMarketId': optionMarketId,
			'associatedCommunityIds': associatedCommunityIds,
			'disassociatedCommunityIds': disassociatedCommunityIds,
			'optionMarketImageIds': optionImages.map(x => x.id)
		};

		return this._http.patch(url, data).pipe(
			map(response => {
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
