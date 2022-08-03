import { forwardRef, Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { IFeatureSwitch, IFeatureSwitchOrgAssoc } from '../models/feature-switch.model';
import { IOrg } from '../models/org.model';
import { API_URL } from '../injection-tokens';

type Feature = 'Or Mapping' | 'Phd Lite' | 'Option Packages';

@Injectable()
export class FeatureSwitchService
{
	private _ds: string = encodeURIComponent('$');

	constructor(private _http: HttpClient,
		@Inject(forwardRef(() => API_URL)) private apiUrl: string)
	{

	}

	getFeatureSwitch(name: string, org: IOrg): Observable<IFeatureSwitch>
	{
		const entity = `featureSwitches`;
		const filter = `name eq '${name}'`;
		const select = `featureSwitchId, name, state`;

		let expandFilter = ``;

		let expandMarketFilter = org.edhMarketId ? `(org/edhMarketId eq ${org.edhMarketId} and org/edhFinancialCommunityId eq null)` : '';
		let expandCommunityFilter = org.edhFinancialCommunityId ? `org/edhFinancialCommunityId eq ${org.edhFinancialCommunityId}` : '';

		if (expandMarketFilter.length > 0 && expandCommunityFilter.length > 0)
		{
			// if both market and community need an 'or' so we can return the market record if available
			expandFilter += `(${expandMarketFilter} or ${expandCommunityFilter})`;
		}
		else
		{
			if (expandMarketFilter.length > 0)
			{
				expandFilter += `${expandMarketFilter}`;
			}

			if (expandCommunityFilter.length > 0)
			{
				expandFilter += `${expandCommunityFilter}`;
			}
		}

		const expand = `featureSwitchOrgAssocs($select=orgId, state;$filter=${expandFilter};$expand=org($select=edhMarketId, edhFinancialCommunityId))`;

		let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}`;

		const url = `${this.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				const featureSwitch = response.value[0] as IFeatureSwitch;

				return featureSwitch;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	isFeatureEnabled(featureName: Feature, org: IOrg): Observable<boolean>
	{
		return this.getFeatureSwitch(featureName, org).pipe(
			map(fw =>
			{
				// is turned on and has markets/communities assigned
				let isEnabled = fw?.state && fw.featureSwitchOrgAssocs.length > 0;

				// feature is set to on
				if (isEnabled)
				{
					let marketOrg = fw.featureSwitchOrgAssocs.find(fsoa => fsoa.org.edhFinancialCommunityId === null);

					// did we find a market?
					if (marketOrg)
					{
						// market found, check its state
						isEnabled = marketOrg.state;

						// if market is good, lets check for communities
						if (isEnabled)
						{
							// get all communities
							let communityOrgs = fw.featureSwitchOrgAssocs.filter(fsoa => fsoa.org.edhFinancialCommunityId !== null);

							if (communityOrgs.length > 0)
							{
								// check to make sure they're all enabled or the passed in community is found and state set to true
								isEnabled = communityOrgs.every(co => co.state) || communityOrgs.find(co => co.org.edhFinancialCommunityId === org?.edhFinancialCommunityId)?.state;
							}
						}
					}
					else
					{
						// get all communities
						let communityOrgs = fw.featureSwitchOrgAssocs.filter(fsoa => fsoa.org.edhFinancialCommunityId !== null);

						if (communityOrgs.length > 0)
						{
							// check to make sure they're all enabled or the passed in community is found and state set to true
							isEnabled = communityOrgs.every(co => co.state) || communityOrgs.find(co => co.org.edhFinancialCommunityId === org?.edhFinancialCommunityId)?.state;
						}
					}
				}

				return isEnabled;
			}),
			catchError(this.handleError));
	}

	private handleError(error: any)
	{
		console.error(error);

		return _throw(error || 'Server error');
	}

	getFeatureSwitchForCommunities(name: string, financialCommunityIds: number[]): Observable<IFeatureSwitchOrgAssoc[]>
	{
		const entity = `featureSwitches`;
		const filter = `name eq '${name}'`;
		const select = `featureSwitchId, name, state`;

		const communityIds = financialCommunityIds.join(",");
		let expandFilter = `org/edhFinancialCommunityId in (${communityIds})`;
		const expand = `featureSwitchOrgAssocs($select=orgId, state;$filter=${expandFilter};$expand=org($select=edhMarketId, edhFinancialCommunityId))`;

		let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}select=${encodeURIComponent(select)}`;
		const url = `${this.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(url).pipe(
			map(response =>
			{
				const featureSwitch = response.value[0] as IFeatureSwitch;
				return featureSwitch.featureSwitchOrgAssocs;
			}),
			catchError(error =>
			{
				console.error(error);
				return _throw(error);
			})
		);
	}
}
