import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as odataUtils from '../../shared/utils/odata.util';
import { Settings } from '../../shared/models/settings.model';
import { SettingsService } from "./settings.service";
import { ChangeOrderTypeAutoApproval } from '../../shared/models/changeOrderTypeAutoApproval.model';
import { withSpinner } from 'phd-common/extensions/withSpinner.extension';
import { FinancialCommunity } from '../../shared/models/financialCommunity.model';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class CommunityService
{
	private settings: Settings;
	private _batch = "$batch";

	constructor(
		private _http: HttpClient,
		private _settingsService: SettingsService
	)
	{
		this.settings = _settingsService.getSettings();
	}

	getChangeOrderTypeAutoApprovals(communityId: number): Observable<Array<ChangeOrderTypeAutoApproval>>
	{
		let url = settings.apiUrl;
		url += `changeOrderTypeAutoApprovals`;

		const body = {
			'financialCommunityId': communityId
		};

		return withSpinner(this._http).post(url, body).pipe(
			map((response: any) =>
			{
				let returnVal = response.value.map(data =>
				{
					return {
						financialCommunityId: data.financialCommunityId,
						edhChangeOrderTypeId: data.edhChangeOrderTypeId,
						isAutoApproval: data.isAutoApproval
					} as ChangeOrderTypeAutoApproval
				});

				return returnVal as Array<ChangeOrderTypeAutoApproval>;
			}))
	}

	patchChangeOrderTypeAutoApprovals(autoApproval: Array<ChangeOrderTypeAutoApproval>)
	{
		const endPoint = `${settings.apiUrl}${this._batch}`;
		const batchRequests = odataUtils.createBatchPatch<ChangeOrderTypeAutoApproval>(autoApproval, null, 'changeOrderTypeAutoApproval', 'financialCommunityId', 'edhChangeOrderTypeId', 'isAutoApproval');

		const batchGuid = odataUtils.getNewGuid();
		const batchBody = odataUtils.createBatchBody(batchGuid, [batchRequests]);
		const headers = new HttpHeaders(odataUtils.createBatchHeaders(batchGuid));

		return this._http.post(endPoint, batchBody, { headers, responseType: 'text' }).pipe(
			map(results =>
			{
				return odataUtils.parseBatchResults<ChangeOrderTypeAutoApproval>(results);
			})
		);
	}

	patchFinancialCommunity(financialCommunityId: number, updatedFields: {}): Observable<FinancialCommunity>
	{
		let dto = {
			id: financialCommunityId,
			...updatedFields
		};

		let url = settings.apiUrl;

		url += `financialCommunities(${financialCommunityId})`;

		return this._http.patch<FinancialCommunity>(url, dto);
	}
}
