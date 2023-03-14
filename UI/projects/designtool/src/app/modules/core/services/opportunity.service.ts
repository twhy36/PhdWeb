import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import * as _ from 'lodash';

import { environment } from '../../../../environments/environment';

import { OpportunityContactAssoc } from 'phd-common';

@Injectable()
export class OpportunityService
{
	constructor(private _http: HttpClient) { }

	/**
	 * Gets ContactOpportunityAssoc from EDH
	 * @param oppId
	 */
	getOpportunityContactAssoc(oppId: string): Observable<OpportunityContactAssoc>
	{
		const entity = 'opportunities';
		const expand = `opportunityContactAssocs($filter=isPrimary eq true;$select=id,contactId)`;
		const filter = `dynamicsOpportunityId eq ${oppId}`;
		const select = 'id,salesCommunityId,dynamicsOpportunityId';
		const endpoint = `${environment.apiUrl}${entity}?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return this._http.get<any>(endpoint).pipe(
			switchMap(response =>
			{
				if (!response.value || !response.value.length || !response.value[0].opportunityContactAssocs || !response.value[0].opportunityContactAssocs.length)
				{
					return of(response);
				}

				const entity = 'contacts';
				const filter = `id eq ${response.value[0].opportunityContactAssocs[0].contactId}`;
				const select = 'id,prefix,firstName,middleName,lastName,suffix,preferredCommunicationMethod,dynamicsIntegrationKey';
				const endpoint = `${environment.apiUrl}${entity}?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

				return this._http.get<any>(endpoint).pipe(
					map(response2 =>
					{
						if (response2.value && response2.value.length)
						{
							response.value[0].opportunityContactAssocs[0].contact = response2.value[0];
						}

						return response;
					})
				);
			}),
			map(response =>
			{
				if (response.value && response.value.length > 0
					&& response.value[0].opportunityContactAssocs
					&& response.value[0].opportunityContactAssocs.length)
				{
					const ctctOppAssoc = new OpportunityContactAssoc({
						id: response.value[0].opportunityContactAssocs[0].id,
						contact: response.value[0].opportunityContactAssocs[0].contact,
						contactId: response.value[0].opportunityContactAssocs[0].contactId,
						isPrimary: true,
						opportunity: {
							id: response.value[0].id,
							dynamicsOpportunityId: response.value[0].dynamicsOpportunityId,
							salesCommunityId: response.value[0].salesCommunityId
						}
					});

					return ctctOppAssoc;
				}
				else
				{
					return null;
				}
			})
			, catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	/**
	 * this will create the contactOpportunityAssoc record in EDH or get the existing one
	 * */
	trySaveOpportunity(opportunity: OpportunityContactAssoc): Observable<OpportunityContactAssoc>
	{
		// deep copy opp state and remove fullname from opp.contact before saving
		const opp = { ...opportunity, contact: _.omitBy(opportunity.contact, k => !k) };

		const entity = 'opportunityContactAssocs';
		const endpoint = environment.apiUrl + entity;

		return this._http.post<OpportunityContactAssoc>(endpoint, opp).pipe(
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}
}
