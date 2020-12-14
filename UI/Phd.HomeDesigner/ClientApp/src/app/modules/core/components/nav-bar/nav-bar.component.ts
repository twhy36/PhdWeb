import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';

import { BrowserService } from '../../services/browser.service';
import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';

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

	constructor(private router: Router, private browser: BrowserService)
    {
		super();
    }

	ngOnInit()
	{
		this.router.events.subscribe(evt => {
			if (evt instanceof NavigationEnd) {
				this.currentRoute = evt.url.toLowerCase();
			}
		});

		this.isTablet$ = this.browser.isTablet();
		this.isTablet$.subscribe(data => {
			this.isMenuCollapsed = true;
		});
	}
}
