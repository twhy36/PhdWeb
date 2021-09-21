import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { catchError, map, switchMap } from 'rxjs/operators';
import {Observable, throwError} from 'rxjs';
import {IColorIdBatch, IColor, IColorDto} from '../../shared/models/color.model';
import { IColorItem, IColorItemDto } from '../../shared/models/colorItem.model';
import * as _ from 'lodash';
import { newGuid, createBatch, createBatchGet, createBatchHeaders, createBatchBody, getNewGuid,  withSpinner, IdentityService } from 'phd-common';

@Injectable()
export class ColorService {
	constructor(private _http: HttpClient, private identityService: IdentityService) {}
	private _ds: string = encodeURIComponent('$');
	private _batch = '$batch';

	/**
	 * Gets the colors for the specified financial community
	 */
	getColors(communityId?: number,	colorName?: string,	subcategoryId?: number,	topRows?: number,	skipRows?: number,	isActive?: boolean): Observable<IColor[]>
	{
		const entity = `colors`;
		let filter = `(EdhFinancialCommunityId eq ${communityId})`;
		const select = `colorId,name,sku,isActive,edhOptionSubcategoryId`;
		const orderBy = `name`;
		if (colorName)
		{
			filter += `and contains(name,'${colorName}')`;
		}

		if (isActive != null)
		{
			filter += `and (isActive eq ${isActive})`;
		}

		if (subcategoryId >= 0) {
			filter += `and (EdhOptionSubcategoryId eq ${subcategoryId})`;
		}

		let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderBy=${encodeURIComponent(orderBy)}`;

		if (topRows)
		{
			qryStr += `&${this._ds}top=${topRows}`;
		}

		if (skipRows)
		{
			qryStr += `&${this._ds}skip=${skipRows}`;
		}

		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return (skipRows ? this._http : withSpinner(this._http))
			.get<any>(endpoint)
			.pipe(
				map((response) => {
					return response.value as Array<IColor>;
				}),
				catchError(this.handleError)
			);
	}

	getPlanOptionAssocColorItems(communityId: number,	edhPlanOptionIds: Array<number>, isActive?: boolean, topRows?: number, skipRows?: number): Observable<IColorItemDto[]>
	{
		const entity = `colorItems`;
		const expand =  `colorItemColorAssoc($expand=color($select=colorId,name,edhFinancialCommunityId,isActive))`
		let filter = `colorItemColorAssoc/color/edhFinancialCommunityId eq ${communityId} and (edhPlanOptionId in (${edhPlanOptionIds.join(',')}))`;
		const select = `colorItemId,name,edhPlanOptionId,isActive,colorItemColorAssoc`;
		
		if (isActive != null)
		{
			filter += ` and (isActive eq ${isActive})`;
		}
		let qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		if (topRows)
		{
			qryStr += `&${this._ds}top=${topRows}`;
		}

		if (skipRows)
		{
			qryStr += `&${this._ds}skip=${skipRows}`;
		}
		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map((response) =>
			{
				let colorItems = response.value as Array<IColorItem>;
				let colorItemDtoList: Array<IColorItemDto> = [];

				// Transform IColorItem to IColorItemDto
				let groupedColorItems = _.groupBy(colorItems,c=>c.colorItemId);

				for(const key in groupedColorItems)
				{
					if(groupedColorItems.hasOwnProperty(key))
					{
						let item = groupedColorItems[key];
						let colorItemDto:IColorItemDto =
						{
							colorItemId:item[0].colorItemId,
							name:item[0].name,
							isActive:item[0].isActive,
							edhPlanOptionId:item[0].edhPlanOptionId,
							colors:item.map(x=>x.colorItemColorAssoc.color)
						}
						colorItemDtoList.push(colorItemDto);
					}
				}
				return colorItemDtoList;
			}),
			catchError(this.handleError)
		);
	}

	getSalesConfiguration(colorList: Array<IColorDto>):Observable<IColorDto[]>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				let guid = newGuid();
				let requests = colorList.map(color =>
					{
					const entity = `jobs`;
					const filter = `jobPlanOptions/any(po: po/planOptionCommunity/optionCommunity/optionSubCategoryId eq ${color.optionSubCategoryId} and po/jobPlanOptionAttributes/any(a: a/attributeGroupCommunityId eq 1 and a/attributeName eq '${color.name}')) or jobChangeOrderGroups/any(cog: cog/jobChangeOrders/any(co: co/jobChangeOrderPlanOptions/any(po: po/planOptionCommunity/optionCommunity/optionSubCategoryId eq ${color.optionSubCategoryId} and po/jobChangeOrderPlanOptionAttributes/any(a: a/attributeGroupCommunityId eq 1 and a/attributeName eq '${color.name}'))))`;
					const select = `id`;
					let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}top=1`;
					const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;
					return createBatchGet(endpoint);
					});
				let headers = createBatchHeaders(guid, token);
				let batch = createBatchBody(guid, requests);

				return this._http.post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any)=>
			{
				let bodies = response.responses.map(res=>res.body);
				colorList.forEach((color,i)=>
				{
					color.hasSalesConfig = bodies[i]?.value?.length > 0 ? true : false;
				})
				return colorList;
			}))
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure
		console.error(error);
		return throwError(error || 'Server error');
	}

	deleteColors(colorIds: number[]): Observable<boolean> {
		const colorsToBeDeleted = colorIds.map(colorId =>
		{
			return {
				colorId
			} as IColorIdBatch;
		});

		const endpoint = `${environment.apiUrl}${this._batch}`;
		const batchRequests = createBatch<IColorIdBatch>(colorsToBeDeleted, 'colorId', `deleteColor`, null, true);
		const batchGuid = getNewGuid();
		const batchBody = createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(createBatchHeaders(batchGuid));

		return this._http.post(endpoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return results.length > 0;
			}),
			catchError(this.handleError)
		);
	}
}
