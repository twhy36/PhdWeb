import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Idle, DEFAULT_INTERRUPTSOURCES } from '@ng-idle/core';
import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { select, Store } from '@ngrx/store';

import { ModalService, ModalRef, IdentityService, UnsubscribeOnDestroy, NavigationService, Constants } from 'phd-common';
import { distinctUntilChanged, withLatestFrom } from 'rxjs/operators';

import * as fromRoot from './modules/ngrx-store/reducers';
import * as fromFavorite from './modules/ngrx-store/favorite/reducer';

import { default as build } from './build.json';
import { environment } from '../environments/environment';
import { IEnvironment } from '../environments/environment.model';
import { IdleLogoutComponent } from './modules/core/components/idle-logout/idle-logout.component';
import { InfoModalComponent } from './modules/shared/components/info-modal/info-modal.component';
import { BrandService } from './modules/core/services/brand.service';
import { AdobeService } from './modules/core/services/adobe.service';
import { BuildMode } from './modules/shared/models/build-mode.model';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
	// eslint-disable-next-line indent
})
export class AppComponent extends UnsubscribeOnDestroy implements OnInit
{
	mobileBreakpoint: string = '(max-width: 1224px)';
	favoritesId: number;
	environment: IEnvironment = environment;
	isMobile: boolean = false;
	title: string = 'Design Preview';
	brandTheme: string;
	buildMode: BuildMode;
	logoutModal: ModalRef;
	browserModal: ModalRef;
	watchIdleStarted: boolean = false;

	readonly breakpoint$ = this.breakpointObserver
		.observe([this.mobileBreakpoint])
		.pipe(distinctUntilChanged());

	get branch(): string 
	{
		return build.branch.split('/').slice(2).join('/');
	}

	get version(): string 
	{
		return build.version;
	}

	// NavigationService is needed here to initalize the routing history, please do not remove
	constructor(
		public overlayContainer: OverlayContainer,
		private idle: Idle,
		private router: Router,
		private store: Store<fromRoot.State>,
		private breakpointObserver: BreakpointObserver,
		private modalService: ModalService,
		private identityService: IdentityService,
		private brandService: BrandService,
		private adobeService: AdobeService,
		private navService: NavigationService, // This needs to be initialized here to properly trace browser history
		@Inject(DOCUMENT) private doc: Document) 
	{
		super();

		this.brandTheme = this.brandService.getBrandTheme();

		// Need to add brand class to the overlayContainer for mat menu to be correctly stylized
		this.overlayContainer.getContainerElement().classList.add(this.brandTheme);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavoriteChoices),
			withLatestFrom(
				this.store.pipe(select(state => state.scenario)),
				this.store.pipe(select(fromFavorite.currentMyFavorite))
			)
		).subscribe(([fav, scenario, favorites]) => 
		{
			this.favoritesId = favorites && favorites.id;
			this.buildMode = scenario.buildMode;
			if ((this.buildMode === BuildMode.Presale) && fav?.length > 0) 
			{
				window.addEventListener('beforeunload', this.createBeforeUnloadListener);
			}
			else 
			{
				window.removeEventListener('beforeunload', this.createBeforeUnloadListener);
			}
		});

		this.router.events.subscribe((event) =>
		{
			if (event instanceof NavigationEnd)
			{
				// Start idle watch for user inactivities if an external user is logged in 
				// only for buyer mode
				if (!this.watchIdleStarted && sessionStorage.getItem('authProvider') === 'sitecoreSSO'
					&& this.router.url.indexOf('/home') !== -1)
				{
					this.watchIdleStarted = true;
					this.watchIdle();
				}

				this.handleMobileNavigation();
			}
		});

		this.breakpoint$.subscribe(() =>
		{
			this.isMobile = this.breakpointObserver.isMatched(this.mobileBreakpoint);

			if (this.router.navigated)
			{
				this.handleMobileNavigation();
			}
		});
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
				keyboard: false,
				windowClass: this.brandTheme,
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
			beforeDismiss: () => false,
			windowClass: this.brandTheme,
		};

		this.browserModal = this.modalService.open(InfoModalComponent, ngbModalOptions, true);
		this.browserModal.componentInstance.title = 'Browser Not Supported';
		this.browserModal.componentInstance.body = `
			<p>The browser version you are currently using is not supported. Please use a recent version of Safari, Chrome or Edge for the best experience.</p>
		`;
		this.browserModal.componentInstance.buttonText = Constants.CONTINUE;
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

	private handleMobileNavigation(): void
	{
		const currentUrl = this.router.url.indexOf('?') > 0 ? this.router.url.substring(0, this.router.url.indexOf('?')) : this.router.url;

		// TODO: remove flag when mobile optimization is ready for production
		// Until then this prevents the app from moving to mobile experience on each route navigation
		// and when breakpoints are detected 
		let newUrl = currentUrl;

		// Handles the different routing structure for options and my-favorites
		// This doesn't go to the exact subgroup/decision point, but this scenario is not an intended use
		if (this.router.url.includes('options') || this.router.url.includes('my-favorites'))
		{
			newUrl = this.optionsPageConverter(newUrl);
		}

		if (this.isMobile && !currentUrl.includes('mobile') && !environment.production)
		{
			newUrl = '/mobile' + newUrl;
			this.router.navigate([newUrl], { queryParamsHandling: 'merge' });
		}
		else if (!this.isMobile && currentUrl.includes('mobile'))
		{
			newUrl = newUrl.replace('/mobile', '');
			this.router.navigate([newUrl], { queryParamsHandling: 'merge' });
		}
	}

	private optionsPageConverter(url: string): string
	{
		if (this.router.url.includes('options') && !this.isMobile)
		{
			return `/favorites/my-favorites/${this.favoritesId}`;
		}
		else if (this.router.url.includes('my-favorites') && this.isMobile)
		{
			return '/options';
		}

		return url;
	}
}
