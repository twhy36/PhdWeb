import { Component } from '@angular/core';
import { NavigationEnd, Router, GuardsCheckEnd, NavigationCancel, Event, NavigationStart } from '@angular/router';

import { Observable } from 'rxjs';
import { filter, map, scan } from 'rxjs/operators';

import { loadScript, IdentityService, Claims } from 'phd-common';
import { environment } from '../environments/environment';
import { default as build } from './build.json';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent
{
	canAccessSalesAdmin$: Observable<boolean>;

	environment = environment;

	get branch(): string
	{
		return build.branch.split('/').slice(2).join('/');
	}

	get version(): string
	{
		return build.version;
	}

	constructor(private router: Router, private identityService: IdentityService)
	{
		this.router.events.pipe(
			filter(evt => evt instanceof NavigationEnd)
		).subscribe(() =>
		{
			if (typeof (<any>window)._wfx_refresh === 'function')
			{
				(<any>window)._wfx_refresh();
			}
		});

		//router module doesn't know which page the user has access to, so we'll just let the route guards do the work
		let entryPoints = ['/', '/contracts', 'community-management'];
		this.router.events.pipe(
			scan<Event, { shouldCancel: boolean, canceled: boolean }>((res, evt) =>
			{
				if (evt instanceof GuardsCheckEnd)
				{
					return { shouldCancel: !evt.shouldActivate, canceled: false };
				}
				else if (evt instanceof NavigationCancel)
				{
					return { shouldCancel: res.shouldCancel, canceled: true };
				}
				else if (evt instanceof NavigationStart)
				{
					return { shouldCancel: false, canceled: false };
				}
				else
				{
					return res;
				}
			})
		).subscribe(res =>
		{
			if (res.shouldCancel && res.canceled)
			{
				let url = entryPoints.pop();

				if (!!url)
				{
					this.router.navigateByUrl(url);
				}
			}
		})

		loadScript(environment.whatFix.scriptUrl).subscribe();

		this.canAccessSalesAdmin$ = this.identityService.getClaims().pipe(
			map((claims: Claims) => !!claims.SalesAdmin || !!claims.AutoApproval)
		);
	}
}
