import { Component, OnInit } from "@angular/core";

import { Store, select, ActionsSubject } from "@ngrx/store";
import { ofType } from '@ngrx/effects';
import { Observable, ReplaySubject } from "rxjs";
import { combineLatest, take } from 'rxjs/operators';

import * as _ from 'lodash';

import * as fromJobs from '../../../ngrx-store/job/reducer';
import { UnsubscribeOnDestroy } from "phd-common/utils/unsubscribe-on-destroy";
import * as fromRoot from '../../../ngrx-store/reducers';
import { Plan } from "../../../shared/models/plan.model";
import { Job } from "../../../shared/models/job.model";
import * as CommonActions from '../../../ngrx-store/actions';
import * as PlanActions from '../../../ngrx-store/plan/actions';
import * as LotActions from '../../../ngrx-store/lot/actions';
import * as JobActions from '../../../ngrx-store/job/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import { ChangeOrderService } from './../../../core/services/change-order.service';
import { CommonActionTypes } from '../../../ngrx-store/actions';
import { Router } from "@angular/router";
import { NewHomeService } from "../../services/new-home.service";
import { Scenario } from "../../../shared/models/scenario.model";

@Component({
	selector: 'quick-move-in',
	templateUrl: 'quick-move-in.component.html',
	styleUrls: ['quick-move-in.component.scss'],
})
export class QuickMoveInComponent extends UnsubscribeOnDestroy implements OnInit
{
	specJobs: Job[];
	plans$: Observable<Array<Plan>>;
	selectedFilterBy$ = new ReplaySubject<number>(1);
	filteredSpecJobs: Job[];
	canConfigure$: Observable<boolean>;
	selectedJob$: Observable<Job>;
	scenario: Scenario;
	buildMode: string;

	constructor(
		private store: Store<fromRoot.State>,
		private router: Router,
		private actions: ActionsSubject,
		private changeOrderService: ChangeOrderService,
		private newHomeService: NewHomeService)
	{
		super();

		this.selectedFilterBy$.next(null);
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.financialCommunityFilter)
		).subscribe(filter => this.selectedFilterBy$.next(filter));

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromJobs.specJobs),
			combineLatest(this.selectedFilterBy$)
		).subscribe(([jobs, filter]) =>
		{
			if (jobs)
			{
				this.specJobs = _.cloneDeep(jobs);
				this.filteredSpecJobs = filter === 0
					? this.specJobs
					: this.specJobs.filter(job => job.lot.financialCommunityId === filter);

				this.filteredSpecJobs.sort(function (a, b)
				{
					if (a.lot.lotBlock < b.lot.lotBlock)
					{
						return -1;
					}

					if (a.lot.lotBlock > b.lot.lotBlock)
					{
						return 1;
					}
				});
			}
			else
			{
				this.filteredSpecJobs = [];
			}
		});

		this.plans$ = this.store.pipe(
			select(state => state.plan.plans)
		);

		this.canConfigure$ = this.store.pipe(select(fromRoot.canConfigure));

		this.selectedJob$ = this.store.pipe(select(fromJobs.jobState));

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario)
		).subscribe(scenario =>
		{
			this.scenario = scenario.scenario;
			this.buildMode = scenario.buildMode;
		});
	}

	toggleSpecHome(event: { job: Job, selectedJobId: number })
	{
		let job = event.job;

		// quick move-in
		if (event.selectedJobId === job.id)
		{
			// remove the spec
			this.store.dispatch(new JobActions.DeselectSpec());

			// remove the plan
			this.store.dispatch(new PlanActions.DeselectPlan());
			this.store.dispatch(new ScenarioActions.SetScenarioPlan(null, null));

			// remove the lot
			this.store.dispatch(new LotActions.DeselectLot());
			this.store.dispatch(new ScenarioActions.SetScenarioLot(null, null, 0));

			this.newHomeService.setSubNavItemsStatus(this.scenario, this.buildMode, null)
		}
		else
		{
			this.changeOrderService.getTreeVersionIdByJobPlan(job.planId).subscribe(() =>
			{
				this.store.dispatch(new CommonActions.LoadSpec(job));

				this.actions.pipe(
					ofType<CommonActions.JobLoaded>(CommonActionTypes.JobLoaded), take(1)).subscribe(() =>
					{
						this.newHomeService.setSubNavItemsStatus(this.scenario, this.buildMode, null)

						this.router.navigate(['/scenario-summary']);
					});
			});
		}
	}
}
