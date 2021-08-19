import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MyFavorite } from 'phd-common';
import { environment } from '../../../../environments/environment';

@Injectable()
export class FavoriteService
{
	private _ds: string = encodeURIComponent('$');

	constructor(private _http: HttpClient) { }

	loadMyFavorites(salesAgreementId: number): Observable<Array<MyFavorite>>
	{
		const expandChoiceLocAttribute = `myFavoritesChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel)`;
		const expandChoiceLocations = `myFavoritesChoiceLocations($expand=${expandChoiceLocAttribute};$select=id,locationGroupCommunityId,locationCommunityId,locationName,locationGroupLabel,quantity)`;
		const expandChoiceAttributes = `myFavoritesChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel)`;
		const expand = `myFavoritesChoice($expand=${expandChoiceAttributes},${expandChoiceLocations};$select=id,choiceDescription,dpChoiceId,dpChoiceQuantity)`;
		const filter = `salesAgreementId eq ${salesAgreementId}`;
		const select = `id,name,salesAgreementId`;
		const orderBy = `id`;
		const url = `${environment.apiUrl}myFavorites?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				return response['value'] as Array<MyFavorite>;
			}),
			catchError(error =>
			{
				console.error(error);
				return _throw(error);
			})		
		);
	}

}
