import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, throwError as _throw, of } from 'rxjs';
import { map, catchError, mergeMap } from 'rxjs/operators';
import * as _ from 'lodash';

import { environment } from '../../../../environments/environment';
import { createBatchGet, getNewGuid, createBatchBody, createBatchHeaders } from 'phd-common';
import { SearchEntities, SearchResult, ISearchResults, IFilterItems } from '../../shared/models/search.model';

@Injectable()
export class SearchService
{
	constructor(private _http: HttpClient) { }

	private _batch = "$batch";

	/**
	* Searches homesites
	* @param searchParams
	*/
	public searchHomeSites(filters: Array<IFilterItems>, financialCommunityId?: string, salesCommunityId?: string): Observable<Array<SearchResult>>
	{
		let filter: string = "financialCommunity/" + (financialCommunityId ? `id eq ${financialCommunityId}` : `salesCommunityId eq ${salesCommunityId}`);

		// build the $filter string
		filters.map(filterItems =>
		{
			// all search groups are at least an AND before the group
			// even though the group itself may be OR between items in the group
			filter += ' and ';

			// if the group has more than one item in it, then we want parens around it
			if (filterItems.items.length > 1)
			{
				filter += '(';
			}

			filterItems.items.map(f =>
			{
				if (filterItems.collection)
				{
					// viewAdjacency/all(i: i/description eq 'City View')
					filter += `${filterItems.collection}/all(i: i/`;
				}

				if (f.equals)
				{
					const val: string | number = typeof f.value === 'string' ? `'${f.value}'` : f.value;

					filter += `${f.name} eq ${val}`;
				}
				else
				{
					filter += `contains(${f.name}, '${f.value}')`;
				}

				if (filterItems.collection)
				{
					// viewAdjacency/all(i: i/description eq 'City View')
					filter += `)`;
				}

				// the type can be AND or OR or a mix
				filter += (f.andOr) ? ` ${f.andOr} ` : '';
			});

			if (filterItems.items.length > 1)
			{
				filter += ')';
			}

			// For example, the address search for '817' should look like this...
			// (remmber, before this is the query for the community, so any filter search will start with "and")
			// and (contains(streetAddress1, '817') or contains(streetAddress2, '817') or contains(city, '817') or contains(state, '817'))
			// while the homesite # search for 120 wii just be...
			// and contains(lotBlock, '120')
			// if the user search for both, it'd look like...
			// and contains(lotBlock, '120') and (contains(streetAddress1, '817') or contains(streetAddress2, '817') or contains(city, '817') or contains(state, '817'))
			// if it is a collection it uses the "all" method, which can then have contains() within it, or...
			// a property or collection can use 'eq' instead of contains()

		});

		let selectData: SearchEntities = new SearchEntities();
		// Top level select that will appear as the value of $select in the call's parameters
		selectData.lots = `id,lotBlock,streetAddress1,streetAddress2,unitNumber,city,stateProvince,postalCode,country,foundationType,lotBuildTypeDesc,lotStatusDescription,premium`;
		// Selects that are going to be included inside the expands below
		selectData.jobs = 'id, planId, createdBy,jobTypeName';
		selectData.jobSalesAgreementAssocs = 'id';
		selectData.planAssociations = 'isActive';
		selectData.planCommunity = 'id,planSalesName';
		selectData.salesAgreement = 'id, salesAgreementNumber,status';
		selectData.salesCommunity = 'id,name,number';
		selectData.financialCommunity = 'id,name,number,marketId,salesCommunityId';
		selectData.scenarios = 'id,name';
		selectData.jobChangeOrderGroup = 'id,jobId,jobChangeOrderGroupDescription,salesStatusDescription';

		let expandData: SearchEntities = new SearchEntities();

		// the order here is important, do not reorder since some values must be defined before setting the next
		expandData.physicalLotTypes = 'lotPhysicalLotTypeAssocs($expand=physicalLotType)';
		expandData.scenarios = `scenarios($select=${selectData.scenarios})`;
		expandData.planCommunity = `planCommunity($select=${selectData.planCommunity})`;
		expandData.planAssociations = `planAssociations($select=${selectData.planAssociations};$expand=${expandData.planCommunity})`;
		expandData.salesCommunity = `salesCommunity($select=${selectData.salesCommunity})`;
		expandData.financialCommunity = `financialCommunity($select=${selectData.financialCommunity};$expand=${expandData.salesCommunity})`;
		expandData.salesAgreement = `salesAgreement($select=${selectData.salesAgreement};$expand=jobSalesAgreementAssocs($select=jobId,isActive,salesAgreementId;$orderby=createdUtcDate desc;$top=1))`;
		expandData.jobSalesAgreementAssocs = `jobSalesAgreementAssocs($select=${selectData.jobSalesAgreementAssocs};$expand=${expandData.salesAgreement})`;
		expandData.jobChangeOrderGroup = `jobChangeOrderGroups($select=${selectData.jobChangeOrderGroup};$orderby=createdUtcDate desc;$top=1;$expand=jobChangeOrderGroupSalesAgreementAssocs($select=jobChangeOrderGroupId,salesAgreementId,changeOrderGroupSequence), jobChangeOrders($select=id,jobChangeOrderGroupId,jobChangeOrderTypeDescription;$expand=jobSalesChangeOrderBuyers($select=id,jobChangeOrderId,buyerName, firstName, lastName, isPrimaryBuyer, sortKey)))`;
		expandData.jobs = `jobs($select=${selectData.jobs};$expand=${expandData.jobSalesAgreementAssocs},${expandData.jobChangeOrderGroup},planCommunity($select=id,planSalesName);)`;

		// top level expands
		let expands = `${expandData.jobs},${expandData.financialCommunity},${expandData.planAssociations},${expandData.physicalLotTypes},${expandData.scenarios}`;

		// putting it all together - DO NOT encode since it will be encoded during the batch process
		const qryStr = `$expand=${expands}` +
			`&$select=${selectData.lots}` +
			`&$filter=${filter}`;

		let url = environment.apiUrl + `lots?${qryStr}`;

		const batchRequests = createBatchGet<ISearchResults>(url);
		const batchGuid = getNewGuid();
		const batchBody = createBatchBody(batchGuid, [batchRequests], createBatchHeaders(batchGuid));
		const headers = new HttpHeaders(createBatchHeaders(batchGuid));

		return this._http.post<any>(`${environment.apiUrl}${this._batch}`, batchBody, { headers: headers, responseType: 'json' }).pipe(
			map(batchResponse =>
			{
				return _.flatMap(batchResponse.responses, response => response.body.value).map(value => new SearchResult(value));
			}),
			mergeMap(result =>
			{
				const needBuyers = result.filter(item => item.salesAgreements.some(sa => sa.jobSalesAgreementAssocs.some(jsaa => jsaa.isActive)));

				if (needBuyers.length > 0)
				{
					const salesAgreementIds = needBuyers.map(sr => sr.salesAgreements.find(sa => sa.jobSalesAgreementAssocs.some(jsaa => jsaa.isActive)).id);
					const expandBuyers = `buyers($expand=opportunityContactAssoc($expand=contact($select=firstName,lastName)))`;
					const saFilter = `id in (${salesAgreementIds})`;
					const saUrl = `${environment.apiUrl}salesAgreements?${encodeURIComponent('$')}filter=${encodeURIComponent(saFilter)}&${encodeURIComponent('$')}expand=${encodeURIComponent(expandBuyers)}`;

					return this._http.get<any>(saUrl).pipe(
						map(response =>
						{
							response.value.forEach(sa =>
							{
								const saLot = result.find(lot => !!lot.salesAgreements.find(salesAgreement => salesAgreement.id === sa.id));

								if (sa.buyers.length > 0)
								{
									saLot.buyers = [];

									//get list of primary buyers
									const primaryBuyerList = sa.buyers.filter(buyer => buyer.isPrimaryBuyer === true)
										.map(buyer => buyer.opportunityContactAssoc.contact);

									//get list of cobuyers in order by sort key, lowest sort key values taking highest priority
									const coBuyerList = sa.buyers.filter(buyer => buyer.isPrimaryBuyer === false)
										.sort((a, b) => { return a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0; })
										.map(buyer => buyer.opportunityContactAssoc.contact);

									//associate buyers to lot
									saLot.buyers.push(...primaryBuyerList, ...coBuyerList);
								}
							});

							return result;
						})
					);
				}

				return of(result);
			}),
			catchError(error =>
			{
				console.log('error', error);

				return _throw(error);
			})
		);
	}
}
