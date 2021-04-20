import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, of, BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, combineLatest, switchMap, withLatestFrom } from 'rxjs/operators';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as CommonActions from '../../../ngrx-store/actions';

import { BrowserService, UnsubscribeOnDestroy, SalesAgreement } from 'phd-common';

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
			if (width > 1024) {
				this.fpImageWidth = '90%';
			}

			if (width > 1280) {
				this.fpImageWidth = '80%';
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
			select(fromRoot.elevationImageUrl)
		).subscribe(imageUrl => {
			this.planImageUrl = imageUrl;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.planState),
			withLatestFrom(this.store.pipe(select(state => state.scenario)))
		).subscribe(([plan, scenario]) => {
			if (plan && plan.marketingPlanId && plan.marketingPlanId.length) {
				if (scenario.tree && scenario.tree.treeVersion) {
					const subGroups = _.flatMap(scenario.tree.treeVersion.groups, g => g.subGroups) || [];
					const fpSubGroup = subGroups.find(sg => sg.useInteractiveFloorplan);
					if (fpSubGroup) {
						this.marketingPlanId$.next(plan.marketingPlanId[0]);
					}
				}
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
			select(fromRoot.financialCommunityName),
		).subscribe(communityName => {
			this.communityName = communityName;
		});

	}
}
