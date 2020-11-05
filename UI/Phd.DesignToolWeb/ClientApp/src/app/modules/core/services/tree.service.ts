import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs/Observable';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { _throw } from 'rxjs/observable/throw';
import { EMPTY as empty } from 'rxjs';
import { of } from 'rxjs/observable/of';

import { environment } from '../../../../environments/environment';

import { Tree, TreeBaseHouseOption } from '../../shared/models/tree.model.new';
import { TreeVersionRules, OptionRule } from '../../shared/models/rule.model.new';

import { OptionImage } from '../../shared/models/tree.model.new';
import { withSpinner } from 'phd-common/extensions/withSpinner.extension';
import { createBatchGet, createBatchHeaders, createBatchBody } from '../../shared/classes/odata-utils.class';
import { newGuid } from '../../shared/classes/guid.class';
import { isJobChoice } from '../../shared/classes/tree.utils';
import { IdentityService } from 'phd-common/services';
import { JobChoice } from '../../shared/models/job.model';
import { ChangeOrderChoice } from '../../shared/models/job-change-order.model';

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

		const entity = 'dTreeVersions';
		const expand = `dTree($select=dTreeID;$expand=plan($select=integrationKey),org($select = edhFinancialCommunityId)),baseHouseOptions($select=planOption;$expand=planOption($select=integrationKey))`;
		const filter = `publishStartDate le now() and (publishEndDate eq null or publishEndDate gt now())${communityFilter}`;
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

				return _throw(error);
			})
		);
	}

	getTree(treeVersionId: number, skipSpinner?: boolean): Observable<Tree>
	{
		const entity = `GetTreeDto(TreeVersionID=${treeVersionId})`;
		const expand = `treeVersion($expand=groups($expand=subGroups($expand=points($expand=choices)))) `;

		const endPoint = environment.apiUrl + `${entity}?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}`;

		return (skipSpinner ? this.http : withSpinner(this.http)).get<Tree>(endPoint).pipe(
			tap(response => response['@odata.context'] = undefined),
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

				return _throw(error);
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
		const select = `planOptionID, imageURL, sortKey`;
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

	getChoiceCatalogIds(choices: Array<JobChoice | ChangeOrderChoice>): Observable<Array<JobChoice | ChangeOrderChoice>>
	{
		return this.identityService.token.pipe(
			switchMap((token: string) =>
			{
				const choiceIds: Array<number> = choices.map(x => isJobChoice(x) ? x.dpChoiceId : x.decisionPointChoiceID);
				const filter = `dpChoiceID in (${choiceIds})`;
				const select = 'dpChoiceID,divChoiceCatalogID';
				const url = `${environment.apiUrl}dPChoices?${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

				return this.http.get<any>(url);
			}),
			map((response: any) =>
			{
				const newChoices = [...choices];
				const changedChoices = [];
				const updatedChoices = [];
				if (newChoices.length > 0) {
					newChoices.forEach(c => {
						const choiceId = isJobChoice(c) ? c.dpChoiceId : c.decisionPointChoiceID;
						const respChoice = response.value.find(r => r.dpChoiceID === choiceId);

						if (respChoice) {
							changedChoices.push({ ...c, divChoiceCatalogId: respChoice.divChoiceCatalogID });
						} else {
							changedChoices.push({ ...c });
						}
					});

					changedChoices.forEach(cc => {
						if (isJobChoice(cc)) {
							updatedChoices.push(new JobChoice(cc));
						} else {
							updatedChoices.push(new ChangeOrderChoice(cc));
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
				let headers = createBatchHeaders(token, guid);
				let batch = createBatchBody(guid, requests);

				return this.http.post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				return response.responses.map(r => r.body);
			})
		);
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
				let headers = createBatchHeaders(token, guid);
				let batch = createBatchBody(guid, requests);

				return this.http.post(`${environment.apiUrl}$batch`, batch, { headers: headers });
			}),
			map((response: any) =>
			{
				let bodyValue: any[] = response.responses.filter(r => r.body.value.length > 0).map(r => r.body.value);
				let optionRules = _.flatten(bodyValue);

				let mappings: { [optionNumber: string]: OptionRule } = {};

				options.forEach(opt =>
				{
					let res = optionRules.find(or => or.planOption.integrationKey === opt.optionNumber && or.dpChoice_OptionRuleAssoc.some(r => r.dpChoiceID === opt.dpChoiceId));

					mappings[opt.optionNumber] = !!res ? <OptionRule>{
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
