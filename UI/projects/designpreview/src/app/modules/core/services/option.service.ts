import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { withSpinner, PlanOption, OptionImage, ODataResponse, PlanOptionCommunityDto } from 'phd-common';
import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';

@Injectable()
export class OptionService
{
	private mapOptions = () => (source: Observable<ODataResponse<PlanOptionCommunityDto[]>>) =>
		source.pipe(
			map((response: ODataResponse<PlanOptionCommunityDto[]>) =>
			{
				return response.value.map(data =>
				{
					const locationGroups = data.optionCommunity.locationGroupOptionCommunityAssocs;
					const attributeGroups = data.optionCommunity.attributeGroupOptionCommunityAssocs;
					const optionCommunityImages = data.optionCommunity.optionCommunityImages;
					let optionImages: OptionImage[] = [];

					if (optionCommunityImages.length > 0)
					{
						optionImages = optionCommunityImages
							.map(image =>
							{
								return { imageURL: image.imageUrl, sortKey: image.sortKey } as OptionImage;
							})
							.sort((a, b) => a.sortKey < b.sortKey ? -1 : 1);
					}

					return {
						id: data.id,
						name: data.optionCommunity.optionSalesName,
						isActive: data.isActive,
						listPrice: data.listPrice || 0,
						maxOrderQuantity: data.maxOrderQty,
						isBaseHouse: data.isBaseHouse,
						isBaseHouseElevation: data.isBaseHouseElevation,
						attributeGroups: attributeGroups.length > 0 ? attributeGroups.map(x => x.attributeGroupCommunityId) : [],
						locationGroups: locationGroups.length > 0 ? locationGroups.map(x => x.locationGroupCommunityId) : [],
						financialOptionIntegrationKey: data.optionCommunity.option.financialOptionIntegrationKey,
						description: data.optionCommunity.optionDescription,
						optionImages: optionImages,
						planId: data.planId ?? 0,
						communityId: data.communityId ?? 0
					} as PlanOption;
				}) as PlanOption[];
			})
		);

	constructor(private _http: HttpClient) { }

	getPlanOptions(planId: number, optionIds?: Array<string>, skipSpinner?: boolean): Observable<PlanOption[]>
	{
		let filterOptions = '';

		if (optionIds != null)
		{
			filterOptions = ' and (' + optionIds.map(id => `optionCommunity/option/financialOptionIntegrationKey eq '${id}'`).join(' or ') + ')';
		}

		const entity = 'planOptionCommunities';
		const expand = 'optionCommunity($expand=optionCommunityImages($select=id,imageUrl,sortKey),attributeGroupOptionCommunityAssocs($select=attributeGroupCommunityId),locationGroupOptionCommunityAssocs($select=locationGroupCommunityId),option($select=financialOptionIntegrationKey,id); $select=optionSalesName,optionDescription,option,id)';
		const filter = `planId eq ${planId}${filterOptions}`;
		const select = 'id, planId, optionCommunity, maxOrderQty, listPrice, isActive, isBaseHouse, isBaseHouseElevation';

		const endPoint = environment.apiUrl + `${entity}?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return (skipSpinner ? this._http : withSpinner(this._http)).get<ODataResponse<PlanOptionCommunityDto[]>>(endPoint).pipe(
			this.mapOptions(),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getPlanOptionsByPlanKey(communityId: number, planKey: string): Observable<PlanOption[]>
	{
		const entity = 'planOptionCommunities';
		const expand = 'optionCommunity($expand=optionCommunityImages($select=id,imageUrl,sortKey),attributeGroupOptionCommunityAssocs($select=attributeGroupCommunityId),locationGroupOptionCommunityAssocs($select=locationGroupCommunityId), option($select=financialOptionIntegrationKey,id); $select=optionSalesName,optionDescription,option,id)';
		const filter = `planCommunity/financialCommunityId eq ${communityId} and planCommunity/financialPlanIntegrationKey eq '${planKey}'`;
		const select = 'id, planId, optionCommunity, maxOrderQty, listPrice, isActive, isBaseHouse, isBaseHouseElevation';

		const endPoint = environment.apiUrl + `${entity}?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return withSpinner(this._http).get<ODataResponse<PlanOptionCommunityDto[]>>(endPoint).pipe(
			this.mapOptions(),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}
}
