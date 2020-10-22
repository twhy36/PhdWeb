import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import * as _ from 'lodash';

import { environment } from '../../../../environments/environment';

import { Scenario, DtoScenario, DtoScenarioChoice, DtoScenarioChoiceAttribute, DtoScenarioChoiceLocation, SelectedChoice, DtoScenarioInfo } from '../../shared/models/scenario.model';
import { Tree, Choice, FloorPlanImage } from '../../shared/models/tree.model.new';
import { JobChoice } from '../../shared/models/job.model';
import { withSpinner } from 'phd-common/extensions/withSpinner.extension';

@Injectable()
export class ScenarioService
{
	private _ds: string = encodeURIComponent("$");

	constructor(private _http: HttpClient) { }

	isScenarioNameUsed(scenarioName: string, opportunityId: string): Observable<boolean>
	{
		scenarioName = scenarioName.replace(/'/g, "''");

		const entity = `scenarios`;
		const expand = `opportunityContactAssoc($expand=opportunity($select=dynamicsOpportunityId,id))`;
		const filter = `opportunityContactAssoc/opportunity/dynamicsOpportunityId eq ${opportunityId} and tolower(name) eq tolower('${scenarioName}')`;
		const select = `id,name`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}top=1`;

		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<any>(url).pipe(
			map(response =>
			{
				const count = response.value.length as number;

				return count > 0;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	/**
	 * Gets Scenario with selected choices and viewed decision points
	 * @param scenarioId
	 */
	getScenario(scenarioId: number): Observable<Scenario>
	{
		const entity = `scenarios(${scenarioId})`;
		const endpoint = environment.apiUrl + entity;
		return withSpinner(this._http).get<DtoScenario>(endpoint).pipe(
			map((scenarioDto: DtoScenario) =>
			{
				return new Scenario(scenarioDto);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}


	//savePlan(treeVersionId: number): Observable<Scenario> {
	//	if (!Number.isInteger(treeVersionId)) {
	//		return empty<Scenario>();
	//	}

	//	console.log('saving a plan');

	//	return this.save(treeVersionId)
	//		.pipe(
	//		map(scenario => {
	//			if (!scenario) {
	//				throw new Error(`response error when saving a plan with treeVersionId: ${treeVersionId}`);
	//			}
	//			this.setScenarioId(scenario.scenarioId);
	//			console.log('plan save complete...', scenario);
	//			return scenario;
	//		})
	//		);
	//}

	saveScenario(scenario: Scenario, tree?: Tree, jobChoices?: JobChoice[]): Observable<Scenario>
	{
		let newScenario = _.cloneDeep(scenario);
		const entity = 'SaveScenario';
		const endpoint = environment.apiUrl + entity;
		const scenarioInfo = newScenario.scenarioInfo;

		if (newScenario.lotId != null && scenarioInfo)
		{
			scenarioInfo.homesiteEstimate = 0;
		}

		const scenarioDto: DtoScenario = {
			id: newScenario.scenarioId ? newScenario.scenarioId : 0,
			name: newScenario.scenarioName,
			treeVersionId: newScenario.treeVersionId ? newScenario.treeVersionId : null,
			planId: newScenario.planId ? newScenario.planId : null,
			lotId: newScenario.lotId ? newScenario.lotId : null,
			handing: newScenario.handing ? newScenario.handing : null,
			lotPremiumOverride: 0,
			isLotPremiumOverride: false,
			opportunityId: newScenario.opportunityId,
			scenarioInfo: {
				homesiteEstimate: scenarioInfo ? scenarioInfo.homesiteEstimate : 0,
				closingIncentive: scenarioInfo ? scenarioInfo.closingIncentive : 0,
				designEstimate: scenarioInfo ? scenarioInfo.designEstimate : 0,
				discount: scenarioInfo ? scenarioInfo.discount : 0
			} as DtoScenarioInfo,
            choices: newScenario.scenarioChoices ? newScenario.scenarioChoices
				.map<DtoScenarioChoice>(choice =>
				{
					return {
						scenarioChoiceId: choice.scenarioChoiceId,
						scenarioId: newScenario.scenarioId ? newScenario.scenarioId : 0,
						dpChoiceID: choice.choiceId,
						dpChoiceQuantity: choice.choiceQuantity,
						divChoiceCatalogID: choice.choice.choiceCatalogId,
						attributes: this.mapAttributes(choice),
						locations: this.mapLocations(choice)
					};
                }) : [],
			viewedDivDPointCatalogIds: newScenario.viewedDecisionPoints
		};

		if (tree)
		{
			const choices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));

			let toRemove = scenarioDto.choices.filter(ch =>
			{
				let choice = choices.find(c => c.id === ch.dpChoiceID);

				//for spec sales, include the scenario choice iff the job choice quantity doesn't match
				let jobChoice = jobChoices.find(jc => jc.divChoiceCatalogId === choice.divChoiceCatalogId);

				return !choice || !choice.enabled || (!jobChoice && !choice.quantity) || (jobChoice && choice.quantity === jobChoice.dpChoiceQuantity);
			});

			toRemove.forEach(ch => scenarioDto.choices.splice(scenarioDto.choices.findIndex(c => c.dpChoiceID === ch.dpChoiceID), 1));

			choices.forEach(ch =>
			{
				let jobChoice = jobChoices.find(jc => jc.divChoiceCatalogId === ch.divChoiceCatalogId);

				if ((!jobChoice && ch.quantity > 0) || (jobChoice && ch.quantity !== jobChoice.dpChoiceQuantity))
				{
					const existingScenarioChoice = scenarioDto.choices.find(c => c.dpChoiceID === ch.id);

					if (!existingScenarioChoice)
					{
						scenarioDto.choices.push({
							divChoiceCatalogID: ch.divChoiceCatalogId,
							dpChoiceID: ch.id,
							dpChoiceQuantity: ch.quantity,
							scenarioId: newScenario.scenarioId || 0,
							scenarioChoiceId: 0,
							attributes: this.mapAttributes(ch),
							locations: this.mapLocations(ch)
						});
					}
					else
					{
						existingScenarioChoice.dpChoiceQuantity = ch.quantity;
						existingScenarioChoice.attributes = this.mapAttributes(ch);
						existingScenarioChoice.locations = this.mapLocations(ch);
					}
				}
			});

			//add any newly viewed decision points to list
			newScenario.viewedDecisionPoints = _.union(
				newScenario.viewedDecisionPoints,
				_.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points))
					.filter(p => p.viewed)
					.map(p => p.divPointCatalogId)
			);
		}

		return (newScenario.scenarioId && newScenario.scenarioId > 0 ? this._http : withSpinner(this._http)).post(endpoint, { scenario: scenarioDto }, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map((scenarioDto: DtoScenario) =>
			{
				let newScenario = new Scenario(scenarioDto);

				newScenario.scenarioInfo = scenarioInfo;

				return newScenario;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveScenarioView(scenarioId: number, divDPointCatalogId: number)
	{
		const action = `SaveScenarioView`;
		const endpoint = environment.apiUrl + action;
		const data = {
			scenarioId: scenarioId,
			divDPointCatalogIds: [divDPointCatalogId]
		};

		return this._http.post<DtoScenario>(endpoint, data).pipe(
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveScenarioInfo(scenarioId: number, scenarioInfo: DtoScenarioInfo): Observable<DtoScenarioInfo>
	{
		const action = `SavePriceBreakdown`;
		const endpoint = environment.apiUrl + action;
		const data = {
			scenarioId: scenarioId,
			scenarioInfo: scenarioInfo
		};

		return this._http.post<DtoScenarioInfo>(endpoint, data).pipe(
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	saveFloorPlanImages(scenarioId: number, floors: { index: number, name: string }[], images: any[])
	{
		var floorPlanImages = floors.map((val, i) =>
		{
			return { floorName: val.name, floorIndex: val.index, svg: images[i].outerHTML };
		});

		this._http.put(`${environment.apiUrl}scenarios(${scenarioId})/scenarioFloorPlanAttachments`, floorPlanImages)
			.subscribe();
	}

	getFloorPlanImages(scenarioId: number): Observable<FloorPlanImage[]>
	{
		return this._http.get<any>(`${environment.apiUrl}scenarios(${scenarioId})/scenarioFloorPlanAttachments`).pipe(
			map(response =>
			{
				let images = response['value'].map(r =>
				{
					return new FloorPlanImage(r);
				});

				return images;
			})
		);
	}

	private mapLocations(choice: SelectedChoice | Choice): Array<DtoScenarioChoiceLocation>
	{
		const locationsDto: Array<DtoScenarioChoiceLocation> = [];

		choice.selectedAttributes && choice.selectedAttributes.forEach(a =>
		{
			if (a.locationGroupId)
			{
				const locationDto = locationsDto.find(dto => dto.locationCommunityId === a.locationId);

				if (locationDto)
				{
					if (a.attributeId)
					{
						locationDto.attributes.push({
							scenarioChoiceLocationAttributeId: a.scenarioChoiceLocationAttributeId ? a.scenarioChoiceLocationAttributeId : 0,
							scenarioChoiceLocationId: a.scenarioChoiceLocationId ? a.scenarioChoiceLocationId : 0,
							attributeCommunityId: a.attributeId,
							attributeGroupCommunityId: a.attributeGroupId,
							attributeGroupName: a.attributeGroupName,
							attributeGroupLabel: a.attributeGroupLabel,
							attributeName: a.attributeName,
							attributeImageUrl: a.attributeImageUrl,
							sku: a.sku,
							manufacturer: a.manufacturer
						});
					}
				}
				else
				{
					locationsDto.push({
						scenarioChoiceLocationId: a.scenarioChoiceLocationId ? a.scenarioChoiceLocationId : 0,
						scenarioChoiceId: choice['choiceId'] ? (choice as SelectedChoice).choiceId : (choice as Choice).id,
						locationCommunityId: a.locationId,
						locationGroupCommunityId: a.locationGroupId,
						quantity: a.locationQuantity,
						attributes: a.attributeId ? [{
							scenarioChoiceLocationAttributeId: a.scenarioChoiceLocationAttributeId ? a.scenarioChoiceLocationAttributeId : 0,
							scenarioChoiceLocationId: a.scenarioChoiceLocationId ? a.scenarioChoiceLocationId : 0,
							attributeGroupCommunityId: a.attributeGroupId,
							attributeCommunityId: a.attributeId,
							attributeGroupName: a.attributeGroupName,
							attributeGroupLabel: a.attributeGroupLabel,
							attributeName: a.attributeName,
							attributeImageUrl: a.attributeImageUrl,
							sku: a.sku,
							manufacturer: a.manufacturer
						}] : [],
						locationGroupName: a.locationGroupName,
						locationGroupLabel: a.locationGroupLabel,
						locationName: a.locationName
					});
				}
			}
		});

		return locationsDto;
	}

	private mapAttributes(choice: SelectedChoice | Choice): Array<DtoScenarioChoiceAttribute>
	{
		const attributesDto: Array<DtoScenarioChoiceAttribute> = [];

		choice.selectedAttributes && choice.selectedAttributes.forEach(a =>
		{
			if (!a.locationGroupId)
			{
				attributesDto.push({
					attributeCommunityId: a.attributeId,
					attributeGroupCommunityId: a.attributeGroupId,
					scenarioChoiceAttributeId: a.scenarioChoiceLocationAttributeId ? a.scenarioChoiceLocationAttributeId : 0,
					scenarioChoiceId: choice['choiceId'] ? (choice as SelectedChoice).choiceId : (choice as Choice).id,
					attributeGroupName: a.attributeGroupName,
					attributeGroupLabel: a.attributeGroupLabel,
					attributeName: a.attributeName,
					attributeImageUrl: a.attributeImageUrl,
					sku: a.sku,
					manufacturer: a.manufacturer
				});
			}
		});

		return attributesDto;
	}
}
