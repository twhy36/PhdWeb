import { Component, OnInit } from '@angular/core';
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

	getBrandedMenuClass (isCollapsedMenu: boolean) {
		let menuClass = '';
		if (isCollapsedMenu) {
			menuClass = 'phd-hamburger-menu';
		} else {
			menuClass = 'phd-menu-options';
		}
		if (this.brandService.getBrandName() === 'johnWieland') {
			menuClass += '-jw';
		}
		return menuClass;
	}

	onHomePage() {
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));
		this.router.navigateByUrl('/home');
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
