import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError as _throw } from 'rxjs';

import * as _ from 'lodash';

import { environment } from '../../../../environments/environment';
import { withSpinner, getNewGuid, createBatchGet, createBatchHeaders, createBatchBody } from 'phd-common';

import { map, catchError } from 'rxjs/operators';
import { LitePlanOption, ScenarioOption, ColorItem, Color, ScenarioOptionColorDto, IOptionSubCategory } from '../../shared/models/lite.model';

@Injectable()
export class LiteService
{
	private _ds: string = encodeURIComponent("$");

    constructor(private _http: HttpClient) { }

	getLitePlanOptions(planId: number, optionIds?: Array<string>, skipSpinner?: boolean): Observable<LitePlanOption[]>
	{
		let filterOptions = '';

		if (optionIds != null)
		{
			filterOptions = " and (" + optionIds.map(id => `optionCommunity/option/financialOptionIntegrationKey eq '${id}'`).join(' or ') + ")";
		}

		const entity = 'planOptionCommunities';
		const expand = `optionCommunity($expand=option($select=financialOptionIntegrationKey,id),optionSubCategory($select=optionCategoryId); $select=optionSalesName,optionDescription,option,id,optionSubCategoryId)`;
		const filter = `planId eq ${planId}${filterOptions}`;
		const select = `id, planId, optionCommunity, maxOrderQty, listPrice, isActive, isBaseHouse, isBaseHouseElevation`;

		const endPoint = environment.apiUrl + `${entity}?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		return (skipSpinner ? this._http : withSpinner(this._http)).get(endPoint).pipe(
			this.mapOptions(),
			catchError(this.handleError)
		);
    }

	private mapOptions = () => (source: Observable<any>) =>
		source.pipe(
			map((response: any) =>
			{
				return response.value.map(data =>
				{
					return {
						id: data['id'],
						name: data['optionCommunity']['optionSalesName'],
						isActive: data['isActive'],
						listPrice: data['listPrice'] || 0,
						maxOrderQuantity: data['maxOrderQty'],
						isBaseHouse: data['isBaseHouse'],
						isBaseHouseElevation: data['isBaseHouseElevation'],
						attributeGroups: [],
						locationGroups: [],
						financialOptionIntegrationKey: data['optionCommunity']['option']['financialOptionIntegrationKey'],
						description: data['optionCommunity']['optionDescription'],
						optionImages: [],
						planId: data['planId'] ? data['planId'] : 0,
                        communityId: data['communityId'] ? data['communityId'] : 0,
						optionSubCategoryId: data['optionCommunity']['optionSubCategoryId'],
						colorItems: [],
						optionCategoryId: data['optionCommunity']['optionSubCategory']['optionCategoryId']
					} as LitePlanOption;
				}) as LitePlanOption[];
			})
        );

	getScenarioOptions(scenarioId: number) : Observable<ScenarioOption[]>
	{
		const entity = `scenarioOptions`;
		const filter = `scenarioId eq ${scenarioId}`;
		const expand = `scenarioOptionColors`;

		const endpoint = `${environment.apiUrl}${entity}?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		return withSpinner(this._http).get<any>(endpoint).pipe(
			map(results =>
			{
				return results['value'];
			}),
			catchError(this.handleError)
		);
	}

	saveScenarioOptions(scenarioId: number, scenarioOptions: ScenarioOption[]) : Observable<ScenarioOption[]>
	{
		const endpoint = environment.apiUrl + `SaveScenarioOptions`;

		let data = {
			scenarioId: scenarioId,
			scenarioOptions: scenarioOptions
		};

		return this._http.post(endpoint, data).pipe(
			map(response =>
			{
				return response['value'];
			}),
			catchError(this.handleError)
		);
	}

