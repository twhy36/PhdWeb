import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { select, Store } from '@ngrx/store';

import { UnsubscribeOnDestroy} from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { BrandService } from '../../services/brand.service';

@Component({
	  selector: 'nav-bar',
	  templateUrl: 'nav-bar.component.html',
	  styleUrls: ['nav-bar.component.scss']
})

export class NavBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	currentRoute: string;
	isMenuCollapsed: boolean = true;
	showContractedOptionsLink: boolean = false;
	showMyFavoritesLink: boolean = false;
	showFloorplanLink: boolean = false;
	showIncludedOptionsLink: boolean = false;
	buildMode: BuildMode;
	welcomeText: string = 'Welcome To Your Home';

	@HostListener("window:resize", ["$event"])
	onResize(event) {

		if (this.brandService.getBrandName() === 'johnWieland') {
			//The 'johnWieland' logo is the biggest, so it has it's own pixel threshold for expanding/collapsing the nav links
			if (event.target.innerWidth > 1130) {	//This is the point where the navbar expands from hamburger menu to links
				this.isMenuCollapsed = true;		//	close the hamburger menu
			}
		}
		else {
			//All the other logos are either this size or less, so this else covers the rest
			if (event.target.innerWidth > 1068) {
				this.isMenuCollapsed = true;
			}
		}
	}

	constructor(
		private router: Router,
		private store: Store<fromRoot.State>,
		private brandService: BrandService
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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
		).subscribe((state) => {
			this.buildMode = state.buildMode;
			switch (state.buildMode)
			{
				case (BuildMode.Preview):
					this.showContractedOptionsLink = false;
					this.showFloorplanLink = true;
					this.showIncludedOptionsLink = false;
					this.showMyFavoritesLink = true;
					break;
				case (BuildMode.Presale):
					this.showContractedOptionsLink = false;
					this.showFloorplanLink = false;
					this.showIncludedOptionsLink = true;
					this.showMyFavoritesLink = true;
					this.welcomeText = 'Welcome To Your Future Home';
					break;
				default:
					this.showContractedOptionsLink = true;
					this.showFloorplanLink = true;
					this.showIncludedOptionsLink = false;
					this.showMyFavoritesLink = true;
					break;
			}
		});
	}

	get toFavoritesPage() {
		return !this.currentRoute.includes('summary') ? true : false;
	}

	get isLaunchedInBuyerPreview() {
		return this.currentRoute?.includes('favorites/preview') ? true : false;
	}

	getBrandedMenuClass (isCollapsedMenu: boolean) {
		let menuClass = '';
		if (isCollapsedMenu) {
			if (this.brandService.getBrandName() === 'johnWieland')
				menuClass = 'phd-hamburger-menu-jw';
			else
				menuClass = 'phd-hamburger-menu';
		} else {
			if (this.brandService.getBrandName() === 'johnWieland')
				menuClass = 'phd-menu-options-jw';
			else
				menuClass = 'phd-menu-options';
		}
		return menuClass;
	}

	onHomePage() {
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));
		switch (this.buildMode)
		{
			case (BuildMode.Preview):
				this.router.navigateByUrl('/preview');
				break;
			case (BuildMode.Presale):
				this.router.navigateByUrl('/presale');
				break;
			default:
				this.router.navigateByUrl('/home');
				break;
		}
	}

	onViewFavorites() {
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));
		this.router.navigateByUrl('/favorites/summary');
	}

	getImageSrc() {
		return this.brandService.getBrandImage('white_logo');
	}

	getBrandedTitle () {
		return 'phd-nav-bar-' + this.brandService.getBrandName();
	}
}
