import { Component, OnInit } from '@angular/core';
import { switchMap, map, tap } from 'rxjs/operators';
import { OrganizationService } from '../../core/services/organization.service';
import { Observable, of } from 'rxjs';

import { FinancialCommunityViewModel } from '../../shared/models/plan-assignment.model';
import { UnsubscribeOnDestroy } from '../../shared/utils/unsubscribe-on-destroy';
import { FinancialCommunity } from '../../shared/models/financialCommunity.model';
import { ChangeOrderTypeAutoApproval } from '../../shared/models/changeOrderTypeAutoApproval.model';
import { CommunityService } from '../../core/services/community.service';
import { MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';

@Component({
	selector: 'community-settings-tab',
	templateUrl: './community-settings-tab.component.html',
	styleUrls: ['./community-settings-tab.component.scss']
})
export class CommunitySettingsTabComponent extends UnsubscribeOnDestroy implements OnInit
{
	canEdit: boolean = false;

	constructor(
		public _orgService: OrganizationService,
		private _route: ActivatedRoute) { super(); }


	ngOnInit()
	{
		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	save(){
		var earnestMoney = (document.getElementById("earnest-money") as HTMLInputElement).value;
		console.log(earnestMoney);
	}
}

