import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { withSpinner } from 'phd-common';
import { catchError, map, groupBy, mergeMap, toArray } from 'rxjs/operators';
import { Observable,throwError as _throw } from 'rxjs';
import { IColor } from '../../shared/models/color.model';
import { IColorItem, IColorItemDto } from '../../shared/models/colorItem.model';
import * as _ from 'lodash';

@Injectable()
export class ColorService {
	constructor(private _http: HttpClient) {}
	private _ds: string = encodeURIComponent('$');
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

		if (subcategoryId)
		{
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

	getColorItems(communityId?: number,	edhPlanOptionIds?: Array<number>, isActive?: boolean, topRows?: number, skipRows?: number): any
	{
		const entity = `colorItems`;
		const expand =  `colorItemColorAssoc($expand=color($select=colorId,name,edhFinancialCommunityId))`
		let filter = `colorItemColorAssoc/color/edhFinancialCommunityId eq ${communityId}`;
		const select = `colorItemId,name,edhPlanOptionId,isActive,colorItemColorAssoc`;
		
		if (isActive != null)
		{
			filter += `and (isActive eq ${isActive})`;
		}
		if (edhPlanOptionIds)
		{
			filter += `and (edhPlanOptionId in (${edhPlanOptionIds.join(',')}))`;			
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
	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure
		console.error(error);
		return _throw(error || 'Server error');
	}
}
