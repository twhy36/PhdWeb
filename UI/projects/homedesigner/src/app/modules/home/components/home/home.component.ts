import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, of, BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, combineLatest, switchMap, withLatestFrom, take } from 'rxjs/operators';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as CommonActions from '../../../ngrx-store/actions';

import { UnsubscribeOnDestroy, SalesAgreement, SDImage } from 'phd-common';
import { JobService } from '../../../core/services/job.service';

@Component({
	selector: 'home',
    templateUrl: 'home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent extends UnsubscribeOnDestroy implements OnInit
{
	communityName: string = '';
	planName: string = '';
	planImageUrl: string = '';
	floorPlanImages: SDImage[] = [];
	salesAgreement: SalesAgreement;

	constructor(
		private activatedRoute: ActivatedRoute,
		private store: Store<fromRoot.State>,
		private jobService: JobService)
    {
        super();
    }

	ngOnInit() {
		this.activatedRoute.paramMap
			.pipe(
				combineLatest(this.store.pipe(select(state => state.salesAgreement))),
				switchMap(([params, salesAgreementState]) => {
					if (salesAgreementState.salesAgreementLoading || salesAgreementState.loadError) {
						return new Observable<never>();
					}

					// if sales agreement is not in the store and the id has been passed in to the url
					// or the passed in sales agreement id is different than that of the id in the store...
					const salesAgreementId = +params.get('salesAgreementId');
					if (salesAgreementId > 0 && salesAgreementState.id !== salesAgreementId) {
						this.store.dispatch(new CommonActions.LoadSalesAgreement(salesAgreementId));
						return new Observable<never>();
					}

					return of(_.pick(salesAgreementState, _.keys(new SalesAgreement())));
				}),
				this.takeUntilDestroyed(),
				distinctUntilChanged()
			)
			.subscribe((salesAgreement: SalesAgreement) => {
				this.salesAgreement = salesAgreement;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.elevationImageUrl)
		).subscribe(imageUrl => {
			this.planImageUrl = imageUrl;
		});

		this.store.pipe(
			select(state => state.job),
			withLatestFrom(this.store.select(state => state.changeOrder)),
			switchMap(([job, changeOrder]) =>
			{
				if (job.id && changeOrder)
				{
					return this.jobService.getFloorPlanImages(job.id, (changeOrder.currentChangeOrder !== null) ? true : false);
				}
				else
				{
					return new Observable<never>();
				}
			}),
			take(1)
		).subscribe(images =>
		{
			images && images.length && images.map(img =>
			{
				img.svg = `data:image/svg+xml;base64,${btoa(img.svg)}`;

				this.floorPlanImages.push({ imageUrl: img.svg, hasDataUri: true, floorIndex: img.floorIndex, floorName: img.floorName } as SDImage);
			});
		});		

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData => {
			this.planName = planData && planData.salesName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName => {
			this.communityName = communityName;
		});

	}
}
