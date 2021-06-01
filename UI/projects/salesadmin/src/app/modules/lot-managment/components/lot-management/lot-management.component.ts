import { Component, OnInit } from '@angular/core';

import { OrganizationService } from '../../../core/services/organization.service';

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
