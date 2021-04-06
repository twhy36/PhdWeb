import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { createBatchPatch } from '../../shared/classes/odata-utils.class';
import { newGuid } from '../../shared/classes/guid.class';

import { IdentityService, } from 'phd-common/services';
import { SettingsService } from './settings.service';
import { LoggingService } from './logging.service';
import { CatalogService } from '../../core/services/catalog.service';

import { DGroup, ICatalogGroupDto } from '../../shared/models/group.model';
import { DSubGroup, ICatalogSubGroupDto } from '../../shared/models/subgroup.model';
import { DPoint, ICatalogPointDto } from '../../shared/models/point.model';
import { CatalogItemType } from '../../shared/models/catalog-item.model';
import { Settings } from '../../shared/models/settings.model';
import { NationalCatalog, INationalCatalogDto, INationalCatalogGroupDto, INationalCatalogSubGroupDto, INationalCatalogPointDto } from '../../shared/models/national-catalog.model';
import { withSpinner } from 'phd-common/extensions/withSpinner.extension';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class NationalService
{
	private _ds: string = encodeURIComponent("$");

	private _canEdit: boolean
	public get canEdit(): boolean
	{
		return this._canEdit;
	}

    constructor(private _http: HttpClient, private _identityService: IdentityService, private _loggingService: LoggingService, private _catService: CatalogService) { }

	/**
	 * Gets the National Catalog
	 */
	getNationalCatalog(): Observable<NationalCatalog>
    {
		let url = settings.apiUrl;

		url += 'GetNationalCatalog';

		return withSpinner(this._http).get(url).pipe(
			map(response =>
				{
					let dto = response as INationalCatalogDto;

					let groups = this.filterGroups(dto.groups);

					let nationalCatalog = new NationalCatalog();

					nationalCatalog.groups = groups;
					nationalCatalog.hasInactiveGroups = dto.hasInactiveGroups;

					return nationalCatalog;

				}),
			catchError(this.handleError));
	}

	/**
	 * Returns inactive Groups
	 */
	getInactiveGroups(): Observable<Array<DGroup>>
	{
		let url = settings.apiUrl;

		const filter = `isActive eq false`;
		const select = `dGroupCatalogID, dGroupImagePath, isActive, dGroupLabel, dGroupSortOrder`;
		const orderby = `dGroupSortOrder`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `dGroupCatalogs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
				{
					let dtos = response['value'] as Array<INationalCatalogGroupDto>;

					let groups = dtos.map(x =>
					{
						return new DGroup(x);
					});

					return groups;

				}),
			catchError(this.handleError));
	}

	/**
	 * Returns inactive SubGroups
	 * @param parentId
	 */
	getInactiveSubGroups(parentId: number): Observable<Array<DSubGroup>>
	{
		let url = settings.apiUrl;

		const filter = `dGroupCatalogID eq ${parentId} and isActive eq false`;
		const select = `dGroupCatalogID, dSubGroupCatalogID, isActive, dSubGroupLabel, dSubGroupSortOrder`;
		const orderby = `dSubGroupSortOrder`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `dSubGroupCatalogs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
				{
					let dtos = response['value'] as Array<INationalCatalogSubGroupDto>;

					let subGroups = dtos.map(x =>
					{
						return new DSubGroup(x);
					});

					return subGroups;

				}),
			catchError(this.handleError));
	}

	/**
	 * Returns Inactive Points
	 * @param parentId
	 */
	getInactivePoints(parentId: number): Observable<Array<DPoint>>
	{
		let url = settings.apiUrl;

		const filter = `dSubGroupCatalogID eq ${parentId} and isActive eq false`;
		const select = `dSubGroupCatalogID, dPointCatalogID, dPointLabel, dPointDescription, isActive, dPointSortOrder`;
		const orderby = `dPointSortOrder`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `dPointCatalogs?${qryStr}`;

		return this._http.get(url).pipe(
			map(response =>
				{
					let dtos = response['value'] as Array<INationalCatalogPointDto>;

					let points = dtos.map(x =>
					{
						return new DPoint(x);
					});

					return points;
				}),
			catchError(this.handleError));
	}

	/**
	 * Get all inactive items for the given itemType; Group, SubGroup, Point.
	 * @param itemType
	 * @param parentId
	 */
	getInactiveItems(itemType: string, parentId?: number): Observable<Array<any>>
	{
		let obs: Observable<any>;

		if (itemType == 'Group')
		{
			obs = this.getInactiveGroups();
		}
		else if (itemType == 'SubGroup')
		{
			obs = this.getInactiveSubGroups(parentId);
		}
		else if (itemType == 'Point')
		{
			obs = this.getInactivePoints(parentId);
		}

		return obs;
	}

	/**
	 * Adds a Group to the National Catalog
	 * @param dto
	 */
	addGroupCatalog(dto: ICatalogGroupDto): Observable<ICatalogGroupDto>
	{
		let url = settings.apiUrl;

		url += `dGroupCatalogs`;

		return this._http.post(url, dto).pipe(
			map(response =>
				{
					let retVal = response as ICatalogGroupDto;

					return retVal;
				}),
			catchError(this.handleError));
	}

	/**
	 * Update a Group
	 * @param dto
	 */
	updateGroupCatalog(dto: ICatalogGroupDto): Observable<ICatalogGroupDto>
	{
		let url = settings.apiUrl;

		url += `dGroupCatalogs(${dto.dGroupCatalogID})`;

		return this._http.patch(url, dto).pipe(
			map(response =>
				{
					let retVal = response as ICatalogGroupDto;

					return retVal;
				}),
			catchError(this.handleError));
	}

	/**
	 * Add a SubGroup to the National Catalog
	 * @param dto
	 */
	addSubGroupCatalog(dto: ICatalogSubGroupDto): Observable<ICatalogSubGroupDto>
	{
		let url = settings.apiUrl;

		url += `dSubGroupCatalogs`;

		return this._http.post(url, dto).pipe(
			map(response =>
				{
					let retVal = response as ICatalogSubGroupDto;

					return retVal;
				}),
			catchError(this.handleError));
	}

	/**
	 * Updates a SubGroup
	 * @param dto
	 */
	updateSubGroupCatalog(dto: ICatalogSubGroupDto): Observable<ICatalogSubGroupDto>
	{
		let url = settings.apiUrl;

		url += `dSubGroupCatalogs(${dto.dSubGroupCatalogID})`;

		return this._http.patch(url, dto).pipe(
			map(response =>
				{
					let retVal = response as ICatalogSubGroupDto;

					return retVal;
				}),
			catchError(this.handleError));
	}

	/**
	 * Adds a Point to the National Catalog
	 * @param dto
	 */
	addPointCatalog(dto: ICatalogPointDto): Observable<ICatalogPointDto>
	{
		let url = settings.apiUrl;

		url += `dPointCatalogs`;

		return this._http.post(url, dto).pipe(
			map(response =>
				{
					let retVal = response as ICatalogPointDto;

					return retVal;
				}),
			catchError(this.handleError));
	}

	/**
	 * Update a Point
	 * @param dto
	 */
	updatePointCatalog(dto: ICatalogPointDto): Observable<ICatalogPointDto>
	{
		let url = settings.apiUrl;

		url += `dPointCatalogs(${dto.dPointCatalogID})`;

		return this._http.patch(url, dto).pipe(
			map(response =>
				{
					let retVal = response as ICatalogPointDto;

					return retVal;
				}),
			catchError(this.handleError));
	}

	/**
	 * Deletes a Group, SubGroup or Point
	 * @param id
	 * @param route
	 */
	private deleteCatalogItem(id: number, route: string): Observable<any>
	{
		let url = settings.apiUrl;

		url += `${route}(${id})`;

		return this._http.delete(url).pipe(
			map(response =>
				{
					return response;
				}),
			catchError(this.handleError));
	}

	/**
	 * Deletes or inactivates a Catalog Item
	 * @param item
	 * @param isInUse
	 * @param itemType
	 */
	removeCatalogItem(item: DGroup | DSubGroup | DPoint, isInUse: boolean, itemType: string): Observable<any>
	{
		let obs: Observable<any>;

		if (itemType == 'Group')
		{
			if (isInUse)
			{
				obs = this.updateGroupCatalog({ dGroupCatalogID: item.id, isActive: false } as ICatalogGroupDto);
			}
			else
			{
				obs = this.deleteCatalogItem(item.id, 'dGroupCatalogs');
			}
		}
		else if (itemType == 'SubGroup')
		{
			if (isInUse)
			{
				obs = this.updateSubGroupCatalog({ dSubGroupCatalogID: item.id, isActive: false } as ICatalogSubGroupDto);
			}
			else
			{
				obs = this.deleteCatalogItem(item.id, 'dSubGroupCatalogs');
			}
		}
		else if (itemType == 'Point')
		{
			if (isInUse)
			{
				obs = this.updatePointCatalog({ dPointCatalogID: item.id, isActive: false } as ICatalogPointDto);
			}
			else
			{
				obs = this.deleteCatalogItem(item.id, 'dPointCatalogs');
			}
		}

		return obs;
	}


	/**
	 * Used to reactivate Catalog Items; Group, SubGroup, Point.
	 * @param inactiveItems
	 * @param itemType
	 */
	reactivateCatalogItem(inactiveItems: Array<DGroup | DSubGroup | DPoint>, itemType: string): Observable<any>
	{
		let obs: Observable<any>;
		let items: Array<DGroup | DSubGroup | DPoint>;

		if (itemType == 'Group')
		{
			items = inactiveItems as Array<DGroup>;

			const groups = items.map(g =>
			{
				return {
					dGroupCatalogID: g.id,
					isActive: true
				} as ICatalogGroupDto;
			});

			obs = this.batchUpdateGroupCatalog(groups);
		}
		else if (itemType == 'SubGroup')
		{
			items = inactiveItems as Array<DSubGroup>;

			const subGroups = items.map(g =>
			{
				return {
					dSubGroupCatalogID: g.id,
					isActive: true
				} as ICatalogSubGroupDto;
			});

			obs = this.batchUpdateSubGroupCatalog(subGroups);
		}
		else if (itemType == 'Point')
		{
			items = inactiveItems as Array<DPoint>;

			const points = items.map(g =>
			{
				return {
					dPointCatalogID: g.id,
					isActive: true
				} as ICatalogPointDto;
			});

			obs = this.batchUpdatePointCatalog(points);
		}
		return obs;
	}

	batchUpdateGroupCatalog(dtos: Array<ICatalogGroupDto>): Observable<void>
	{
		const batchRequests = [createBatchPatch<ICatalogGroupDto>(dtos, 'dGroupCatalogID', 'dGroupCatalogs', 'isActive')];

		return this.batchUpdate(batchRequests);
	}

	batchUpdateSubGroupCatalog(dtos: Array<ICatalogSubGroupDto>): Observable<void>
	{
		const batchRequests = [createBatchPatch<ICatalogSubGroupDto>(dtos, 'dSubGroupCatalogID', 'dSubGroupCatalogs', 'isActive')];

		return this.batchUpdate(batchRequests);
	}

	batchUpdatePointCatalog(dtos: Array<ICatalogPointDto>): Observable<void>
	{
		const batchRequests = [createBatchPatch<ICatalogPointDto>(dtos, 'dPointCatalogID', 'dPointCatalogs', 'isActive')];

		return this.batchUpdate(batchRequests);
	}

	batchUpdate(batchRequests: string[][]): Observable<void>
	{
		let body: string[] = [];

		const batchGuid = newGuid();

		batchRequests.forEach(b => {
			if (b.length > 0) {
				body.push(`--batch_${batchGuid}`);
				body.push(...b);
			}
		});
		body.push(`--batch_${batchGuid}--`);
		body.push('');

		var data = body.join("\r\n");

		const headers = new HttpHeaders({
			'Content-Type': `multipart/mixed; boundary=batch_${batchGuid}`,
			'OData-Version': '4.0;NetFx',
			'OData-MaxVersion': '4.0NetFx',
			'Accept': 'application/json'
		});

		let url = settings.apiUrl + `$batch`;

		return this._http.post(url, data, { headers, responseType: 'text' }).pipe(
			map((response: any) =>
			{
				return response;
			}),
			catchError(this.handleError));
	}

    saveNationalCatalogSortOrder(groups: Array<DGroup>): Observable<void>
    {
        const mappedSubGroups: ICatalogSubGroupDto[] = [];
        const mappedGroups: ICatalogGroupDto[] = [];

        groups.forEach(g =>
        {
            if (g.sortChanged)
            {
                mappedGroups.push({
                    dGroupCatalogID: g.id,
                    dGroupSortOrder: g.sortOrder
                } as ICatalogGroupDto);
            }

            if (g.subGroups.length > 0)
            {
                g.subGroups.forEach(sg =>
                {
                    if (sg.sortChanged)
                    {
                        mappedSubGroups.push({
                            dSubGroupCatalogID: sg.id,
                            dSubGroupSortOrder: sg.sortOrder
                        } as ICatalogSubGroupDto);
                    }
                });
            }
        });

        const batchGroupRequests = createBatchPatch<ICatalogGroupDto>(mappedGroups, 'dGroupCatalogID', 'dGroupCatalogs', 'dGroupSortOrder');
        const batchSubGroupRequests = createBatchPatch<ICatalogSubGroupDto>(mappedSubGroups, 'dSubGroupCatalogID', 'dSubGroupCatalogs', 'dSubGroupSortOrder');

        const results = this.batchUpdate([batchGroupRequests, batchSubGroupRequests]);

        return results;
    }

	/**
	 * Checks to see if the label already exists
	 * @param itemType
	 * @param label
	 * @param parentId
	 */
    doesLabelExist(itemType: CatalogItemType, label: string, parentId: number): Observable<boolean>
    {
        let obs: Observable<boolean>;

        if (itemType == 'Group')
        {
            obs = this._catService.getLabelExistCount('dGroupCatalogs', 'dGroupLabel', label);
        }
        else if (itemType == 'SubGroup')
        {
			obs = this._catService.getLabelExistCount('dSubGroupCatalogs', 'dSubGroupLabel', label, `and dGroupCatalogID eq ${parentId}`);
        }
        else if (itemType == 'Point')
        {
			obs = this._catService.getLabelExistCount('dPointCatalogs', 'dPointLabel', label, `and dSubGroupCatalogID eq ${parentId}`);
        }

        return obs;
    }

	/**
	 * Builds the correct call to find out if the passed in item type is in use or not.
	 * @param item
	 */
	isNatCatItemInUse(item: DGroup | DSubGroup | DPoint): Observable<boolean>
	{
		let obs: Observable<boolean>;

		if (item instanceof DGroup)
		{
            obs = this._catService.getCatItemCount('dGroups', 'dGroupCatalogID', 'dGroupCatalogID', item.id);
		}
		else if (item instanceof DSubGroup)
		{
            obs = this._catService.getCatItemCount('dSubGroups', 'dSubGroupCatalogID', 'dSubGroupCatalogID', item.id);
		}
		else if (item instanceof DPoint)
		{
            obs = this._catService.getCatItemCount('dPoints', 'divDPointCatalog/dPointCatalogID', 'dPointID', item.id);
		}

		return obs;
	}

	private filterGroups(groups: Array<INationalCatalogGroupDto>): Array<DGroup>
	{
		let catGroups = null;

		catGroups =	groups.map(g =>
		{
			const group = new DGroup(g);

			group.children = g.subGroups.map(sg =>
			{
				const subGroup = new DSubGroup(sg);

				subGroup.children = sg.points.map(p =>
				{
					const point = new DPoint(p);

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

	private treeNodeSorter(l: any, r: any): number
	{
		if (l.sortOrder > r.sortOrder)
		{
			return 1;
		}
		else if (r.sortOrder > l.sortOrder)
		{
			return -1;
		}

		return 0;
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}
