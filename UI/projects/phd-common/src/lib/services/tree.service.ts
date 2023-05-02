import { forwardRef, Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../injection-tokens';

import { map, catchError, tap, switchMap, toArray, mergeMap } from 'rxjs/operators';
import { EMPTY as empty, from, Observable, of, throwError, combineLatest, forkJoin } from 'rxjs';

import
{
	newGuid, createBatchGet, createBatchHeaders, createBatchBody, withSpinner, ChangeOrderChoice, ChangeOrderPlanOption,
	JobChoice, JobPlanOption, TreeVersionRules, OptionRule, Tree, ChoiceImageAssoc, PlanOptionCommunityImageAssoc,
	TreeBaseHouseOption, OptionImage, MyFavoritesChoice, getDateWithUtcOffset, PlanOption, ChangeOrderGroup,
	Choice, DecisionPoint, PointStatus, SubGroup, Group, findChoice, MyFavoritesPointDeclined, TokenService,
	getDefaultOptionRule, getOptions, isChangeOrderChoice, isJobChoice, isJobPlanOption, isLocked, isOptionLocked, mapAttributes,
	saveLockedInChoices, BatchResponse, DPointDto, DTreeVersionDto, ODataResponse, OptionRuleDto, TreeVersion, SelectedChoice, AttributeCommunityImageAssoc,
	convertDateToUtcString, IdentityService
} from 'phd-common';

import * as _ from 'lodash';

@Injectable()
export class TreeService
{
	private _ds: string = encodeURIComponent('$');

	constructor(private http: HttpClient, private tokenService: TokenService, private identityService: IdentityService,
		@Inject(forwardRef(() => API_URL)) private apiUrl: string) { }

	/**
	 * gets active tree versions for communities
	 * @param communityIds
	 */
	public getTreeVersionsByCommIds(communityIds: Array<number>): Observable<any>
	{
		const communityFilterArray = communityIds.map(id => `dTree/plan/org/edhFinancialCommunityId eq ${id}`);
		const communityFilter = communityFilterArray && communityFilterArray.length
			? ` and (${communityFilterArray.join(" or ")})`
			: '';

		const utcNow = getDateWithUtcOffset();

		const entity = 'dTreeVersions';
		const expand = `dTree($select=dTreeID;$expand=plan($select=planId,integrationKey),org($select = edhFinancialCommunityId)),baseHouseOptions($select=planOption;$expand=planOption($select=integrationKey))`;
		const filter = `publishStartDate le ${utcNow} and (publishEndDate eq null or publishEndDate gt ${utcNow})${communityFilter}`;
		const select = `dTreeVersionID,dTreeID,dTreeVersionName,dTreeVersionDescription,publishStartDate,publishEndDate,lastModifiedDate`;
		const orderBy = `publishStartDate`;

		const endPoint = this.apiUrl + `${entity}?${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}&${encodeURIComponent("$")}orderby=${orderBy}`;

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
						planId: data['dTree']['plan']['planID'],
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

	/**
	 * gets active tree versions for communities
	 * @param communityId
	 * @param planKey
	 */
	getTreeVersionsByPlanKeyAndCommId(planKey: number, communityId: number): Observable<TreeVersion[]>
	{
		const communityFilter = ` and (dTree/plan/org/edhFinancialCommunityId eq ${communityId}) and (dTree/plan/integrationKey eq '${planKey}')`;

		const utcNow = new Date().toISOString();

		const entity = 'dTreeVersions';
		const expand = 'dTree($select=dTreeID;$expand=plan($select=integrationKey),org($select = edhFinancialCommunityId)),baseHouseOptions($select=planOption;$expand=planOption($select=integrationKey))';
		const filter = `publishStartDate le ${utcNow} and (publishEndDate eq null or publishEndDate gt ${utcNow})${communityFilter}`;
		const select = 'dTreeVersionID,dTreeID,dTreeVersionName,dTreeVersionDescription,publishStartDate,publishEndDate,lastModifiedDate';
		const orderBy = 'publishStartDate desc';

		const endPoint = this.apiUrl + `${entity}?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}&${encodeURIComponent('$')}orderby=${encodeURIComponent(orderBy)}`;

		return withSpinner(this.http).get<ODataResponse<DTreeVersionDto[]>>(endPoint).pipe(
			map(response =>
			{
				return response.value.map(data =>
				{
					return {
						id: data.dTreeVersionID,
						name: data.dTreeVersionName,
						communityId: data.dTree.org.edhFinancialCommunityId,
						planKey: data.dTree.plan.integrationKey,
						description: data.dTreeVersionDescription,
						treeId: data.dTreeID,
						publishStartDate: data.publishStartDate,
						publishEndDate: data.publishEndDate,
						lastModifiedDate: data.lastModifiedDate,
						includedOptions: _.flatMap(data.baseHouseOptions, o => o.planOption.integrationKey)
					} as TreeVersion;
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

		const endPoint = this.apiUrl + `${entity}?useCache=true&${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}`;

		return (skipSpinner ? this.http : withSpinner(this.http)).get<Tree>(endPoint).pipe(
			tap(response => response['@odata.context'] = undefined),
			mergeMap((response: Tree) => forkJoin(
				this.getDivDPointCatalogs(response, skipSpinner),
				this.getDivChoiceCatalogAttributeGroups(response, skipSpinner),
				this.getDivChoiceCatalogLocationGroups(response, skipSpinner)
			)),
			map(([tree, attrChoices, locChoices]) =>
			{
				const treePoints = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).filter(x => x.treeVersionId === tree.treeVersion.id);
				const treeChoices = _.flatMap(treePoints, p => p.choices).filter(x => x.treeVersionId === tree.treeVersion.id);

				if (attrChoices)
				{
					attrChoices.map(x =>
					{
						let choice = treeChoices.find(c => c.divChoiceCatalogId === x.divChoiceCatalogId);

						if (choice)
						{
							if (!choice.divChoiceCatalogAttributeGroups)
							{
								choice.divChoiceCatalogAttributeGroups = [];
							}

							choice.divChoiceCatalogAttributeGroups.push(x.attributeGroupCommunityId);
						}
					});
				}

				if (locChoices)
				{
					locChoices.map(x =>
					{
						let choice = treeChoices.find(c => c.divChoiceCatalogId === x.divChoiceCatalogId);

						if (choice)
						{
							if (!choice.divChoiceCatalogLocationGroups)
							{
								choice.divChoiceCatalogLocationGroups = [];
							}

							choice.divChoiceCatalogLocationGroups.push(x.locationGroupCommunityId);
						}
					});
				}

				return new Tree(tree);
			}),
			catchError(error =>
			{
				console.error(error);

				return empty;
			})
		);
	}

	getTreeBaseHouseOptions(treeVersionId: number, skipSpinner?: boolean): Observable<TreeBaseHouseOption[]>
	{
		const entity = `baseHouseOptions`;
		const expand = `planOption($select=integrationKey)`;
		const select = `planOption`;
		const filter = `dTreeVersionID eq ${treeVersionId}`;

		const endPoint = this.apiUrl + `${entity}?${encodeURIComponent("$")}expand=${encodeURIComponent(expand)}&${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}&${encodeURIComponent("$")}select=${encodeURIComponent(select)}`;

		return (skipSpinner ? this.http : withSpinner(this.http)).get<any>(endPoint).pipe(
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
		const endPoint = this.apiUrl + `${entity}${parameter}`;

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
		let url = this.apiUrl;

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
				const dtos = response ? response['value'] : [];

				const images = dtos.map(x =>
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

	getChoiceCatalogIds(choices: Array<JobChoice | ChangeOrderChoice | MyFavoritesChoice>, skipSpinner?: boolean): Observable<Array<JobChoice | ChangeOrderChoice>>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				const choiceIds: Array<number> = choices.map(x => isChangeOrderChoice(x) ? x.decisionPointChoiceID : x.dpChoiceId);

				if (choiceIds.length > 0)
				{
					const filter = `dpChoiceID in (${choiceIds})`;
					const select = 'dpChoiceID,divChoiceCatalogID';
					const url = `${this.apiUrl}dPChoices?${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

					return (skipSpinner ? this.http : withSpinner(this.http)).get<any>(url);
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

	getChoiceDetails(choices: number[], skipSpinner?: boolean): Observable<any[]>
	{
		return this.tokenService.getToken().pipe(
			switchMap((token: string) =>
			{
				const guid = newGuid();

				const buildRequestUrl = (choices: number[]) =>
				{
					const filter = `dpChoiceId in (${choices.join(',')})`;
					const select = 'dTreeVersionID,dpChoiceSortOrder,maxQuantity,divChoiceCatalogID,dpChoiceID,imagePath,isDecisionDefault';

					let pointExpands = 'divDPointCatalog($select=dPointLabel,isQuickQuoteItem,isStructuralItem;$expand=dPointCatalog($select=dPointTypeId)),';
					pointExpands += 'dSubGroup($select=dSubGroupCatalogID,dSubGroupSortOrder;$expand=dSubGroupCatalog($select=dSubGroupLabel),dGroup($select=dGroupID,dGroupCatalogID,dGroupSortOrder;$expand=dGroupCatalog($select=dGroupLabel)))';

					let expand = 'divChoiceCatalog($select=choiceLabel),';
					expand += `dPoint($select=dPointID,divDPointCatalogID,dSubGroupID,dPointSortOrder;$expand=${pointExpands})`;

					return `${this.apiUrl}dPChoices?${encodeURIComponent('$')}select=${select}&${encodeURIComponent('$')}filter=${filter}&${encodeURIComponent('$')}expand=${expand}`;
				};

				const batchSize = 50;
				const batchBundles: string[] = [];

				for (var x = 0; x < choices.length; x = x + batchSize)
				{
					const choiceList = choices.slice(x, x + batchSize);

					batchBundles.push(buildRequestUrl(choiceList));
				}

				const requests = batchBundles.map(req => createBatchGet(req));
				const headers = createBatchHeaders(guid, token);
				const batch = createBatchBody(guid, requests);

				return (skipSpinner ? this.http : withSpinner(this.http)).post(`${this.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: BatchResponse<any[]>) =>
			{
				const bodies = response.responses.map(r => r.body);

				return _.flatten(bodies.map(body =>
				{
					return body.value?.length > 0 ? body.value : null;
				}).filter(res => res));
			})
		);
	}

	getChoiceImageAssoc(choices: Choice[]): Observable<Array<ChoiceImageAssoc>>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				let guid = newGuid();

				let buildRequestUrl = (choices: Choice[]) =>
				{
					let optFilter = (choice: Choice) => 
					{
						let choiceId = choice.lockedInChoice ? choice.lockedInChoice.choice.dpChoiceId : choice.id;

						let filter = `(dpChoiceId eq ${choiceId}`;

						if (choice.lockedInChoice && choice.lockedInChoice.choice.outForSignatureDate)
						{
							filter += ` and startDate le ${choice.lockedInChoice.choice.outForSignatureDate} and (endDate eq null or endDate gt ${choice.lockedInChoice.choice.outForSignatureDate})`;
						}
						else
						{
							filter += ` and endDate eq null`;
						}

						return filter + ')';
					}

					let filter = `${choices.map(choice => optFilter(choice)).join(' or ')}`;
					let select = `dpChoiceImageAssocId, dpChoiceId, imageUrl, sortKey`;
					let orderBy = `sortKey`;

					return `${this.apiUrl}dPChoiceImageAssocs?${encodeURIComponent('$')}select=${select}&${encodeURIComponent('$')}filter=${filter}&${encodeURIComponent('$')}orderby=${orderBy}&${this._ds}count=true`;
				}

				const batchSize = 35;
				let batchBundles: string[] = [];

				// create a batch request with a max of 100 choices per request
				for (var x = 0; x < choices.length; x = x + batchSize)
				{
					let optionList = choices.slice(x, x + batchSize);

					batchBundles.push(buildRequestUrl(optionList));
				}

				let requests = batchBundles.map(req => createBatchGet(req));

				var headers = createBatchHeaders(guid, token);
				var batch = createBatchBody(guid, requests);

				return this.http.post(`${this.apiUrl}$batch`, batch, { headers: headers });
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

	getChoiceImages(choices: Choice[], isPreview: boolean, publishStartDate: Date): Observable<ChoiceImageAssoc[]>
	{
		const utcNow = getDateWithUtcOffset();

		// return images for a preview or future dated tree - DPChoiceImages or DivChoiceCatalog_CommunityImages
		if (isPreview && (publishStartDate === null || convertDateToUtcString(publishStartDate) > utcNow))
		{
			const endPoint = this.apiUrl + `GetChoiceImages`;

			const body = {
				choiceIds: choices.map(choice => choice.id)
			};

			return this.http.post(endPoint, body).pipe(
				map(response => response['value'] as ChoiceImageAssoc[])
			);
		}
		else
		{
			// return images for a active tree - EDH DPChoiceImageAssoc
			return this.getChoiceImageAssoc(choices);
		}
	}

	getPlanOptionCommunityImageAssoc(options: Array<JobPlanOption | ChangeOrderPlanOption>, skipSpinner?: boolean): Observable<Array<PlanOptionCommunityImageAssoc>>
	{
		if (options.length)
		{
			return this.tokenService.getToken().pipe(
				switchMap((token: string) =>
				{
					const guid = newGuid();

					const buildRequestUrl = (options: Array<JobPlanOption | ChangeOrderPlanOption>) =>
					{
						const optFilter = (opt: JobPlanOption | ChangeOrderPlanOption) => 
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

						const filter = `${options.map(opt => optFilter(opt)).join(' or ')}`;
						const select = 'planOptionCommunityId, imageUrl, startDate, endDate, sortOrder';
						const orderBy = 'sortOrder';

						return `${this.apiUrl}planOptionCommunityImageAssocs?${encodeURIComponent('$')}select=${select}&${encodeURIComponent('$')}filter=${filter}&${encodeURIComponent('$')}orderby=${orderBy}&${this._ds}count=true`;
					};

					const batchSize = 35;
					const batchBundles: string[] = [];

					// create a batch request with a max of 35 options per request
					for (var x = 0; x < options.length; x = x + batchSize)
					{
						const optionList = options.slice(x, x + batchSize);

						batchBundles.push(buildRequestUrl(optionList));
					}

					const requests = batchBundles.map(req => createBatchGet(req));

					var headers = createBatchHeaders(guid, token);
					var batch = createBatchBody(guid, requests);

					return (skipSpinner ? this.http : withSpinner(this.http)).post(`${this.apiUrl}$batch`, batch, { headers: headers });
				}),
				map((response: BatchResponse<PlanOptionCommunityImageAssoc[]>) =>
				{
					const bodies = response.responses.map(r => r.body);

					return bodies.map(body =>
					{
						// pick draft(publishStartDate is null) or latest publishStartDate(last element)
						const value = body.value.length > 0 ? body.value[0] : null;

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

		const buildRequestUrl = (options: Array<{ optionNumber: string; dpChoiceId: number }>) =>
		{
			const optFilter = (opt: { optionNumber: string; dpChoiceId: number }) => `(dpChoice_OptionRuleAssoc/any(or: or/dpChoiceId eq ${opt.dpChoiceId}) and planOption/integrationKey eq '${opt.optionNumber}')`;
			const filter = `${options.map(opt => optFilter(opt)).join(' or ')}`;
			const expand = 'dpChoice_OptionRuleAssoc($select=dpChoiceId,mustHave;$expand=attributeReassignments($select=attributeReassignmentID, todpChoiceID, attributeGroupID;$expand=todpChoice($select=dpChoiceID,divChoiceCatalogID)),dpChoice($select=divChoiceCatalogId,dpChoiceSortOrder;$expand=dPoint($select=dPointSortOrder;$expand=dSubGroup($select=dSubGroupSortOrder;$expand=dGroup($select=dGroupSortOrder))))),planOption,optionRuleReplaces($expand=planOption($select=integrationKey))';

			return `${this.apiUrl}optionRules?${encodeURIComponent('$')}expand=${expand}&${encodeURIComponent('$')}filter=${filter}`;
		}

		const batchSize = 1;
		const chunk = 100;
		const splitArrayresult = options.reduce((resultArray, item, index) =>
		{
			const chunkIndex = Math.floor(index / chunk);

			if (!resultArray[chunkIndex])
			{
				resultArray[chunkIndex] = [];
			}

			resultArray[chunkIndex].push(item);

			return resultArray;
		}, []);

		return from(splitArrayresult).pipe(
			mergeMap(item =>
			{
				const batchBundles: string[] = [];

				for (var x = 0; x < item.length; x = x + batchSize)
				{
					const optionList = item.slice(x, x + batchSize);

					batchBundles.push(buildRequestUrl(optionList));
				}

				const requests = batchBundles.map(req => createBatchGet(req));

				const guid = newGuid();
				const batch = createBatchBody(guid, requests);

				return this.tokenService.getToken().pipe(
					switchMap((token: string) =>
					{
						const headers = createBatchHeaders(guid, token);

						return withSpinner(this.http).post(`${this.apiUrl}$batch`, batch, { headers: headers });
					}));
			}),
			toArray<BatchResponse<OptionRuleDto[]>>(),
			map(responses =>
			{
				const bodyValue = _.flatMap(responses, (response) => response.responses.filter(r => r.body?.value?.length > 0).map(r => r.body.value));
				// logic here to recombine results	
				const optionRules = _.flatten(bodyValue);

				const mappings: { [optionNumber: string]: OptionRule } = {};

				options.forEach(opt =>
				{
					const res = optionRules.find(or => or.planOption.integrationKey === opt.optionNumber && or.dpChoice_OptionRuleAssoc.some(r => r.dpChoiceID === opt.dpChoiceId));

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
											attributeGroupId: ar.attributeGroupID,
											divChoiceCatalogId: ar.todpChoice.divChoiceCatalogID
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

	// Retrieve the latest cutOffDays in case GetTreeDto returns cached tree data from API
	getDivDPointCatalogs(tree: Tree, skipSpinner?: boolean): Observable<Tree>
	{
		const entity = 'divDPointCatalogs';
		const points = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));

		const pointCatalogIds = points.map(x => x.divPointCatalogId);
		const filter = `divDpointCatalogID in (${pointCatalogIds})`;

		const select = 'divDpointCatalogID,cutOffDays,edhConstructionStageId,isHiddenFromBuyerView';

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		const endPoint = `${this.apiUrl}${entity}?${qryStr}`;

		return (skipSpinner ? this.http : withSpinner(this.http)).get<Tree>(endPoint).pipe(
			map(response =>
			{
				if (response)
				{
					response['value'].map(x =>
					{
						const point = points.find(p => p.divPointCatalogId === x.divDpointCatalogID);

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

				return throwError(error);
			})
		);
	}

	/**
	 * Gets the Division-level Attribute Groups tied to the tree.
	 */
	getDivChoiceCatalogAttributeGroups(tree: Tree, skipSpinner?: boolean): Observable<any[]>
	{
		const entity = `divChoiceCatalogAttributeGroupCommunityAssocs`;
		const points = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).filter(x => x.treeVersionId === tree.treeVersion.id);
		const choices = _.flatMap(points, p => p.choices).filter(x => x.treeVersionId === tree.treeVersion.id);

		const divChoiceCatalogIds = choices.map(x => x.divChoiceCatalogId);
		const filter = `divChoiceCatalogID in (${divChoiceCatalogIds})`;

		const select = `divChoiceCatalogID, AttributeGroupMarketId, AttributeGroupCommunityId`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		const endPoint = `${this.apiUrl}${entity}?${qryStr}`;

		return (skipSpinner ? this.http : withSpinner(this.http)).get<Tree>(endPoint).pipe(
			map(response =>
			{
				return response['value'] as any[];
			}),
			catchError(error =>
			{
				console.error(error);

				return empty;
			})
		);
	}

	/**
	 * Gets the Division-level Location Groups tied to the tree.
	 */
	getDivChoiceCatalogLocationGroups(tree: Tree, skipSpinner?: boolean): Observable<any[]>
	{
		const entity = `divChoiceCatalogLocationGroupCommunityAssocs`;
		const points = _.flatMap(tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).filter(x => x.treeVersionId === tree.treeVersion.id);
		const choices = _.flatMap(points, p => p.choices).filter(x => x.treeVersionId === tree.treeVersion.id);

		const divChoiceCatalogIds = choices.map(x => x.divChoiceCatalogId);
		const filter = `divChoiceCatalogID in (${divChoiceCatalogIds})`;

		const select = `divChoiceCatalogID, LocationGroupMarketId, LocationGroupCommunityId`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		const endPoint = `${this.apiUrl}${entity}?${qryStr}`;

		return (skipSpinner ? this.http : withSpinner(this.http)).get<Tree>(endPoint).pipe(
			map(response =>
			{
				return response['value'] as any[];
			}),
			catchError(error =>
			{
				console.error(error);

				return empty;
			})
		);
	}

	mergeIntoTree<T extends { tree: Tree, options: PlanOption[], images?: OptionImage[], selectedChoices: SelectedChoice[] | JobChoice[] }>(choices: Array<JobChoice | ChangeOrderChoice>, options: Array<JobPlanOption | ChangeOrderPlanOption>, changeOrder?: ChangeOrderGroup, lockPricing: boolean = true): (source: Observable<T>) => Observable<T>
	{
		return (source: Observable<T>) => combineLatest([
			source.pipe(
				switchMap(data =>
				{
					if (data.tree && data.tree.treeVersion)
					{
						let currentSubgroups = _.flatMap(data.tree.treeVersion.groups, g => g.subGroups);
						let currentPoints = _.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
						let currentChoices = _.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));

						if (choices)
						{
							let missingChoices = [];

							//find previosly selected choices which are no longer in the tree
							choices.filter(isLocked(changeOrder)).forEach(choice =>
							{
								let existingChoice = currentChoices.find(c => c.divChoiceCatalogId === choice.divChoiceCatalogId);

								if (!existingChoice)
								{
									missingChoices.push(choice.dpChoiceId);
								}
							});

							if (missingChoices.length)
							{
								return this.getChoiceDetails(missingChoices).pipe(map(response =>
								{
									choices.forEach(choice =>
									{
										let ch = response.find(r => r.dpChoiceID === choice.dpChoiceId);

										if (ch)
										{
											let point = currentPoints.find(p => p.divPointCatalogId === ch.dPoint.divDPointCatalogID);

											//get a list of all the original mapped options for the choice
											let opt = getOptions(choice, options).map(option =>
											{
												if (option)
												{
													let qty = option instanceof JobPlanOption ? option.optionQty : option.qty;
													let attributeGroups = option instanceof JobPlanOption ? option.jobPlanOptionAttributes.map(att => att.attributeGroupCommunityId) : option.jobChangeOrderPlanOptionAttributes.map(att => att.attributeGroupCommunityId);
													let locationGroups = option instanceof JobPlanOption ? option.jobPlanOptionLocations.map(loc => loc.locationGroupCommunityId) : option.jobChangeOrderPlanOptionLocations.map(loc => loc.locationGroupCommunityId);

													let existingOption = data.options.find(o => o.financialOptionIntegrationKey === option.integrationKey);

													if (existingOption)
													{
														attributeGroups.push(...existingOption.attributeGroups.filter(ag => !attributeGroups.some(ag2 => ag2 === ag)));
													}

													return <any>{
														attributeGroups: attributeGroups,
														locationGroups: locationGroups,
														calculatedPrice: option.listPrice * qty,
														listPrice: option.listPrice,
														id: option.planOptionId,
														isActive: existingOption?.isActive || false,
														maxOrderQuantity: qty,
														name: option.optionSalesName,
														description: option.optionDescription,
														financialOptionIntegrationKey: option.integrationKey
													};
												}
												else
												{
													return null;
												}
											}).filter(o => !!o);

											let maxQuantity = 1;
											let choiceMaxQuantity = ch.maxQuantity as number;

											if (choiceMaxQuantity != null && opt.length > 0)
											{
												//If there is an option tied to a default choice and Choice Admin set - up a max quantity in the slide out panel, then the minimum quantity of the two will be used.
												maxQuantity = Math.min(opt[0].maxOrderQuantity, choiceMaxQuantity);
											}
											else if (choiceMaxQuantity != null)
											{
												maxQuantity = choiceMaxQuantity;
											}
											else if (opt.length > 0)
											{
												maxQuantity = opt[0].maxOrderQuantity;
											}

											let newChoice = new Choice();

											newChoice = {
												...newChoice,
												divChoiceCatalogId: ch.divChoiceCatalogID,
												enabled: true,
												id: ch.dpChoiceID,
												imagePath: ch.imagePath,
												isDecisionDefault: ch.isDecisionDefault,
												isSelectable: true,
												sortOrder: ch.dpChoiceSortOrder,
												label: ch.divChoiceCatalog.choiceLabel,
												options: opt, //this is setting it to an empty array for some reason
												maxQuantity: maxQuantity, //max them out at what was previously selected
												quantity: choice.dpChoiceQuantity,
												treePointId: point ? point.id : ch.dPoint.dPointID,
												treeVersionId: ch.dTreeVersionID,
												selectedAttributes: mapAttributes(choice)
											};

											newChoice.price = choice.dpChoiceCalculatedPrice;

											if (point)
											{
												point.choices.push(newChoice);
											}
											else
											{
												let subgroup = currentSubgroups.find(sg => ch.dPoint.dSubGroup.dSubGroupCatalogID === sg.subGroupCatalogId);

												if (subgroup)
												{
													let newPoint = <DecisionPoint>{
														choices: [newChoice],
														completed: true,
														divPointCatalogId: ch.dPoint.divDPointCatalogID,
														enabled: true,
														id: ch.dPoint.dPointID,
														isQuickQuoteItem: ch.dPoint.divDPointCatalog.isQuickQuoteItem,
														isStructuralItem: ch.dPoint.divDPointCatalog.isStructuralItem,
														label: ch.dPoint.divDPointCatalog.dPointLabel,
														sortOrder: ch.dPoint.dPointSortOrder,
														status: PointStatus.COMPLETED,
														subGroupCatalogId: ch.dPoint.dSubGroup.dSubGroupCatalogID,
														subGroupId: ch.dPoint.dSubGroupID,
														treeVersionId: ch.dTreeVersionID,
														dPointTypeId: ch.dPoint.divDPointCatalog.dPointCatalog?.dPointTypeId,
														viewed: true
													};

													subgroup.points.push(newPoint);
												}
												else
												{
													let group = data.tree.treeVersion.groups.find(g => ch.dPoint.dSubGroup.dGroup.dGroupCatalogID === g.groupCatalogId);

													if (group)
													{
														let newSubGroup = <SubGroup>{
															groupId: ch.dPoint.dSubGroup.dGroup.dGroupID,
															id: ch.dPoint.dSubGroupID,
															label: ch.dPoint.dSubGroup.dSubGroupCatalog.dSubGroupLabel,
															points: [<DecisionPoint>{
																choices: [newChoice],
																completed: true,
																divPointCatalogId: ch.dPoint.divDPointCatalogID,
																enabled: true,
																id: ch.dPoint.dPointID,
																isQuickQuoteItem: ch.dPoint.divDPointCatalog.isQuickQuoteItem,
																isStructuralItem: ch.dPoint.divDPointCatalog.isStructuralItem,
																label: ch.dPoint.divDPointCatalog.dPointLabel,
																sortOrder: ch.dPoint.dPointSortOrder,
																status: PointStatus.COMPLETED,
																subGroupCatalogId: ch.dPoint.dSubGroup.dSubGroupCatalogID,
																subGroupId: ch.dPoint.dSubGroupID,
																treeVersionId: ch.dTreeVersionID,
																viewed: true
															}],
															sortOrder: ch.dPoint.dSubGroup.dSubGroupSortOrder,
															status: PointStatus.COMPLETED,
															subGroupCatalogId: ch.dPoint.dSubGroup.dSubGroupCatalogID,
															treeVersionId: ch.dTreeVersionID,
															useInteractiveFloorplan: false
														};

														group.subGroups.push(newSubGroup);
													}
													else
													{
														const newGroup = <Group>{
															groupCatalogId: ch.dPoint.dSubGroup.dGroup.dGroupCatalogID,
															id: ch.dPoint.dSubGroup.dGroup.dGroupID,
															label: ch.dPoint.dSubGroup.dGroup.dGroupCatalog.dGroupLabel,
															sortOrder: ch.dPoint.dSubGroup.dGroup.dGroupSortOrder,
															status: PointStatus.COMPLETED,
															subGroups: [{
																groupId: ch.dPoint.dSubGroup.dGroup.dGroupID,
																id: ch.dPoint.dSubGroupID,
																label: ch.dPoint.dSubGroup.dSubGroupCatalog.dSubGroupLabel,
																points: [<DecisionPoint>{
																	choices: [newChoice],
																	completed: true,
																	divPointCatalogId: ch.dPoint.divDPointCatalogID,
																	enabled: true,
																	id: ch.dPoint.dPointID,
																	isQuickQuoteItem: ch.dPoint.divDPointCatalog.isQuickQuoteItem,
																	isStructuralItem: ch.dPoint.divDPointCatalog.isStructuralItem,
																	label: ch.dPoint.divDPointCatalog.dPointLabel,
																	sortOrder: ch.dPoint.dPointSortOrder,
																	status: PointStatus.COMPLETED,
																	subGroupCatalogId: ch.dPoint.dSubGroup.dSubGroupCatalogID,
																	subGroupId: ch.dPoint.dSubGroupID,
																	treeVersionId: ch.dTreeVersionID,
																	viewed: true
																}],
																sortOrder: ch.dPoint.dSubGroup.dSubGroupSortOrder,
																status: PointStatus.COMPLETED,
																subGroupCatalogId: ch.dPoint.dSubGroup.dSubGroupCatalogID,
																treeVersionId: ch.dTreeVersionID,
																useInteractiveFloorplan: false
															}],
															treeVersionId: ch.dTreeVersionID
														};

														data.tree.treeVersion.groups.splice(data.tree.treeVersion.groups.findIndex(g => g.sortOrder > newGroup.sortOrder), 0, newGroup);
													}
												}
											}
										}
									});

									//save original locked in choice information on the tree
									saveLockedInChoices(choices,
										_.flatMap(data.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))),
										options,
										changeOrder);

									return data;
								}));
							}
							else
							{
								saveLockedInChoices(choices, currentChoices, options, changeOrder);

								return of(data);
							}
						}
					}

					return of(data);
				})
			),
			this.getPlanOptionCommunityImageAssoc(options.filter(o => o.outForSignatureDate !== undefined)),
			this.getAttributeCommunityImageAssocs(_.flatten(choices.map(c =>
			{
				return isJobChoice(c) ? c.jobChoiceAttributes?.map(a => a.attributeCommunityId) : c.jobChangeOrderChoiceAttributes.map(a => a.attributeCommunityId);
			}))),
			//capture original option mappings for locked-in options/choices
			this.getHistoricOptionMapping(_.flatten(choices.map(c =>
			{
				if (isJobChoice(c))
				{
					return c.jobChoiceJobPlanOptionAssocs
						.filter(o => o.choiceEnabledOption)
						.map(o =>
						{
							return { optionNumber: options.find(opt => opt.id === o.jobPlanOptionId)?.integrationKey, dpChoiceId: c.dpChoiceId };
						});
				}
				else
				{
					return c.jobChangeOrderChoiceChangeOrderPlanOptionAssocs
						.filter(o => o.jobChoiceEnabledOption)
						.map(o =>
						{
							return { optionNumber: options.find(opt => opt.id === o.jobChangeOrderPlanOptionId)?.integrationKey, dpChoiceId: c.decisionPointChoiceID };
						});
				}
			})))
		]).pipe(
			//update pricing information for locked-in options/choices
			map(([res, optImageAssoc, attrImageAssoc, mapping]) =>
			{
				//override option prices if prices are locked
				if (options.length)
				{
					options.filter(isOptionLocked(changeOrder)).forEach(option =>
					{
						let opt = res.options.find(o => o.financialOptionIntegrationKey === option.integrationKey);

						if (opt)
						{
							opt.listPrice = lockPricing ? option.listPrice : opt.listPrice;
							opt.description = option.optionDescription;
							opt.name = option.optionSalesName;

							let existingAssoc = optImageAssoc ? optImageAssoc.filter(optImage => optImage.planOptionCommunityId === opt.id) : [];

							if (existingAssoc.length && res.images)
							{
								res.images = [...res.images.filter(o => o.integrationKey !== opt.financialOptionIntegrationKey), ...existingAssoc.map(i => ({ integrationKey: opt.financialOptionIntegrationKey, imageURL: i.imageUrl, sortKey: i.sortOrder }))];
							}

							//add in missing attribute/location groups
							if (!opt.isBaseHouse)
							{
								if (isJobPlanOption(option))
								{
									option.jobPlanOptionAttributes.forEach(jpoAtt =>
									{
										if (!opt.attributeGroups.find(a => a === jpoAtt.attributeGroupCommunityId))
										{
											opt.attributeGroups.push(jpoAtt.attributeGroupCommunityId);
										}
									});

									option.jobPlanOptionLocations.forEach(jpoLoc =>
									{
										if (!opt.locationGroups.find(l => l === jpoLoc.locationGroupCommunityId))
										{
											opt.locationGroups.push(jpoLoc.locationGroupCommunityId);
										}
									});
								}
								else
								{
									option.jobChangeOrderPlanOptionAttributes.forEach(jpoAtt =>
									{
										if (!opt.attributeGroups.find(a => a === jpoAtt.attributeGroupCommunityId))
										{
											opt.attributeGroups.push(jpoAtt.attributeGroupCommunityId);
										}
									});

									option.jobChangeOrderPlanOptionLocations.forEach(jpoLoc =>
									{
										if (!opt.locationGroups.find(l => l === jpoLoc.locationGroupCommunityId))
										{
											opt.locationGroups.push(jpoLoc.locationGroupCommunityId);
										}
									});
								}
							}
						}
					});
				}

				return { res, attrImageAssoc, mapping };
			}),
			//store the original option mapping on the choice where it was selected
			//rules engine can use this to 'override' current option mappings
			map(data =>
			{
				// reattaching images to attributes
				data.res.selectedChoices.forEach(c =>
				{
					// check to make sure the choice object is JobChoice else it's SelectedChoice
					if ((<any>c).action === undefined)
					{
						c.jobChoiceAttributes?.map(a => a.imageUrl = data.attrImageAssoc.find(x => x.attributeCommunityId === a.attributeCommunityId && (c.outForSignatureDate ? (x.startDate <= c.outForSignatureDate && (x.endDate == null || x.endDate >= c.outForSignatureDate)) : x.endDate == null))?.imageUrl);
					}
					else
					{
						c.selectedAttributes?.map(a => a.attributeImageUrl = data.attrImageAssoc.find(x => x.attributeCommunityId === a.attributeCommunityId && (c.outForSignatureDate ? (x.startDate <= c.outForSignatureDate && (x.endDate == null || x.endDate >= c.outForSignatureDate)) : x.endDate == null))?.imageUrl);
					}
				});

				choices.filter(isLocked(changeOrder)).forEach(c =>
				{
					let choice = findChoice(data.res.tree, ch => ch.divChoiceCatalogId === c.divChoiceCatalogId);

					if (!!choice)
					{
						if (isJobChoice(c))
						{
							choice.lockedInOptions = c.jobChoiceJobPlanOptionAssocs?.filter(o => o.choiceEnabledOption)?.map(o => data.mapping[options.find(opt => opt.id === o.jobPlanOptionId)?.integrationKey] || getDefaultOptionRule(options.find(opt => opt.id === o.jobPlanOptionId)?.integrationKey, choice));
						}
						else
						{
							choice.lockedInOptions = c.jobChangeOrderChoiceChangeOrderPlanOptionAssocs?.filter(o => o.jobChoiceEnabledOption)?.map(o => data.mapping[options.find(opt => opt.id === o.jobChangeOrderPlanOptionId)?.integrationKey] || getDefaultOptionRule(options.find(opt => opt.id === o.jobChangeOrderPlanOptionId)?.integrationKey, choice));
						}
					}
				});

				return data.res;
			}),
			catchError(err => { console.error(err); return throwError(err); })
		);
	}

	getAttributeCommunityImageAssocs(attributeCommunityIds: number[]): Observable<AttributeCommunityImageAssoc[]>
	{
		// create distinct string
		let ids = [...new Set(attributeCommunityIds)].join(',');
		let url = this.apiUrl;
		const filter = `attributeCommunity/id in (${ids})`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=attributeCommunityId, imageUrl, startDate, endDate`;

		url += `attributeCommunityImageAssocs?${qryStr}`;

		return this.http.get(url).pipe(
			map(response =>
			{
				let acImageAssoc = response['value'] as Array<AttributeCommunityImageAssoc>;

				return acImageAssoc;
			})
		);
	}

	getDeclinedPointCatalogIds(pointsDeclined: MyFavoritesPointDeclined[]): Observable<MyFavoritesPointDeclined[]>
	{
		const pointIds: Array<number> = pointsDeclined.map(x => x.dPointId);
		const filter = `dPointID in (${pointIds})`;
		const select = 'dPointID,divDPointCatalogID';
		const url = `${this.apiUrl}dPoints?${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		return withSpinner(this.http).get<ODataResponse<DPointDto[]>>(url).pipe(
			map((response) =>
			{
				const newPointsDeclined: MyFavoritesPointDeclined[] = [];
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
		);
	}
}
