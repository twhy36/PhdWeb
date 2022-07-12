import { Component, OnInit } from "@angular/core";

import { Store, select, ActionsSubject } from "@ngrx/store";
import { ofType } from '@ngrx/effects';
import { Observable, ReplaySubject } from "rxjs";
import { combineLatest, take, switchMap } from 'rxjs/operators';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, Job, Plan, Scenario, ScenarioOption } from 'phd-common';

import * as fromJobs from '../../../ngrx-store/job/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as CommonActions from '../../../ngrx-store/actions';
import * as PlanActions from '../../../ngrx-store/plan/actions';
import * as LotActions from '../../../ngrx-store/lot/actions';
import * as JobActions from '../../../ngrx-store/job/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as LiteActions from '../../../ngrx-store/lite/actions';
import { ChangeOrderService } from './../../../core/services/change-order.service';
import { CommonActionTypes } from '../../../ngrx-store/actions';
import { Router } from "@angular/router";
import { NewHomeService } from "../../services/new-home.service";
import { LiteService } from "../../../core/services/lite.service";
import { LiteActionTypes } from "../../../ngrx-store/lite/actions";
import { ScenarioActionTypes, ScenarioSaved } from '../../../ngrx-store/scenario/actions';

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

	// PHD Lite
	scenarioOptions: ScenarioOption[];
	previousScenarioOptions: ScenarioOption[];

	constructor(
		private store: Store<fromRoot.State>,
		private router: Router,
		private actions: ActionsSubject,
		private changeOrderService: ChangeOrderService,
		private newHomeService: NewHomeService,
		private liteService: LiteService)
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
				this.specJobs = this.specJobs.filter(job => !(job.createdBy.toUpperCase().startsWith('PHCORP') || job.createdBy.toUpperCase().startsWith('PHBSSYNC')));
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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lite.scenarioOptions)
		).subscribe(scenarioOptions =>
		{
			this.scenarioOptions = scenarioOptions;
		});
	}

	toggleSpecHome(event: { job: Job, selectedJobId: number })
	{
		let job = event.job;

		this.store.pipe(
			take(1),
			select(state => state.org),
			switchMap(org =>
			{
				return this.liteService.isPhdLiteEnabled(job.financialCommunityId, org.salesCommunity?.market?.id);
			})
		).subscribe(isPhdLiteEnabled =>
		{
			const isPhdLite = isPhdLiteEnabled && this.liteService.checkLiteAgreement(event.job, null);
			const previousJob = this.specJobs.find(x => x.id === event.selectedJobId);
			const previousJobWasPhdLite = previousJob ? this.liteService.checkLiteAgreement(previousJob, null) : false;

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
			else if (isPhdLite)
			{
				//TODO: need to account for no previous job but started out as a regular Full config and then lite QMI was chosen
				this.previousScenarioOptions = _.cloneDeep(this.scenarioOptions);
				//if previousJob was for PhdFull or no previous job but config was being filled out with PhdFull info
				const needToDeletePhdFullData = (!!previousJob && previousJobWasPhdLite === false) || !!this.scenario.treeVersionId;

				this.store.dispatch(new CommonActions.LoadSpec(job));

				this.actions.pipe(
					ofType<ScenarioSaved>(ScenarioActionTypes.ScenarioSaved), take(1)).subscribe((action) =>
				{
					let scenarioOptions: ScenarioOption[] = job.jobPlanOptions.map(jobOption =>
					{
						return {
							scenarioOptionId: 0,
							scenarioId: action.scenario.scenarioId,
							edhPlanOptionId: jobOption.planOptionId,
							planOptionQuantity: jobOption.optionQty,
							scenarioOptionColors: []
						}
					});

					if (previousJob && previousJobWasPhdLite)
					{
						this.store.dispatch(new LiteActions.ToggleQuickMoveInSelections(this.previousScenarioOptions, scenarioOptions, needToDeletePhdFullData));
					}
					else if (!previousJob || needToDeletePhdFullData)
					{
						/*there was no previous job OR there was a previous PhdFull job.
						  Either way we need to save options for the newly selected Lite job and may or may need to delete PhdFull data*/
						this.store.dispatch(new LiteActions.ToggleQuickMoveInSelections([], scenarioOptions, needToDeletePhdFullData));
					}

					this.actions.pipe(
						ofType<LiteActions.ScenarioOptionsSaved>(LiteActionTypes.ScenarioOptionsSaved), take(1)).subscribe(() =>
					{
						this.newHomeService.setSubNavItemsStatus(this.scenario, this.buildMode, null)
						this.router.navigate(['/lite-summary']);
					});
				});
			}
			else
			{
				//previous selected QMI was for PhdLite or the config was for PhdLite
				if (previousJob && previousJobWasPhdLite || this.scenarioOptions?.length > 0)
				{
					this.previousScenarioOptions = _.cloneDeep(this.scenarioOptions);
				}

				this.changeOrderService.getTreeVersionIdByJobPlan(job.planId).subscribe(() =>
				{
					this.store.dispatch(new CommonActions.LoadSpec(job));

					this.actions.pipe(
						ofType<CommonActions.JobLoaded>(CommonActionTypes.JobLoaded), take(1)).subscribe(() =>
					{
						if (previousJob && previousJobWasPhdLite && this.previousScenarioOptions?.length > 0)
						{
							this.store.dispatch(new LiteActions.ToggleQuickMoveInSelections(this.previousScenarioOptions, [], false));
						}

						this.newHomeService.setSubNavItemsStatus(this.scenario, this.buildMode, null)

						this.router.navigate(['/scenario-summary']);
					});
				});
			}
		});
	}
}
