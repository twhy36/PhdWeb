import { Component } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router, GuardsCheckEnd, NavigationCancel, Event, NavigationStart } from '@angular/router';

import { Observable } from 'rxjs';
import { filter, map, scan } from 'rxjs/operators';

import { LoggingService } from './modules/core/services/logging.service';
import { loadScript } from 'phd-common/utils';
import { environment } from '../environments/environment';
import { IdentityService } from 'phd-common/services';
import { Claims } from 'phd-common/models';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent
{
	canAccessSalesAdmin$: Observable<boolean>;

	constructor(private router: Router, private loggingService: LoggingService, private route: ActivatedRoute, private identityService: IdentityService) {
		this.router.events.pipe(
            filter(evt => evt instanceof NavigationEnd)
        ).subscribe((evt: NavigationEnd) => {
            const url = evt.url;
            const componentName = this.getComponentName(this.route.snapshot);

			this.loggingService.logPageView(`Sales Admin - ${componentName}`, url);
			if (typeof (<any>window)._wfx_refresh === 'function') {
				(<any>window)._wfx_refresh();
			}
			});

		//router module doesn't know which page the user has access to, so we'll just let the route guards do the work
		let entryPoints = ['/', '/contracts', 'community-management'];
		this.router.events.pipe(
			scan<Event, { shouldCancel: boolean, canceled: boolean }>((res, evt) => {
				if (evt instanceof GuardsCheckEnd) {
					return { shouldCancel: !evt.shouldActivate, canceled: false };
				}
				else if (evt instanceof NavigationCancel) {
					return { shouldCancel: res.shouldCancel, canceled: true };
				}
				else if (evt instanceof NavigationStart) {
					return { shouldCancel: false, canceled: false };
				}
				else {
					return res;
				}
			})
		).subscribe(res => {
			if (res.shouldCancel && res.canceled) {
				let url = entryPoints.pop();
				if (!!url) {
					this.router.navigateByUrl(url);
				}
			}
		})

		loadScript(environment.whatFix.scriptUrl).subscribe();

		this.canAccessSalesAdmin$ = this.identityService.getClaims().pipe(
			map((claims: Claims) => !!claims.SalesAdmin || !!claims.AutoApproval)
		);
    }

    private getComponentName(snapshot: ActivatedRouteSnapshot): string {
        if (snapshot.children.find(c => c.outlet === 'primary')) {
            return this.getComponentName(snapshot.children.find(c => c.outlet === 'primary'));
        }

        return typeof snapshot.component === 'string' ? snapshot.component : snapshot.component.name;
    }
}
