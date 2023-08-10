import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';

import * as fromPlan from '../../ngrx-store/plan/reducer';
import * as fromRoot from '../../ngrx-store/reducers';

import { UnsubscribeOnDestroy } from 'phd-common';
import { BrandService } from '../../core/services/brand.service';
import { BuildMode } from '../../shared/models/build-mode.model';
@Component({
	selector: 'landing',
	templateUrl: './landing.component.html',
	styleUrls: ['./landing.component.scss'],
	})
export class LandingComponent extends UnsubscribeOnDestroy implements OnInit 
{
	isPresale: boolean;
	imageUrl: string;
	communityName: string;
	planName: string;

	constructor(
		private store: Store<fromRoot.State>,
		private brandService: BrandService
	) 
	{
		super();
	}

	ngOnInit(): void 
	{
		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select((state) => state.scenario)
			)
			.subscribe(
				(state) =>
					(this.isPresale = state.buildMode === BuildMode.Presale)
			);

		this.store
			.pipe(this.takeUntilDestroyed(), select(fromRoot.elevationImageUrl))
			.subscribe((imageUrl) => (this.imageUrl = imageUrl));

		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select(fromRoot.financialCommunityName)
			)
			.subscribe((communityName) => (this.communityName = communityName));

		this.store
			.pipe(this.takeUntilDestroyed(), select(fromPlan.selectedPlanData))
			.subscribe((planData) => (this.planName = planData?.salesName));
	}

	getImageSrc(): string 
	{
		return this.brandService.getBrandImage('logo');
	}
}
