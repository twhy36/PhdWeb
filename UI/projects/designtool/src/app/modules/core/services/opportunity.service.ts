import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable ,  Subscriber ,  throwError as _throw ,  of } from 'rxjs';
import { catchError, map, finalize, switchMap } from 'rxjs/operators';

import * as _ from 'lodash';

import { environment } from '../../../../environments/environment';

import { OrganizationService } from './organization.service';
import { CrmOpportunity, OpportunityContactAssoc, IOpportunityContactAssoc } from '../../shared/models/opportunity.model';

import { bind } from '../../shared/classes/decorators.class';

@Injectable()
export class OpportunityService {
    private _ds: string = encodeURIComponent("$");
	
	private crmSubscriber: Subscriber<OpportunityContactAssoc>;
	isListeningToCrm = false;

    constructor(private _orgService: OrganizationService, private _http: HttpClient) { }

	/**
	 * Gets ContactOpportunityAssoc from EDH
	 * @param oppId
	 */
	getOpportunityContactAssoc(oppId: string): Observable<OpportunityContactAssoc> {
		const entity = 'opportunities';
		const expand = `opportunityContactAssocs($filter=isPrimary eq true;$select=id,contactId)`;
		const filter = `dynamicsOpportunityId eq ${oppId}`;
		const select = 'id,salesCommunityId,dynamicsOpportunityId'
		const endpoint = `${environment.apiUrl}${entity}?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return this._http.get<any>(endpoint).pipe(
			switchMap(response => {
				if (!response.value || !response.value.length || !response.value[0].opportunityContactAssocs || !response.value[0].opportunityContactAssocs.length) return of(response);

				const entity = 'contacts';
				const filter = `id eq ${response.value[0].opportunityContactAssocs[0].contactId}`;
				const select = 'id,prefix,firstName,middleName,lastName,suffix,preferredCommunicationMethod,dynamicsIntegrationKey'
				const endpoint = `${environment.apiUrl}${entity}?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

				return this._http.get<any>(endpoint).pipe(
					map(response2 => {
						if (response2.value && response2.value.length) 
							response.value[0].opportunityContactAssocs[0].contact = response2.value[0];

						return response;
					})
				);
			}),
			map(response => {
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
				else {
					return null;
				}
			})
			, catchError(error => {
				console.error(error);
				return _throw(error);
			})
		);
	}

	/**
	 * this will create the contactOpportunityAssoc record in EDH or get the existing one
	 * */
	trySaveOpportunity(opportunity: OpportunityContactAssoc): Observable<OpportunityContactAssoc> {
		// deep copy opp state and remove fullname from opp.contact before saving
		const opp = { ...opportunity, contact: _.omitBy(opportunity.contact, k => !k) };

		const entity = 'opportunityContactAssocs';
		const endpoint = environment.apiUrl + entity;

		return this._http.post<OpportunityContactAssoc>(endpoint, opp).pipe(
			catchError(error => {
				console.error(error);
				return _throw(error);
			})
		);
    }

	getOpportunityFromCRM(oppId: string): Observable<OpportunityContactAssoc> {
		return new Observable<OpportunityContactAssoc>(sub => {
            this.crmSubscriber = sub;

            // add event listener to get crm data
            window.addEventListener("message", this.handleMessageEvent);
            console.log("started listening to messages from CRM");

            // send message to crm window that we would like its opp data
            if (window.opener) {
                window.opener.postMessage(null, "*" /*"http://phd.pulte.com"*/);
            }
        });
    }
	
	/**
	 * Handles the message posted by CRM to get opp/contact data and then gets the sales community id frm EDH
	 * @param evt
	 */
	@bind
    handleMessageEvent(evt) {
        if (evt.origin.indexOf("pultegroup.com") !== -1 && evt.data.opportunityid) {
            this.stopListening();
            const crmOpp = evt.data as CrmOpportunity;

            // get the sales community id from crm
            this._orgService.getSalesCommunityId(crmOpp._pulte_communityid_value)
                .pipe(
					finalize(() => this.crmSubscriber.complete())
                )
                .subscribe(scId => {
                    let opp = this.mapToContactOppAssoc(crmOpp);
                    opp.opportunity.salesCommunityId = scId;
                    console.log("Opportunity:", opp);

                    this.crmSubscriber.next(opp);
                });

        }
	}

	private stopListening() {
		window.removeEventListener("message", this.handleMessageEvent);
		console.log("stopped listening to messages from CRM");
	}

	private mapToContactOppAssoc(opp: CrmOpportunity): OpportunityContactAssoc {

		// map from CRM preferred contact method to EDH preferred communication method
		// possible CRM values are "Any", "Email", and "Phone"
		let preferredCommunicationMethod: string;
		switch (opp.parentcontactid["preferredcontactmethodcode@OData.Community.Display.V1.FormattedValue"]) {
			case "Email":
				preferredCommunicationMethod = "Email";
				break;
			case "Phone":
				preferredCommunicationMethod = "Phone";
				break;
			default:
				preferredCommunicationMethod = null
		}

		return {
			id: 0,
			contactId: 0,
			contact: {
				id: 0,
				dynamicsIntegrationKey: opp.parentcontactid.contactid,
				firstName: opp.parentcontactid.firstname,
				lastName: opp.parentcontactid.lastname,
				middleName: opp.parentcontactid.middlename,
				preferredCommunicationMethod: preferredCommunicationMethod,
				prefix: opp.parentcontactid.salutation,
				suffix: opp.parentcontactid.suffix
			},
			isPrimary: true,
			opportunity: {
				dynamicsOpportunityId: opp.opportunityid,
				salesCommunityId: undefined
			}
		} as OpportunityContactAssoc;
	}
}
