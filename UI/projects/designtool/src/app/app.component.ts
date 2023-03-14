import { Component, HostListener, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import { filter } from 'rxjs/operators';

import { IdentityService, loadScript, TimeOfSaleOptionPrice, UnsubscribeOnDestroy } from 'phd-common';

import { environment } from '../environments/environment';
import { default as build } from './build.json';
import { NotificationService } from './modules/core/services/notification.service';
import { select, Store } from '@ngrx/store';
import * as fromRoot from './modules/ngrx-store/reducers';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.scss']
})
export class AppComponent extends UnsubscribeOnDestroy
{
	environment = environment;
	timeOfSaleOptionPrices: TimeOfSaleOptionPrice[];
	token: string;

	get branch(): string
	{
		return build.branch.split('/').slice(2).join('/');
	}

	get version(): string
	{
		return build.version;
	}

	constructor(
		private router: Router,
		private notificationService: NotificationService,
		private identityService: IdentityService,
		private store: Store<fromRoot.State>)
	{
		super();

		this.router.events.pipe(
			filter(evt => evt instanceof NavigationEnd)
		).subscribe(() =>
		{
			if (typeof (<any>window)._wfx_refresh === 'function')
			{
				(<any>window)._wfx_refresh();
			}
		});

		loadScript(environment.whatFix.scriptUrl).subscribe();

		this.notificationService.init();
		this.notificationService.registerHandlers();

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(store => store.job)
		).subscribe(job => 
		{
			this.timeOfSaleOptionPrices = job?.timeOfSaleOptionPrices;
		});

		this.identityService.token.subscribe(token =>
		{
			this.token = token;
		});
	}

	// #388662
	// When the browser is closed, we must remove any auto-saved TimeOfSale prices
	// that are attached to an active, unapproved CO. The API logic will automatically 
	// determine what prices to delete based on the latest CO.
	@HostListener('window:beforeunload')
	onBeforeUnload()
	{
		if (this.timeOfSaleOptionPrices?.length)
		{
			const body = {
				'timeOfSaleOptionPrices': this.timeOfSaleOptionPrices,
				'isRevertChangeOrder': true,
			};

			fetch(`${environment.apiUrl}DeleteTimeOfSaleOptionPrices`, {
				keepalive: true,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.token}`,
				},
				body: JSON.stringify(body),
			});
		}
	}
}
