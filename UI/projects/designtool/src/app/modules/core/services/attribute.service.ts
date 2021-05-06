import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw, of } from 'rxjs';
import { map, catchError, combineLatest } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';

import { AttributeGroup, LocationGroup, Location, Attribute, AttributeCommunityImageAssoc, Choice } from 'phd-common';

import { orderBy } from "lodash";

@Injectable()
export class AttributeService
{
	private _ds: string = encodeURIComponent("$");

	constructor(private _http: HttpClient) { }

	getAttributeGroups(choice: Choice): Observable<AttributeGroup[]>
	{
		const filterAttributeGroupIds = choice.mappedAttributeGroups.map(ag => `id eq ${ag.id}`).join(' or ');

		const entity = `attributeGroupCommunities`;
		const expand = `attributeGroupOptionCommunityAssocs($expand=optionCommunity($expand=option($select=id,financialOptionIntegrationKey);$select=id)),attributeGroupAttributeCommunityAssocs($expand=attributeCommunity($select=id,name,attributeDescription,manufacturer,sku,imageUrl,startDate,endDate);$filter=(attributeCommunity/endDate gt now()) and (attributeCommunity/startDate lt now()))`;
		const filter = `(${filterAttributeGroupIds})`;
		const select = `id,groupName,groupLabel,description,isActive`;
		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		// Get attribute group sort order for the included choice in PHD
		const getChoiceAttributeGroups: Observable<any[]> = (!choice.options || choice.options.length < 1)
			? this.getChoiceAttributeGroups(choice.id)
			: of([]);

		return this._http.get<any>(`${url}`).pipe(
			combineLatest(getChoiceAttributeGroups),
			map(([response, choiceAttributeGroups]) =>
			{
				const attributeGroupsDto = response.value as any[];

				const attributeGroups = attributeGroupsDto.map<AttributeGroup>(g =>
				{
					var sortOrder = 0;

					if (g.attributeGroupOptionCommunityAssocs && g.attributeGroupOptionCommunityAssocs.length)
					{
						const attrAssoc = g.attributeGroupOptionCommunityAssocs.find(
							x => choice.options.some(o => o.financialOptionIntegrationKey === x.optionCommunity.option.financialOptionIntegrationKey));

						sortOrder = attrAssoc ? attrAssoc.sortOrder : 0;
					}
					else
					{
						var choiceAttributeGroup = choiceAttributeGroups.find(x => x.id === g.id);

						if (choiceAttributeGroup)
						{
							sortOrder = choiceAttributeGroup.sortOrder;
						}
					}

					return {
						id: g.id,
						name: g.groupName,
						label: g.groupLabel,
						choiceId: null,
						sortOrder: sortOrder,
						attributes: orderBy(g.attributeGroupAttributeCommunityAssocs.map(a => a.attributeCommunity as Attribute[]), [attr => attr.name.toLowerCase()])
					};
				});

				return attributeGroups;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getLocationGroups(locationGroupIds: number[]): Observable<LocationGroup[]>
	{
		const filterLocationGroupIds = locationGroupIds.map(id => `id eq ${id}`).join(' or ');

		const entity = `locationGroupCommunities`;
		const expand = `locationGroupLocationCommunityAssocs($expand=locationCommunity($select=id,locationName,locationDescription,isActive);$filter=locationCommunity/isActive eq true)`;
		const filter = `(${filterLocationGroupIds})`;
		const select = `id,locationGroupName,groupLabel,locationGroupDescription,isActive`;
		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(`${url}`).pipe(
			map(response =>
			{
				const locationGroupsDto = response.value as any[];

				return locationGroupsDto.map<LocationGroup>(g =>
				{
					return {
						id: g.id,
						name: g.locationGroupName,
						label: g.groupLabel,
						locations: g.locationGroupLocationCommunityAssocs.map(l =>
						{
							return {
								id: l.locationCommunity.id,
								name: l.locationCommunity.locationName
							} as Location;
						})
					};
				});
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getAttributeCommunities(attributeCommunityIds: number[]): Observable<any[]>
	{
		const expand = `attributeGroupAttributeCommunityAssocs($expand=attributeGroupCommunity)`;
		const filter = attributeCommunityIds.map(x => `id eq ${x}`).join(" or ");

		const url = `${environment.apiUrl}attributeCommunities?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		return this._http.get<any>(`${url}`).pipe(
			map(response =>
			{
				const attributes = response.value as any[];

				return attributes.map(a =>
				{
					return {
						id: a.id,
						imageUrl: a.imageUrl,
						manufacturer: a.manufacturer,
						name: a.name,
						sku: a.sku,
						attributeGroups: a.attributeGroupAttributeCommunityAssocs.map(g =>
						{
							return {
								id: g.attributeGroupCommunity.id,
								label: g.attributeGroupCommunity.groupLabel,
								name: g.attributeGroupCommunity.groupName,
								attributes: []
							};
						})
					};
				});
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getAttributeCommunityImageAssoc(attributeCommunityId: Array<number>, outForSignatureDate: Date): Observable<Array<AttributeCommunityImageAssoc>>
	{
		if (attributeCommunityId.length && outForSignatureDate)
		{
			let url = environment.apiUrl;
			const filter = `attributeCommunity/id in (${attributeCommunityId.join(',')}) and startDate le ${outForSignatureDate} and (endDate eq null or endDate gt ${outForSignatureDate})`;

			const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=attributeCommunityId, imageUrl, startDate, endDate`;

			url += `attributeCommunityImageAssocs?${qryStr}`;

			return this._http.get(url).pipe(
				map(response => {
					let acImageAssoc = response['value'] as Array<AttributeCommunityImageAssoc>;

					return acImageAssoc;
				})
			);
		}

		return of(null);
	}

	getLocationCommunities(locationCommunityIds: number[]): Observable<any[]>
	{
		const expand = `locationGroupLocationCommunityAssocs($expand=locationGroupCommunity)`;
		const filter = locationCommunityIds.map(x => `id eq ${x}`).join(" or ");

		const url = `${environment.apiUrl}locationCommunities?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		return this._http.get<any>(`${url}`).pipe(
			map(response =>
			{
				const locations = response.value as any[];

				return locations.map(loc =>
				{
					return {
						id: loc.id,
						name: loc.locationName,
						locationGroups: loc.locationGroupLocationCommunityAssocs.map(g =>
						{
							return {
								id: g.locationGroupCommunity.id,
								label: g.locationGroupCommunity.groupLabel,
								name: g.locationGroupCommunity.locationGroupName,
								locations: []
							};
						})
					};
				});
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	// Get attribute group sort order for the included choice in PHD
	getChoiceAttributeGroups(choiceId: number): Observable<any[]>
	{
		const entity = `dPChoiceAttributeGroupCommunityAssocs`;
		const filter = `dPChoiceID eq ${choiceId}`;
		const select = `attributeGroupCommunityId,sortOrder`;
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(`${url}`).pipe(
			map(response =>
			{
				const attributeGroups = response.value.map(g =>
				{
					return {
						id: g.attributeGroupCommunityId,
						sortOrder: g.sortOrder
					};
				});

				return attributeGroups;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}
}

