import { Component, OnInit } from '@angular/core';
import { OrganizationService } from '../../../core/services/organization.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { identity } from 'lodash';

@Component({
	selector: 'community-settings-tab',
	templateUrl: './community-settings-tab.component.html',
	styleUrls: ['./community-settings-tab.component.scss']
})
export class CommunitySettingsTabComponent extends UnsubscribeOnDestroy implements OnInit
{
	canEdit: boolean = false;
	selectedFinancialCommunityId: FinancialCommunity = null;
	url?: string = null;
	communityLinkEnabled: boolean = false;

	constructor(
		public _orgService: OrganizationService,
		private _route: ActivatedRoute) { super(); }


	ngOnInit() {
		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			switchMap(financialCommunity => this._orgService.getWebsiteCommunity(financialCommunity?.salesCommunityId)),
			map(websiteCommunity => websiteCommunity?.webSiteIntegrationKey),
		).subscribe(webSiteIntegrationKey => {
			this.url = (environment.thoUrl && webSiteIntegrationKey)
				? environment.thoUrl + webSiteIntegrationKey
				: null;
		});
	}

	toggleCommunityLink() {
		this.communityLinkEnabled = !this.communityLinkEnabled;
	}

	save() {
		const ecoeMonths = (document.getElementById("ecoe-months") as HTMLInputElement).value;
		console.log(ecoeMonths);

		const earnestMoney = (document.getElementById("earnest-money") as HTMLInputElement).value;
		console.log(earnestMoney);
	}
}