	saveScenarioOptionColors(scenarioId: number, optionColors: ScenarioOptionColorDto[]) : Observable<ScenarioOption[]>
	{
		const endpoint = environment.apiUrl + `SaveScenarioOptionColors`;

		let data = {
			scenarioId: scenarioId,
			scenarioOptionColors: optionColors
		};

		return this._http.post(endpoint, data).pipe(
			map(response =>
			{
				return response['value'];
			}),
			catchError(this.handleError)
		);
	}

	getColorItems(optionIds: Array<number>): Observable<ColorItem[]>
	{
		const batchGuid = getNewGuid();
		const batchSize = 50;

		let requests = [];

		for (let i = 0; i < optionIds.length; i = i + batchSize)
		{
			const batchIds = optionIds.slice(i, i + batchSize);
			const entity = `colorItems`;
			const expand =  `colorItemColorAssoc($expand=color)`
			let filter = `(edhPlanOptionId in (${batchIds.join(',')})) and (isActive eq true)`;
			const select = `colorItemId,name,edhPlanOptionId,isActive`;

			let qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

			const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

			requests.push(createBatchGet(endpoint));
		}

		let headers = createBatchHeaders(batchGuid);
		let batch = createBatchBody(batchGuid, requests);

		return withSpinner(this._http).post(`${environment.apiUrl}$batch`, batch, { headers: headers }).pipe(
			map((response: any) =>
			{
				let responseBodies = response.responses.map(res => res.body);
				let colorItems: Array<ColorItem> = [];

				responseBodies.forEach((result)=>
				{
					let resultItems = result.value as Array<ColorItem>;

					resultItems.forEach(item => {
						colorItems.push({
							colorItemId: item.colorItemId,
							name: item.name,
							edhPlanOptionId: item.edhPlanOptionId,
							isActive: item.isActive,
							color: this.mapColors(item['colorItemColorAssoc'], item.colorItemId)
						});
					});
				})

			return colorItems;
		}),
			catchError(this.handleError)
		)
	}

	private mapColors(colorItemAssoc: any[], colorItemId: number) : Color[]
	{
		let colors : Color[] = [];

		if (colorItemAssoc)
		{
			colorItemAssoc.forEach(assoc => {
				colors.push({
					colorId: assoc.color?.colorId,
					name: assoc.color?.name,
					sku: assoc.color?.sku,
					edhFinancialCommunityId: assoc.color?.edhFinancialCommunityId,
					edhOptionSubcategoryId: assoc.color?.edhOptionSubcategoryId,
					isActive: assoc.color?.isActive,
					colorItemId: colorItemId
				})
			})
		}

		return colors;
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure
		console.error(error);

		return _throw(error || 'Server error');
	}

	getOptionsCategorySubcategory(
		financialCommunityId: number
	): Observable<IOptionSubCategory[]> {
		const dollarSign: string = encodeURIComponent('$');
		const entity = `optionSubCategories`;
		const expand = `optionCategory($select=id,name)`;
		const filter = `optionCommunities/any(oc: oc/financialCommunityId eq ${financialCommunityId})`;
		const select = `id,name`;

		let qryStr = `${dollarSign}expand=${encodeURIComponent(expand)}&${
			dollarSign
		}filter=${encodeURIComponent(filter)}&${
			dollarSign
		}select=${encodeURIComponent(select)}`;

		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map((response) => {
				let subCategoryList =
					response.value as Array<IOptionSubCategory>;
				// sort by categoryname and then by subcategoryname
				return subCategoryList.sort((a, b) => {
					let aName = a.optionCategory.name.toLowerCase();
					let bName = b.optionCategory.name.toLowerCase();

					if (aName < bName) {
						return -1;
					}

					if (aName > bName) {
						return 1;
					}

					if ((aName === bName)) {
						let aSubName = a.name.toLowerCase();
						let bSubName = b.name.toLowerCase();

						if (aSubName < bSubName) {
							return -1;
						}

						if (aSubName > bSubName) {
							return 1;
						}

						return 0;
					}
					return 0;
				});
			}),
			catchError(error =>
				{
					console.error(error);

					return _throw(error);
				})
		);
	}
}
