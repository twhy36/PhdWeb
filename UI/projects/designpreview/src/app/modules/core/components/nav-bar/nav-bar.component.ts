import { Component, HostListener, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { select, Store } from '@ngrx/store';

import { TreeVersion, UnsubscribeOnDestroy } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromApp from '../../../ngrx-store/app/reducer';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as ErrorActions from '../../../ngrx-store/error.action';

import { Brands, BrandService } from '../../services/brand.service';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { withLatestFrom } from 'rxjs/operators';

@Component({
	selector: 'nav-bar',
	templateUrl: 'nav-bar.component.html',
	styleUrls: ['nav-bar.component.scss']
	})

export class NavBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	currentRoute: string;
	displayBrandedMenu: boolean = true;
	isMenuCollapsed: boolean = true;
	isDesignComplete: boolean = false;
	showContractedOptionsLink: boolean = false;
	showFloorplanLink: boolean = false;
	showIncludedOptionsLink: boolean = true;
	buildMode: BuildMode;
	welcomeText: string = 'Welcome To Your Home';
	sessionStorage: Storage = sessionStorage;
	includedTree: TreeVersion;

	@HostListener('window:resize', ['$event'])
	onResize(event)
	{
		if (this.brandService.getBrandName() === 'johnWieland')
		{
			//The 'johnWieland' logo is the biggest, so it has it's own pixel threshold for expanding/collapsing the nav links
			if (event.target.innerWidth > 1130)
			{	//This is the point where the navbar expands from hamburger menu to links
				this.isMenuCollapsed = true;		//	close the hamburger menu
			}
		}
		else
		{
			//All the other logos are either this size or less, so this else covers the rest
			if (event.target.innerWidth > 1068)
			{
				this.isMenuCollapsed = true;
			}
		}
	}

	get toFavoritesPage()
	{
		return !this.currentRoute.includes('summary');
	}

	get isLaunchedInBuyerPreview()
	{
		return this.currentRoute?.includes('favorites/preview');
	}

	constructor(
		private router: Router,
		private store: Store<fromRoot.State>,
		private brandService: BrandService)
	{
		super();
	}

	ngOnInit()
	{
		this.router.events.subscribe(evt =>
		{
			if (evt instanceof NavigationEnd)
			{
				this.currentRoute = evt.url.toLowerCase();
				if (evt.url != '/error')
				{
					this.store.dispatch(new ErrorActions.ClearLatestError());
				}
				this.isMenuCollapsed = true;
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement),
			withLatestFrom(this.store.pipe(select(fromRoot.includedTree))),
		).subscribe(([salesAgreement, tree]) =>
		{
			this.isDesignComplete = salesAgreement.isDesignComplete;
			this.includedTree = tree;
			const includedDecisionPoints = this.includedTree?.groups.flatMap(g => g.subGroups).flatMap(sg => sg.points);
			this.showIncludedOptionsLink = !this.isDesignComplete || (!this.isDesignComplete && !!includedDecisionPoints?.find(dp => !dp.isPastCutOff));
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromApp.getAppLatestError)
		).subscribe(latestError =>
		{
			this.displayBrandedMenu = latestError ? false : true;	
		})

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
		).subscribe((state) =>
		{
			this.buildMode = state.buildMode;
			switch (state.buildMode)
			{
			case (BuildMode.Preview):
				this.showContractedOptionsLink = false;
				this.showFloorplanLink = true;
				break;
			case (BuildMode.Presale):
				this.showContractedOptionsLink = false;
				this.showFloorplanLink = false;
				this.welcomeText = 'Welcome To Your Future Home';
				break;
			default:
				this.showContractedOptionsLink = true;
				this.showFloorplanLink = true;
				break;
			}
		});
	}

	getBrandedMenuClass()
	{
		let menuClass = 'phd-hamburger-menu';

		if (this.brandService.getBrandName() === Brands.JohnWieland)
		{
			menuClass += '-jw';
		}
		return menuClass;
	}

	onHomePage()
	{
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));
		switch (this.buildMode)
		{
		case (BuildMode.Preview):
			this.router.navigate(['/preview'], { queryParamsHandling: 'merge' });
			break;
		case (BuildMode.Presale):
			this.router.navigate(['presale'], { queryParamsHandling: 'merge' });
			break;
		default:
			this.router.navigate(['/home'], { queryParamsHandling: 'merge' });
			break;
		}
	}

	onViewFavorites()
	{
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));
		this.router.navigate(['favorites', 'summary'], { queryParamsHandling: 'merge' })
	}

	getImageSrc()
	{
		return this.brandService.getBrandImage('white_logo');
	}

	getBrandedTitle()
	{
		return 'phd-nav-bar-' + this.brandService.getBrandName();
	}

}
