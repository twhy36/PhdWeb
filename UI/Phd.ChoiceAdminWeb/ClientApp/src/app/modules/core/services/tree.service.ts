import { Injectable, Attribute } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { BehaviorSubject, Observable, throwError as _throw, of } from 'rxjs';
import { EMPTY } from 'rxjs';
import { combineLatest, map, catchError, flatMap, switchMap } from 'rxjs/operators';

import * as odataUtils from '../../shared/classes/odata-utils.class';

import { DTree, DTVersion, DTGroup, DTSubGroup, DTPoint, DTChoice, DTreeVersionDropDown, AttributeReassignment, PointChoiceDependent } from '../../shared/models/tree.model';
import { Settings } from '../../shared/models/settings.model';

import { LoggingService } from '../../core/services/logging.service';
import { SettingsService } from '../../core/services/settings.service';
import { PlanOptionService } from './plan-option.service';

import { PhdApiDto, PhdEntityDto } from '../../shared/models/api-dtos.model';
import { TreeOption, ITreeOption, Option } from '../../shared/models/option.model';
import { IDivCatalogPointDto } from '../../shared/models/point.model';
import { IDivCatalogChoiceDto, IChoiceImageAssoc } from '../../shared/models/choice.model';

import { withSpinner } from 'phd-common/extensions/withSpinner.extension';
import { RuleType } from '../../shared/models/rule.model';
import { DivCatWizPlan, IDivCatWizChoice, DivCatWizChoice } from '../../divisional/services/div-catalog-wizard.service';
import { IPlanOptionResult, IPlanOptionCommunityResult } from '../../shared/models/plan.model';
import * as _ from 'lodash';
import { DivAttributeWizPlan, DivAttributeWizOption, DivAttributeWizChoice } from '../../divisional/services/div-attribute-wizard.service';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class TreeService
{
	private _ds: string = encodeURIComponent('$');
	private _batch = "$batch";

	currentTreeVersionId$: BehaviorSubject<number>;
	private _currentTree: BehaviorSubject<DTree>;
	private _currentTreeOptions: BehaviorSubject<Array<ITreeOption>>;
	currentTree: Observable<DTree>;
	currentTreeOptions: Observable<Array<ITreeOption>>;
	treeVersionIsLoading: boolean = false;

	constructor(
		private _http: HttpClient,
		private _loggingService: LoggingService,
		private _optionService: PlanOptionService)
	{
		this.currentTreeVersionId$ = new BehaviorSubject<number>(null);
		this._currentTreeOptions = new BehaviorSubject<Array<ITreeOption>>(null);
		this._currentTree = new BehaviorSubject<DTree>(null);
		this.currentTree = this._currentTree.asObservable();
		this.currentTreeOptions = this._currentTreeOptions.asObservable();

		this.currentTreeVersionId$
			.pipe(
				switchMap(treeVersionId =>
				{
					this.clearCurrentTree();

					if (treeVersionId)
					{
						this.treeVersionIsLoading = true;

						return this.getTree(treeVersionId).pipe(
							combineLatest(this.getTreeOptions(treeVersionId))
						);
					}
					else
					{
						this.treeVersionIsLoading = false;

						return EMPTY;
					}
				})
			)
			.subscribe(([tree, treeOptions]) =>
			{
				this.setCurrentTree(tree, treeOptions);
				this.treeVersionIsLoading = false;
			});
	}

	getTreeByVersionId(treeVersionId: number): Observable<DTree>
	{
		if (this.currentTreeVersionId$.value === treeVersionId)
		{
			return this.currentTree;
		}
		else
		{
			this.clearCurrentTree();

			return this.getTree(treeVersionId).pipe(
				combineLatest(this.getTreeOptions(treeVersionId)),
				map(([tree, treeOptions]) =>
				{
					this.setCurrentTree(tree, treeOptions);
					this.treeVersionIsLoading = false;

					return tree;
				})
			);
		}
	}

	clearCurrentTree()
	{
		this._currentTree.next(null);
		this._currentTreeOptions.next(null);
	}


	updateCurrentTree(tree: DTree)
	{
		this._currentTree.next(tree);
	}

	setCurrentTree(tree: DTree, treeOptions: Array<ITreeOption>)
	{
		this._currentTree.next(tree);
		this._currentTreeOptions.next(treeOptions);
	}

	getTreeVersions(commId: number, planKey: string): Observable<Array<DTreeVersionDropDown>>
	{
		let url = settings.apiUrl;

		const expand = `dTree($select=dTreeID;$expand=plan($select=integrationKey),org($select=edhFinancialCommunityId)),baseHouseOptions($select=planOption;$expand=planOption($select=integrationKey))`;
		const filter = `dTree/plan/org/edhFinancialCommunityId eq ${commId} and dTree/plan/integrationKey eq '${planKey}'`;
		const select = `dTreeVersionID,dTreeID,dTreeVersionName,dTreeVersionDescription,publishStartDate,publishEndDate,lastModifiedDate`;
		const orderBy = `publishStartDate`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderBy)}`;

		url += `dTreeVersions?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{

				const versionsDto = response.value as Array<PhdEntityDto.IDTreeVersionDto>;
				let versions = versionsDto.map<DTreeVersionDropDown>(v => new DTreeVersionDropDown(v));

				versions = versions.sort((a, b) =>
				{
					if (!a.effectiveDate)
					{
						return -1;
					}

					if (!b.effectiveDate)
					{
						return 1;
					}

					const left = a.effectiveDate;
					const right = b.effectiveDate;

					if (left.isSame(right))
					{
						return 0;
					}

					if (left.isBefore(right))
					{
						return 1;
					}
					else
					{
						return -1;
					}
				});

				return versions;
			}), catchError(this.handleError));
	}

	getTree(treeVersionId: number): Observable<DTree>
	{
		const entity = `GetTreeDto(TreeVersionID=${treeVersionId})`;
		const expand = `treeVersion($expand=groups($expand=subGroups($expand=points($expand=choices)))) `;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<PhdApiDto.IDTreeDto>(endPoint).pipe(
			map<PhdApiDto.IDTreeDto, DTree>(response =>
			{
				return this.createTreeFromDto(response);
			}),
			catchError(this.handleError));
	}

	getTreeOptions(treeVersionId: number): Observable<Array<ITreeOption>>
	{
		return this.getTreeKeys(treeVersionId).pipe(
			flatMap(treeVersion =>
			{
				const commId = treeVersion.dTree.org.edhFinancialCommunityId;
				const planKey = treeVersion.dTree.plan.integrationKey;

				// get plan options to set hasChoice or baseHouse
				return this.getPlanOptions(treeVersionId).pipe(combineLatest(this._optionService.getPlanOptions(commId, planKey)))
			}),
			map(([phdPlanOptions, planOptions]) =>
			{
				let treeOptions: ITreeOption[] = [];

				if (planOptions != null)
				{
					// sort first so messages can inherit sort
					planOptions.sort((a, b) =>
					{
						let col1a = a.category;
						let col1b = b.category;

						let col2a = a.subCategory;
						let col2b = b.subCategory;

						let col3a = a.name;
						let col3b = b.name;

						if (col1a < col1b) return -1;
						if (col1a > col1b) return 1;
						if (col2a < col2b) return -1;
						if (col2a > col2b) return 1;
						if (col3a < col3b) return -1;
						if (col3a > col3b) return 1;

						return 0;
					});

					planOptions.forEach(option =>
					{
						// build id list
						let idList = phdPlanOptions.map(x => x.optionKey);
						// find index of option id
						let index = idList.indexOf(option.id.toString());

						// if index found add planOption else add default planOption
						let planOption = index === -1 ? {
							planOptionId: 0,
							planId: 0,
							optionKey: null,
							hasRules: false,
							baseHouse: false
						} as PhdApiDto.IDTPlanOption : phdPlanOptions[index];

						if (option.isActive || planOption.hasRules)
						{
							let tOption = new TreeOption(option, planOption);

							treeOptions.push(tOption);
						}
					});
				}

				return treeOptions
			}));
	}

	getTreeKeys(treeVersionId: number): Observable<PhdEntityDto.IDTreeVersionDto>
	{
		const entity = `dTreeVersions`;
		const expand = `dTree($select=org;$expand=plan($select=integrationKey),org($select=integrationKey,edhFinancialCommunityId))`;
		const select = `dTreeVersionID, dTree`;
		const filter = `dTreeVersionId eq ${treeVersionId}`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}filter=${filter}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endPoint).pipe(
			map(resp => resp.value[0])
		);
	}

	getNewTree(commId: number, planKey: string, newType: string, oldTreeVersionId: number): Observable<DTree>
	{
		this.treeVersionIsLoading = true;

		// calling unbound odata action
		const body = {
			'commId': commId,
			'planKey': planKey,
			'newType': newType,
			'oldTreeVersionId': oldTreeVersionId
		};

		const action = `CreateNewTree`;
		const expand = `treeVersion($expand=groups($expand=subGroups($expand=points($expand=choices))))`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}`;

		const endPoint = `${settings.apiUrl}${action}?${qryStr}`;

		return this._http.post<PhdApiDto.IDTreeDto>(endPoint, body).pipe(
			map(treeDto =>
			{
				let dTree: DTree;

				if (treeDto.treeVersion.groups != null)
				{
					dTree = this.createTreeFromDto(treeDto);
				}

				this.treeVersionIsLoading = false;

				return dTree;
			}));
	}

	getChoiceOptionRules(treeVersionId: number, choiceId: number): Observable<Array<PhdApiDto.IChoiceOptionRule>>
	{
		const entity = `dPChoiceOptionRuleAssocs`;
		const expand = `optionRule($select=planOptionID;$expand=planOption($select=integrationKey))`;
		const filter = `dTreeVersionID eq ${treeVersionId} and dpChoiceID eq ${choiceId}`;
		const select = "dpChoiceOptionRuleAssocID,optionRuleID";

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endPoint).pipe(
			map(response =>
			{
				const optionRules = response.value as Array<PhdEntityDto.IDPChoice_OptionRuleAssocDto>;

				return optionRules.map(r =>
				{
					return {
						choiceOptionRuleId: r.dpChoiceOptionRuleAssocID,
						integrationKey: r.optionRule.planOption.integrationKey,
						optionRuleId: r.optionRuleID,
						planOptionId: r.optionRule.planOptionID
					} as PhdApiDto.IChoiceOptionRule;
				});
			}));
	}

	getPlanKeysForOption(optionIntegrationKey: string, marketId: number): Observable<Array<IPlanOptionCommunityResult>>
	{
		const entity = 'planOptionCommunities';
		const expand = `planCommunity($select=id,financialPlanIntegrationKey,planSalesName; $orderby=planSalesName; $filter=isActive eq true; $expand=financialCommunity($select=id;$filter=marketId eq ${marketId})),
						optionCommunity($select=id,optionId,financialCommunityId;$filter=isActive eq true;
						$expand=option($select=id,name,financialOptionIntegrationKey;$filter=financialOptionIntegrationKey eq '${optionIntegrationKey}' and isActive eq true;
						$expand=optionMarkets($filter=marketId eq ${marketId})))`;
		const filter = `planCommunity/isActive eq true and optionCommunity/option/financialOptionIntegrationKey eq '${optionIntegrationKey}' and planCommunity/financialCommunity/marketId eq ${marketId} and
						optionCommunity/isActive eq true and optionCommunity/option/isActive eq true and optionCommunity/option/optionMarkets/any(om : om/marketId eq ${marketId}) and isActive eq true`;
		const select = `id, planId, planCommunity`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get(endPoint).pipe(

			map(response =>
			{
				const planOptionCommunity = response['value'];

				return planOptionCommunity.map(poc =>
				{
					return {
						planID: poc.planId,
						financialPlanIntegrationKey: poc.planCommunity.financialPlanIntegrationKey,
						planSalesName: poc.planCommunity.planSalesName,
						financialCommunityId: poc.planCommunity.financialCommunity.id
					}
				})
			})
		);
	}

	getTreeWithChoices(planOptionCommunity: IPlanOptionCommunityResult[], selectedChoices: DivAttributeWizChoice[]): Observable<Array<IPlanOptionResult>>
	{
		const batchGuid = odataUtils.getNewGuid();

		const optionGroups = _(planOptionCommunity).groupBy('financialCommunityId');
		let requests = Object.keys(optionGroups).map(financialCommunityId =>
		{
			var financialPlanIntegrationKey = optionGroups[financialCommunityId].map(p => `'${p.financialPlanIntegrationKey}'`).join(',');

			const entity = `dTreeVersions`;
			const filter = `dTree/plan/org/edhFinancialCommunityId eq ${financialCommunityId} and dTree/plan/integrationKey in (${financialPlanIntegrationKey}) and (publishStartDate eq null or publishStartDate le now())`;
			const expand = `dpChoices($select=dpChoiceID,divChoiceCatalogID),dTree($select=dTreeID;$expand=plan($select=planId,integrationKey;$expand=org($select=orgId,edhFinancialCommunityId)))`
			const select = `dTreeVersionID, dTreeVersionName, publishStartDate, lastModifiedDate`;
			const orderBy = `publishStartDate`;
			const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}orderby=${encodeURIComponent(orderBy)}&${this._ds}count=true`;
			const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

			return odataUtils.createBatchGet(endpoint);
		});

		let headers = odataUtils.createBatchHeaders(batchGuid);
		let batch = odataUtils.createBatchBody(batchGuid, requests);

		return withSpinner(this._http).post(`${settings.apiUrl}$batch`, batch, { headers: headers }).pipe(
			map((response: any) =>
			{
				let bodies = response.responses.map(r => r.body);

				return _.flatten(bodies.map(body =>
				{
					var result: Array<IPlanOptionResult> = [];

					// Group by financial plan integration key
					let groupedValue = body.value.length ? _.groupBy(body.value, poc => poc.dTree.plan.integrationKey) : null;

					for (let val in groupedValue)
					{
						let valObject = groupedValue[val];

						// pick draft(publishStartDate is null) or latest publishStartDate(last element)
						let value = valObject.length > 0 ? !valObject[0].publishStartDate ? valObject[0] : valObject[valObject.length - 1] : null;

						if (value)
						{
							result.push(
								{
									org: { edhFinancialCommunityId: value.dTree.plan.org.edhFinancialCommunityId },
									integrationKey: value.dTree.plan.integrationKey,
									choicesExist: selectedChoices.every(selectedChoice => value.dpChoices.some(dp => dp.divChoiceCatalogID === selectedChoice.id))
								} as IPlanOptionResult);
						}
					}

					return result;
				}));
			})
		);
	}

	getPlansWithActiveTrees(marketId: number): Observable<PhdEntityDto.IPlanDto[]>
	{
		const filter = `org/edhMarketId eq ${marketId} and dTrees/any(t: t/dTreeVersions/any())`;
		const expand = `org($select=edhFinancialCommunityId)`
		const select = `planID,integrationKey`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}`;

		let url = `${settings.apiUrl}plans?${qryStr}`;

		return withSpinner(this._http).get(url).pipe(
			map(response =>
			{
				return response['value'] as PhdEntityDto.IPlanDto[];
			})
		);
	}

	getOptionLocationGroupCommunity(commId: number, integrationKey: string): Observable<PhdApiDto.ILocationGroupCommunity[]>
	{
		const entity = `locationGroupCommunities`;
		let expand = `locationGroupOptionCommunityAssocs($select=locationGroupCommunityId;$expand=optionCommunity($expand=option($select=id, financialOptionIntegrationKey); $select=id, optionId, financialCommunityId; $filter=financialCommunityId eq ${commId} and option/financialOptionIntegrationKey eq '${integrationKey}')),`;
		expand += `locationGroupCommunityTags, locationGroupLocationCommunityAssocs($select=locationGroupCommunityId;$expand=locationCommunity($select = id, locationName, isActive))`;
		const filter = `financialCommunityId eq ${commId} and locationGroupOptionCommunityAssocs/any(a: a/optionCommunity/option/financialOptionIntegrationKey eq '${integrationKey}')`;
		const select = `id, financialCommunityId, locationGroupName, groupLabel, locationGroupDescription, isActive`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endPoint).pipe(
			map(response =>
			{
				let loco = response['value'] as PhdApiDto.ILocationGroupCommunity[];

				return loco;
			}),
			catchError(this.handleError));
	}

	getOptionChoiceRules(treeVersionId: number, optionKey: string): Observable<PhdApiDto.IOptionChoiceRule>
	{
		const entity = `optionRules`;
		const expand = `optionRuleReplaces($expand=planOption($select=integrationKey)),planOption($select=integrationKey),dpChoice_OptionRuleAssoc($expand=dpChoice($select=dPointID,divChoiceCatalog;$expand=divChoiceCatalog($select=choiceLabel),dPoint($select=divDPointCatalog;$expand=divDPointCatalog($select=dPointLabel))))`;
		const filter = `dTreeVersionID eq ${treeVersionId} and planOption/integrationKey eq '${optionKey}'`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endPoint).pipe(
			map(response =>
			{
				const rules = response.value as Array<PhdEntityDto.IOptionRuleDto>;

				if (rules.length === 0)
				{
					return null;
				}

				return {
					id: rules[0].optionRuleID,
					planOptionId: rules[0].planOptionID,
					treeVersionId: rules[0].dTreeVersionID,
					integrationKey: rules[0].planOption.integrationKey,
					choices: rules[0].dpChoice_OptionRuleAssoc.map(c =>
					{
						return {
							choiceId: c.dpChoiceID,
							id: c.dpChoiceOptionRuleAssocID,
							label: c.dpChoice.divChoiceCatalog.choiceLabel,
							mustHave: c.mustHave,
							optionRuleId: c.optionRuleID,
							pointId: c.dpChoice.dPointID,
							pointLabel: c.dpChoice.dPoint.divDPointCatalog.dPointLabel,
							treeVersionId: c.dTreeVersionID
						} as PhdApiDto.IOptionChoiceRuleChoice;
					}),
					replaceRules: rules[0].optionRuleReplaces.map(o =>
					{
						return {
							id: o.optionRuleReplaceID,
							optionRuleId: o.optionRuleID,
							planOptionId: o.planOptionID,
							treeVersionId: o.dTreeVersionID,
							optionKey: o.planOption.integrationKey
						} as PhdApiDto.IOptionReplace;
					})
				} as PhdApiDto.IOptionChoiceRule;
			}));
	}

	getPlanOptions(treeVersionId: number): Observable<Array<PhdApiDto.IDTPlanOption>>
	{
		const entity = `dTreeVersions`;
		const expand = `dTree($expand=plan($expand=planOptions($expand=baseHouseOptions($top=1;$filter=dTreeVersionID eq ${treeVersionId};$select=baseHouseOptionId), optionImages($filter=hideImage eq false and dTreeVersionID eq ${treeVersionId};$select=optionImageId), optionRules($top=1;$filter=dTreeVersionID eq ${treeVersionId};$select=optionRuleID), optionRuleReplaces($top=1;$filter=dTreeVersionID eq ${treeVersionId};$select=optionRuleReplaceID))))`;
		const select = "dTree";
		const filter = `dTreeVersionId eq ${treeVersionId}`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<any>(endPoint).pipe(
			map<any, any>(response => response.value[0]),
			map((version: PhdEntityDto.IDTreeVersionDto) =>
			{
				return version.dTree.plan.planOptions.map(o =>
				{
					let imageCount = o.optionImages.length;

					return {
						planOptionId: o.planOptionID,
						planId: o.planID,
						optionKey: o.integrationKey,
						baseHouse: !!o.baseHouseOptions.length,
						hasRules: !!o.optionRules.length || !!o.optionRuleReplaces.length,
						hasImages: imageCount > 0,
						imageCount: imageCount
					} as PhdApiDto.IDTPlanOption;
				});
			}));
	}

	patchPoint(pointId: number, pointDto: PhdEntityDto.IDPointDto): Observable<any>
	{
		const endPoint = `${settings.apiUrl}dPoints(${pointId})`;

		return this._http.patch(endPoint, pointDto);
	}

	patchChoice(choiceId: number, choiceDto: PhdEntityDto.IDPChoiceDto): Observable<any>
	{
		const endPoint = `${settings.apiUrl}dPChoices(${choiceId})`;

		return this._http.patch(endPoint, choiceDto);
	}

	getChoiceImages(choice: number): Observable<Array<IChoiceImageAssoc>>
	{
		const entity = `dPChoiceImageAssocs`;
		const filter = `dpChoiceId eq (${choice})`;
		const orderby = `sortKey`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderBy=${orderby}&${this._ds}select=dpChoiceImageAssocId, dpChoiceId, imageUrl, sortKey`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get(endPoint).pipe(
			map(response =>
			{
				let choiceImageAssoc = response['value'] as Array<IChoiceImageAssoc>;

				return choiceImageAssoc;
			})
		);
	}

	saveChoiceImages(choiceImages: PhdEntityDto.IDPChoiceDto[], treeVersionId: number): Observable<IChoiceImageAssoc[]>
	{
		// calling unbound odata action 
		const body = {
			'choiceImages': choiceImages,
			'treeVersionId': treeVersionId,
		};

		const action = `SaveChoiceImages`;
		const endpoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endpoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response.value as Array<IChoiceImageAssoc>;
			}));
	}

	deleteChoiceImage(choiceImageId: number, choiceId: number): Observable<any>
	{
		// calling unbound odata action
		const body =
		{
			'dpChoiceImageAssocId': choiceImageId,
			'dpChoiceId': choiceId
		};

		const action = 'DeleteChoiceImage';
		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endPoint, body);
	}

	saveChoiceImageSortOrder(images: Array<IChoiceImageAssoc>, treeVersionId: number): Observable<any>
	{
		let url = settings.apiUrl + `UpdateChoiceImages`;

		let data = {
			'treeVersionId': treeVersionId,
			'choiceImages': images
		};

		return this._http.patch(url, data, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response;
			}),
			catchError(this.handleError));
	}

	getDPointPointRules(pointId: number): Observable<Array<PhdApiDto.IDPointRule>>
	{
		const entity = `dPointDPointRuleAssocs`;
		const expand = `dPointRuleAssoc_DPointAssoc($expand=dPoint($select=dPointID;$expand=divDPointCatalog($select=dPointCatalogID,dPointLabel)))`;
		const filter = `dPointID eq ${pointId} and dPointRuleAssoc_DPointAssoc/any()`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endPoint).pipe(
			map(response =>
			{
				const rulesDto = response.value as Array<PhdEntityDto.IDPoint_DPointRuleAssocDto>;
				const rules = rulesDto.map(r =>
				{
					return {
						id: r.dPointRuleDPointAssocID,
						pointId: r.dPointID,
						pointRuleId: r.dPointRuleID,
						treeVersionId: r.dTreeVersionID,
						ruleItems: r.dPointRuleAssoc_DPointAssoc.map(p =>
						{
							return {
								id: p.dPointRuleDPointAssocID,
								itemId: p.dPointID,
								treeVersionId: p.dTreeVersionID,
								label: p.dPoint.divDPointCatalog.dPointLabel
							} as PhdApiDto.IRuleItemDto;
						})
					} as PhdApiDto.IDPointRule;
				});

				return rules;
			}));
	}

	getDPointChoiceRules(pointId: number): Observable<Array<PhdApiDto.IDPointRule>>
	{
		const entity = `dPointDPointRuleAssocs`;
		const expand = `dPointRuleAssoc_DPChoiceAssoc($expand=dpChoice($select=dpChoiceID;$expand=divChoiceCatalog($select=choiceLabel)))`;
		const filter = `dPointID eq ${pointId} and dPointRuleAssoc_DPChoiceAssoc/any()`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endPoint).pipe(
			map(response =>
			{
				const rulesDto = response.value as Array<PhdEntityDto.IDPoint_DPointRuleAssocDto>;
				const rules = rulesDto.map(r =>
				{
					return {
						id: r.dPointRuleDPointAssocID,
						pointId: r.dPointID,
						pointRuleId: r.dPointRuleID,
						treeVersionId: r.dTreeVersionID,
						ruleItems: r.dPointRuleAssoc_DPChoiceAssoc.map(p =>
						{
							return {
								id: p.dPointRuleDPointAssocID,
								itemId: p.dpChoiceID,
								treeVersionId: p.dTreeVersionID,
								label: p.dpChoice.divChoiceCatalog.choiceLabel
							} as PhdApiDto.IRuleItemDto;
						})
					} as PhdApiDto.IDPointRule;
				});

				return rules;
			}));
	}

	getDPChoiceChoiceRules(choiceId: number): Observable<Array<PhdApiDto.IDPChoiceRule>>
	{
		const entity = "dPChoiceDPChoiceRuleAssocs";
		const expand = "dpChoiceRule_DPChoiceAssoc($expand=dpChoice($select=dpChoiceID;$expand=divChoiceCatalog($select=choiceLabel)))";
		const filter = `dpChoiceID eq ${choiceId} and dpChoiceRule_DPChoiceAssoc/any()`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endPoint).pipe(
			map(response =>
			{
				const rulesDto = response.value as Array<PhdEntityDto.IDPChoice_DPChoiceRuleAssocDto>;
				const rules = rulesDto.map(r =>
				{
					return {
						choiceId: r.dpChoiceID,
						choiceRuleId: r.dpChoiceRuleID,
						id: r.dpChoiceRuleAssocID,
						treeVersionId: r.dTreeVersionID,
						ruleItems: r.dpChoiceRule_DPChoiceAssoc.map(cc =>
						{
							return {
								id: cc.dpChoiceRuleAssocID,
								treeVersionId: cc.dTreeVersionID,
								itemId: cc.dpChoiceID,
								label: cc.dpChoice.divChoiceCatalog.choiceLabel
							} as PhdApiDto.IRuleItemDto;
						})
					} as PhdApiDto.IDPChoiceRule
				});
				return rules;
			}));
	}

	getPointChoiceDependent(treeVersionId: number, pointId: number, choiceId: number): Observable<PointChoiceDependent>
	{
		const endPoint = settings.apiUrl + `GetPointChoiceDependent(treeVersionId=${treeVersionId},pointId=${pointId},choiceId=${choiceId})`;

		return this._http.get(endPoint).pipe(
			map(response =>
			{
				return response as PointChoiceDependent;
			}),
			catchError(this.handleError));
	}

	hasUnusedDivChoices(pointId: number): Observable<boolean>
	{
		return this.getDivChoicesNotUsedCount(pointId).pipe(
			map(numberOfUnusedChoices =>
			{
				return numberOfUnusedChoices > 0;
			})
		);
	}

	hasUnusedDivPoints(marketId: number, subGroupId: number): Observable<boolean>
	{
		return this.getDivPointsNotUsedCount(marketId, subGroupId).pipe(
			map(numberOfUnusedPoints =>
			{
				return numberOfUnusedPoints > 0;
			})
		);
	}

	getDivChoicesNotUsedCount(pointId: number): Observable<number>
	{
		const entity = "divChoiceCatalogs";
		const expand = `divDPointCatalog($select=divDpointCatalogID;$expand=dPoints($select=dPointID;$filter=dPointID eq ${pointId})),dpChoices($filter=dPointID eq ${pointId})`;
		const filter = `isActive eq true and divDPointCatalog/dPoints/any(dp: dp/dPointID eq ${pointId}) and not dpChoices/any(c: c/dPointID eq ${pointId})`;
		const select = `choiceLabel,divChoiceCatalogID,divDpointCatalogID,isActive,divChoiceSortOrder,isDecisionDefault`;
		const orderby = `divChoiceSortOrder`;
		const count = `true`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}&${this._ds}count=${encodeURIComponent(count)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endPoint).pipe(
			map(response =>
			{
				return response["@odata.count"] as number;
			}));
	}

	getDivPointsNotUsedCount(marketId: number, subGroupId: number): Observable<number>
	{
		return this.getUnusedDivPoints(marketId, subGroupId).pipe(
			map(points =>
			{
				return points.length;
			}));
	}

	getUnusedDivChoices(pointId: number): Observable<Array<IDivCatalogChoiceDto>>
	{
		const entity = `divChoiceCatalogs`;
		const expand = `divDPointCatalog($select=divDpointCatalogID;$expand=dPoints($select=dPointID;$filter=dPointID eq ${pointId})),dpChoices($filter=dPointID eq ${pointId})`;
		const filter = `isActive eq true and divDPointCatalog/dPoints/any(dp: dp/dPointID eq ${pointId}) and not dpChoices/any(c: c/dPointID eq ${pointId})`;
		const select = `choiceLabel,divChoiceCatalogID,divDpointCatalogID,isActive,divChoiceSortOrder,isDecisionDefault`;
		const orderby = `divChoiceSortOrder`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endPoint).pipe(
			map(results =>
			{
				const divChoiceCatalogs = results.value as Array<PhdEntityDto.IDivChoiceCatalogDto>;
				return divChoiceCatalogs.map(c =>
				{
					return {
						choiceLabel: c.choiceLabel,
						divChoiceCatalogID: c.divChoiceCatalogID,
						divChoiceSortOrder: c.divChoiceSortOrder,
						divDpointCatalogID: c.divDpointCatalogID,
						dPointCatalogID: c.divDPointCatalog.dPointCatalogID,
						isActive: c.isActive,
						isDecisionDefault: c.isDecisionDefault
					} as IDivCatalogChoiceDto;
				});
			}));
	}

	getUnusedDivPoints(marketId: number, subGroupId: number): Observable<Array<IDivCatalogPointDto>>
	{
		const entity = `dSubGroups`;
		const expand = `dPoints($select=divDPointCatalogID),dSubGroupCatalog($select=dSubGroupCatalogID;$expand=dPointCatalogs($select=dPointCatalogID;$expand=divDPointCatalogs($filter=isActive eq true and org/edhMarketId eq ${marketId} and divChoiceCatalogs/any();$expand=dPointCatalog);$filter=isActive eq true and divDPointCatalogs/any(p: p/org/edhMarketId eq ${marketId} and p/divChoiceCatalogs/any())))`;
		const filter = `dSubGroupID eq ${subGroupId}`;
		const select = `dSubGroupID`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endPoint).pipe(
			map(result =>
			{
				let unusedDivDPointCatalogs: IDivCatalogPointDto[] = [];
				let sg = result.value[0] as PhdEntityDto.IDSubGroupDto;
				const usedDivDPointCatalogIDs = sg.dPoints.map(p => p.divDPointCatalogID);
				const filteredCatalogPoints = sg.dSubGroupCatalog.dPointCatalogs.filter(p =>
				{
					// divDPointCatalogID not in usedDivDPointCatalogIDs
					return p.divDPointCatalogs.some(divP => usedDivDPointCatalogIDs.indexOf(divP.divDpointCatalogID) === -1);
				});

				filteredCatalogPoints.forEach(point =>
				{
					let filteredDivPoints = point.divDPointCatalogs.filter(x => usedDivDPointCatalogIDs.indexOf(x.divDpointCatalogID) === -1);

					filteredDivPoints.forEach(divP =>
					{
						let dto = {
							divDpointCatalogID: divP.divDpointCatalogID,
							divDPointSortOrder: divP.divDPointSortOrder,
							dPointCatalogID: divP.dPointCatalogID,
							dPointDescription: divP.dPointDescription,
							dPointLabel: divP.dPointLabel,
							dPointPickType: divP.dPointPickType,
							dPointPickTypeID: divP.dPointPickTypeID,
							dPointSortOrder: divP.divDPointSortOrder,
							dSubGroupCatalogID: divP.dPointCatalog.dSubGroupCatalogID,
							isActive: divP.isActive,
							isQuickQuoteItem: divP.isQuickQuoteItem,
							isStructuralItem: divP.isStructuralItem,
							orgID: divP.orgID
						} as IDivCatalogPointDto;

						unusedDivDPointCatalogs.push(dto);
					});
				});

				return unusedDivDPointCatalogs;
			}));
	}

	getTreeEndDate(treeVersionId: number): Observable<string>
	{
		const select = `publishEndDate`;
		const entity = `dTreeVersions(${treeVersionId})`;
		const qryStr = `${this._ds}select=${encodeURIComponent(select)}`;
		const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;
		return this._http.get<PhdEntityDto.IDTreeVersionDto>(endpoint).pipe(
			map(v =>
			{
				return v.publishEndDate;
			}));
	}

	getOptionImages(treeVersionId: number, optionKey: string): Observable<Array<PhdEntityDto.IOptionImageDto>>
	{
		const entity = `optionImages`;
		const filter = `dTreeVersionID eq ${treeVersionId} and planOption/integrationKey eq '${optionKey}'`;
		const orderby = `sortKey`;
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}orderby=${encodeURIComponent(orderby)}`;
		const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(response =>
			{
				return response.value as Array<PhdEntityDto.IOptionImageDto>;
			}));
	}

	saveOptionImages(optionImages: PhdEntityDto.IOptionImageDto[], integrationKey: string): Observable<PhdEntityDto.IOptionImageDto[]>
	{
		// calling unbound odata action 
		const body = {
			'integrationKey': integrationKey,
			'optionImages': optionImages
		};

		const action = `SaveOptionImages`;
		const endpoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endpoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response.value as Array<PhdEntityDto.IOptionImageDto>;
			}));
	}

	saveOptionImageSortOrder(images: Array<PhdEntityDto.IOptionImageDto>): Observable<any>
	{
		const batchRequestsImage = odataUtils.createBatchPatch<PhdEntityDto.IOptionImageDto>(images, "optionImageId", "optionImages", "sortKey");

		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequestsImage]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		const endPoint = `${settings.apiUrl}${this._batch}`;

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(response =>
			{
				//todo: parse batch response for errors and throw any
				return response;
			}));
	}

	patchOptionImage(imageDto: PhdEntityDto.IOptionImageDto): Observable<PhdEntityDto.IOptionImageDto>
	{
		const entity = `optionImages(${imageDto.optionImageId})`;
		const endpoint = `${settings.apiUrl}${entity}`;

		return this._http.patch<PhdEntityDto.IOptionImageDto>(endpoint, imageDto, { headers: { 'Prefer': 'return=representation' } });
	}

	deleteOptionImage(optionImageId: number): Observable<any>
	{
		const entity = `optionImages(${optionImageId})`;
		const endpoint = `${settings.apiUrl}${entity}`;

		return this._http.delete(endpoint);
	}

	saveReplaceOption(treeVersionId: number, option: PhdApiDto.IOptionReplace): Observable<PhdApiDto.IOptionReplace>
	{
		// calling unbound odata action
		const body = {
			"treeVersionId": treeVersionId,
			"optionReplace": option
		};

		const action = 'SaveReplaceOption';

		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<PhdApiDto.IOptionReplace>(endPoint, body, { headers: { 'Prefer': 'return=representation' } });
	}

	deleteOptionRuleReplace(optionReplaceId: number): Observable<any>
	{
		const entity = `optionRuleReplaces(${optionReplaceId})`;

		const endPoint = `${settings.apiUrl}${entity}`;

		return this._http.delete<PhdApiDto.IDTreeRule>(endPoint);
	}

	saveTreeVersion(treeVersion: PhdApiDto.IDTreeVersionDto): Observable<PhdApiDto.IDTreeVersionDto>
	{
		// Currently only supporting Name, Description, PublishStartDate, and PublishEndDate
		const endpoint = `dTreeVersions(${treeVersion.id})`;
		const body = {
			dTreeVersionName: treeVersion.name,
			dTreeVersionDescription: treeVersion.description,
			publishStartDate: treeVersion.publishStartDate,
			publishEndDate: treeVersion.publishEndDate
		};

		const endPoint = `${settings.apiUrl}${endpoint}`;

		return this._http.patch<PhdEntityDto.IDTreeVersionDto>(endPoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(dto =>
			{
				return {
					treeId: dto.dTreeID,
					description: dto.dTreeVersionDescription,
					id: dto.dTreeVersionID,
					name: dto.dTreeVersionName,
					lastModifiedDate: dto.lastModifiedDate,
					publishEndDate: dto.publishEndDate,
					publishStartDate: dto.publishStartDate
				} as PhdApiDto.IDTreeVersionDto;
			}));
	}

	saveTreeSort(treeVersionId: number, points: Array<PhdApiDto.IDTreePointDto>): Observable<any>
	{
		const patchPoints = points.map(p =>
		{
			return {
				dPointID: p.id,
				dPointSortOrder: p.sortOrder
			} as PhdEntityDto.IDPointDto;
		});
		const choiceArrays = points.map(p =>
		{
			return p.choices.map(c =>
			{
				return {
					dpChoiceID: c.id,
					dpChoiceSortOrder: c.sortOrder
				} as PhdEntityDto.IDPChoiceDto;
			});
		});

		// flatten choiceArrays
		const patchChoices = choiceArrays.reduce((a, b) => a.concat(b), []);

		const batchPointRequests = odataUtils.createBatchPatch<PhdEntityDto.IDPointDto>(patchPoints, "dPointID", "dPoints", "dPointSortOrder");
		const batchChoiceRequests = odataUtils.createBatchPatch<PhdEntityDto.IDPChoiceDto>(patchChoices, "dpChoiceID", "dPChoices", "dpChoiceSortOrder");

		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchPointRequests, batchChoiceRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		const endPoint = `${settings.apiUrl}${this._batch}`;

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(response =>
			{
				//todo: parse batch response for errors and throw any
				return response;
			}));
	}

	saveDPointPointRule(pointRule: PhdApiDto.IDPointRule): Observable<PhdApiDto.IDPointRule>
	{
		// calling unbound odata action
		const body = {
			"treeVersionId": pointRule.treeVersionId,
			"pointRule": {
				"id": pointRule.id,
				"pointRuleId": pointRule.pointRuleId,
				"pointId": pointRule.pointId,
				"treeVersionId": pointRule.treeVersionId,
				"ruleItems": pointRule.ruleItems == null ? [] : pointRule.ruleItems.map(r =>
				{
					return {
						label: r.label,
						id: r.id,
						itemId: r.itemId,
						treeVersionId: r.treeVersionId
					}
				})
			}
		};

		const action = 'SaveDPointPointRule';

		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<PhdApiDto.IDPointRule>(endPoint, body, { headers: { 'Prefer': 'return=representation' } });
	}

	saveDPointChoiceRule(choiceRule: PhdApiDto.IDPointRule, deleteAttributeReassignments: boolean = false): Observable<PhdApiDto.IDPointRule>
	{
		// calling unbound odata action
		const body = {
			'treeVersionId': choiceRule.treeVersionId,
			'deleteAttributeReassignments': deleteAttributeReassignments,
			'choiceRule': {
				'id': choiceRule.id,
				'pointRuleId': choiceRule.pointRuleId,
				'pointId': choiceRule.pointId,
				'treeVersionId': choiceRule.treeVersionId,
				'ruleItems': choiceRule.ruleItems == null ? [] : choiceRule.ruleItems.map(r =>
				{
					return {
						label: r.label,
						id: r.id,
						itemId: r.itemId,
						treeVersionId: r.treeVersionId
					}
				})
			}
		};

		const action = 'SaveDPointChoiceRule';

		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<PhdApiDto.IDPointRule>(endPoint, body, { headers: { 'Prefer': 'return=representation' } });
	}

	saveDPChoiceChoiceRule(choiceRule: PhdApiDto.IDPChoiceRule, deleteAttributeReassignments: boolean = false): Observable<PhdApiDto.IDPChoiceRule>
	{
		// calling unbound odata action
		const body = {
			deleteAttributeReassignments: deleteAttributeReassignments,
			choiceRule: {
				id: choiceRule.id,
				choiceRuleId: choiceRule.choiceRuleId,
				choiceId: choiceRule.choiceId,
				treeVersionId: choiceRule.treeVersionId,
				ruleItems: choiceRule.ruleItems == null ? [] : choiceRule.ruleItems.map(r =>
				{
					return {
						label: r.label,
						id: r.id,
						itemId: r.itemId,
						treeVersionId: r.treeVersionId
					}
				})
			}
		};

		const action = 'SaveDPChoiceChoiceRule';

		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<PhdApiDto.IDPChoiceRule>(endPoint, body, { headers: { 'Prefer': 'return=representation' } });
	}

	saveChoiceOptionRules(treeVersionId: number, choiceId: number, choiceOptionRules: Array<PhdApiDto.IChoiceOptionRule>): Observable<Array<PhdApiDto.IChoiceOptionRule>>
	{
		// calling unbound odata action
		const body = {
			"treeVersionId": treeVersionId,
			"choiceId": choiceId,
			"choiceOptionRules": choiceOptionRules
		};

		const action = 'SaveChoiceOptionRules';
		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endPoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(result =>
			{
				return result.value as Array<PhdApiDto.IChoiceOptionRule>;
			}));
	}

	saveOptionChoiceRuleChoice(treeVersionId: number, choices: Array<PhdApiDto.IOptionChoiceRuleChoice>): Observable<Array<PhdApiDto.IOptionChoiceRuleChoice>>
	{
		// calling unbound odata action
		const body = {
			"treeVersionId": treeVersionId,
			"optionChoiceRuleChoices": choices
		};

		const action = 'SaveOptionChoiceRuleChoices';
		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endPoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(result =>
			{
				return result.value as Array<PhdApiDto.IOptionChoiceRuleChoice>;
			}));
	}

	saveBaseHouseOption(isBaseHouse: boolean, treeVersionId: number, optionKey: string): Observable<any>
	{
		// calling unbound odata action
		const body = {
			"treeVersionId": treeVersionId,
			"optionKey": optionKey,
			"isBaseHouse": isBaseHouse
		};

		const action = 'SaveBaseHouseOption';
		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endPoint, body);
	}

	saveItemsToTree(parentId: number, ids: number[], parent: DTPoint | DTSubGroup): Observable<boolean>
	{
		if (parent instanceof DTPoint)
		{
			return this.saveChoicesToTree(parentId, ids, parent).pipe(map(choices =>
			{
				if (choices)
				{
					choices.forEach(choice =>
					{
						const ch = new DTChoice(choice);

						if (parent)
						{
							ch.parent = parent;
						}

						if (ch.isDecisionDefault)
						{
							let oldDefault = parent.choices.find(x => x.isDecisionDefault === true);

							if (oldDefault)
							{
								oldDefault.isDecisionDefault = false;
							}
						}

						// add new choices to DTPoints choice list.
						parent.choices.push(ch);
					});

					return true;
				}

				return false;
			}));
		}
		else
		{
			return this.savePointsToTree(parentId, ids, parent).pipe(map(points =>
			{
				if (points)
				{
					points.forEach(point =>
					{
						const dp = new DTPoint(point);

						if (parent)
						{
							dp.parent = parent;
						}

						point.choices.forEach(choice =>
						{
							const ch = new DTChoice(choice);
							ch.parent = dp;
							dp.choices.push(ch);
						});

						// add new points to DTSubGroup points list.
						parent.points.push(dp);
					});

					return true;
				}

				return false;
			}));
		}
	}

	//saves points to tree
	savePointsToTree(parentId: number, ids: number[], parent: DTSubGroup): Observable<Array<PhdApiDto.IDTreePointDto>>
	{
		const batchPoints = ids.map(p =>
		{
			return {
				divDPointCatalogID: p,
				dPointID: 0,
				dSubGroupID: parentId,
				dTreeVersionID: parent.treeVersionId,
			} as PhdEntityDto.IDPointDto;
		});

		const entity = `dPoints`;
		const qryStr = `${entity}`;
		const endPoint = `${settings.apiUrl}${this._batch}`;

		const batchRequests = odataUtils.createBatch<PhdEntityDto.IDPointDto>(batchPoints, "dPointID", qryStr);

		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			switchMap(results =>
			{
				const parsedResults = odataUtils.parseBatchResults<PhdEntityDto.IDPointDto>(results);
				const expand = `dpChoices($expand=divChoiceCatalog($select=choiceLabel)),divDPointCatalog($expand=dPointPickType($select=dPointPickTypeLabel))`;

				return this._http.get<any>(`${settings.apiUrl}dPoints?${this._ds}filter=dPointID in (${parsedResults.map(r => r.dPointID).join(',')})&${this._ds}expand=${expand}`);
			}),
			map(results =>
			{

				return results.value.map(x =>
				{
					return {
						choices: x.dpChoices.map(c =>
						{
							return {
								description: c.dpChoiceDescription,
								divChoiceCatalogId: c.divChoiceCatalogID,
								id: c.dpChoiceID,
								imagePath: c.imagePath,
								hasImage: c.hasImage,
								isDecisionDefault: c.isDecisionDefault,
								isSelectable: c.isSelectable,
								label: c.divChoiceCatalog.choiceLabel,
								sortOrder: c.dpChoiceSortOrder,
								treePointId: c.dPointID,
								treeVersionId: c.dTreeVersionID,
								choiceMaxQuantity: c.maxQuantity
							} as PhdApiDto.IDTreeChoiceDto;
						}),
						description: x.divDPointCatalog.dPointDescription,
						divPointCatalogId: x.divDPointCatalogID,
						id: x.dPointID,
						isQuickQuoteItem: x.isQuickQuoteItem,
						isStructuralItem: x.isStructuralItem,
						label: x.divDPointCatalog.dPointLabel,
						pointPickTypeId: x.dPointPickTypeID,
						pointPickTypeLabel: x.divDPointCatalog.dPointPickType.dPointPickTypeLabel,
						sortOrder: x.dPointSortOrder,
						subGroupId: x.dSubGroupID,
						treeVersionId: x.dTreeVersionID
					} as PhdApiDto.IDTreePointDto;
				});
			}));
	}

	saveChoicesToTree(parentId: number, ids: number[], parent: DTPoint): Observable<Array<PhdApiDto.IDTreeChoiceDto>>
	{
		const batchChoices = ids.map(c =>
		{
			return {
				dpChoiceID: 0,
				divChoiceCatalogID: c,
				dPointID: parentId,
				dTreeVersionID: parent.treeVersionId
			} as PhdEntityDto.IDPChoiceDto;
		});

		const entity = `dPChoices`;
		const qryStr = `${entity}`;
		const endPoint = `${settings.apiUrl}${this._batch}`;

		const batchRequests = odataUtils.createBatch<PhdEntityDto.IDPChoiceDto>(batchChoices, "dpChoiceID", qryStr);

		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			switchMap(results =>
			{
				const parsedResults = odataUtils.parseBatchResults<PhdEntityDto.IDPChoiceDto>(results);
				const expand = `divChoiceCatalog($select=choiceLabel)`;

				return this._http.get<any>(`${settings.apiUrl}dPChoices?${this._ds}filter=dpChoiceID in (${parsedResults.map(r => r.dpChoiceID).join(',')})&${this._ds}expand=${expand}`);
			}),
			map(results =>
			{
				return results.value.map(x =>
				{
					return {
						description: x.dpChoiceDescription,
						divChoiceCatalogId: x.divChoiceCatalogID,
						id: x.dpChoiceID,
						imagePath: x.imagePath,
						hasImage: x.hasImage,
						isDecisionDefault: x.isDecisionDefault,
						isSelectable: x.isSelectable,
						label: x.divChoiceCatalog.choiceLabel,
						sortOrder: x.dpChoiceSortOrder,
						treePointId: x.dPointID,
						treeVersionId: x.dTreeVersionID,
						choiceMaxQuantity: x.maxQuantity
					} as PhdApiDto.IDTreeChoiceDto;
				});
			}));
	}

	saveOptionChoiceRules(optionChoiceRule: PhdApiDto.IOptionChoiceRule, assocId: number): Observable<PhdApiDto.IOptionChoiceRule>
	{
		// calling unbound odata action
		const body = {
			'treeVersionId': optionChoiceRule.treeVersionId,
			'assocId': assocId,
			'optionChoiceRule': {
				'integrationKey': optionChoiceRule.integrationKey,
				'id': optionChoiceRule.id,
				'treeVersionId': optionChoiceRule.treeVersionId,
				'planOptionId': optionChoiceRule.planOptionId,
				'choices': optionChoiceRule.choices,
				'replaceRules': optionChoiceRule.replaceRules
			}
		};

		const action = 'SaveOptionChoiceRules';
		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<PhdApiDto.IOptionChoiceRule>(endPoint, body, { headers: { 'Prefer': 'return=representation' } });
	}

	deleteDraftTreeVersion(treeVersionId: number): Observable<any>
	{
		this.treeVersionIsLoading = true;
		const entity = `dTreeVersions(${treeVersionId})`;

		const endPoint = `${settings.apiUrl}${entity}`;

		this.treeVersionIsLoading = false;
		return this._http.delete<PhdApiDto.IDTreeRule>(endPoint);
	}

	deleteChoiceFromTree(treeVersionId: number, choiceId: number): Observable<PhdApiDto.IDTreeRule>
	{
		const entity = `dPChoices(${choiceId})`;
		const expand = `points`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.delete<PhdApiDto.IDTreeRule>(endPoint, { headers: { 'Prefer': 'return=representation' } });
	}

	deletePointFromTree(treeVersionId: number, pointId: number): Observable<PhdApiDto.IDTreeRule>
	{
		const entity = `dPoints(${pointId})`;
		const expand = `points`;

		const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}`;

		const endPoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.delete<PhdApiDto.IDTreeRule>(endPoint, { headers: { 'Prefer': 'return=representation' } });
	}

	deletePointRuleAssoc(pointRulePointAssocId: number): Observable<any>
	{
		const entity = `dPointDPointRuleAssocs(${pointRulePointAssocId})`;
		const endPoint = `${settings.apiUrl}${entity}`;

		return this._http.delete<any>(endPoint);
	}

	deleteDPointDPointRuleAssocs(pointRulePointAssocId: number, deleteAttributeReassignments: boolean): Observable<any>
	{
		// calling unbound odata action
		const body = {
			'pointRulePointAssocId': pointRulePointAssocId,
			'deleteAttributeReassignments': deleteAttributeReassignments
		};

		const action = 'DeleteDPointDPointRuleAssocs';
		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endPoint, body);
	}

	deleteChoiceRuleAssoc(choiceRuleChoiceAssocId: number): Observable<any>
	{
		const entity = `dPChoiceDPChoiceRuleAssocs(${choiceRuleChoiceAssocId})`;
		const endPoint = `${settings.apiUrl}${entity}`;

		return this._http.delete<any>(endPoint);
	}

	deleteDPChoiceDPChoiceRuleAssocs(choiceRuleChoiceAssocId: number, deleteAttributeReassignments: boolean): Observable<any>
	{
		// calling unbound odata action
		const body = {
			'choiceRuleChoiceAssocId': choiceRuleChoiceAssocId,
			'deleteAttributeReassignments': deleteAttributeReassignments
		};

		const action = 'DeleteDPChoiceDPChoiceRuleAssocs';
		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endPoint, body);
	}

	deleteOptionChoiceRuleChoice(treeVersionId: number, choiceOptionRuleId: number): Observable<any>
	{
		const entity = `dPChoiceOptionRuleAssocs(${choiceOptionRuleId})`;
		const endPoint = `${settings.apiUrl}${entity}`;

		return this._http.delete<any>(endPoint);
	}

	toggleInteractiveFloor(subGroupId: number, useInteractiveFloorplan: boolean)
	{
		const body = { "useInteractiveFloorplan": useInteractiveFloorplan };
		const endPoint = `${settings.apiUrl}dSubGroups(${subGroupId})`;

		return this._http.patch(endPoint, body)
	}

	deleteAttributeReassignment(attributeReassignmentId: number): Observable<any>
	{
		const entity = `attributeReassignments(${attributeReassignmentId})`;
		const endPoint = `${settings.apiUrl}${entity}`;

		return this._http.delete<any>(endPoint);
	}

	deleteAllAttributeReassignment(treeVersionId: number, dpChoiceOptionRuleAssocID: number): Observable<any>
	{
		// calling unbound odata action
		const body = {
			'dpChoiceOptionRuleAssocID': dpChoiceOptionRuleAssocID,
		};

		const action = 'DeleteAttributeReassignmentAll';
		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endPoint, body);
	}

	saveAttributeReassignment(attributeReassignment: PhdApiDto.IAttributeReassignmentDto): Observable<AttributeReassignment>
	{
		const action = 'AddAttributeReassignment';
		const endPoint = `${settings.apiUrl}${action}`;

		return this._http.post<any>(endPoint, attributeReassignment, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				let dto = response as PhdEntityDto.IAttributeReassignmentDto;
				let attrReDto = {
					attributeReassignmentId: dto.attributeReassignmentID,
					attributeGroupId: dto.attributeGroupID,
					toChoiceId: dto.toDPChoiceID,
					dpChoiceOptionRuleAssocID: dto.dpChoiceOptionRuleAssocID,
					treeVersionId: dto.dTreeVersionID
				} as PhdApiDto.IAttributeReassignment;

				return new AttributeReassignment(attrReDto);
			}));
	}

	getAttributeReassignment(treeVersionId: number, optionRuleId: number, attributeGroupId: number): Observable<AttributeReassignment>
	{
		const entity = `attributeReassignments`;
		const expand = `toDPChoice($select=dpChoiceID;$expand=divChoiceCatalog($select=choiceLabel),dPoint($select=dPointID;$expand=divDPointCatalog($select=dPointLabel)))`;
		const filter = `dTreeVersionID eq ${treeVersionId} and dpChoice_OptionRuleAssoc/optionRule/optionRuleID eq ${optionRuleId} and attributeGroupId eq ${attributeGroupId}`;
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}`;
		const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(response =>
			{
				let dto = response.value[0] as PhdEntityDto.IAttributeReassignmentDto;
				let attrReDto = {
					attributeReassignmentId: dto.attributeReassignmentID,
					attributeGroupId: dto.attributeGroupID,
					toChoiceId: dto.toDPChoiceID,
					dpChoiceOptionRuleAssocID: dto.dpChoiceOptionRuleAssocID,
					treeVersionId: dto.dTreeVersionID,
					choiceLabel: dto.todpChoice.divChoiceCatalog.choiceLabel,
					dPointLabel: dto.todpChoice.dPoint.divDPointCatalog.dPointLabel
				} as PhdApiDto.IAttributeReassignment;

				return new AttributeReassignment(attrReDto);
			}));
	}

	hasAttributeReassignmentsByChoiceId(choiceId: number): Observable<boolean>
	{
		const entity = `attributeReassignments`;
		const filter = `(toDPChoiceID eq ${choiceId} or dpChoice_OptionRuleAssoc/dpChoiceID eq ${choiceId}) `;
		const select = `attributeReassignmentID`;
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}count=true`;
		const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(response =>
			{
				let count = response['@odata.count'] as number;

				return count > 0;
			}));
	}

	hasAttributeReassignmentsByChoiceIds(choices: number[]): Observable<boolean>
	{
		const batchGuid = odataUtils.getNewGuid();
		let requests = choices.map(choiceId =>
		{
			const entity = `attributeReassignments`;
			const filter = `(toDPChoiceID eq ${choiceId} or dpChoice_OptionRuleAssoc/dpChoiceID eq ${choiceId}) `;
			const select = `attributeReassignmentID`;
			const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}count=true`;
			const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

			return odataUtils.createBatchGet(endpoint);
		});

		let headers = odataUtils.createBatchHeaders(batchGuid);
		let batch = odataUtils.createBatchBody(batchGuid, requests);

		return this._http.post(`${settings.apiUrl}$batch`, batch, { headers: headers }).pipe(
			map((response: any) =>
			{
				let bodies: any[] = response.responses.map(r => r.body);
				let hasReassignments = bodies.some(body =>
				{
					let count = body['@odata.count'] as number;

					return count > 0;
				});

				return hasReassignments;
			})
		);
	}

	hasAttributeReassignment(dpChoiceOptionRuleAssocID: number): Observable<boolean>
	{
		const entity = `attributeReassignments`;
		const filter = `dpChoiceOptionRuleAssocID eq ${dpChoiceOptionRuleAssocID}`;
		const select = `attributeReassignmentID`;
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}count=true`;
		const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(response =>
			{
				let count = response['@odata.count'] as number;

				return count > 0;
			}));
	}

	hasAttributeReassignmentByChoice(id: number, choices: number[], ruleType: RuleType): Observable<number[]>
	{
		const batchGuid = odataUtils.getNewGuid();
		let requests = choices.map(choiceId =>
		{
			const entity = `attributeReassignments`;
			const expand = `dpChoice_OptionRuleAssoc($select=dpChoiceID)`;
			let filter = `dpChoice_OptionRuleAssoc/dpChoiceID eq ${choiceId}`;

			if (ruleType === 'choice')
			{
				filter += ` and toDPChoiceID eq ${id}`;
			}
			else
			{
				filter += ` and toDPChoice/dPointID eq ${id}`;
			}

			const select = `attributeReassignmentID`;
			const qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
			const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

			return odataUtils.createBatchGet(endpoint);
		});

		let headers = odataUtils.createBatchHeaders(batchGuid);
		let batch = odataUtils.createBatchBody(batchGuid, requests);

		return this._http.post(`${settings.apiUrl}$batch`, batch, { headers: headers }).pipe(
			map((response: any) =>
			{
				let bodies = response.responses.map(r => r.body);
				let choices: number[] = [];

				bodies.forEach(body =>
				{
					let value = body.value.length > 0 ? body.value[0] : null;

					if (value)
					{
						choices.push(value.dpChoice_OptionRuleAssoc.dpChoiceID);
					}
				});

				return choices;
			})
		);
	}

	/**
	 * *Returns any Point to Choice and Choice to Choice rules
	 * @param choiceId
	 */
	getChoiceRulesByChoiceId(choiceId: number): Observable<PhdEntityDto.IDPChoiceDto>
	{
		const entity = `dPChoices`;
		const expand = `dPChoiceRule_DPChoiceAssoc($select=dpChoiceRuleAssocID;$expand=dPChoice_DPChoiceRuleAssoc($select=dpChoiceID)), dPointRuleAssoc_DPChoiceAssoc($select=dPointRuleDPointAssocID;$expand=dPoint_DPointRuleAssoc($select=dPointID))`;
		const filter = `dpChoiceID eq ${choiceId}`;
		const select = `dpChoiceID`;
		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}`;
		const endpoint = `${settings.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(response =>
			{
				let dto = response.value[0] as PhdEntityDto.IDPChoiceDto;

				return dto;
			}));
	}

	muDivisionMapping(selectedPlans: DivAttributeWizPlan[], selectedChoices: DivAttributeWizChoice[], option: DivAttributeWizOption, selectedMapping: string): Observable<DivAttributeWizPlan[]>
	{
		const body = {
			"plans": selectedPlans.map(plan =>
			{
				return { financialCommunityId: plan.financialCommunityId, financialPlanIntegrationKey: plan.financialPlanIntegrationKey };
			}),
			"choices": selectedChoices.map(c =>
			{
				return { id: c.id };
			}),
			"option": { id: option.financialOptionIntegrationKey, selectedMapping: selectedMapping }
		};

		const action = 'MUDivisionMapping';
		const endPoint = `${settings.apiUrl}${action}`;

		return withSpinner(this._http).post<any>(endPoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(result =>
			{
				result['value'].forEach(v =>
				{
					let plan = selectedPlans.find(p => p.financialPlanIntegrationKey === v.financialPlanIntegrationKey && p.financialCommunityId === v.financialCommunityId);

					if (plan)
					{
						plan.draftType = v.draftType;
					}
				});

				return selectedPlans;
			}));
	}

	muChoiceUpdate(selectedPlans: DivCatWizPlan[], selectedChoices: DivCatWizChoice[]): Observable<DivCatWizPlan[]>
	{
		const body = {
			"plans": selectedPlans.map(plan =>
			{
				return { financialCommunityId: plan.financialCommunityId, financialPlanIntegrationKey: plan.financialPlanIntegrationKey };
			}),
			"choices": selectedChoices.map(c =>
			{
				return { id: c.id, action: c.action.toString() };
			})
		};

		const action = 'MUChoiceUpdate';
		const endPoint = `${settings.apiUrl}${action}`;

		return withSpinner(this._http).post<any>(endPoint, body, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(result =>
			{
				result['value'].forEach(v =>
				{
					let plan = selectedPlans.find(p => p.financialPlanIntegrationKey === v.financialPlanIntegrationKey);

					if (plan)
					{
						plan.draftType = v.draftType;
					}
				});

				return selectedPlans;
			}));
	}

	muExportUpdateTreeResultsToExcel(selectedChoices: DivCatWizChoice[], selectedPlans: DivCatWizPlan[]): Observable<string>
	{
		const action = `MUExportUpdateTreeResultsToExcel`;
		const url = `${settings.apiUrl}${action}`;
		const headers = new HttpHeaders({
			'Content-Type': 'application/json',
			'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		});

		const data = {
			data: {
				selectedChoices: selectedChoices.map(c =>
				{
					return { id: c.id, pointLabel: c.pointLabel, choiceLabel: c.choiceLabel, action: c.action.toString() };
				}),
				selectedPlans: selectedPlans
			}
		};

		return withSpinner(this._http).post(url, data, { headers: headers, responseType: 'blob' }).pipe(
			map(response =>
			{
				return window.URL.createObjectURL(response);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	muExportDivMappingResultsToExcel(selectedOption: DivAttributeWizOption, selectedChoices: DivAttributeWizChoice[], selectedPlans: DivAttributeWizPlan[]): Observable<string>
	{
		const action = `MUExportDivMappingResultsToExcel`;
		const url = `${settings.apiUrl}${action}`;
		const headers = new HttpHeaders({
			'Content-Type': 'application/json',
			'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		});

		const data = {
			data: {
				selectedOption: { category: selectedOption.category, subCategory: selectedOption.subCategory, financialOptionIntegrationKey: selectedOption.financialOptionIntegrationKey, optionSalesName: selectedOption.optionSalesName },
				selectedChoices: selectedChoices.map(c =>
				{
					return { id: c.id, choiceLabel: c.label };
				}),
				selectedPlans: selectedPlans
			}
		};

		return withSpinner(this._http).post(url, data, { headers: headers, responseType: 'blob' }).pipe(
			map(response =>
			{
				return window.URL.createObjectURL(response);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	private createTreeFromDto(tree: PhdApiDto.IDTreeDto): DTree
	{
		const groups = tree.treeVersion.groups.map(g =>
		{
			let group = new DTGroup(g,
				g.subGroups.map(s =>
				{
					let subGroup = new DTSubGroup(s,
						s.points.map(p =>
						{
							var dp = new DTPoint(p, p.choices.map(c =>
							{
								let choice = new DTChoice(c);

								return choice;
							}));

							dp.choices.map(c => c.parent = dp);

							return dp;
						}));

					subGroup.points.map(p => p.parent = subGroup);

					return subGroup;
				}));

			group.subGroups.map(s => s.parent = group);

			return group;
		});

		const dTree = new DTree(tree, new DTVersion(tree.treeVersion, groups));

		return dTree;
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure.
		console.error(error);

		return _throw(error || 'Server error');
	}
}
