import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';

import { BrowserService, UnsubscribeOnDestroy} from 'phd-common';

@Component({
	  selector: 'nav-bar',
	  templateUrl: 'nav-bar.component.html',
	  styleUrls: ['nav-bar.component.scss']
})

export class NavBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	currentRoute: string;
	isTablet$: Observable<boolean>;
	isMenuCollapsed: boolean = true;
	currentPath: string;

	constructor(private router: Router, private browser: BrowserService)
    {
		super();
    }

	ngOnInit()
	{
		this.router.events.subscribe(evt => {
			if (evt instanceof NavigationEnd) {
				this.currentRoute = evt.url.toLowerCase();

				this.currentPath = '';
				if (this.currentRoute && this.currentRoute.length) {
					const paths = this.currentRoute.split('/');
					const favIndex = paths.findIndex(x => x === 'favorites');
					if (favIndex > -1 && favIndex === paths.length - 1) {
						this.currentPath = 'favorites';
					}

					if (paths.find(x => x === 'my-favorites')) {
						this.currentPath = 'my-favorites';
					}
				}
			}
		});

		this.isTablet$ = this.browser.isTablet();
		this.isTablet$.subscribe(data => {
			this.isMenuCollapsed = true;
		});
	}

}
