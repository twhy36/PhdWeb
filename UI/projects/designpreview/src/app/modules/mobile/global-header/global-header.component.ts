import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Store, select } from '@ngrx/store';

import { UnsubscribeOnDestroy } from 'phd-common';

import * as fromRoot from '../../ngrx-store/reducers';
import * as ScenarioActions from '../../ngrx-store/scenario/actions';

import { BrandService } from '../../core/services/brand.service';
import { BuildMode } from '../../shared/models/build-mode.model';

@Component({
	selector: 'global-header',
	templateUrl: './global-header.component.html',
	styleUrls: ['./global-header.component.scss']
	})
export class GlobalHeaderComponent extends UnsubscribeOnDestroy implements OnInit 
{

	@Output() hamburgerClicked = new EventEmitter();

	buildMode: BuildMode;

	constructor(
		private router: Router,
		private store: Store<fromRoot.State>,
		private brandService: BrandService)
	{
		super();
	}

	ngOnInit(): void
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
		).subscribe((scenario) =>
		{
			this.buildMode = scenario.buildMode;
		})
	}

	getImageSrc(): string
	{
		return this.brandService.getBrandImage('white_logo');
	}

	homeLogoClicked(): void
	{
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));
		switch (this.buildMode)
		{
			case (BuildMode.Preview):
				this.router.navigate(['mobile/preview'], { queryParamsHandling: 'merge' });
				break;
			case (BuildMode.Presale):
				this.router.navigate(['mobile/presale'], { queryParamsHandling: 'merge' });
				break;
			default:
				this.router.navigate(['mobile/home'], { queryParamsHandling: 'merge' });
				break;
		}
	}
}
