import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { catchError, map, switchMap } from 'rxjs/operators';
import {Observable, throwError} from 'rxjs';
import {IColorIdBatch, IColor, IColorDto} from '../../shared/models/color.model';
import {IColorItem, IColorItemAssoc, IColorItemColorAssoc, IColorItemDto} from '../../shared/models/colorItem.model';
import * as _ from 'lodash';
import {
	newGuid,
	createBatch,
	createBatchGet,
	createBatchHeaders,
	createBatchBody,
	getNewGuid,
	withSpinner,
	IdentityService,
	createBatchPatch,
} from 'phd-common';
import { IPlanOptionCommunityGridDto } from '../../shared/models/community.model';

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

		return withSpinner(this._http)
			.get<any>(endpoint)
			.pipe(
				map((response) => {
					return response.value as Array<IColor>;
				}),
				catchError(this.handleError)
			);
	}

	getPlanOptionAssocColorItems(communityId: number,	edhPlanOptionIds: Array<number>, isActive?: boolean, name?: string, topRows?: number, skipRows?: number): Observable<IColorItemDto[]>
	{
			return this.identityService.token.pipe(
				switchMap((token: string) =>
				{
					let guid = newGuid();
					let requests=[];
					for(let i=0;i<edhPlanOptionIds.length;i=i+50)
					{
							const entity = `colorItems`;
							const expand =  `colorItemColorAssoc($expand=color($select=colorId,name,edhFinancialCommunityId,isActive;$filter=edhFinancialCommunityId eq ${communityId}))`
							let filter = `(edhPlanOptionId in (${_.take(edhPlanOptionIds,50).join(',')}))`;
							const select = `colorItemId,name,edhPlanOptionId,isActive,colorItemColorAssoc`;

							if (isActive != null)
							{
								filter += ` and (isActive eq ${isActive})`;
							}
							if (name)
							{
								filter += ` and (name eq '${name}')`;
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
							let request = createBatchGet(endpoint);
							edhPlanOptionIds.splice(0,50);
							requests.push(request);
					}
					let headers = createBatchHeaders(guid, token);
					let batch = createBatchBody(guid, requests);

					return withSpinner(this._http).post(`${environment.apiUrl}$batch`, batch, { headers: headers });
				}),
				map((response: any)=>
				{
					let bodies = response.responses.map(res=>res.body);
					let colorItemDtoList: Array<IColorItemDto> = [];

					bodies.forEach((result)=>
					{
						let colorItems = result.value as Array<IColorItem>;
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
									colors:item.map(x => x.colorItemColorAssoc).map(colorassoc => colorassoc.map(c=>c.color)).reduce((a,b)=>[...a,...b],[])
								}
								colorItemDtoList.push(colorItemDto);
							}
						}
					})

				console.log('service results');
				console.log(colorItemDtoList);
				return colorItemDtoList;
			}),
				catchError(this.handleError)
			)
	}

	getSalesConfiguration(colorList: Array<IColorDto>, communityId:number):Observable<IColorDto[]>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				let guid = newGuid();
				let requests = colorList.map(color =>
				{
					const entity = `jobs`;
					const filter = `(FinancialCommunityId eq ${communityId}) and (jobPlanOptions/any(po: po/planOptionCommunity/optionCommunity/optionSubCategoryId eq ${color.optionSubCategoryId} and po/jobPlanOptionAttributes/any(a: a/attributeGroupCommunityId eq 1 and a/attributeName eq '${color.name}')) or jobChangeOrderGroups/any(cog: cog/jobChangeOrders/any(co: co/jobChangeOrderPlanOptions/any(po: po/planOptionCommunity/optionCommunity/optionSubCategoryId eq ${color.optionSubCategoryId} and po/jobChangeOrderPlanOptionAttributes/any(a: a/attributeGroupCommunityId eq 1 and a/attributeName eq '${color.name}')))))`;
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

	getSalesAgreementForGrid(itemList: Array<IPlanOptionCommunityGridDto>, communityId:number):Observable<IPlanOptionCommunityGridDto[]>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				let guid = newGuid();
				let requests = itemList.map(item =>
				{
					const entity = `jobs`;
					const filter = `(FinancialCommunityId eq ${communityId}) and ((jobPlanOptions/any(po: po/planOptionId in (${item.colorItem.map(c=>c.edhPlanOptionId).join(',')}))) or (jobChangeOrderGroups/any(cog: cog/jobChangeOrders/any(co: co/jobChangeOrderPlanOptions/any(po:po/planOptionId in (${item.colorItem.map(c=>c.edhPlanOptionId).join(',')}))))))`;
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
				itemList.forEach((item,i)=>
				{
					item.hasSalesAgreement = bodies[i]?.value?.length > 0 ? true : false;
				})
				return itemList;
			}))
	}

	getconfigForGrid(itemList: Array<IPlanOptionCommunityGridDto>, communityId:number):Observable<IPlanOptionCommunityGridDto[]>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				let guid = newGuid();
				let requests = itemList.map(item =>
				{
					const entity = `scenarioOptions`;
					const filter = `(EdhPlanOptionId in (${item.colorItem.map(c=>c.edhPlanOptionId).join(',')}))`;
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
				itemList.forEach((item,i)=>
				{
					item.hasConfig = bodies[i]?.value?.length > 0 ? true : false;
				})
				return itemList;
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

	updateColor(colorToUpdate: IColorDto, communityId: number): Observable<IColor> {
		const url = `${environment.apiUrl}colors(${colorToUpdate.colorId})`;
		const body = {
			colorId: colorToUpdate.colorId,
			name: colorToUpdate.name,
			sku: colorToUpdate.sku,
			edhOptionSubcategoryId: colorToUpdate.optionSubCategoryId,
			edhFinancialCommunityId: communityId,
			isActive: colorToUpdate.isActive
		} as IColor;

		return withSpinner(this._http).patch(url, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(resp => {
				return resp as IColor;
			}),
			catchError(this.handleError)
		);
	}

	updateColorItem(colorItemToUpdate: IColorItemDto[],rowId:number): Observable<IColorItemDto[]>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				let guid = newGuid();
				let requests = createBatchPatch<IColorItemDto>(colorItemToUpdate, 'colorItemId', 'colorItems', 'isActive');
				let headers = new HttpHeaders(createBatchHeaders(guid, token));

				let batchBody = createBatchBody(guid, [requests]);
				const endPoint = `${environment.apiUrl}${this._batch}`;
				return this._http.post(endPoint, batchBody,{ headers: headers });
			}),
			map((response: any)=>
			{
				let bodies = response.responses.map(res=>res.body);
				return bodies;
			}))

	}

	saveColorItem(dtoColorItems: IColorItemDto[]): Observable<IColorItem[]>
	{
		const colorItems: IColorItemAssoc[] = [];

		dtoColorItems.forEach(dtoItem => {
			const item: IColorItemAssoc = {
				colorItemId: dtoItem.colorItemId,
				name: dtoItem.name,
				edhPlanOptionId: dtoItem.edhPlanOptionId,
				isActive: dtoItem.isActive,
				colorItemColorAssoc: []
			};

			if (dtoItem.colors.length > 0)
			{
				dtoItem.colors.forEach(color => {
					const colorInfo: IColorItemColorAssoc = {
						colorId: color.colorId,
						color: color,
						colorItemId: dtoItem.colorItemId
					};

					item.colorItemColorAssoc.push(colorInfo);
				});
			}

			colorItems.push(item);
		});

		const body = {
			'newColorItems': colorItems
		};

		const action = `addColorItems`;
		const endpoint = `${environment.apiUrl}${action}`;

		return this._http.post<any>(endpoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response.value;
			}),
			catchError(this.handleError)
		);
	}
}
