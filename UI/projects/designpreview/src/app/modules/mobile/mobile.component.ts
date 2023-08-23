import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';

import * as fromRoot from '../ngrx-store/reducers';
import * as ErrorActions from '../ngrx-store/error.action';
import { filter } from 'rxjs/operators';


@Component({
	selector: 'mobile',
	templateUrl: './mobile.component.html',
	styleUrls: ['./mobile.component.scss']
	})
export class MobileComponent
{
	showFooter: boolean = true;
	isSummaryPage: boolean = false;
	hideFooterForRoutes: string[] = ['/options']; // Update when more routs are added

	constructor(private router: Router,
		private store: Store<fromRoot.State>)
	{
		this.router.events
			.pipe(filter((event) => event instanceof NavigationEnd))
			.subscribe((event: NavigationEnd) =>
			{
				// Check the current route path
				const currentUrl = event.url;

				if (currentUrl != '/error')
				{
					this.store.dispatch(new ErrorActions.ClearLatestError());
				}

				if (currentUrl)
				{
					this.showFooter = !this.hideFooterForRoutes.some((path) => currentUrl.includes(path));
					this.isSummaryPage = currentUrl.includes('/favorites/summary');
				}
			});
	}



}
