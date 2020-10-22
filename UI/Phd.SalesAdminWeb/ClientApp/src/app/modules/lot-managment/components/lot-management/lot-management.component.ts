import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, NavigationExtras, Params } from "@angular/router";

import { OrganizationService } from '@core/services/organization.service';

@Component({
	selector: 'lot-management',
	templateUrl: './lot-management.component.html',
	styleUrls: ['./lot-management.component.scss']
})
export class LotManagementComponent implements OnInit
{
	constructor(public _orgService: OrganizationService) { }

	ngOnInit()
	{
		// set the ability to change sales communities
		this._orgService.canChangeOrg = true;
	}
}
