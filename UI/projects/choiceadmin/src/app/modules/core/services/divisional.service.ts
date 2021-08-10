import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Observable ,  forkJoin ,  throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import * as odataUtils from '../../shared/classes/odata-utils.class';

import { IdentityService, withSpinner} from 'phd-common';
import { SettingsService } from './settings.service';
import { CatalogService } from './catalog.service';

import { DivDGroup } from '../../shared/models/group.model';
import { DivDSubGroup } from '../../shared/models/subgroup.model';
import { DivDPoint, IDivCatalogPointDto, IDPointPickType, DivDPointCatalog } from '../../shared/models/point.model';
import { DivDChoice, IDivCatalogChoiceDto, DivChoiceCatalog } from '../../shared/models/choice.model';
import { Settings } from '../../shared/models/settings.model';
import { IDivisionalCatalogGroupDto, IDivisionalCatalogPointDto, IDivisionalCatalogDto, IDivisionalCatalogChoiceDto, DivisionalCatalog, IDivSortList } from '../../shared/models/divisional-catalog.model';
import { PhdEntityDto } from '../../shared/models/api-dtos.model';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class DivisionalService
{
	private _ds: string = encodeURIComponent("$");
	private _batch = "$batch";

	constructor(
		private _http: HttpClient,
		private _identityService: IdentityService,
		private _catService: CatalogService) { }

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
		const select = `divDpointCatalogID, orgID, dPointPickTypeID, divDPointSortOrder, isActive, isQuickQuoteItem, isStructuralItem, dPointLabel, dPointDescription`;
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
