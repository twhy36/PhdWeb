import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { Observable, combineLatest, EMPTY as empty, of, throwError } from 'rxjs';

import
{
	withSpinner, newGuid, createBatchGet, createBatchHeaders, createBatchBody,
	IdentityService, JobChoice, ChangeOrderChoice, TreeVersionRules, OptionRule, Tree, OptionImage,
	JobPlanOption, ChangeOrderPlanOption, PlanOptionCommunityImageAssoc, ChoiceImageAssoc, TreeBaseHouseOption, Choice,
	MyFavoritesChoice, MyFavoritesPointDeclined, getDateWithUtcOffset
} from 'phd-common';

import { environment } from '../../../../environments/environment';
import { isChangeOrderChoice } from '../../shared/classes/tree.utils';

import * as _ from 'lodash';

@Injectable()
export class TreeService
{
	private _ds: string = encodeURIComponent('$');

	constructor(private http: HttpClient, private identityService: IdentityService) { }

	/**
	 * gets active tree versions for communities
	 * @param communityIds
	 */
	public getTreeVersions(planKey: number, communityId: number): Observable<any>
	{
		const communityFilter = ` and (dTree/plan/org/edhFinancialCommunityId eq ${communityId}) and (dTree/plan/integrationKey eq '${planKey}')`;

		const utcNow = getDateWithUtcOffset();

		const entity = 'dTreeVersions';
		const expand = `dTree($select=dTreeID;$expand=plan($select=integrationKey),org($select = edhFinancialCommunityId)),baseHouseOptions($select=planOption;$expand=planOption($select=integrationKey))`;
		const filter = `publishStartDate le ${utcNow} and (publishEndDate eq null or publishEndDate gt ${utcNow})${communityFilter}`;
		const select = `dTreeVersionID,dTreeID,dTreeVersionName,dTreeVersionDescription,publishStartDate,publishEndDate,lastModifiedDate`;
		const orderBy = `publishStartDate`;

		const endPoint = environment.apiUrl + `${entity}?${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}&${encodeURIComponent("$")}orderby=${orderBy}`;

		return withSpinner(this.http).get<any>(endPoint).pipe(
			map(response =>
			{
				return response.value.map(data =>
				{
					return {
						// DEVNOTE: will change late bound to object if these mappings are repeated.
						id: data['dTreeVersionID'],
						name: data['dTreeVersionName'],
						communityId: data['dTree']['org']['edhFinancialCommunityId'],
						planKey: data['dTree']['plan']['integrationKey'],
						description: data['dTreeVersionDescription'],
						treeId: data['dTreeID'],
						publishStartDate: data['publishStartDate'],
						publishEndDate: data['publishEndDate'],
						lastModifiedDate: data['lastModifiedDate'],
						includedOptions: data['baseHouseOptions'].map(o => o['planOption']['integrationKey'])
					};
				});
			}),
			catchError(error =>
			{
				console.error(error);

				return throwError(error);
			})
		);
	}

