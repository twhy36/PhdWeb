import { Component, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Idle, DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { environment } from '../environments/environment';
import { default as build } from './build.json';

import { ModalService, ModalRef, IdentityService, UnsubscribeOnDestroy } from 'phd-common';
import { IdleLogoutComponent } from './modules/core/components/idle-logout/idle-logout.component';
import { BrandService } from './modules/core/services/brand.service';
import { AdobeService } from './modules/core/services/adobe.service';
import * as fromRoot from './modules/ngrx-store/reducers';
import * as fromFavorite from './modules/ngrx-store/favorite/reducer';
import { BuildMode } from './modules/shared/models/build-mode.model';
import { select, Store } from '@ngrx/store';
import { withLatestFrom } from 'rxjs/operators';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent extends UnsubscribeOnDestroy
{
	title = 'Design Preview';

	environment = environment;

	buildMode: BuildMode;

	logoutModal: ModalRef;

	get branch(): string
	{
		return build.branch.split('/').slice(2).join('/');
	}

	get version(): string
	{
		return build.version;
	}

	constructor(
		private idle: Idle,
		private modalService: ModalService,
		private identityService: IdentityService,
		private brandService: BrandService,
		private adobeService: AdobeService,
		private store: Store<fromRoot.State>,
		@Inject(DOCUMENT) private doc: any)
	{
		super();

		// Start idle watch for user inactivities if an external user is logged in
		if (sessionStorage.getItem('authProvider') === 'sitecoreSSO')
		{
			this.watchIdle();
		}

		this.brandService.applyBrandStyles();

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavoriteChoices),
			withLatestFrom(this.store.pipe(select(state => state.scenario)))
		).subscribe(([fav, scenario]) => {
			this.buildMode = scenario.buildMode;
			if ((this.buildMode === BuildMode.Presale || this.buildMode === BuildMode.Preview) && fav?.length > 0) {
				window.addEventListener('beforeunload', this.createBeforeUnloadListener);
			} else {
				window.removeEventListener('beforeunload', this.createBeforeUnloadListener);
			}
		});
	}

	ngOnInit()
	{
		window['appEventData'] = [];

		this.setAdobeAnalytics();
	}

	watchIdle()
	{
		// sets an idle timeout of 14 minutes (840 seconds)
		this.idle.setIdle(840);
		// sets a timeout period of 60 seconds. after 900 seconds of inactivity, the user will be considered timed out.
		this.idle.setTimeout(60);
		// sets the default interrupts, in this case, things like clicks, scrolls, touches to the document
		this.idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);

		this.idle.onTimeout.subscribe(() =>
		{
			this.logout();
		});

		this.idle.onIdleStart.subscribe(() =>
		{
			this.idle.clearInterrupts();

			let ngbModalOptions: NgbModalOptions = {
				centered: true,
				backdrop: 'static',
				keyboard: false
			};

			this.logoutModal = this.modalService.open(IdleLogoutComponent, ngbModalOptions);
			this.adobeService.setAlertEvent("You're About To Be Signed Out", 'Idle Logout Alert');

			this.logoutModal.result.then((result) =>
			{
				if (result == 'Logout')
				{
					this.logout();
				}
				else
				{
					// stay signed in
					this.idle.setInterrupts(DEFAULT_INTERRUPTSOURCES);
					this.idle.watch();
				}

			}, (reason) => { });
		});

		this.idle.onTimeoutWarning.subscribe((countdown) =>
		{
			this.logoutModal.componentInstance.countdown = countdown;
		});

		this.idle.watch();
	}

	createBeforeUnloadListener(e: BeforeUnloadEvent) {
		e.returnValue = `This will delete your MY FAVORITES list, continue?`;
	}

	logout()
	{
		this.idle.stop();
		this.logoutModal.dismiss();
		this.identityService.logout();
	}

	setAdobeAnalytics()
	{
		const script = this.doc.createElement('script');

		script.type = 'text/javascript'
		script.src = environment.adobeUrl;
		script.async = true;

		const head = this.doc.getElementsByTagName('head')[0];

		head.appendChild(script);
	}
}
