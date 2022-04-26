import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { EMPTY as empty, Observable, of, throwError } from 'rxjs';

import
	{
		newGuid, createBatchGet, createBatchHeaders, createBatchBody, withSpinner, ChangeOrderChoice, ChangeOrderPlanOption,
		JobChoice, JobPlanOption, TreeVersionRules, OptionRule, Tree, ChoiceImageAssoc, PlanOptionCommunityImageAssoc,
		TreeBaseHouseOption, OptionImage, IdentityService, MyFavoritesChoice, getDateWithUtcOffset, ChoiceRules, LotChoiceRule, PointRule, PointRules, LotChoiceRules, OptionMapping, OptionRuleChoice, OptionRuleAttributeReassignment
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
	public getTreeVersions(communityIds: Array<number>): Observable<any>
	{
		const communityFilterArray = communityIds.map(id => `dTree/plan/org/edhFinancialCommunityId eq ${id}`);
		const communityFilter = communityFilterArray && communityFilterArray.length
			? ` and (${communityFilterArray.join(" or ")})`
			: '';

		const utcNow = getDateWithUtcOffset();

		const entity = 'dTreeVersions';
		const expand = `dTree($select=dTreeID;$expand=plan($select=integrationKey),org($select = edhFinancialCommunityId)),baseHouseOptions($select=planOption;$expand=planOption($select=integrationKey))`;
		const filter = `publishStartDate le ${utcNow} and (publishEndDate eq null or publishEndDate gt ${utcNow})${communityFilter}`;
		const select = `dTreeVersionID,dTreeID,dTreeVersionName,dTreeVersionDescription,publishStartDate,publishEndDate,lastModifiedDate`;
		const orderBy = `publishStartDate`;

		const endPoint = environment.apiUrl + `${entity}?${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}&${encodeURIComponent("$")}orderby=${orderBy}`;

		return this.http.get<any>(endPoint).pipe(
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
			switchMap(response => this.getDivDPointCatalogs(response, skipSpinner)),
			map((response: Tree) => new Tree(response)),
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

		return this.http.get<any>(endPoint).pipe(
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

	getRules(treeVersionId: number, skipSpinner?: boolean): Observable<TreeVersionRules>
	{
		const entity = 'GetTreeVersionRulesDto';
		const parameter = `(TreeVersionID=${treeVersionId})`;
		const endPoint = environment.apiUrl + `${entity}${parameter}`;

		return (skipSpinner ? this.http : withSpinner(this.http)).get(endPoint).pipe(
			tap(response => response['@odata.context'] = undefined),
			map(response =>
			{
				let rules = {
					choiceRules: response['choiceRules'] as ChoiceRules[],
					lotChoiceRules: response['lotChoiceRules'] as LotChoiceRules[],
					optionRules: [],
					pointRules: response['pointRules'] as PointRules[]
				} as TreeVersionRules;

				let optionRulesDto = response['optionRules'];
				let optionRules: OptionRule[] = [];

				if (optionRulesDto !== null)
				{
					optionRules = optionRulesDto.map(optionRuleDto =>
					{
						// group by mappingIndex to handle multiple option mappings
						const groupedOptionChoices = _.groupBy(optionRuleDto.choices, c => c.mappingIndex);
						const optionChoices = _.map(groupedOptionChoices, (choices) => choices);
						let optionMappings: OptionMapping[] = optionChoices.map(oc =>
						{
							return {
								mappingIndex: oc[0].mappingIndex,
								choices: oc
							} as OptionMapping;
						})

						return {
							optionId: optionRuleDto.optionId,
							ruleId: optionRuleDto.ruleId,
							optionMappings: optionMappings,
							replaceOptions: optionRuleDto.replaceOptions
						} as OptionRule;
					});
				}

				rules.optionRules = optionRules;

				return rules;
			}),
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
				let dtos = response ? response['value'] : [];

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

	getChoiceCatalogIds(choices: Array<JobChoice | ChangeOrderChoice | MyFavoritesChoice>): Observable<Array<JobChoice | ChangeOrderChoice>>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				const choiceIds: Array<number> = choices.map(x => isChangeOrderChoice(x) ? x.decisionPointChoiceID : x.dpChoiceId);

				if (choiceIds.length > 0)
				{
					const filter = `dpChoiceID in (${choiceIds})`;
					const select = 'dpChoiceID,divChoiceCatalogID';
					const url = `${environment.apiUrl}dPChoices?${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

					return this.http.get<any>(url);
				}
				else
				{
					return of(null);
				}
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

				return this.http.post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				return response.responses.map(r => r.body);
			})
		);
	}

	getChoiceImageAssoc(choices: Array<number>): Observable<Array<ChoiceImageAssoc>>
	{
		let url = environment.apiUrl;
		const filter = `dpChoiceId in (${choices.join(',')})`;
		const orderby = `sortKey`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderBy=${orderby}&${this._ds}select=dpChoiceImageAssocId, dpChoiceId, imageUrl, sortKey`;

		url += `dPChoiceImageAssocs?${qryStr}`;

		return this.http.get(url).pipe(
			map(response =>
			{
				let choiceImageAssoc = response['value'] as Array<ChoiceImageAssoc>;

				return choiceImageAssoc;
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
						let optFilter = (opt: JobPlanOption | ChangeOrderPlanOption) => 
						{
							let filter = `planOptionCommunityId eq ${opt.planOptionId}`;

							if (opt.outForSignatureDate)
							{
								filter += ` and startDate le ${opt.outForSignatureDate} and (endDate eq null or endDate gt ${opt.outForSignatureDate})`;
							}
							else
							{
								filter += ` and endDate eq null`;
							}

							return filter;
						}

						let filter = `${options.map(opt => optFilter(opt)).join(' or ')}`;
						let select = `planOptionCommunityId, imageUrl, startDate, endDate, sortOrder`;
						let orderBy = `sortOrder`;

						return `${environment.apiUrl}planOptionCommunityImageAssocs?${encodeURIComponent('$')}select=${select}&${encodeURIComponent('$')}filter=${filter}&${encodeURIComponent('$')}orderby=${orderBy}&${this._ds}count=true`;
					}

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

					return this.http.post(`${environment.apiUrl}$batch`, batch, { headers: headers });
				}),
				map((response: any) =>
				{
					let bodies: any[] = response.responses.map(r => r.body);

					return _.flatten(bodies.map(body =>
					{
						return body.value?.length > 0 ? body.value : null;
					}).filter(res => res));
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
			let expand = `dpChoice_OptionRuleAssoc($select=dpChoiceId,mustHave,mappingIndex;$expand=attributeReassignments($select=attributeReassignmentID, todpChoiceID, attributeGroupID;$expand=todpChoice($select=dpChoiceID,divChoiceCatalogID)),dpChoice($select=divChoiceCatalogId,dpChoiceSortOrder;$expand=dPoint($select=dPointSortOrder;$expand=dSubGroup($select=dSubGroupSortOrder;$expand=dGroup($select=dGroupSortOrder))))),planOption,optionRuleReplaces($expand=planOption($select=integrationKey))`;

			return `${environment.apiUrl}optionRules?${encodeURIComponent('$')}expand=${expand}&${encodeURIComponent('$')}filter=${filter}`;
		}

		const batchSize = 100;
		let batchBundles: string[] = [];

		// create a batch request with a max of 100 options per request
		for (var x = 0; x < options.length; x = x + batchSize)
		{
			let optionList = options.slice(x, x + batchSize);

			batchBundles.push(buildRequestUrl(optionList));
		}

		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				let requests = batchBundles.map(req => createBatchGet(req));

				let guid = newGuid();
				let headers = createBatchHeaders(guid, token);
				let batch = createBatchBody(guid, requests);

				return this.http.post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				let bodyValue: any[] = response.responses.filter(r => r.body?.value?.length > 0).map(r => r.body.value);
				let optionRules = _.flatten(bodyValue);

				let mappings: { [optionNumber: string]: OptionRule } = {};

				options.forEach(opt =>
				{
					let res = optionRules.find(or => or.planOption.integrationKey === opt.optionNumber && or.dpChoice_OptionRuleAssoc.some(r => r.dpChoiceID === opt.dpChoiceId));

					if (!!res)
					{
						// group by mappingIndex to handle multiple option mappings
						const groupedOptionChoices = _.groupBy(res.dpChoice_OptionRuleAssoc, c => c.mappingIndex);
						let optionChoices = _.map(groupedOptionChoices, (choices) => choices);

						mappings[opt.optionNumber] = <OptionRule>{
							optionId: opt.optionNumber,
							optionMappings: optionChoices.map(oc =>
							{
								return {
									mappingIndex: oc[0].mappingIndex,
									choices: oc.sort(sortChoices).map(c =>
									{
										return {
											id: c.dpChoice.divChoiceCatalogID,
											mustHave: c.mustHave,
											attributeReassignments: c.attributeReassignments.map(ar =>
											{
												return {
													id: ar.attributeReassignmentID,
													choiceId: ar.todpChoiceID,
													attributeGroupId: ar.attributeGroupID,
													divChoiceCatalogId: ar.todpChoice.divChoiceCatalogID
												} as OptionRuleAttributeReassignment;
											})
										} as OptionRuleChoice;
									})
								} as OptionMapping;
							}),
							ruleId: res.optionRuleID,
							replaceOptions: res.optionRuleReplaces.map(orr => orr.planOption.integrationKey)
						};
					}
					else
					{
						mappings[opt.optionNumber] = null;
					}
				});

				return mappings;
			})
		);
	}

	getHistoricRules(choices: Array<JobChoice | ChangeOrderChoice>): Observable<TreeVersionRules>
	{
		if (!choices || !choices.length)
		{
			return of(null);
		}

		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				const choiceIds: Array<number> = choices.map(x => isChangeOrderChoice(x) ? x.decisionPointChoiceID : x.dpChoiceId);
				const url = `${environment.apiUrl}GetRulesByChoiceIds(dpChoiceIds=[${choiceIds}])`;

				return this.http.get<any>(url);
			}),
			map((response: any) =>
			{
				let rules = response ? response as TreeVersionRules : null;

				return rules;
			})
		);
	}

	// Retrieve the latest cutOffDays in case GetTreeDto returns cached tree data from API
	getDivDPointCatalogs(tree: Tree, skipSpinner?: boolean): Observable<Tree>
    {
        const entity = `divDPointCatalogs`;
        let points = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

		const pointCatalogIds = points.map(x => x.divPointCatalogId);
        const filter = `divDpointCatalogID in (${pointCatalogIds})`;

        const select = `divDpointCatalogID,cutOffDays,edhConstructionStageId`;

        const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
        const endPoint = `${environment.apiUrl}${entity}?${qryStr}`;

        return (skipSpinner ? this.http : withSpinner(this.http)).get<Tree>(endPoint).pipe(
            map(response =>
            {
                if (response)
                {
                    response['value'].map(x => {
                        let point = points.find(p => p.divPointCatalogId === x.divDpointCatalogID);
                        if (point)
                        {
                            point.cutOffDays = x.cutOffDays;
							point.edhConstructionStageId = x.edhConstructionStageId;
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

}
