import { Component } from '@angular/core';
import { Router, ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd } from '@angular/router';

import { filter } from 'rxjs/operators';

import { loadScript } from 'phd-common';
import { LoggingService } from './modules/core/services/logging.service';
import { environment } from '../environments/environment';
import * as build from './build.json';
import { NotificationService } from './modules/core/services/notification.service';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent {
	build = (build as any).default;
	environment = environment;

	get branch(): string {
		return build.branch.split('/').slice(2).join('/');
	}

	constructor(private router: Router, private loggingService: LoggingService, private route: ActivatedRoute, private notificationService: NotificationService) {
		this.router.events.pipe(
			filter(evt => evt instanceof NavigationEnd)
		).subscribe((evt: NavigationEnd) => {
			const url = evt.url;
			const componentName = this.getComponentName(this.route.snapshot);

			this.loggingService.logPageView(`Design Tool - ${componentName}`, url);

			if (typeof (<any>window)._wfx_refresh === 'function') {
				(<any>window)._wfx_refresh();
			}
		});

		loadScript(environment.whatFix.scriptUrl).subscribe();

		this.notificationService.init();
		this.notificationService.registerHandlers();
	}

	private getComponentName(snapshot: ActivatedRouteSnapshot): string {
		if (snapshot.children.find(c => c.outlet === 'primary')) {
			return this.getComponentName(snapshot.children.find(c => c.outlet === 'primary'));
		}

		return typeof snapshot.component === 'string' ? snapshot.component : snapshot.component.name;
	}
}
