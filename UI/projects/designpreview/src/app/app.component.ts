import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Idle, DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { select, Store } from '@ngrx/store';

import { ModalService, ModalRef, IdentityService, UnsubscribeOnDestroy, NavigationService, LoggingService } from 'phd-common';
import { withLatestFrom } from 'rxjs/operators';

import { environment } from '../environments/environment';
import { default as build } from './build.json';

import { IdleLogoutComponent } from './modules/core/components/idle-logout/idle-logout.component';
import { InfoModalComponent } from './modules/shared/components/info-modal/info-modal.component';
import { BrandService } from './modules/core/services/brand.service';
import { AdobeService } from './modules/core/services/adobe.service';
import * as fromRoot from './modules/ngrx-store/reducers';
import * as fromFavorite from './modules/ngrx-store/favorite/reducer';
import * as fromScenario from './modules/ngrx-store/scenario/reducer';
import { BuildMode } from './modules/shared/models/build-mode.model';
import { ActivatedRoute, NavigationEnd, Router, RouterEvent } from '@angular/router';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent extends UnsubscribeOnDestroy implements OnInit, OnDestroy
{
	title = 'Design Preview';
	environment = environment;
	buildMode: BuildMode;
	logoutModal: ModalRef;
	browserModal: ModalRef;
	treeVersionId: number = 0;
	private startTime: number;
	pageLoadExecuted: boolean = false;
	currentRoute = '';
	processedLog = '';

	get branch(): string 
	{
		return build.branch.split('/').slice(2).join('/');
	}

	get version(): string 
	{
		return build.version;
	}

	//navService is needed here to initalize the routing history, please do not remove
	constructor(
		private idle: Idle,
		private store: Store<fromRoot.State>,
		private modalService: ModalService,
		private identityService: IdentityService,
		private brandService: BrandService,
		private adobeService: AdobeService,
		private navService: NavigationService, // This needs to be initialized here to properly trace browser history
		private loggingService: LoggingService,
		private router: Router,
		private route: ActivatedRoute,
		@Inject(DOCUMENT) private doc: Document) 
	{
		super();

		this.router.events.subscribe((event: RouterEvent) =>
		{
			if (event instanceof NavigationEnd)
			{
				this.pageLoadExecuted = false;
				this.currentRoute = event.url.toLowerCase();
				//console.log(event.url.toLowerCase()); 
			}
		});

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
		).subscribe(([fav, scenario]) => 
		{
			this.buildMode = scenario.buildMode;
			if ((this.buildMode === BuildMode.Presale) && fav?.length > 0) 
			{
				window.addEventListener('beforeunload', this.createBeforeUnloadListener);
			}
			else 
			{
				window.addEventListener("unload", (event) =>
				{
					//log the duration here
					this.logVisit('OnUnload');
				});
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.selectScenario),
			withLatestFrom(this.store.pipe(select(state => state.salesAgreement.id)))
		).subscribe(([scenario, sgid]) => 
		{
			const stateTreeId = scenario?.tree?.treeVersion.id;
			const stateProcessed = scenario.buildMode + ':' + sgid;
			const isMatchingMode = (this.currentRoute.includes('/home') && scenario.buildMode == BuildMode.Buyer)
				||
				(this.currentRoute.includes('/presale') && scenario.buildMode == BuildMode.Presale)

			if (stateTreeId && isMatchingMode && stateProcessed != this.processedLog)	
			{
				this.treeVersionId = scenario?.tree?.treeVersion.id;
				console.log('state=' + stateProcessed + ':this=' + this.processedLog + 'in ' + scenario.buildMode + ':' + sgid + ':tid:' + this.treeVersionId + ':marketname:' + scenario.salesCommunity.market.name);
				this.processedLog = scenario.buildMode + ':' + sgid;

				const usageInfo = {
					SalesAgreementId: sgid,
					CommunityName: scenario.salesCommunity?.name,
					CommunityId: scenario.salesCommunity?.id,
					MarketName: scenario.salesCommunity?.market?.name,
					MarketId: scenario.salesCommunity?.market?.id,
					AuthenticationType: sessionStorage.getItem('authProvider'),
					RequestUrl: this.currentRoute,
					BuildMode: this.buildMode,
					TreeVersionId: this.treeVersionId

				};
				this.loggingService.logEvent('UsageInfo', usageInfo);
				this.pageLoadExecuted = true;
			}

			this.startTime = window.performance.now();

		});
	}

	ngOnDestroy()
	{
		this.logVisit('OnDestroy');
	}

	ngOnInit()
	{
		window['appEventData'] = [];

		this.setAdobeAnalytics();

		//popup warning only once when user browser is not supported
		const needBrowserCheck = sessionStorage.getItem('supportedBrowserChecked') == null ||
			(sessionStorage.getItem('supportedBrowserChecked') && sessionStorage.getItem('supportedBrowserChecked').toLowerCase() !== 'true');
		if (needBrowserCheck && !this.isSupportedBrowser() && !this.isDevEnvironment()) 
		{
			this.displayBrowserModal();
		}
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

			const ngbModalOptions: NgbModalOptions =
			{
				centered: true,
				backdrop: 'static',
				keyboard: false
			};

			this.logoutModal = this.modalService.open(IdleLogoutComponent, ngbModalOptions, true);
			this.adobeService.setAlertEvent('You\'re About To Be Signed Out', 'Idle Logout Alert');

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

	createBeforeUnloadListener(e: BeforeUnloadEvent) 
	{
		e.returnValue = 'This will delete your MY FAVORITES list, continue?';
	}

	logout() 
	{
		this.idle.stop();
		this.logoutModal.dismiss();
		this.identityService.logout();

		//log duration
		this.logVisit('logout');
	}

	logVisit(location: string)
	{
		if (this.buildMode !== BuildMode.Buyer && this.buildMode !== BuildMode.Presale)
		{
			return;
		}
		const duration = window.performance.now() - this.startTime;
		const userVisit = {
			Duration: duration,
			Location: location,
			SessionStart: this.startTime
		};
		this.loggingService.logEvent('UserVisit', userVisit);
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

	isSupportedBrowser(): boolean 
	{
		let isSupported = false;

		if (typeof navigator !== 'undefined' && navigator.userAgent) 
		{
			const browserInfo = navigator.userAgent.toLowerCase();
			const isEdge = /edg/.test(browserInfo);
			const isChrome = /chrome/.test(browserInfo);
			const isSafari = /safari/.test(browserInfo);
			const isOpera = /opera/.test(browserInfo) || /opr/.test(browserInfo);

			isSupported = (isChrome || isEdge || isSafari) && !isOpera;
		}

		return isSupported;
	}

	displayBrowserModal(): void 
	{
		const ngbModalOptions: NgbModalOptions =
		{
			centered: true,
			backdrop: true,
			beforeDismiss: () => false
		};

		this.browserModal = this.modalService.open(InfoModalComponent, ngbModalOptions, true);
		this.browserModal.componentInstance.title = 'Browser Not Supported';
		this.browserModal.componentInstance.body = `
			<p>The browser version you are currently using is not supported. Please use a recent version of Safari, Chrome or Edge for the best experience.</p>
		`;
		this.browserModal.componentInstance.buttonText = 'Continue';
		this.browserModal.componentInstance.isCloseable = true;
		this.browserModal.componentInstance.isTitleCentered = true;

		this.browserModal.result.then(() => 
		{
			sessionStorage.setItem('supportedBrowserChecked', 'true');
		}
		);
	}

	private isDevEnvironment(): boolean 
	{
		return window.location.toString().includes('localhost');
	}
}
