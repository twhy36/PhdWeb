import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import * as _ from 'lodash';

import { withSpinner, createBatch, getNewGuid, createBatchBody, createBatchHeaders, Tree, JobChoice, Choice } from 'phd-common';

import { environment } from '../../../../environments/environment';
import { MyFavorite, MyFavoritesChoice, MyFavoritesChoiceAttribute, MyFavoritesChoiceLocation } from '../../shared/models/my-favorite.model';

interface ChoiceExt { decisionPointLabel: string, subgroupLabel: string, groupLabel: string };

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
		const expand = `myFavoritesChoice($expand=${expandChoiceAttributes},${expandChoiceLocations};$select=id,choiceDescription,dpChoiceId,dpChoiceQuantity,decisionPointLabel,groupLabel,subGroupLabel,sortOrder)`;
		const filter = `salesAgreementId eq ${salesAgreementId}`;
		const select = `id,name,salesAgreementId`;
		const url = `${environment.apiUrl}myFavorites?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

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

	saveMyFavorite(myFavoriteId: number, name: string, salesAgreementId: number): Observable<MyFavorite>
	{
        const url = environment.apiUrl + `myFavorites`;
        
        const data = {
            id: myFavoriteId,
            name: name,
            salesAgreementId: salesAgreementId
        };

		return withSpinner(this._http).post(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			tap(response => response['@odata.context'] = undefined),
			map((response: any) =>
			{
				return new MyFavorite(response);
			}),
			catchError(error =>
			{
				console.log(error);

				return _throw(error);
			})
		);
	}

	saveMyFavoritesChoices(myFavoriteId: number, choices: any[]): Observable<MyFavoritesChoice[]>
	{
		const savedChoices = _.filter(choices, (c => c.removed !== undefined));
		const newChoices = [];
		const deletedChoices = [];
		
		savedChoices.forEach(c => {
			const choice = {
				id: c.id,
				myFavoriteId: myFavoriteId,
				choiceDescription: c.choiceDescription,
				dpChoiceId: c.dpChoiceId,
				dpChoiceQuantity: c.dpChoiceQuantity,
				decisionPointLabel: c.decisionPointLabel,
				subGroupLabel: c.subGroupLabel,
				groupLabel: c.groupLabel				
			};

			c.removed ? deletedChoices.push(choice) : newChoices.push(choice);
		});

		const endPoint = `${environment.apiUrl}${this._batch}`;
		const batchNewChoices = createBatch<MyFavoritesChoice>(newChoices, 'id', 'myFavoritesChoices');
		const batchDeletedChoices = createBatch<MyFavoritesChoice>(deletedChoices, 'id', 'myFavoritesChoices', null, true);
		const batchGuid = getNewGuid();
		const batchBody = createBatchBody(batchGuid, [batchNewChoices, batchDeletedChoices]);
		const headers = new HttpHeaders(createBatchHeaders(batchGuid));

		return withSpinner(this._http).post(endPoint, batchBody, { headers }).pipe(
			map(results =>
			{
				const responses = (results['responses']) as any[];
				let responseChoices = [];
				
				responses.forEach(res => {
					let resChoice = res['body'] as MyFavoritesChoice;
					if (resChoice && resChoice.dpChoiceId)
					{
						const choice = choices.find(x => x.dpChoiceId === resChoice.dpChoiceId);
						responseChoices.push({
							id: resChoice.id,
							myFavoriteId: resChoice.myFavoriteId,
							choiceDescription: resChoice.choiceDescription,
							dpChoiceId: resChoice.dpChoiceId,
							dpChoiceQuantity: resChoice.dpChoiceQuantity,
							groupLabel: resChoice.groupLabel,
							subGroupLabel: resChoice.subGroupLabel,
							decisionPointLabel: resChoice.decisionPointLabel,
							sortOrder: resChoice.sortOrder,
							divChoiceCatalogId: (choice ? choice.divChoiceCatalogId : 0) || 0							
						});
					}
				});

				deletedChoices.forEach(del => {
					const choice = choices.find(x => x.dpChoiceId === del.dpChoiceId);
					responseChoices.push({
						id: 0,
						dpChoiceId: del.dpChoiceId,
						divChoiceCatalogId: choice.divChoiceCatalogId
					});
				});

				return responseChoices;
			}),
			catchError(error =>
			{
				console.log(error);

				return _throw(error);
			})			
		);
	}	

	getFavoriteChoices(tree: Tree, salesChoices: JobChoice[], favorites: MyFavorite) : any[]
	{
		let choices = [];
		const treeChoices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices.filter(ch => ch.quantity > 0)))) || [];
		const favoriteChoices = (favorites ? favorites.myFavoritesChoice : []) || [];
		
		const newFavoriteChoices = treeChoices.filter(c => salesChoices.findIndex(sc => sc.divChoiceCatalogId === c.divChoiceCatalogId) === -1);
		newFavoriteChoices.forEach(nc => {
			const existingChoice = favoriteChoices.find(fav => fav.divChoiceCatalogId === nc.divChoiceCatalogId);
			if (!existingChoice)
			{
				const labels = this.getChoiceLabels(nc, tree);
				choices.push({
					id: 0,
					choiceDescription: nc.description,
					dpChoiceId: nc.id,
					dpChoiceQuantity: nc.quantity,
					decisionPointLabel: labels.decisionPointLabel,
					subGroupLabel: labels.subgroupLabel,
					groupLabel: labels.groupLabel,
					divChoiceCatalogId: nc.divChoiceCatalogId,
					removed: false
				});
			}
		});

		const deletedFavoriteChoices = favoriteChoices.filter(fc => newFavoriteChoices.findIndex(nc => nc.divChoiceCatalogId === fc.divChoiceCatalogId) === -1);
		deletedFavoriteChoices.forEach(dc => {
			const labels = this.getChoiceLabels(dc, tree);
			choices.push({
				id: dc.id,
				choiceDescription: dc.choiceDescription,
				dpChoiceId: dc.dpChoiceId,
				dpChoiceQuantity: dc.dpChoiceQuantity,
				decisionPointLabel: labels.decisionPointLabel,
				subGroupLabel: labels.subgroupLabel,
				groupLabel: labels.groupLabel,
				divChoiceCatalogId: dc.divChoiceCatalogId,
				removed: true
			});			
		})

		return [ ...choices, ...favoriteChoices ];
	}

	private getChoiceLabels(choice: Choice | MyFavoritesChoice, tree: Tree): ChoiceExt
	{

		let pointId: number = 0;

		if (choice instanceof Choice)
		{
			pointId = choice.treePointId;
		}
		else
		{
			const choices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));
			const ch = choices.find(x => x.divChoiceCatalogId === choice.divChoiceCatalogId);

			if (ch)
			{
				pointId = ch.treePointId;
			}
		}

		return tree.treeVersion.groups.reduce((val: ChoiceExt, g) =>
		{
			let result = g.subGroups.reduce((sgVal: ChoiceExt, sg) =>
			{
				let p = sg.points.find(p => p.id === pointId);

				if (!!p)
				{
					return { decisionPointLabel: p.label, subgroupLabel: sg.label, groupLabel: g.label };
				}
				else
				{
					return sgVal;
				}
			}, null);

			if (!!result)
			{
				return result;
			}
			else
			{
				return val;
			}
		}, null);
	}

	public deleteMyFavorite(fav: MyFavorite) : Observable<number>
	{
		const endPoint = `${environment.apiUrl}${this._batch}`;

		let locAttributes = _.flatMap(fav.myFavoritesChoice, c => _.flatMap(c.myFavoritesChoiceLocations, loc => loc.myFavoritesChoiceLocationAttributes));
		locAttributes = locAttributes ? locAttributes.filter(c => !!c) : [];
		const batchLocationAttributes = createBatch<MyFavoritesChoiceAttribute>(locAttributes, 'id', 'myFavoritesChoiceLocationAttributes', null, true);
		
		let choiceLocations = _.flatMap(fav.myFavoritesChoice, c => c.myFavoritesChoiceLocations);
		choiceLocations = choiceLocations ? choiceLocations.filter(c => !!c) : [];
		const batchChoiceLocations = createBatch<MyFavoritesChoiceLocation>(choiceLocations, 'id', 'myFavoritesChoiceLocations', null, true);

		let choiceAttributes = _.flatMap(fav.myFavoritesChoice, c => c.myFavoritesChoiceAttributes);
		choiceAttributes = choiceAttributes ? choiceAttributes.filter(c => !!c) : [];
		const batchChoiceAttributes = createBatch<MyFavoritesChoiceAttribute>(choiceAttributes, 'id', 'myFavoritesChoiceAttributes', null, true);

		const favoritesChoices = fav.myFavoritesChoice ? fav.myFavoritesChoice.filter(c => !!c) : [];
		const batchFavoritesChoices = createBatch<MyFavoritesChoice>(favoritesChoices, 'id', 'myFavoritesChoices', null, true);

		const myFavorites = [fav];
		const batchMyFavorites = createBatch<MyFavorite>(myFavorites, 'id', 'myFavorites', null, true);
		
		const batchGuid = getNewGuid();
		const batchBody = createBatchBody(batchGuid, [batchLocationAttributes, batchChoiceLocations, batchChoiceAttributes, batchFavoritesChoices, batchMyFavorites]);
		const headers = new HttpHeaders(createBatchHeaders(batchGuid));

		return withSpinner(this._http).post(endPoint, batchBody, { headers }).pipe(
			map(results =>
			{
				return fav.id;
			}),
			catchError(error =>
			{
				console.log(error);

				return _throw(error);
			})			
		);		
	}
}