	getTree(treeVersionId: number, skipSpinner?: boolean): Observable<Tree>
	{
		const entity = `GetTreeDto(TreeVersionID=${treeVersionId})`;
		const expand = `treeVersion($expand=groups($expand=subGroups($expand=points($expand=choices))))`;

		const endPoint = environment.apiUrl + `${entity}?useCache=true&${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}`;

		return (skipSpinner ? this.http : withSpinner(this.http)).get<Tree>(endPoint).pipe(
			tap(response => response['@odata.context'] = undefined),
			switchMap(response => combineLatest([
				this.getDivDPointCatalogs(response),
				this.getDivChoiceCatalogs(response)
			])),
			map((response: [Tree, Tree]) =>
			{
				const modPoints = _.flatMap(response[0].treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
				let finalPoints = _.flatMap(response[1].treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

				modPoints.map(x =>
				{
					let point = finalPoints.find(p => p.divPointCatalogId === x.divPointCatalogId);
					if (point)
					{
						point.cutOffDays = x.cutOffDays;
						point.isHiddenFromBuyerView = x.isHiddenFromBuyerView;
					}
				});
				return new Tree(response[1]);
			}),
			catchError(error =>
			{
				console.error(error);

				return empty;
			})
		);
	}

	getTreeBaseHouseOptions(treeVersionId: number): Observable<TreeBaseHouseOption[]>
	{
		const entity = `baseHouseOptions`;
		const expand = `planOption($select=integrationKey)`;
		const select = `planOption`;
		const filter = `dTreeVersionID eq ${treeVersionId}`;

		const endPoint = environment.apiUrl + `${entity}?${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;

		return withSpinner(this.http).get<any>(endPoint).pipe(
			map(response =>
			{
				return response.value as TreeBaseHouseOption[];
			}),
			catchError(error =>
			{
				console.error(error);

				return throwError(error);
			})
		);
	}

	getDivDPointCatalogs(tree: Tree): Observable<Tree>
	{
		const entity = `divDPointCatalogs`;
		let points = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

		const pointCatalogIds = points.map(x => x.divPointCatalogId);
		const filter = `divDpointCatalogID in (${pointCatalogIds})`;

		const select = `divDpointCatalogID,cutOffDays,edhConstructionStageId,isHiddenFromBuyerView`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		const endPoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return this.http.get<Tree>(endPoint).pipe(
			map(response =>
			{
				if (response)
				{
					response['value'].map(x =>
					{
						let point = points.find(p => p.divPointCatalogId === x.divDpointCatalogID);
						if (point)
						{
							point.cutOffDays = x.cutOffDays;
							point.edhConstructionStageId = x.edhConstructionStageId;
							point.isHiddenFromBuyerView = x.isHiddenFromBuyerView;
						}
					});
				}
				return tree;
			}),
			catchError(error =>
			{
				console.error(error);

				return empty;
			})
		);
	}

	getDivChoiceCatalogs(tree: Tree): Observable<Tree>
	{
		let choices = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				const batchSize = 75;
				let batchBundles: string[] = [];

				// create a batch request with a max of 75 choices per request
				let buildRequestUrl = (choices: Choice[]) =>
				{
					const entity = `divChoiceCatalogs`;
					const select = `divChoiceCatalogID,isHiddenFromBuyerView,priceHiddenFromBuyerView`;

					const choiceCatalogIds = choices.map(x => x.divChoiceCatalogId);
					const filter = `divChoiceCatalogID in (${choiceCatalogIds})`;
					const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
					const endPoint = `${environment.apiUrl}${entity}?${qryStr}`;

					return endPoint;
				};

				for (var x = 0; x < choices.length; x = x + batchSize)
				{
					let choiceList = choices.slice(x, x + batchSize);

					batchBundles.push(buildRequestUrl(choiceList));
				}

				let requests = batchBundles.map(req => createBatchGet(req));
				let guid = newGuid();

				var headers = createBatchHeaders(guid, token);
				var batch = createBatchBody(guid, requests);

				return withSpinner(this.http).post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				if (response)
				{
					response['responses'].forEach(response =>
					{
						response['body']['value'].map(x =>
						{
							let choice = choices.find(p => p.divChoiceCatalogId === x.divChoiceCatalogID);
							if (choice)
							{
								choice.isHiddenFromBuyerView = x.isHiddenFromBuyerView;
								choice.priceHiddenFromBuyerView = x.priceHiddenFromBuyerView;
							}
						});
					})
				}
				return tree;
			})
		)
	}

	getRules(treeVersionId: number, skipSpinner?: boolean): Observable<TreeVersionRules>
	{
		const entity = 'GetTreeVersionRulesDto';
		const parameter = `(TreeVersionID=${treeVersionId})`;
		const endPoint = environment.apiUrl + `${entity}${parameter}`;

		return (skipSpinner ? this.http : withSpinner(this.http)).get(endPoint).pipe(
			tap(response => response['@odata.context'] = undefined),
			map(response => response as TreeVersionRules),
			catchError(error =>
			{
				console.error(error);

				return empty;
			})
		);
	}

	getOptionImages(treeVersionId: number, optionIds: string[] = [], top?: number, skipSpinner?: boolean): Observable<OptionImage[]>
	{
		let url = environment.apiUrl;

		let filters = [`dTreeVersionID eq ${treeVersionId} and hideImage eq false`];

		const optionFilter = optionIds.map(x => `planOption/integrationKey eq '${x}'`).join(' or ');

		if (optionFilter.length)
		{
			filters.push(`(${optionFilter})`);
		}

		const expand = `planOption($select=planOptionID, integrationKey)`;
		const select = `planOptionID, imageURL, sortKey, dTreeVersionId`;
		const orderby = `planOptionID, sortKey`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filters.join(' and '))}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		url += `optionImages?${qryStr}`;

		if (top)
		{
			url += `&${this._ds}top=${top}`;
		}

		return (skipSpinner ? this.http : withSpinner(this.http)).get(url).pipe(
			map(response =>
			{
				let dtos = response['value'];

				let images = dtos.map(x =>
				{
					return {
						integrationKey: x.planOption.integrationKey,
						imageURL: x.imageURL,
						sortKey: x.sortKey
					} as OptionImage;
				});

				return images;
			}),
			catchError(error =>
			{
				console.error(error);

				return of([]);
			})
		);
	}

	getPointCatalogIds(pointsDeclined: MyFavoritesPointDeclined[]): Observable<MyFavoritesPointDeclined[]>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				const pointIds: Array<number> = pointsDeclined.map(x => x.dPointId);
				const filter = `dPointID in (${pointIds})`;
				const select = 'dPointID,divDPointCatalogID';
				const url = `${environment.apiUrl}dPoints?${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

				return withSpinner(this.http).get<any>(url);
			}),
			map((response: any) =>
			{
				let newPointsDeclined: MyFavoritesPointDeclined[] = [];
				pointsDeclined.forEach(p =>
				{
					const respPoint = response.value.find(r => r.dPointID === p.dPointId);
					if (respPoint)
					{
						newPointsDeclined.push({ ...p, divPointCatalogId: respPoint.divDPointCatalogID });
					}
				});
				return newPointsDeclined;
			})
		)
	}

