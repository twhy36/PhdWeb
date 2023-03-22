import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Observable, forkJoin, throwError as _throw, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import * as odataUtils from '../../shared/classes/odata-utils.class';

import { IdentityService, withSpinner } from 'phd-common';
import { SettingsService } from './settings.service';
import { CatalogService } from './catalog.service';

import { DivDGroup } from '../../shared/models/group.model';
import { DivDSubGroup } from '../../shared/models/subgroup.model';
import { DivDPoint, IDivCatalogPointDto, IDPointPickType, DivDPointCatalog } from '../../shared/models/point.model';
import { DivDChoice, IDivCatalogChoiceDto, DivChoiceCatalog } from '../../shared/models/choice.model';
import { Settings } from '../../shared/models/settings.model';
import { IDivisionalCatalogGroupDto, IDivisionalCatalogPointDto, IDivisionalCatalogDto, IDivisionalCatalogChoiceDto, DivisionalCatalog, IDivSortList, DivisionalChoice, IDivChoiceCatalogMarketImageDto, DivChoiceCatalogMarketImage, IDivChoiceCatalogCommunityImageDto, DivChoiceCatalogCommunityImage, IDivChoiceCatalogAttributeGroupCommunityDto, DivChoiceCatalogAttributeGroupCommunity, DivChoiceCatalogAttributeGroupMarket, IDivChoiceCatalogLocationGroupCommunityDto, DivChoiceCatalogLocationGroupCommunity, DivChoiceCatalogLocationGroupMarket, IDivChoiceCatalogGroupCommunitiesDto } from '../../shared/models/divisional-catalog.model';
import { PhdEntityDto } from '../../shared/models/api-dtos.model';
import { TableSort } from '../../../../../../phd-common/src/lib/components/table/phd-table.model';
import { OrganizationService } from './organization.service';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class DivisionalService
{
	private _ds: string = encodeURIComponent("$");
	private _batch = "$batch";

	constructor(
		private _http: HttpClient,
		private _identityService: IdentityService,
		private _catService: CatalogService,
		private _orgService: OrganizationService) { }

	getDivisionalCatalog(marketId: number): Observable<DivisionalCatalog>
	{
		let url = settings.apiUrl;

		url += `GetDivisionalCatalog(marketId=${marketId})`;

		return withSpinner(this._http).get<IDivisionalCatalogDto>(url).pipe(
			map(dto =>
			{
				let groups = this.buildDivisionalCatalog(dto.groups);
				let divisionalCatalog = new DivisionalCatalog();

				divisionalCatalog.groups = groups;

				return divisionalCatalog;
			})
		);
	}

	getDivisionalChoices(marketId: number, top?: number, skip?: number, filterName?: string, keywords?: string, tableSort?: TableSort): Observable<DivisionalChoice[]>
	{
		let url = settings.apiUrl;

		const expand = `divChoiceCatalog_MarketImages($top=0;$count=true;),divChoiceCatalog_AttributeGroupMarketAssocs($top=0;$count=true;),divChoiceCatalog_LocationGroupMarketAssocs($top=0;$count=true;), divDPointCatalog($select=divDpointCatalogID, dPointLabel;$expand=dPointCatalog($select=dPointCatalogId;$expand=dSubGroupCatalog($select=dSubGroupCatalogId, dSubGroupLabel;$expand=dGroupCatalog($select=dGroupCatalogId, dGroupLabel))))`;
		const select = `divChoiceCatalogID, divDpointCatalogID, choiceLabel, isActive, divChoiceSortOrder`;
		let filter = `divDPointCatalog/org/edhmarketid eq ${marketId} and isActive eq true and divDPointCatalog/dPointCatalog/dSubGroupCatalog/dGroupCatalog/isActive eq true and divDPointCatalog/dPointCatalog/dSubGroupCatalog/isActive eq true and divDPointCatalog/isActive eq true`;
		let orderby = `divDPointCatalog/dPointCatalog/dSubGroupCatalog/dGroupCatalog/dGroupLabel, divDPointCatalog/dPointCatalog/dSubGroupCatalog/dSubGroupLabel, divDPointCatalog/dPointLabel, choiceLabel`;

		if (tableSort?.sortField)
		{
			switch (tableSort.sortField)
			{
				case 'choiceLabel':
					orderby = 'choiceLabel';

					break;
				case 'pointLabel':
					orderby = 'divDPointCatalog/dPointLabel';

					break;
				case 'subGroupLabel':
					orderby = 'divDPointCatalog/dPointCatalog/dSubGroupCatalog/dSubGroupLabel';

					break;
				case 'groupLabel':
					orderby = 'divDPointCatalog/dPointCatalog/dSubGroupCatalog/dGroupCatalog/dGroupLabel';

					break;
			}

			orderby += ` ${tableSort.sortOrderText}`;
		}

		if (keywords)
		{
			var keywordFilter = '';

			if (!filterName)
			{
				keywordFilter += `indexof(tolower(choiceLabel), '${keywords}') gt -1`;
				keywordFilter += ` or indexof(tolower(divDPointCatalog/dPointLabel), '${keywords}') gt -1`;
				keywordFilter += ` or indexof(tolower(divDPointCatalog/dPointCatalog/dSubGroupCatalog/dSubGroupLabel), '${keywords}') gt -1`;
				keywordFilter += ` or indexof(tolower(divDPointCatalog/dPointCatalog/dSubGroupCatalog/dGroupCatalog/dGroupLabel), '${keywords}') gt -1`;
			}
			else if (filterName === 'pointLabel')
			{
				keywordFilter += `indexof(tolower(divDPointCatalog/dPointLabel), '${keywords}') gt -1`;
			}
			else if (filterName === 'subGroupLabel')
			{
				keywordFilter += `indexof(tolower(divDPointCatalog/dPointCatalog/dSubGroupCatalog/dSubGroupLabel), '${keywords}') gt -1`;
			}
			else if (filterName === 'groupLabel')
			{
				keywordFilter += `indexof(tolower(divDPointCatalog/dPointCatalog/dSubGroupCatalog/dGroupCatalog/dGroupLabel), '${keywords}') gt -1`;
			}
			else
			{
				keywordFilter += `indexof(tolower(${filterName}), '${keywords}') gt -1`;
			}

			filter += ` and (${keywordFilter})`;
		}

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `divChoiceCatalogs?${qryStr}`;

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
				let dtos = response['value'] as PhdEntityDto.IDivChoiceCatalogDto[];
				let choices: DivisionalChoice[] = dtos.map(c =>
				{
					const divChoiceCatalogAttributeGroupMarketAssocsCount = c['divChoiceCatalog_AttributeGroupMarketAssocs@odata.count'] as number;
					const divChoiceCatalogLocationGroupMarketAssocsCount = c['divChoiceCatalog_LocationGroupMarketAssocs@odata.count'] as number;

					let choice = new DivisionalChoice();

					choice.divChoiceCatalogId = c.divChoiceCatalogID;
					choice.choiceLabel = c.choiceLabel;
					choice.pointLabel = c.divDPointCatalog.dPointLabel;
					choice.subGroupLabel = c.divDPointCatalog.dPointCatalog.dSubGroupCatalog.dSubGroupLabel;
					choice.groupLabel = c.divDPointCatalog.dPointCatalog.dSubGroupCatalog.dGroupCatalog.dGroupLabel;
					choice.divChoiceCatalogMarketImages$ = this.getDivChoiceCatalogMarketImages(c.divChoiceCatalogID);
					choice.imageCount = c['divChoiceCatalog_MarketImages@odata.count'] as number;
					choice.divChoiceCatalogMarketAttributes$ = this.getDivChoiceCatalogMarketAttributeGroups(c.divChoiceCatalogID);
					choice.divChoiceCatalogMarketLocations$ = this.getDivChoiceCatalogMarketLocationGroups(c.divChoiceCatalogID);
					choice.divChoiceCatalogCommunities$ = this._orgService.getCommunities(marketId);
					choice.hasAttributeLocationAssoc = divChoiceCatalogAttributeGroupMarketAssocsCount > 0 || divChoiceCatalogLocationGroupMarketAssocsCount > 0;

					return choice;
				});

				return choices;
			})
		);
	}

	getDivChoiceCatalogCommunityImages(divChoiceCatalogMarketImageIds: number[])
	{
		let url = settings.apiUrl;

		const filter = `DivChoiceCatalogMarketImageID in (${divChoiceCatalogMarketImageIds.join(',')})`;
		const select = `DivChoiceCatalogCommunityImageID, DivChoiceCatalogMarketImageID, FinancialCommunityId`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `divChoiceCatalogCommunityImages?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'] as IDivChoiceCatalogCommunityImageDto[];

				return dtos.map(dto => new DivChoiceCatalogCommunityImage(dto));
			}),
			catchError(this.handleError));
	}

	getDivChoiceCatalogCommunityImagesByOrgId(orgId: number)
	{
		let url = settings.apiUrl;

		const filter = `FinancialCommunityId eq ${orgId}`;
		const select = `DivChoiceCatalogCommunityImageID, DivChoiceCatalogMarketImageID, FinancialCommunityId`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `divChoiceCatalogCommunityImages?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'] as IDivChoiceCatalogCommunityImageDto[];

				return dtos.map(dto => new DivChoiceCatalogCommunityImage(dto));
			}),
			catchError(this.handleError));
	}

	getDivChoiceCatalogMarketImages(divChoiceCatalogId: number): Observable<DivChoiceCatalogMarketImage[]>
	{
		let url = settings.apiUrl;

		const filter = `divChoiceCatalogID eq ${divChoiceCatalogId}`;
		const select = `DivChoiceCatalogMarketImageId, divChoiceCatalogId, marketID, imageURL, sortKey`;
		const orderby = `sortKey`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `divChoiceCatalogMarketImages?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'] as IDivChoiceCatalogMarketImageDto[];

				return dtos.map(dto => new DivChoiceCatalogMarketImage(dto));
			}),
			catchError(this.handleError));
	}

	saveDivChoiceCatalogMarketImages(images: IDivChoiceCatalogMarketImageDto[]): Observable<IDivChoiceCatalogMarketImageDto[]>
	{
		// calling unbound odata action 
		const body = {
			'marketImages': images
		};

		const action = `SaveDivChoiceCatalogMarketImages`;
		const endpoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endpoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response.value as Array<IDivChoiceCatalogMarketImageDto>;
			})
		);
	}

	deleteDivChoiceCatalogMarketImages(images: Array<IDivChoiceCatalogMarketImageDto>): Observable<any>
	{
		const url = `${settings.apiUrl}DeleteDivChoiceCatalogMarketImages`;

		return this._http.post(url, { imageIds: images.map(x => x.divChoiceCatalogMarketImageId) }).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError)
		);
	}

	/**
	 * Updates the communities associated to a collection of DivChoiceCatalog_MarketImages.
	 * @param divChoiceCatalogId The ID of the DivChoiceCatalog in which the image(s) exist.
	 * @param associatedOrgIds The communities (via their OrgID) to be associated with the image(s).
	 * @param disassociatedOrgIds The communities (via their OrgID) to be disassociated with the image(s).
	 * @param marketImages The image(s) for which the communities are to be updated.
	 */
	updateDivChoiceCatalogMarketImagesCommunitiesImages(divChoiceCatalogId: number, associatedOrgIds: number[], disassociatedOrgIds: number[], marketImages: DivChoiceCatalogMarketImage[]): Observable<any>
	{
		const url = settings.apiUrl + `UpdateDivChoiceCatalogCommunitiesImages`;

		const data = {
			'divChoiceCatalogId': divChoiceCatalogId,
			'associatedOrgIds': associatedOrgIds,
			'disassociatedOrgIds': disassociatedOrgIds,
			'choiceMarketImageIds': marketImages.map(x => x.divChoiceCatalogMarketImageId)
		};

		return this._http.patch(url, data).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError));
	}

	getDivChoiceCatalogMarketAttributeGroups(divChoiceCatalogId: number): Observable<DivChoiceCatalogAttributeGroupMarket[]>
	{
		let url = settings.apiUrl;

		const filter = `divChoiceCatalogID eq ${divChoiceCatalogId}`;
		const select = `AttributeGroupMarketId, divChoiceCatalogID`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `divChoiceCatalogAttributeGroupMarketAssocs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'] as any[];

				return dtos.map(dto => new DivChoiceCatalogAttributeGroupMarket(dto));
			}),
			catchError(this.handleError));
	}

	getDivChoiceCatalogCommunityAttributeGroups(attributeGroupMarketIds: number[]): Observable<any[]>
	{
		let url = settings.apiUrl;

		const filter = `attributeGroupMarketId in (${attributeGroupMarketIds.join(',')})`;
		const select = `AttributeGroupCommunityId, AttributeGroupMarketId, divChoiceCatalogID`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `divChoiceCatalogAttributeGroupCommunityAssocs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'] as IDivChoiceCatalogAttributeGroupCommunityDto[];

				return dtos.map(dto => new DivChoiceCatalogAttributeGroupCommunity(dto));
			}),
			catchError(this.handleError));
	}

	getDivChoiceCatalogCommunityAttributeGroupsByDivChoiceCatalogId(divChoiceCatalogId: number): Observable<DivChoiceCatalogAttributeGroupCommunity[]>
	{
		let url = settings.apiUrl;

		const filter = `divChoiceCatalogId eq ${divChoiceCatalogId}`;
		const select = `divChoiceCatalogId, AttributeGroupCommunityId, AttributeGroupMarketId`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `divChoiceCatalogAttributeGroupCommunityAssocs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'] as IDivChoiceCatalogAttributeGroupCommunityDto[];

				return dtos.map(dto => new DivChoiceCatalogAttributeGroupCommunity(dto));
			}),
			catchError(this.handleError));
	}

	/**
	 * Updates the communities associated to a collection of DivChoiceCatalog_AttributeGroupMarketAssocs.
	 * @param divChoiceCatalogId The ID of the DivChoiceCatalog in which the group(s) exist.
	 * @param associatedCommunityIds The communities to be associated with the group(s).
	 * @param disassociatedCommunityIds The communities to be disassociated with the group(s).
	 * @param marketGroups The group(s) for which the communities are to be updated.
	 */
	updateDivChoiceCatalogAttributeGroupCommunityAssocs(divChoiceCatalogId: number, associatedCommunityIds: number[], disassociatedCommunityIds: number[], marketGroups: DivChoiceCatalogAttributeGroupMarket[]): Observable<any>
	{
		const url = settings.apiUrl + `UpdateDivChoiceCatalogAttributeGroupCommunityAssocs`;

		const data = {
			'divChoiceCatalogId': divChoiceCatalogId,
			'associatedCommunityIds': associatedCommunityIds,
			'disassociatedCommunityIds': disassociatedCommunityIds,
			'choiceMarketGroupIds': marketGroups.map(x => x.id)
		};

		return this._http.patch(url, data).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError));
	}

	getDivChoiceCatalogMarketLocationGroups(divChoiceCatalogId: number): Observable<DivChoiceCatalogLocationGroupMarket[]>
	{
		let url = settings.apiUrl;

		const filter = `divChoiceCatalogID eq ${divChoiceCatalogId}`;
		const select = `LocationGroupMarketId, divChoiceCatalogID`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `divChoiceCatalogLocationGroupMarketAssocs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'] as any[];

				return dtos.map(dto => new DivChoiceCatalogLocationGroupMarket(dto));
			}),
			catchError(this.handleError));
	}

	getDivChoiceCatalogCommunityLocationGroups(locationGroupMarketIds: number[]): Observable<any[]>
	{
		let url = settings.apiUrl;

		const filter = `locationGroupMarketId in (${locationGroupMarketIds.join(',')})`;
		const select = `LocationGroupCommunityId, LocationGroupMarketId, divChoiceCatalogID`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `divChoiceCatalogLocationGroupCommunityAssocs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'] as IDivChoiceCatalogLocationGroupCommunityDto[];

				return dtos.map(dto => new DivChoiceCatalogLocationGroupCommunity(dto));
			}),
			catchError(this.handleError));
	}

	getDivChoiceCatalogCommunityLocationGroupsByDivChoiceCatalogId(divChoiceCatalogId: number): Observable<DivChoiceCatalogLocationGroupCommunity[]>
	{
		let url = settings.apiUrl;

		const filter = `divChoiceCatalogId eq ${divChoiceCatalogId}`;
		const select = `divChoiceCatalogId, LocationGroupCommunityId, LocationGroupMarketId`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		url += `divChoiceCatalogLocationGroupCommunityAssocs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'] as IDivChoiceCatalogLocationGroupCommunityDto[];

				return dtos.map(dto => new DivChoiceCatalogLocationGroupCommunity(dto));
			}),
			catchError(this.handleError));
	}

	/**
	 * Updates the communities associated to a collection of DivChoiceCatalog_LocationGroupMarketAssocs.
	 * @param divChoiceCatalogId The ID of the DivChoiceCatalog in which the group(s) exist.
	 * @param associatedCommunityIds The communities to be associated with the group(s).
	 * @param disassociatedCommunityIds The communities to be disassociated with the group(s).
	 * @param marketGroups The group(s) for which the communities are to be updated.
	 */
	updateDivChoiceCatalogLocationGroupCommunityAssocs(divChoiceCatalogId: number, associatedCommunityIds: number[], disassociatedCommunityIds: number[], marketGroups: DivChoiceCatalogLocationGroupMarket[]): Observable<any>
	{
		const url = settings.apiUrl + `UpdateDivChoiceCatalogLocationGroupCommunityAssocs`;

		const data = {
			'divChoiceCatalogId': divChoiceCatalogId,
			'associatedCommunityIds': associatedCommunityIds,
			'disassociatedCommunityIds': disassociatedCommunityIds,
			'choiceMarketGroupIds': marketGroups.map(x => x.id)
		};

		return this._http.patch(url, data).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError));
	}

	associateChoiceItemsToCommunity(divChoiceCatalogId: number, marketId: number, orgId: number, communityId: number, selectedAttributes: DivChoiceCatalogAttributeGroupMarket[], selectedLocations: DivChoiceCatalogLocationGroupMarket[], selectedMarketImages: DivChoiceCatalogMarketImage[]): Observable<IDivChoiceCatalogGroupCommunitiesDto>
	{
		let url = settings.apiUrl + `AssociateChoiceItemsToCommunity`;

		let data = {
			'divChoiceCatalogId': divChoiceCatalogId,
			'marketId': marketId,
			'orgId': orgId,
			'communityId': communityId,
			'selectedAttributes': selectedAttributes.map(x => x.id),
			'selectedLocations': selectedLocations.map(x => x.id),
			'selectedMarketImages': selectedMarketImages.map(x => x.divChoiceCatalogMarketImageId)
		};

		return this._http.post(url, { choiceItemsAssocDto: data }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response as IDivChoiceCatalogGroupCommunitiesDto;
			}),
			catchError(this.handleError));
	}

	checkDivPointHasInactiveChildren(divPointIds: number[]): Observable<Array<IDivisionalCatalogPointDto>>
	{
		let url = settings.apiUrl;

		url += `CheckDivPointHasInactiveChildren(divPointIds=[${divPointIds}])`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dto = response['value'] as Array<IDivisionalCatalogPointDto>;

				return dto;
			})
		);
	}

	getPointPickTypes(): Observable<Array<IDPointPickType>>
	{
		let url = settings.apiUrl;

		const select = `dPointPickTypeID, dPointPickTypeLabel`;

		const qryStr = `${this._ds}select=${encodeURIComponent(select)}`;

		url += `dPointPickTypes?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let pickTypes = response['value'] as Array<IDPointPickType>;

				return pickTypes;
			})
		);
	}

	saveDivPointCatalog(dto: IDivCatalogPointDto): Observable<IDivCatalogPointDto>
	{
		let obs = null;

		if (dto.divDpointCatalogID == 0)
		{
			obs = this.addDivPointCatalog(dto);
		}
		else
		{
			obs = this.updateDivPointCatalog(new DivDPointCatalog(dto));
		}

		return obs;
	}

	addDivPointCatalog(dto: IDivCatalogPointDto): Observable<IDivCatalogPointDto>
	{
		let body = new DivDPointCatalog(dto);
		let url = settings.apiUrl;

		const expand = `dPointPickType,dPointCatalog`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}`;

		url += `divDPointCatalogs?${qryStr}`;

		return this._http.post(url, body).pipe(
			map(response =>
			{
				let dto = response as IDivCatalogPointDto;

				return dto;
			})
		);
	}

	updateDivPointCatalog(dto: DivDPointCatalog): Observable<IDivCatalogPointDto>
	{
		let body = dto;
		let url = settings.apiUrl;

		url += `divDPointCatalogs(${dto.divDpointCatalogID})`;

		return this._http.patch(url, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let dto = response as IDivCatalogPointDto;

				return dto;
			})
		);
	}

	addDivChoiceCatalog(dtos: Array<IDivCatalogChoiceDto>): Observable<Array<IDivCatalogChoiceDto>>
	{
		const choicesDto = dtos.map(c =>
		{
			// encode special characters for batch.  
			return new DivChoiceCatalog({ ...c, choiceLabel: encodeURIComponent(c.choiceLabel) });
		});

		const endPoint = `${settings.apiUrl}${this._batch}`;
		const batchRequests = odataUtils.createBatch<DivChoiceCatalog>(choicesDto, 'divChoiceCatalogID', 'divChoiceCatalogs');
		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return odataUtils.parseBatchResults<IDivCatalogChoiceDto>(results);
			})
		);
	}

	updateDivChoiceCatalog(dto: IDivCatalogChoiceDto): Observable<IDivCatalogChoiceDto>
	{
		let body = new DivChoiceCatalog(dto);
		let url = settings.apiUrl;

		url += `divChoiceCatalogs(${dto.divChoiceCatalogID})`;

		return this._http.patch(url, body).pipe(
			map(response =>
			{
				let dto = response as IDivCatalogChoiceDto;

				return dto;
			})
		);
	}

	deleteDivChoiceCatalog(divChoiceCatalogID: number): Observable<any>
	{
		let url = settings.apiUrl;

		url += `divChoiceCatalogs(${divChoiceCatalogID})`;

		return this._http.delete(url).pipe(
			map(response =>
			{
				return response;
			})
		);
	}

	/**
	 * Check to see if the Label is used 
	 * @param label
	 * @param divChoiceId
	 * @param divPointId
	 */
	doesChoiceLabelExist(label: string, divChoiceId: number, divPointId: number)
	{
		return this._catService.getLabelExistCount('divChoiceCatalogs', 'choiceLabel', label, `and divDpointCatalogID eq ${divPointId} and divChoiceCatalogID ne ${divChoiceId}`);
	}

	doesPointLabelExist(label: string, divPointId: number, dPointCatalogID: number, orgId: number)
	{
		return this._catService.getLabelExistCount('divDPointCatalogs', 'dPointLabel', label, `and dPointCatalogID eq ${dPointCatalogID} and orgID eq ${orgId} and divDpointCatalogID ne ${divPointId}`);
	}

	/**
	 * Check to see if the Choice is being used on a Tree
	 * @param item
	 */
	isItemInUse(item: DivDChoice): Observable<boolean>
	{
		return this._catService.getCatItemCount('dPChoices', 'divChoiceCatalogID', 'dpChoiceID', item.id);
	}

	/**
	 * Get all inactive items for the given itemType; Group, SubGroup, Point.
	 * @param itemType
	 * @param parentId
	 */
	getInactiveItems(itemType: string, parentId: number, orgId: number): Observable<Array<any>>
	{
		let obs: Observable<any>;

		if (itemType == 'Point')
		{
			obs = this.getInactivePoints(parentId, orgId);
		}
		else if (itemType == 'Choice')
		{
			obs = this.getInactiveChoices(parentId);
		}

		return obs;
	}

	getInactivePoints(parentId: number, orgId: number): Observable<Array<DivDPoint>>
	{
		let url = settings.apiUrl;

		const expand = `dPointPickType($select=dPointPickTypeID, dPointPickTypeLabel), dPointCatalog($select=dPointCatalogID, isActive)`;
		const filter = `dPointCatalog/dSubGroupCatalogID eq ${parentId} and dPointCatalog/isActive eq true and isActive eq false and orgID eq ${orgId}`;
		const select = `divDpointCatalogID, orgID, dPointPickTypeID, divDPointSortOrder, isActive, isQuickQuoteItem, isStructuralItem, isHiddenFromBuyerView, dPointLabel, dPointDescription`;
		const orderby = `divDPointSortOrder`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `divDPointCatalogs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'];

				let points = dtos.map(x =>
				{
					let dto = {
						divDpointCatalogID: x.divDpointCatalogID,
						divDPointSortOrder: x.divDPointSortOrder,
						dPointCatalogID: x.dPointCatalog.dPointCatalogID,
						dPointDescription: x.dPointDescription,
						dPointLabel: x.dPointLabel,
						dPointPickType: x.dPointPickType,
						dPointPickTypeID: x.dPointPickTypeID,
						dSubGroupCatalogID: x.dPointCatalog.dSubGroupCatalogID,
						isActive: x.isActive,
						isQuickQuoteItem: x.isQuickQuoteItem,
						isStructuralItem: x.isStructuralItem,
						isHiddenFromBuyerView: x.isHiddenFromBuyerView,
						orgID: x.orgID
					} as IDivisionalCatalogPointDto;

					return new DivDPoint(dto);
				});

				return points;
			}),
			catchError(this.handleError));
	}

	getInactiveChoices(parentId: number): Observable<Array<DivDChoice>>
	{
		let url = settings.apiUrl;

		const filter = `divDpointCatalogID eq ${parentId} and isActive eq false`;
		const select = `divChoiceCatalogID, divDpointCatalogID, choiceLabel, isActive, divChoiceSortOrder, isDecisionDefault`;
		const orderby = `divChoiceSortOrder`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `divChoiceCatalogs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				let dtos = response['value'] as Array<IDivisionalCatalogChoiceDto>;

				let choices = dtos.map(x =>
				{
					return new DivDChoice(x);
				});

				return choices;
			})
		);
	}

	reactivateCatalogItem(inactiveItems: Array<DivDPoint | DivDChoice>, itemType: string): Observable<Array<PhdEntityDto.IDPointDto> | Array<PhdEntityDto.IDPChoiceDto>>
	{
		let obs: Observable<any>;
		let items: Array<DivDPoint | DivDChoice>;

		if (itemType == 'Point')
		{
			items = inactiveItems as Array<DivDPoint>;

			const points = items.map(p =>
			{
				return {
					divDpointCatalogID: p.id,
					isActive: true
				} as IDivCatalogPointDto;
			});

			obs = this.batchUpdateDivPointCatalog(points);
		}
		else if (itemType == 'Choice')
		{
			items = inactiveItems as Array<DivDChoice>;

			const choices = items.map(c =>
			{
				return {
					divChoiceCatalogID: c.id,
					isActive: true
				} as IDivCatalogChoiceDto;
			});

			obs = this.batchUpdateDivChoiceCatalog(choices);
		}

		return obs;
	}

	saveDivisionalSort(sortList: IDivSortList, orgId: number): Observable<IDivSortList>
	{
		const patchPoints = sortList.pointList.map(p =>
		{
			if (p.divDpointCatalogID != 0)
			{
				return {
					divDpointCatalogID: p.divDpointCatalogID,
					divDPointSortOrder: p.dPointSortOrder
				} as IDivCatalogPointDto;
			}
			else
			{
				p.orgID = orgId;
				p.divDpointCatalogID = 0;
				p.divDPointSortOrder = p.dPointSortOrder;
				p.dPointPickTypeID = 1;

				delete p.dSubGroupCatalogID;
				delete p.dPointSortOrder;

				return p as IDivCatalogPointDto;
			}
		});

		const patchChoices = sortList.choiceList.map(c =>
		{
			return {
				divChoiceCatalogID: c.divChoiceCatalogID,
				divChoiceSortOrder: c.divChoiceSortOrder
			} as IDivCatalogChoiceDto;
		});

		const endPoint = `${settings.apiUrl}${this._batch}`;
		const batchPointRequests = odataUtils.createBatch<IDivCatalogPointDto>(patchPoints, 'divDpointCatalogID', 'divDPointCatalogs');
		const batchChoiceRequests = odataUtils.createBatch<IDivCatalogChoiceDto>(patchChoices, 'divChoiceCatalogID', 'divChoiceCatalogs');
		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchPointRequests, batchChoiceRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		const obs = withSpinner(this._http).post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return odataUtils.parseBatchResults<IDivCatalogChoiceDto | IDivCatalogPointDto>(results);
			})
		);

		return forkJoin(obs, this.getPointPickTypes()).pipe(
			map(([entityArray, pickTypes]) =>
			{
				const divSortList: IDivSortList = {
					choiceList: [],
					pointList: []
				};

				entityArray.forEach(e =>
				{
					if (e["divChoiceCatalogID"])
					{
						divSortList.choiceList.push(e as IDivCatalogChoiceDto);
					}
					else
					{
						let point = e as IDivCatalogPointDto;
						let pickType = pickTypes.find(x => x.dPointPickTypeID == point.dPointPickTypeID);

						point.dPointPickType = pickType;

						divSortList.pointList.push(point);
					}
				});

				return divSortList;
			})
		);
	}

	batchUpdateDivPointCatalog(dtos: Array<IDivCatalogPointDto>): Observable<Array<PhdEntityDto.IDPointDto>>
	{
		const endPoint = `${settings.apiUrl}${this._batch}`;
		const batchRequests = odataUtils.createBatchPatch<IDivCatalogPointDto>(dtos, 'divDpointCatalogID', 'divDPointCatalogs', 'isActive');
		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return odataUtils.parseBatchResults<PhdEntityDto.IDPointDto>(results);
			})
		);
	}

	batchUpdateDivChoiceCatalog(dtos: Array<IDivCatalogChoiceDto>): Observable<Array<PhdEntityDto.IDPChoiceDto>>
	{
		const endPoint = `${settings.apiUrl}${this._batch}`;
		const batchRequests = odataUtils.createBatchPatch<IDivCatalogChoiceDto>(dtos, 'divChoiceCatalogID', 'divChoiceCatalogs', 'isActive');
		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return odataUtils.parseBatchResults<PhdEntityDto.IDPChoiceDto>(results);
			})
		);
	}

	buildDivisionalCatalog(groups: IDivisionalCatalogGroupDto[])
	{
		let catGroups = null;

		catGroups = groups.map(g =>
		{
			const group = new DivDGroup(g);

			group.children = g.subGroups.map(sg =>
			{
				const subGroup = new DivDSubGroup(sg);

				subGroup.children = sg.points.map(p =>
				{
					const point = new DivDPoint(p);

					point.children = p.choices.map(c =>
					{
						const choice = new DivDChoice(c);

						choice.parent = point;

						return choice;
					});

					point.parent = subGroup;

					return point;
				});

				subGroup.parent = group;

				return subGroup;
			});

			return group;
		});

		return catGroups;
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}
