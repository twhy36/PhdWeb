import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SettingsService } from './settings.service';

import { Settings } from '../../shared/models/settings.model';
import { IPlanOptionDto } from '../../shared/models/option.model';

@Injectable()
export class PlanOptionService
{
	private settings: Settings;
	private _ds: string = encodeURIComponent('$');

	constructor(
		private _http: HttpClient,
		private _settingsService: SettingsService)
	{
		this.settings = _settingsService.getSettings();
	}

	getPlanOptions(commId: number, planKey: string): Observable<Array<IPlanOptionDto>>
	{
		let expand = `planCommunity($select=id,financialCommunityId,financialPlanIntegrationKey),`;
		expand += `optionCommunity(
			$select = id, optionSalesName, optionDescription, optionSubCategory, option; $expand=attributeGroupOptionCommunityAssocs(
				$select=attributeGroupCommunityId;$expand=attributeGroupCommunity($select=id;$top=1)
			),
			locationGroupOptionCommunityAssocs(
				$select=locationGroupCommunityId; $expand=locationGroupCommunity($select=id;$top=1)
			),
			option($select = id, financialOptionIntegrationKey, createdBy),
			optionSubCategory($select = id, name, optionCategory; $expand = optionCategory($select = id, name)),
			optionCommunityImages($select=id;)
		)`;

		const filter = `planCommunity/financialCommunityId eq ${commId} and planCommunity/financialPlanIntegrationKey eq '${planKey}'`;
		const select = `id, planId, optionCommunity, maxOrderQty, listPrice, isActive, planCommunity`;
		const entity = `planOptionCommunities`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&useCache=false`;

		const url = `${this.settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map((response) =>
			{
				return response.value.map((data: any) =>
				{
					return {
						id: data.optionCommunity.option.financialOptionIntegrationKey,
						name: data.optionCommunity.optionSalesName,
						description: data.optionCommunity.optionDescription,
						isActive: data.isActive,
						listPrice: data.listPrice,
						maxOrderQuantity: data.maxOrderQty,
						category: data.optionCommunity.optionSubCategory.optionCategory.name,
						subCategory: data.optionCommunity.optionSubCategory.name,
						optionCommunityId: data.optionCommunity.id,
						hasAttributeLocationAssoc: data.optionCommunity.attributeGroupOptionCommunityAssocs.length > 0 || data.optionCommunity.locationGroupOptionCommunityAssocs.length > 0,
						imageCount: data.optionCommunity.optionCommunityImages.length
					} as IPlanOptionDto;
				});
			}),
			catchError(this.handleError)
		);
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}