	getChoiceCatalogIds(choices: Array<JobChoice | ChangeOrderChoice | MyFavoritesChoice>): Observable<Array<JobChoice | ChangeOrderChoice>>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				const choiceIds: Array<number> = choices.map(x => isChangeOrderChoice(x) ? x.decisionPointChoiceID : x.dpChoiceId);
				const filter = `dpChoiceID in (${choiceIds})`;
				const select = 'dpChoiceID,divChoiceCatalogID';
				const url = `${environment.apiUrl}dPChoices?${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

				return withSpinner(this.http).get<any>(url);
			}),
			map((response: any) =>
			{
				const newChoices = [...choices];
				const changedChoices = [];
				const updatedChoices = [];

				if (newChoices.length > 0)
				{
					newChoices.forEach(c =>
					{
						const choiceId = isChangeOrderChoice(c) ? c.decisionPointChoiceID : c.dpChoiceId;
						const respChoice = response.value.find(r => r.dpChoiceID === choiceId);

						if (respChoice)
						{
							changedChoices.push({ ...c, divChoiceCatalogId: respChoice.divChoiceCatalogID });
						}
						else
						{
							changedChoices.push({ ...c });
						}
					});

					changedChoices.forEach(cc =>
					{
						if (isChangeOrderChoice(cc))
						{
							updatedChoices.push(new ChangeOrderChoice(cc));
						}
						else
						{
							updatedChoices.push(new JobChoice(cc));
						}
					});
				}
				return updatedChoices;
			})
		);
	}

	getChoiceDetails(choices: Array<number>): Observable<Array<any>>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				let guid = newGuid();
				let requests = choices.map(choice => createBatchGet(`${environment.apiUrl}GetChoiceDetails(DPChoiceID=${choice})`));
				let headers = createBatchHeaders(guid, token);
				let batch = createBatchBody(guid, requests);

				return withSpinner(this.http).post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				return response.responses.map(r => r.body);
			})
		);
	}

	getPlanOptionCommunityImageAssoc(options: Array<JobPlanOption | ChangeOrderPlanOption>): Observable<Array<PlanOptionCommunityImageAssoc>>
	{
		if (options.length)
		{
			return this.identityService.token.pipe(
				switchMap((token: string) =>
				{
					let guid = newGuid();

					let buildRequestUrl = (options: Array<JobPlanOption | ChangeOrderPlanOption>) =>
					{
						let optFilter = (opt: JobPlanOption | ChangeOrderPlanOption) => `planOptionCommunityId eq ${opt.planOptionId} and startDate le ${opt.outForSignatureDate} and (endDate eq null or endDate gt ${opt.outForSignatureDate})`;
						let filter = `${options.map(opt => optFilter(opt)).join(' or ')}`;
						let select = `planOptionCommunityId, imageUrl, startDate, endDate, sortOrder`;
						let orderBy = `sortOrder`;

						return `${environment.apiUrl}planOptionCommunityImageAssocs?${encodeURIComponent('$')}select=${select}&${encodeURIComponent('$')}filter=${filter}&${encodeURIComponent('$')}orderby=${orderBy}&${this._ds}count=true`;
					};

					const batchSize = 35;
					let batchBundles: string[] = [];

					// create a batch request with a max of 100 options per request
					for (var x = 0; x < options.length; x = x + batchSize)
					{
						let optionList = options.slice(x, x + batchSize);

						batchBundles.push(buildRequestUrl(optionList));
					}

					let requests = batchBundles.map(req => createBatchGet(req));

					var headers = createBatchHeaders(guid, token);
					var batch = createBatchBody(guid, requests);

					return withSpinner(this.http).post(`${environment.apiUrl}$batch`, batch, { headers: headers });
				}),
				map((response: any) =>
				{
					let bodies: any[] = response.responses.map(r => r.body);

					return bodies.map(body =>
					{
						// pick draft(publishStartDate is null) or latest publishStartDate(last element)
						let value = body.value.length > 0 ? body.value[0] : null;

						return value ? value as PlanOptionCommunityImageAssoc : null;
					}).filter(res => res);
				})
			);
		}
		return of(null);
	}

	getHistoricOptionMapping(options: Array<{ optionNumber: string; dpChoiceId: number }>): Observable<{ [optionNumber: string]: OptionRule }>
	{
		if (!options || !options.length)
		{
			return of({});
		}

		const sortChoices = function (a, b)
		{
			if (a.dpChoice.dPoint.dSubGroup.dGroup.dGroupSortOrder > b.dpChoice.dPoint.dSubGroup.dGroup.dGroupSortOrder)
			{
				return 1;
			}
			else if (b.dpChoice.dPoint.dSubGroup.dGroup.dGroupSortOrder > a.dpChoice.dPoint.dSubGroup.dGroup.dGroupSortOrder)
			{
				return -1;
			}
			else if (a.dpChoice.dPoint.dSubGroup.dSubGroupSortOrder > b.dpChoice.dPoint.dSubGroup.dSubGroupSortOrder)
			{
				return 1;
			}
			else if (b.dpChoice.dPoint.dSubGroup.dSubGroupSortOrder > a.dpChoice.dPoint.dSubGroup.dSubGroupSortOrder)
			{
				return -1;
			}
			else if (a.dpChoice.dPoint.dPointSortOrder > b.dpChoice.dPoint.dPointSortOrder)
			{
				return 1;
			}
			else if (b.dpChoice.dPoint.dPointSortOrder > a.dpChoice.dPoint.dPointSortOrder)
			{
				return -1;
			}
			else
			{
				return a.dpChoice.dpChoiceSortOrder - b.dpChoice.dpChoiceSortOrder;
			}
		}

		let buildRequestUrl = (options: Array<{ optionNumber: string; dpChoiceId: number }>) =>
		{
			let optFilter = (opt: { optionNumber: string; dpChoiceId: number }) => `(dpChoice_OptionRuleAssoc/any(or: or/dpChoiceId eq ${opt.dpChoiceId}) and planOption/integrationKey eq '${opt.optionNumber}')`;
			let filter = `${options.map(opt => optFilter(opt)).join(' or ')}`;
			let expand = `dpChoice_OptionRuleAssoc($select=dpChoiceId,mustHave;$expand=attributeReassignments($select=attributeReassignmentID, todpChoiceID, attributeGroupID),dpChoice($select=divChoiceCatalogId,dpChoiceSortOrder;$expand=dPoint($select=dPointSortOrder;$expand=dSubGroup($select=dSubGroupSortOrder;$expand=dGroup($select=dGroupSortOrder))))),planOption,optionRuleReplaces($expand=planOption($select=integrationKey))`;

			return `${environment.apiUrl}optionRules?${encodeURIComponent('$')}expand=${expand}&${encodeURIComponent('$')}filter=${filter}`;
		}
		

		const batchSize = 1;
		let batchBundles: string[] = [];

		const chunk = 100;
		const splitArrayresult = options.reduce((resultArray, item, index) =>
		{
			const chunkIndex = Math.floor(index / chunk);
			if (!resultArray[chunkIndex])
			{
				resultArray[chunkIndex] = []
			}
			resultArray[chunkIndex].push(item)
			return resultArray
		}, []);

		for (let item of splitArrayresult)
		{
			// create a batch request with a max of 100 options per request
			for (var x = 0; x < item.length; x = x + batchSize)
			{
				let optionList = item.slice(x, x + batchSize);

				batchBundles.push(buildRequestUrl(optionList));
			}

			return this.identityService.token.pipe(
				switchMap((token: string) =>
				{
					let requests = batchBundles.map(req => createBatchGet(req));

					let guid = newGuid();
					let headers = createBatchHeaders(guid, token);
					let batch = createBatchBody(guid, requests);

					return withSpinner(this.http).post(`${environment.apiUrl}$batch`, batch, { headers: headers });
				}),
				map((response: any) =>
				{
					let bodyValue: any[] = response.responses.filter(r => r.body?.value?.length > 0).map(r => r.body.value);
					let optionRules = _.flatten(bodyValue);

					let mappings: { [optionNumber: string]: OptionRule } = {};

					options.forEach(opt =>
					{
						let res = optionRules.find(or => or.planOption.integrationKey === opt.optionNumber && or.dpChoice_OptionRuleAssoc.some(r => r.dpChoiceID === opt.dpChoiceId));

						mappings[opt.optionNumber] = !!res ? <OptionRule>
							{
								optionId: opt.optionNumber, choices: res.dpChoice_OptionRuleAssoc.sort(sortChoices).map(c =>
								{
									return {
										id: c.dpChoice.divChoiceCatalogID,
										mustHave: c.mustHave,
										attributeReassignments: c.attributeReassignments.map(ar =>
										{
											return {
												id: ar.attributeReassignmentID,
												choiceId: ar.todpChoiceID,
												attributeGroupId: ar.attributeGroupID
											};
										})
									};
								}), ruleId: res.optionRuleID, replaceOptions: res.optionRuleReplaces.map(orr => orr.planOption.integrationKey)
							} : null;
					});

					return mappings;
				})
			);
		}
	}

	getChoiceImageAssoc(choices: Array<number>): Observable<Array<ChoiceImageAssoc>>
	{
		let url = environment.apiUrl;
		const filter = `dpChoiceId in (${choices.join(',')})`;
		const select = 'dpChoiceId, imageUrl, sortKey';

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${select}`;

		url += `dPChoiceImageAssocs?${qryStr}`;

		return withSpinner(this.http).get(url).pipe(
			map(response =>
			{
				let choiceImageAssoc = response['value'] as Array<ChoiceImageAssoc>;

				return choiceImageAssoc;
			})
		);
	}

}
