import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError as _throw, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import * as _ from 'lodash';

import 
{
	withSpinner, createBatch, getNewGuid, createBatchBody, createBatchHeaders, Tree, JobChoice, Choice,
	MyFavorite, MyFavoritesChoice, MyFavoritesChoiceAttribute, MyFavoritesChoiceLocation, MyFavoritesPointDeclined, DesignToolAttribute
} from 'phd-common';

import { environment } from '../../../../environments/environment';

interface ChoiceExt { decisionPointLabel: string, subgroupLabel: string, groupLabel: string; };

@Injectable()
export class FavoriteService
{
	private _ds: string = encodeURIComponent('$');
	private _batch = '$batch';

	constructor(private _http: HttpClient) { }

	loadMyFavorites(salesAgreementId: number): Observable<Array<MyFavorite>>
	{
		const expandChoiceLocAttribute = 'myFavoritesChoiceLocationAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel)';
		const expandChoiceLocations = `myFavoritesChoiceLocations($expand=${expandChoiceLocAttribute};$select=id,locationGroupCommunityId,locationCommunityId,locationName,locationGroupLabel,quantity)`;
		const expandChoiceAttributes = 'myFavoritesChoiceAttributes($select=id,attributeGroupCommunityId,attributeCommunityId,attributeName,attributeGroupLabel)';
		const expand = `myFavoritesPointDeclined,myFavoritesChoice($expand=${expandChoiceAttributes},${expandChoiceLocations};$select=id,choiceDescription,dpChoiceId,dpChoiceQuantity,decisionPointLabel,groupLabel,subGroupLabel,sortOrder)`;
		const filter = `salesAgreementId eq ${salesAgreementId}`;
		const select = 'id,name,salesAgreementId';
		const orderBy = 'id';
		const url = `${environment.apiUrl}myFavorites?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

		return withSpinner(this._http).get(url).pipe(
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
		const url = environment.apiUrl + 'myFavorites';

		const data = {
			id: myFavoriteId,
			name: name,
			salesAgreementId: salesAgreementId
		};

		return withSpinner(this._http).post(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			tap(response => response['@odata.context'] = undefined),
			map((response: MyFavorite) =>
			{
				return new MyFavorite(response);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	//save favorites to DB through API calls, return processed choices for next action
	saveMyFavoritesChoices(tree: Tree, salesChoices: JobChoice[], favorites: MyFavorite): Observable<MyFavoritesChoice[]>
	{
		const favoriteChoices = (favorites ? favorites.myFavoritesChoice : []) || [];
		const updatedChoices = this.getMyFavoritesChoices(tree, salesChoices, favoriteChoices);
		const savedChoices = updatedChoices.map(c => _.omit(c, ['divChoiceCatalogId']));

		const data = {
			myFavoriteId: favorites.id,
			choices: savedChoices
		};

		const endPoint = environment.apiUrl + 'SaveMyFavoritesChoices';

		return withSpinner(this._http).post(endPoint, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(results =>
			{
				const responses = (results['value']) as MyFavoritesChoice[];
				const choices = [...updatedChoices, ...favoriteChoices];

				return responses.map(res =>
				{
					if (res)
					{
						const choice = choices.find(x => x.dpChoiceId === res.dpChoiceId);
						res.divChoiceCatalogId = (choice ? choice.divChoiceCatalogId : 0) || 0;
					}
					return res;
				});
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	addMyFavoritesPointDeclined(myFavoriteId: number, pointId: number): Observable<MyFavoritesPointDeclined>
	{
		const endPoint = environment.apiUrl + 'myFavoritesPointsDeclined';

		const data = {
			myFavoriteId: myFavoriteId,
			dPointId: pointId
		};

		return withSpinner(this._http).post(endPoint, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			tap(response => response['@odata.context'] = undefined),
			map((response: MyFavoritesPointDeclined) =>
			{
				return new MyFavoritesPointDeclined(response);
			}),
			catchError(error =>
			{
				console.error(error);
				return _throw(error);
			})
		);
	}

	deleteMyFavoritesPointDeclined(myFavoriteId: number, myFavoritesPointDeclinedId: number): Observable<MyFavoritesPointDeclined>
	{
		const endPoint = environment.apiUrl + `myFavoritesPointsDeclined(${myFavoritesPointDeclinedId})`;
		return withSpinner(this._http).delete(endPoint).pipe(
			map(() =>
			{
				const result = new MyFavoritesPointDeclined();
				result.id = myFavoritesPointDeclinedId;
				result.myFavoriteId = myFavoriteId;
				return result;
			}),
			catchError(error =>
			{
				return _throw(error);
			})
		);
	}

	//read from store/state, contracted and fovorited choices, 
	//return choices feeding API DB updates for saving favorites
	getMyFavoritesChoices(tree: Tree, salesChoices: JobChoice[], favoriteChoices: MyFavoritesChoice[])
	{
		const choices = [];
		//read store/state.tree for all selected
		const treeChoices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices.filter(ch => ch.quantity > 0)))) || [];

		//get selected other than contracted
		const newFavoriteChoices = treeChoices.filter(c => salesChoices.findIndex(sc => sc.divChoiceCatalogId === c.divChoiceCatalogId) === -1);
		newFavoriteChoices.forEach(nc =>
		{
			//already favorited in store/state, return existing ID, otherwise ID=0 for insert
			const existingChoice = favoriteChoices.find(fav => fav.divChoiceCatalogId === nc.divChoiceCatalogId);
			if (existingChoice)
			{
				const updatedAttributes = this.getMyFavoritesChoiceAttributes(nc, existingChoice);
				const updatedLocations = this.getMyFavoritesChoiceLocations(nc, existingChoice);
				if (updatedAttributes.length || updatedLocations.length || existingChoice.dpChoiceQuantity !== nc.quantity)
				{
					choices.push({
						id: existingChoice.id,
						choiceDescription: existingChoice.choiceDescription,
						dpChoiceId: existingChoice.dpChoiceId,
						dpChoiceQuantity: nc.quantity,
						decisionPointLabel: existingChoice.decisionPointLabel,
						subGroupLabel: existingChoice.subGroupLabel,
						groupLabel: existingChoice.groupLabel,
						divChoiceCatalogId: existingChoice.divChoiceCatalogId,
						attributes: updatedAttributes,
						locations: updatedLocations,
						removed: false
					});
				}
			}
			else
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
					attributes: this.getMyFavoritesChoiceAttributes(nc, null),
					locations: this.getMyFavoritesChoiceLocations(nc, null),
					removed: false
				});
			}
		});

		//remove by set return choice ids and Remove=true
		const deletedFavoriteChoices = favoriteChoices.filter(fc => newFavoriteChoices.findIndex(nc => nc.divChoiceCatalogId === fc.divChoiceCatalogId) === -1);
		deletedFavoriteChoices.forEach(dc =>
		{
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
				attributes: this.getMyFavoritesChoiceAttributes(null, dc),
				locations: this.getMyFavoritesChoiceLocations(null, dc),
				removed: true
			});
		});

		return choices;
	}

	private getMyFavoritesChoiceAttributes(choice: Choice, favoriteChoice: MyFavoritesChoice)
	{
		const attributesDto = [];
		const selectedAttributes = this.mapAttributes(choice);
		const favoriteAttributes = (favoriteChoice ? favoriteChoice.myFavoritesChoiceAttributes : null) || [];

		const newAttributes = selectedAttributes
			.filter(a => favoriteAttributes
				.findIndex(fa => fa.attributeGroupCommunityId === a.attributeGroupCommunityId
					&& fa.attributeCommunityId === a.attributeCommunityId) === -1);

		newAttributes.forEach(nc =>
		{
			attributesDto.push({
				id: 0,
				attributeCommunityId: nc.attributeCommunityId,
				attributeGroupCommunityId: nc.attributeGroupCommunityId,
				attributeName: nc.attributeName,
				attributeGroupLabel: nc.attributeGroupLabel,
				removed: false
			});
		});

		const deletedAttributes = favoriteAttributes
			.filter(fa => selectedAttributes
				.findIndex(sa => sa.attributeGroupCommunityId === fa.attributeGroupCommunityId
					&& sa.attributeCommunityId === fa.attributeCommunityId) === -1);

		deletedAttributes.forEach(da =>
		{
			attributesDto.push({
				id: da.id,
				attributeCommunityId: da.attributeCommunityId,
				attributeGroupCommunityId: da.attributeGroupCommunityId,
				attributeName: da.attributeName,
				attributeGroupLabel: da.attributeGroupLabel,
				removed: true
			});
		});

		return attributesDto;
	}

	private getMyFavoritesChoiceLocations(choice: Choice, favoriteChoice: MyFavoritesChoice)
	{
		const locationsDto = [];
		const selectedLocations = this.mapLocations(choice);
		const favoriteLocations = (favoriteChoice ? favoriteChoice.myFavoritesChoiceLocations : null) || [];

		selectedLocations.forEach(loc =>
		{
			const existingLocation = favoriteLocations.find(fl => fl.locationGroupCommunityId === loc.locationGroupCommunityId && fl.locationCommunityId === loc.locationCommunityId);
			if (existingLocation)
			{
				const locAttributesDto = this.mapExistingLocationAttributes(loc, existingLocation);
				if (locAttributesDto.length || existingLocation.quantity !== loc.quantity)
				{
					locationsDto.push({
						id: existingLocation.id,
						locationCommunityId: existingLocation.locationCommunityId,
						locationGroupCommunityId: existingLocation.locationGroupCommunityId,
						locationName: existingLocation.locationName,
						locationGroupLabel: existingLocation.locationGroupLabel,
						quantity: loc.quantity,
						attributes: locAttributesDto,
						removed: false
					});
				}
			}
			else
			{
				const locAttributesDto = [];
				if (loc.attributes)
				{
					loc.attributes.forEach(la =>
					{
						locAttributesDto.push({
							id: 0,
							attributeCommunityId: la.attributeCommunityId,
							attributeGroupCommunityId: la.attributeGroupCommunityId,
							attributeName: la.attributeName,
							attributeGroupLabel: la.attributeGroupLabel,
							removed: false
						});
					});
				}
				locationsDto.push({
					id: 0,
					locationCommunityId: loc.locationCommunityId,
					locationGroupCommunityId: loc.locationGroupCommunityId,
					locationName: loc.locationName,
					locationGroupLabel: loc.locationGroupLabel,
					quantity: loc.quantity,
					attributes: locAttributesDto,
					removed: false
				});
			}
		});

		const deletedLocations = favoriteLocations
			.filter(fl => selectedLocations
				.findIndex(sl => sl.locationGroupCommunityId === fl.locationGroupCommunityId
					&& sl.locationCommunityId === fl.locationCommunityId) === -1);

		deletedLocations.forEach(dl =>
		{
			const locAttributesDto = [];
			if (dl.myFavoritesChoiceLocationAttributes)
			{
				dl.myFavoritesChoiceLocationAttributes.forEach(la =>
				{
					locAttributesDto.push({
						id: la.id,
						attributeCommunityId: la.attributeCommunityId,
						attributeGroupCommunityId: la.attributeGroupCommunityId,
						attributeName: la.attributeName,
						attributeGroupLabel: la.attributeGroupLabel,
						removed: true
					});
				});
			}
			locationsDto.push({
				id: dl.id,
				locationCommunityId: dl.locationCommunityId,
				locationGroupCommunityId: dl.locationGroupCommunityId,
				locationName: dl.locationName,
				locationGroupLabel: dl.locationGroupLabel,
				quantity: dl.quantity,
				attributes: locAttributesDto,
				removed: true
			});
		});

		return locationsDto;
	}

	private mapExistingLocationAttributes(selectedLocation, existingLocation: MyFavoritesChoiceLocation)
	{
		const locAttributesDto = [];
		const existingLocAttributes = existingLocation.myFavoritesChoiceLocationAttributes || [];
		const newLocAttributes = selectedLocation.attributes.filter(la =>
			existingLocAttributes.findIndex(ea => ea.attributeGroupCommunityId === la.attributeGroupCommunityId
				&& ea.attributeCommunityId === la.attributeCommunityId) === -1);
		newLocAttributes.forEach(att =>
		{
			locAttributesDto.push({
				id: 0,
				attributeCommunityId: att.attributeCommunityId,
				attributeGroupCommunityId: att.attributeGroupCommunityId,
				attributeName: att.attributeName,
				attributeGroupLabel: att.attributeGroupLabel,
				removed: false
			});
		});

		const deletedLocAttriutes = existingLocAttributes.filter(ea =>
			selectedLocation.attributes.findIndex(la => la.attributeGroupCommunityId === ea.attributeGroupCommunityId
				&& la.attributeCommunityId === ea.attributeCommunityId) === -1);
		deletedLocAttriutes.forEach(att =>
		{
			locAttributesDto.push({
				id: att.id,
				attributeCommunityId: att.attributeCommunityId,
				attributeGroupCommunityId: att.attributeGroupCommunityId,
				attributeName: att.attributeName,
				attributeGroupLabel: att.attributeGroupLabel,
				removed: true
			});
		});

		return locAttributesDto;
	}

	private mapAttributes(choice: Choice)
	{
		const attributes = [];

		if (choice && choice.selectedAttributes)
		{
			choice.selectedAttributes.forEach(a =>
			{
				if (!a.locationGroupId)
				{
					const attribute = {
						attributeCommunityId: a.attributeId,
						attributeGroupCommunityId: a.attributeGroupId,
						attributeName: a.attributeName,
						attributeGroupLabel: a.attributeGroupLabel
					};
					attributes.push(attribute);
				}
			});
		}

		return attributes;
	}

	private mapLocations(choice: Choice)
	{
		const locationsDto = [];

		if (choice && choice.selectedAttributes)
		{
			choice.selectedAttributes.forEach(a =>
			{
				if (a.locationGroupId)
				{
					const locationDto = locationsDto.find(dto => dto.locationCommunityId === a.locationId);

					if (locationDto)
					{
						if (a.attributeId)
						{
							const attribute = {
								attributeCommunityId: a.attributeId,
								attributeGroupCommunityId: a.attributeGroupId,
								attributeName: a.attributeName,
								attributeGroupLabel: a.attributeGroupLabel
							};
							locationDto.attributes.push(attribute);
						}
					}
					else
					{
						const location = {
							locationCommunityId: a.locationId,
							locationGroupCommunityId: a.locationGroupId,
							locationName: a.locationName,
							locationGroupLabel: a.locationGroupLabel,
							quantity: a.locationQuantity,
							attributes: a.attributeId
								? [
									{
										attributeCommunityId: a.attributeId,
										attributeGroupCommunityId: a.attributeGroupId,
										attributeName: a.attributeName,
										attributeGroupLabel: a.attributeGroupLabel
									}
								]
								: []
						};

						locationsDto.push(location);
					}
				}
			});
		}

		return locationsDto;
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
			const result = g.subGroups.reduce((sgVal: ChoiceExt, sg) =>
			{
				const p = sg.points.find(p => p.id === pointId);

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

	public deleteMyFavorite(fav: MyFavorite): Observable<number>
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
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveMyFavoritesChoicesInPreviewAndPresale(tree: Tree, favorites: MyFavorite): Observable<MyFavoritesChoice[]>
	{ 
		const choices = [];

		const newFavoriteChoices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices.filter(ch => ch.quantity > 0)))) || [];
		const favoriteChoices = (favorites ? favorites.myFavoritesChoice : []) || [];

		newFavoriteChoices.forEach(nc =>
		{
			const existingChoice = favoriteChoices.find(fav => fav.divChoiceCatalogId === nc.divChoiceCatalogId);
			if (existingChoice)
			{
				choices.push({
					id: existingChoice.id,
					myFavoriteId: -1,
					choiceDescription: existingChoice.choiceDescription,
					dpChoiceId: existingChoice.dpChoiceId,
					dpChoiceQuantity: nc.quantity,
					decisionPointLabel: existingChoice.decisionPointLabel,
					subGroupLabel: existingChoice.subGroupLabel,
					groupLabel: existingChoice.groupLabel,
					divChoiceCatalogId: existingChoice.divChoiceCatalogId,
					myFavoritesChoiceAttributes: this.getMyFavoritesChoiceAttributesInPreviewAndPresale(nc, existingChoice),
					myFavoritesChoiceLocations: this.getMyFavoritesChoiceLocationsInPreviewAndPresale(nc, existingChoice)
				});
			}
			else
			{
				const labels = this.getChoiceLabels(nc, tree);
				choices.push({
					id: -nc.id,
					myFavoriteId: -1,
					choiceDescription: nc.description,
					dpChoiceId: nc.id,
					dpChoiceQuantity: nc.quantity,
					decisionPointLabel: labels.decisionPointLabel,
					subGroupLabel: labels.subgroupLabel,
					groupLabel: labels.groupLabel,
					divChoiceCatalogId: nc.divChoiceCatalogId,
					myFavoritesChoiceAttributes: this.getMyFavoritesChoiceAttributesInPreviewAndPresale(nc, null),
					myFavoritesChoiceLocations: this.getMyFavoritesChoiceLocationsInPreviewAndPresale(nc, null)
				});
			}
		});

		const deletedFavoriteChoices = favoriteChoices.filter(fc => newFavoriteChoices.findIndex(nc => nc.divChoiceCatalogId === fc.divChoiceCatalogId) === -1);
		deletedFavoriteChoices.forEach(dc =>
		{
			choices.push({
				id: 0,
				dpChoiceId: dc.dpChoiceId,
				divChoiceCatalogId: dc.divChoiceCatalogId
			});
		});

		return of(choices);
	}

	private getMyFavoritesChoiceAttributesInPreviewAndPresale(choice: Choice, favoriteChoice: MyFavoritesChoice)
	{
		const selectedAttributes = this.mapAttributes(choice);
		const favoriteAttributes = (favoriteChoice ? favoriteChoice.myFavoritesChoiceAttributes : null) || [];
		const attributes = _.cloneDeep(favoriteAttributes);

		const newAttributes = selectedAttributes
			.filter(a => favoriteAttributes
				.findIndex(fa => fa.attributeGroupCommunityId === a.attributeGroupCommunityId
					&& fa.attributeCommunityId === a.attributeCommunityId) === -1);

		newAttributes.forEach(nc =>
		{
			attributes.push({
				id: 0,
				attributeCommunityId: nc.attributeCommunityId,
				attributeGroupCommunityId: nc.attributeGroupCommunityId,
				attributeName: nc.attributeName,
				attributeGroupLabel: nc.attributeGroupLabel
			});
		});

		const deletedAttributes = favoriteAttributes
			.filter(fa => selectedAttributes
				.findIndex(sa => sa.attributeGroupCommunityId === fa.attributeGroupCommunityId
					&& sa.attributeCommunityId === fa.attributeCommunityId) === -1);

		deletedAttributes.forEach(da =>
		{
			const deletedIndex = attributes.findIndex(att =>
				att.attributeGroupCommunityId === da.attributeGroupCommunityId
				&& att.attributeCommunityId === da.attributeCommunityId);
			if (deletedIndex > -1)
			{
				attributes.splice(deletedIndex, 1);
			}
		});

		return attributes;
	}

	private getMyFavoritesChoiceLocationsInPreviewAndPresale(choice: Choice, favoriteChoice: MyFavoritesChoice)
	{
		const selectedLocations = this.mapLocations(choice);
		const favoriteLocations = (favoriteChoice ? favoriteChoice.myFavoritesChoiceLocations : null) || [];
		const locations = _.cloneDeep(favoriteLocations);

		selectedLocations.forEach(loc =>
		{
			const existingLocation = locations.find(fl => fl.locationGroupCommunityId === loc.locationGroupCommunityId && fl.locationCommunityId === loc.locationCommunityId);
			if (existingLocation)
			{
				existingLocation.quantity = loc.quantity;
				existingLocation.myFavoritesChoiceLocationAttributes = this.mapExistingLocationAttributesInPreviewAndPresale(loc, existingLocation);
			}
			else
			{
				const locAttributesDto = [];
				if (loc.attributes)
				{
					loc.attributes.forEach(la =>
					{
						locAttributesDto.push({
							id: 0,
							attributeCommunityId: la.attributeCommunityId,
							attributeGroupCommunityId: la.attributeGroupCommunityId,
							attributeName: la.attributeName,
							attributeGroupLabel: la.attributeGroupLabel
						});
					});
				}

				locations.push({
					id: 0,
					locationCommunityId: loc.locationCommunityId,
					locationGroupCommunityId: loc.locationGroupCommunityId,
					locationName: loc.locationName,
					locationGroupLabel: loc.locationGroupLabel,
					quantity: loc.quantity,
					myFavoritesChoiceLocationAttributes: locAttributesDto
				});
			}
		});

		const deletedLocations = favoriteLocations
			.filter(fl => selectedLocations
				.findIndex(sl => sl.locationGroupCommunityId === fl.locationGroupCommunityId
					&& sl.locationCommunityId === fl.locationCommunityId) === -1);

		deletedLocations.forEach(dl =>
		{
			const deletedIndex = locations.findIndex(loc =>
				loc.locationGroupCommunityId === dl.locationGroupCommunityId
				&& loc.locationCommunityId === dl.locationCommunityId);
			if (deletedIndex > -1)
			{
				locations.splice(deletedIndex, 1);
			}
		});

		return locations;
	}

	private mapExistingLocationAttributesInPreviewAndPresale(selectedLocation, existingLocation: MyFavoritesChoiceLocation)
	{
		const locAttributes = _.cloneDeep(existingLocation.myFavoritesChoiceLocationAttributes);

		const newLocAttributes = selectedLocation.attributes.filter(la =>
			locAttributes.findIndex(ea => ea.attributeGroupCommunityId === la.attributeGroupCommunityId
				&& ea.attributeCommunityId === la.attributeCommunityId) === -1);
		newLocAttributes.forEach(att =>
		{
			locAttributes.push({
				id: 0,
				attributeCommunityId: att.attributeCommunityId,
				attributeGroupCommunityId: att.attributeGroupCommunityId,
				attributeName: att.attributeName,
				attributeGroupLabel: att.attributeGroupLabel
			});
		});

		const deletedLocAttriutes = locAttributes.filter(ea =>
			selectedLocation.attributes.findIndex(la => la.attributeGroupCommunityId === ea.attributeGroupCommunityId
				&& la.attributeCommunityId === ea.attributeCommunityId) === -1);
		deletedLocAttriutes.forEach(att =>
		{
			const deletedIndex = locAttributes.findIndex(locAtt =>
				locAtt.attributeGroupCommunityId === att.attributeGroupCommunityId
				&& locAtt.attributeCommunityId === att.attributeCommunityId);
			if (deletedIndex > -1)
			{
				locAttributes.splice(deletedIndex, 1);
			}
		});

		return locAttributes;
	}

	public deleteMyFavoritesChoices(choices: MyFavoritesChoice[]): Observable<MyFavoritesChoice[]>
	{
		const endPoint = `${environment.apiUrl}${this._batch}`;

		let locAttributes = _.flatMap(choices, c => _.flatMap(c.myFavoritesChoiceLocations, loc => loc.myFavoritesChoiceLocationAttributes));
		locAttributes = locAttributes ? locAttributes.filter(c => !!c) : [];
		const batchLocationAttributes = createBatch<MyFavoritesChoiceAttribute>(locAttributes, 'id', 'myFavoritesChoiceLocationAttributes', null, true);

		let choiceLocations = _.flatMap(choices, c => c.myFavoritesChoiceLocations);
		choiceLocations = choiceLocations ? choiceLocations.filter(c => !!c) : [];
		const batchChoiceLocations = createBatch<MyFavoritesChoiceLocation>(choiceLocations, 'id', 'myFavoritesChoiceLocations', null, true);

		let choiceAttributes = _.flatMap(choices, c => c.myFavoritesChoiceAttributes);
		choiceAttributes = choiceAttributes ? choiceAttributes.filter(c => !!c) : [];
		const batchChoiceAttributes = createBatch<MyFavoritesChoiceAttribute>(choiceAttributes, 'id', 'myFavoritesChoiceAttributes', null, true);

		const favoritesChoices = choices?.filter(c => !!c) || [];
		const batchFavoritesChoices = createBatch<MyFavoritesChoice>(favoritesChoices, 'id', 'myFavoritesChoices', null, true);

		const batchGuid = getNewGuid();
		const batchBody = createBatchBody(batchGuid, [batchLocationAttributes, batchChoiceLocations, batchChoiceAttributes, batchFavoritesChoices]);
		const headers = new HttpHeaders(createBatchHeaders(batchGuid));

		return withSpinner(this._http).post(endPoint, batchBody, { headers }).pipe(
			map(results =>
			{
				return choices;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	public deleteMyFavoritesAttributes(attributes: DesignToolAttribute[], locations: DesignToolAttribute[], myFavoritesChoice: MyFavoritesChoice)
	{
		const endPoint = `${environment.apiUrl}${this._batch}`;

		const missingLocAttributes = [...attributes, ...locations];
		let locAttributes = _.flatMap(myFavoritesChoice?.myFavoritesChoiceLocations, loc => loc.myFavoritesChoiceLocationAttributes);
		locAttributes = locAttributes?.filter(locAtt =>
			!!missingLocAttributes.find(att => locAtt.attributeGroupCommunityId === att.attributeGroupId
				&& locAtt.attributeCommunityId === att.attributeId
				&& !!att.locationId)
		) || [];
		const batchLocationAttributes = createBatch<MyFavoritesChoiceAttribute>(locAttributes, 'id', 'myFavoritesChoiceLocationAttributes', null, true);

		const locationIds = locations.map(loc => loc.locationId);
		const locationGroupIds = locations.map(loc => loc.locationGroupId);
		const choiceLocations = myFavoritesChoice.myFavoritesChoiceLocations?.filter(loc =>
			!!locationIds.find(locId => loc.locationCommunityId === locId)
			&& !!locationGroupIds.find(locGrpId => loc.locationGroupCommunityId === locGrpId)
		) || [];
		const batchChoiceLocations = createBatch<MyFavoritesChoiceLocation>(choiceLocations, 'id', 'myFavoritesChoiceLocations', null, true);

		const choiceAttributes = myFavoritesChoice.myFavoritesChoiceAttributes?.filter(choiceAtt =>
			!!attributes.find(att => choiceAtt.attributeGroupCommunityId === att.attributeGroupId
				&& choiceAtt.attributeCommunityId === att.attributeId
				&& !att.locationId
			)) || [];
		const batchChoiceAttributes = createBatch<MyFavoritesChoiceAttribute>(choiceAttributes, 'id', 'myFavoritesChoiceAttributes', null, true);

		const batchGuid = getNewGuid();
		const batchBody = createBatchBody(batchGuid, [batchLocationAttributes, batchChoiceLocations, batchChoiceAttributes]);
		const headers = new HttpHeaders(createBatchHeaders(batchGuid));

		return withSpinner(this._http).post(endPoint, batchBody, { headers }).pipe(
			map(results =>
			{
				return myFavoritesChoice;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

}
