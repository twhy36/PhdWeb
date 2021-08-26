import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';

import { BrowserService, UnsubscribeOnDestroy} from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

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

	constructor(
		private router: Router, 
		private browser: BrowserService,
		private store: Store<fromRoot.State>
	)
    {
		super();
    }

	ngOnInit()
	{
		this.router.events.subscribe(evt => {
			if (evt instanceof NavigationEnd) {
				this.currentRoute = evt.url.toLowerCase();
				this.isMenuCollapsed = true;
			}
		});

		this.isTablet$ = this.browser.isTablet();
		this.isTablet$.subscribe(data => {
			this.isMenuCollapsed = true;
		});
	}

	onHomePage() {
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));
		this.router.navigateByUrl('/home');
	}
}
