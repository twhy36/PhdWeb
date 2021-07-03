import { Component, OnInit } from '@angular/core';
import { OrganizationService } from '../../core/services/organization.service';

import { UnsubscribeOnDestroy } from '../../shared/utils/unsubscribe-on-destroy';
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
		var ecoeMonths = (document.getElementById("ecoe-months") as HTMLInputElement).value;
		console.log(ecoeMonths);

		var earnestMoney = (document.getElementById("earnest-money") as HTMLInputElement).value;
		console.log(earnestMoney);
	}
}

