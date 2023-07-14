import { Component, OnInit } from '@angular/core';
import { Permission, Claims, IdentityService } from 'phd-common';
import { environment } from '../../../../../environments/environment';
import { Observable, forkJoin } from 'rxjs';

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
	roles: string[];
	environment = environment;

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
		this._identityService.getRoles().subscribe(roles =>
		{
			this.roles = roles;
			console.log("Roles: " + roles);
		});

		forkJoin(
			this._identityService.getClaims() as Observable<Claims>,
			this._identityService.hasClaimWithPermission('PhdReports', Permission.Read) as Observable<boolean>
		).subscribe(([claims, reportAccess]) =>
		{
			this.canAccessSalesAdmin = !!claims.SalesAdmin || !!claims.AutoApproval;

			this.canAccessReports = reportAccess;
		});
	}
}
