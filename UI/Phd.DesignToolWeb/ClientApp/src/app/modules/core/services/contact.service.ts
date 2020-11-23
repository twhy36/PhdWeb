import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { Contact, MatchingContact } from '../../shared/models/contact.model';
import { defaultOnNotFound } from '../../shared/classes/default-on-not-found';

@Injectable()
export class ContactService
{
	private _ds: string = encodeURIComponent("$");

	constructor(private _http: HttpClient) { }

	getSalesConsultants(filterText: string): Observable<Array<Contact>>
	{
		const entity = `contacts`;
		const jobTitleFilter = `(jobTitle eq 'Sales Consultant' or jobTitle eq 'Sales Consultant - CFT' or jobTitle eq 'Sales Trainee')`;
		const filter = `${jobTitleFilter} and adIsActive eq true and (contains(lastName, '${filterText}') or contains(firstName,'${filterText}'))`;
		const expand = 'emailAssocs($expand=email($select=id,emailAddress);$filter=isPrimary eq true;$select=id,isPrimary)';
		const select = 'id,firstName,lastName,jobTitle,adIsActive';
		const orderBy = 'lastName,firstName';

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}${encodeURIComponent(expand)}&${this._ds}${encodeURIComponent(select)}&${this._ds}${encodeURIComponent(orderBy)}`;

		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map(results =>
			{
				return results.value.map(x => new Contact(x));
			}),
			defaultOnNotFound("getSalesConsultants")
		);
	}

	getSalesConsultantsByRoles(marketNumber: string, filterText: string): Observable<Array<Contact>> {
		let endpoint = `${environment.apiUrl}GetSalesConsultantsByRoles(marketNumber='${marketNumber}',filterText='${filterText}')`;

		return this._http.get<any>(endpoint).pipe(
			map(response => {
				return response['value'].map(x => new Contact(x));
			}),
			defaultOnNotFound("getSalesConsultantsByRoles")
		);
	}

	getContact(contactId: number, ...expandOptions: Array<ExpandOption>): Observable<Contact>
	{
		const entity = `contacts(${contactId})`;

		let expand = "";
		let expandArray: string[] = [];

		if (expandOptions.includes(ExpandOption.Addresses))
		{
			expandArray.push("addressAssocs($expand=address)");
		}

		if (expandOptions.includes(ExpandOption.Phones))
		{
			expandArray.push("phoneAssocs($expand=phone)");
		}

		if (expandOptions.includes(ExpandOption.Emails))
		{
			expandArray.push("emailAssocs($expand=email)");
		}

		if (expandArray.length)
		{
			expand = `${this._ds}expand=${encodeURIComponent(expandArray.join(','))}`;
		}

		const select = 'id,prefix,firstName,middleName,lastName,suffix,preferredCommunicationMethod,dynamicsIntegrationKey';

		const endpoint = `${environment.apiUrl}${entity}?${expand}&${this._ds}select=${encodeURIComponent(select)}`;

		return this._http.get<Contact>(endpoint).pipe(
			defaultOnNotFound("getSalesAgreementRealtor")
		);
	}

	getMatchingContacts(firstName: string, phone: string, email: string, isRealtor: boolean): Observable<Array<MatchingContact>>
	{
		const expandArray = [
			"addressAssocs($expand=address)",
			"phoneAssocs($expand=phone)",
			"emailAssocs($expand=email)"
		];
		const expand = `${this._ds}expand=${encodeURIComponent(expandArray.join(','))}`;

		const endpoint = `${environment.apiUrl}GetMatchingContacts(firstName='${firstName}',phone='${phone}',email='${email}',isRealtor=${isRealtor})?${expand}`;

		return this._http.get<any>(endpoint).pipe(
			map(result =>
			{
				const dtos = result.value as Array<MatchingContact>;

				return dtos.map(dto =>
				{
					return new MatchingContact(dto);
				}).sort((a, b) =>
				{
					if (a.isExactMatch && !b.isExactMatch)
					{
						return -1;
					}

					if (!a.isExactMatch && b.isExactMatch)
					{
						return 1;
					}

					if ((a.isExactMatch && b.isExactMatch) || (!a.isExactMatch && !b.isExactMatch))
					{
						const aLastName = a.lastName.toLowerCase();
						const bLastName = b.lastName.toLowerCase();
						const aFirstName = a.firstName.toLowerCase();
						const bFirstName = b.firstName.toLowerCase();

						if (aLastName < bLastName)
						{
							return -1;
						}

						if (aLastName > bLastName)
						{
							return 1;
						}

						if (aLastName === bLastName)
						{
							if (aFirstName < bFirstName)
							{
								return -1;
							}

							if (aFirstName > bFirstName)
							{
								return 1;
							}

							if (aFirstName === bFirstName)
							{
								return 0;
							}
						}
						return 0;
					}
				});
			}),
			defaultOnNotFound("getSalesAgreementRealtor", [])
		);
	}
}

export enum ExpandOption
{
	Addresses,
	Emails,
	Phones
}
