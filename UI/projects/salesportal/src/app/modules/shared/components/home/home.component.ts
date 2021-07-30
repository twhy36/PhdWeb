import { Component, OnInit } from '@angular/core';
import { Permission, Claims, ClaimTypes, IdentityService } from 'phd-common';
import { environment } from '../../../../../environments/environment';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { Observable } from 'rxjs';

@Component({
	selector: 'main.app-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit
{
	Permission = Permission;
	canAccessSalesAdmin: boolean = false;
	canAccessReports: boolean = false;
	environment = environment;

	colorManagementAction = { envBaseUrl: 'colorManagement', path: '' };
	salesAdminAction = { envBaseUrl: 'salesAdmin', path: '' };
	d365Action = { envBaseUrl: 'crm', path: '' };
	buyerTrackerAction = { envBaseUrl: 'buyerTracker', path: '' };
	specAction = { envBaseUrl: 'designTool', path: 'new-home' };
	choiceAdminAction = { envBaseUrl: 'choiceAdmin', path: '' };
	reportsAction = { envBaseUrl: 'reports', path: '' };
	salesTallyAction = { envBaseUrl: 'salesTally', path: '' };
	searchAction = { envBaseUrl: 'designTool', path: '' };
	previewAction = { envBaseUrl: 'designTool', path: 'preview' };

	constructor(private _identityService: IdentityService) { }

	ngOnInit()
	{
		this._identityService.getRoles().subscribe(roles => {
			console.log("Roles: " + roles);
		});

		forkJoin(
			this._identityService.getClaims() as Observable<Claims>,
			this._identityService.hasClaimWithPermission('PhdReports', Permission.Read) as Observable<boolean>
		).subscribe(([claims, reportAccess]) => {
			this.canAccessSalesAdmin = !!claims.SalesAdmin || !!claims.AutoApproval;

			this.canAccessReports = reportAccess;
		});
	}
}
