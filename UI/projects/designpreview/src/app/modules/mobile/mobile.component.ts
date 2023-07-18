import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { UnsubscribeOnDestroy } from 'phd-common';

import * as fromRoot from '../ngrx-store/reducers';
import * as ErrorActions from '../ngrx-store/error.action';


@Component({
	selector: 'mobile',
	templateUrl: './mobile.component.html',
	styleUrls: ['./mobile.component.scss']
	})
export class MobileComponent extends UnsubscribeOnDestroy implements OnInit
{
	constructor(
		private router: Router,
		private store: Store<fromRoot.State>,
	)
	{
		super();
	}

	ngOnInit(): void
	{
		// Clear errors from store on successful navigation
		this.router.events.subscribe(evt =>
		{
			if (evt instanceof NavigationEnd && evt.url != '/error')
			{
				this.store.dispatch(new ErrorActions.ClearLatestError());
			}
		});

		
	}
}
