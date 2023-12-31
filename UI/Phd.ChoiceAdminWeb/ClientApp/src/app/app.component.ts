import { Component } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';

import { filter } from 'rxjs/operators';

import { loadScript } from 'phd-common/utils';
import { LoggingService } from './modules/core/services/logging.service';
import { environment } from '../environments/environment';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent
{
    title = 'app';

    constructor(private router: Router, private loggingService: LoggingService, private route: ActivatedRoute) {
        this.router.events.pipe(
            filter(evt => evt instanceof NavigationEnd)
        ).subscribe((evt: NavigationEnd) => {
            const url = evt.url;
            const componentName = this.getComponentName(this.route.snapshot);

            this.loggingService.logPageView(`Choice Admin - ${componentName}`, url);

			if (typeof (<any>window)._wfx_refresh === 'function') {
				(<any>window)._wfx_refresh();
			}
        });

		loadScript(environment.whatFix.scriptUrl).subscribe();
    }

    private getComponentName(snapshot: ActivatedRouteSnapshot): string {
        if (snapshot.children.find(c => c.outlet === 'primary')) {
            return this.getComponentName(snapshot.children.find(c => c.outlet === 'primary'));
        }

        return typeof snapshot.component === 'string' ? snapshot.component : snapshot.component.name;
    }
}
