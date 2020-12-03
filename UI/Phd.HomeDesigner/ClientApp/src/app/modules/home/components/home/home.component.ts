import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, of, BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, combineLatest, switchMap, withLatestFrom } from 'rxjs/operators';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromOrg from '../../../ngrx-store/org/reducer';
import * as fromJob from '../../../ngrx-store/job/reducer';
import * as CommonActions from '../../../ngrx-store/actions';

import { PlanOption } from '../../../shared/models/option.model';
import { SalesAgreement } from '../../../shared/models/sales-agreement.model';
import { BrowserService } from '../../../core/services/browser.service';
import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';

@Component({
	selector: 'home',
    templateUrl: 'home.component.html',
    styleUrls: ['home.component.scss']
})
export class HomeComponent extends UnsubscribeOnDestroy implements OnInit
{
	fpImageWidth: string = '120%';
	communityName: string = '';
	planName: string = '';
	planImageUrl: string = '';
	marketingPlanId$ = new BehaviorSubject<number>(0);
	salesAgreement: SalesAgreement;

	constructor(private browser: BrowserService,
		private activatedRoute: ActivatedRoute,
		private store: Store<fromRoot.State>)
    {
        super();
    }

	ngOnInit() {

		this.browser.clientWidth().subscribe(width => {
			if (width > 1280) {
				this.fpImageWidth = '100%';
			}
		});

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
			select(fromScenario.elevationDP),
			withLatestFrom(this.store.pipe(select(state => state.scenario)))
		).subscribe(([dp, scenario]) => {
			const elevationOption = scenario.options ? scenario.options.find(x => x.isBaseHouseElevation) : null;

			if (dp) {
				const selectedChoice = dp.choices.find(x => x.quantity > 0);
				let option: PlanOption = null;

				if (selectedChoice && selectedChoice.options && selectedChoice.options.length) {
					// look for a selected choice to pull the image from
					option = selectedChoice.options.find(x => x.optionImages != null);
				}
				else if (!selectedChoice && elevationOption) {
					// if a choice hasn't been selected then get the default option
					option = elevationOption;
				}

				if (option && option.optionImages.length > 0) {
					this.planImageUrl = option.optionImages[0].imageURL;
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.planState)
		).subscribe(plan => {
			if (plan && plan.marketingPlanId && plan.marketingPlanId.length) {
				this.marketingPlanId$.next(plan.marketingPlanId[0]);
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData => {
			this.planName = planData && planData.salesName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromOrg.selectOrg),
			combineLatest(this.store.pipe(select(fromJob.jobState)))
		).subscribe(([org, job]) => {
			if (org && org.salesCommunity && org.salesCommunity.financialCommunities && org.salesCommunity.financialCommunities.length) {
				const financialCommunity = org.salesCommunity.financialCommunities.find(x => x.id === job.financialCommunityId);
				if (financialCommunity) {
					this.communityName = financialCommunity.name;
				}
			}
		});

	}
}
