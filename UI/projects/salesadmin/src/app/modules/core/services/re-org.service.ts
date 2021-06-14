import { OrganizationService } from './organization.service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { withSpinner } from 'phd-common';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs';
import { SettingsService } from './settings.service';
import { Settings } from '../../shared/models/settings.model';
import { ReOrg } from '../../shared/models/re-org.model';
import { map, switchMap } from 'rxjs/operators';

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class ReOrgService
{
	constructor(
		private _http: HttpClient,
        private _orgService: OrganizationService
	)
    {
		this.reorgsUpdatedFlag = new Subject<boolean>();
    }

	public reorgsUpdatedFlag: Subject<boolean>;

	getReOrgs(): Observable<Array<ReOrg>>
	{
		const templateReOrg = `templateReOrg($expand=sourceTemplate)`;
		let orderby = 'createdUtcDate desc'
		const url = `${settings.apiUrl}reOrgs?${encodeURIComponent('$')}expand=${encodeURIComponent(templateReOrg)}&${encodeURIComponent("$")}orderby=${encodeURIComponent(orderby)}`;

		return withSpinner(this._http).get(url).pipe(
			switchMap(response => {
				return this._orgService.getOrgs(response['value'])
			}),
			map(reorg =>
			{
				let reOrgs = reorg.map(reorg =>
				{
					return new ReOrg(reorg);
				})
				return reOrgs;
			}

			));
	}
    
	executeReOrg(sourceMarket: number, targetMarket: number)
	{
		let url = settings.apiUrl;
		let data = { sourceMarketId: sourceMarket, targetMarketId: targetMarket }
		url += `ExecuteReOrg`;

		return this._http.post(url, data).subscribe();
	}

	updateReOrgsFlag()
	{
		this.reorgsUpdatedFlag.next(true);
	}
}
