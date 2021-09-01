import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import * as _ from 'lodash';

import { Observable, throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import 
{ 
	withSpinner, createBatch, getNewGuid, createBatchBody, createBatchHeaders, MyFavorite, 
	MyFavoritesChoice, MyFavoritesChoiceAttribute, MyFavoritesChoiceLocation, MyFavoritesPointDeclined
} from 'phd-common';

import { environment } from '../../../../environments/environment';

@Injectable()
export class FavoriteService
{
	private _ds: string = encodeURIComponent('$');
	private _batch = "$batch";

	constructor(private _http: HttpClient) { }

	loadMyFavorites(salesAgreementId: number): Observable<Array<MyFavorite>>
	{
		const expandChoiceLocAttribute = `myFavoritesChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel)`;
		const expandChoiceLocations = `myFavoritesChoiceLocations($expand=${expandChoiceLocAttribute};$select=id,locationGroupCommunityId,locationCommunityId,locationName,locationGroupLabel,quantity)`;
		const expandChoiceAttributes = `myFavoritesChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel)`;
		const expandChoice = `myFavoritesChoice($expand=${expandChoiceAttributes},${expandChoiceLocations};$select=id,choiceDescription,dpChoiceId,dpChoiceQuantity)`;
		const expand = `${expandChoice},myFavoritesPointDeclined($select=id)`;
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

	public deleteMyFavorites(favorites: MyFavorite[]) : Observable<any>
	{
		const endPoint = `${environment.apiUrl}${this._batch}`;

		let locAttributes = _.flatMap(favorites, fav => _.flatMap(fav.myFavoritesChoice, c => _.flatMap(c.myFavoritesChoiceLocations, loc => loc.myFavoritesChoiceLocationAttributes)));
		locAttributes = locAttributes?.filter(c => !!c) || [];
		const batchLocationAttributes = createBatch<MyFavoritesChoiceAttribute>(locAttributes, 'id', 'myFavoritesChoiceLocationAttributes', null, true);
		
		let choiceLocations = _.flatMap(favorites, fav => _.flatMap(fav.myFavoritesChoice, c => c.myFavoritesChoiceLocations));
		choiceLocations = choiceLocations?.filter(c => !!c) || [];
		const batchChoiceLocations = createBatch<MyFavoritesChoiceLocation>(choiceLocations, 'id', 'myFavoritesChoiceLocations', null, true);

		let choiceAttributes = _.flatMap(favorites, fav => _.flatMap(fav.myFavoritesChoice, c => c.myFavoritesChoiceAttributes));
		choiceAttributes = choiceAttributes?.filter(c => !!c) || [];
		const batchChoiceAttributes = createBatch<MyFavoritesChoiceAttribute>(choiceAttributes, 'id', 'myFavoritesChoiceAttributes', null, true);

		const favoritesChoices = _.flatMap(favorites, fav => fav.myFavoritesChoice?.filter(c => !!c) || []);
		const batchFavoritesChoices = createBatch<MyFavoritesChoice>(favoritesChoices, 'id', 'myFavoritesChoices', null, true);

		const pointsDeclined = _.flatMap(favorites, fav => fav.myFavoritesPointDeclined?.filter(c => !!c) || []);
		const batchPointsDeclined = createBatch<MyFavoritesPointDeclined>(pointsDeclined, 'id', 'myFavoritesPointsDeclined', null, true);

		const batchMyFavorites = createBatch<MyFavorite>(favorites, 'id', 'myFavorites', null, true);
		
		const batchGuid = getNewGuid();
		const batchBody = createBatchBody(batchGuid, [batchLocationAttributes, batchChoiceLocations, batchChoiceAttributes, batchFavoritesChoices, batchPointsDeclined, batchMyFavorites]);
		const headers = new HttpHeaders(createBatchHeaders(batchGuid));

		return withSpinner(this._http).post(endPoint, batchBody, { headers }).pipe(
			map(results =>
			{
				return results;
			}),
			catchError(error =>
			{
				console.log(error);

				return _throw(error);
			})			
		);		
	}	
}
