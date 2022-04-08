import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Observable, ReplaySubject } from 'rxjs';
import { combineLatest, map, filter, take } from 'rxjs/operators';

import { UnsubscribeOnDestroy, flipOver, FinancialCommunity, ChangeTypeEnum, Job, LotExt, Plan, Scenario } from 'phd-common';

import { PlanService } from '../../../core/services/plan.service';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as PlanActions from '../../../ngrx-store/plan/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { ActionBarCallType } from '../../../shared/classes/constants.class';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromJob from '../../../ngrx-store/job/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as JobActions from '../../../ngrx-store/job/actions';
import * as LotActions from '../../../ngrx-store/lot/actions';
import { selectSelectedLot } from '../../../ngrx-store/lot/reducer';

// PHD Lite
import { ExteriorSubNavItems, LiteSubMenu } from '../../../shared/models/lite.model';
import * as LiteActions from '../../../ngrx-store/lite/actions';

type planSortByType = "Price - Low to High" | "Price - High to Low";

@Component({
	selector: 'plan',
	templateUrl: 'plan.component.html',
	styleUrls: ['plan.component.scss'],
	animations: [
		flipOver
	]
})
export class PlanComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() canConfigure: boolean;
	@Output() onPlanToggled = new EventEmitter<void>();

	selectedSortBy$ = new ReplaySubject<planSortByType>(1);
	selectedFilterBy$ = new ReplaySubject<number>(1);

	communities$: Observable<Array<FinancialCommunity>>;
	plans$: Observable<Array<Plan>>;
	selectedPlan$: Observable<Plan>;
	selectedLot$: Observable<LotExt>;
	buildMode: string;
	scenario: Scenario;
	isChangingOrder$: Observable<boolean>;
	inChangeOrder: boolean = false;
	selectedPlan: Plan;
	jobPlanId: number;
	changeOrderPlanId: number;
	salesPrice: number = 0;
	selectionPrice: number = 0;
	selectedPlanPrice$: Observable<number>;
	job: Job;
	isPhdLite: boolean = false;

	constructor(public planService: PlanService,
		private router: Router,
		private store: Store<fromRoot.State>,
		private route: ActivatedRoute
	)
	{
		super();

		this.selectedSortBy$.next("Price - Low to High");
		this.selectedFilterBy$.next(null);
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.scenario)).subscribe(scenario =>
			{
				this.scenario = scenario;
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.buildMode)).subscribe(build =>
			{
				this.buildMode = build;
			});

		this.communities$ = this.store.pipe(
			select(state => state.org.salesCommunity.financialCommunities),
			map(communities => communities.slice().sort(function (a, b)
			{
				// then sort by lotblock
				return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
			}))
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.financialCommunityFilter)
		).subscribe(filter => this.selectedFilterBy$.next(filter));

		this.plans$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.plan.plans),
			filter(plans => !!plans),
			combineLatest(this.store.pipe(select(state => state.lot.selectedLot ? state.lot.selectedLot.id : null)), this.selectedFilterBy$, this.selectedSortBy$),
			map(([plans, selectedLot, financialCommunity, sortBy]) =>
			{
				return plans
					.filter(p => (financialCommunity === 0 || p.communityId === financialCommunity) && p.lotAssociations.length > 0)
					.sort(function (a, b)
					{
						// first group by plans that have the selected lot in its lotAssocation
						if (selectedLot)
						{
							const aHasLotAssociation = a.lotAssociations.some(p => p === selectedLot);
							const bHasLotAssociation = b.lotAssociations.some(p => p === selectedLot);

							if (aHasLotAssociation && !bHasLotAssociation)
							{
								return -1;
							}

							if (!aHasLotAssociation && bHasLotAssociation)
							{
								return 1;
							}
						}

						// then sort by price, then name
						if (sortBy === "Price - Low to High")
						{
							return a.price < b.price ? -1 : a.price > b.price ? 1 : a.salesName < b.salesName ? -1 : a.salesName > b.salesName ? 1 : 0;
						}
						else
						{
							return a.price < b.price ? 1 : a.price > b.price ? -1 : a.salesName < b.salesName ? -1 : a.salesName > b.salesName ? 1 : 0;
						}
					});
			})
		);

		this.selectedPlan$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state =>
				{
					this.selectedPlan = state.plan.selectedTree && state.plan.plans ? state.plan.plans.find(p => p.treeVersionId === state.plan.selectedTree) : null;
	
					if (!this.selectedPlan && state.plan.selectedPlan && state.lite?.isPhdLite)
					{
						this.selectedPlan = state.plan.plans.find(p => p.id === state.plan.selectedPlan);
					}
	
					return this.selectedPlan;
				})
		);

		this.selectedLot$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(selectSelectedLot)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.nav.selectedItem)
		).subscribe(item =>
		{
			if (item === 1)
			{
				this.router.navigate(['..', 'name-scenario'], { relativeTo: this.route });
			}
		});

		this.isChangingOrder$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder),
			map(changeOrder =>
			{
				this.inChangeOrder = changeOrder.changeInput && changeOrder.changeInput.type === ChangeTypeEnum.PLAN && changeOrder.isChangingOrder;
				this.changeOrderPlanId = changeOrder.changeInput ? changeOrder.changeInput.changeOrderPlanId : null;

				return this.inChangeOrder;
			})
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromSalesAgreement.salesAgreementState),
			combineLatest(
				this.store.pipe(select(fromRoot.priceBreakdown)),
				this.store.pipe(select(fromJob.jobState)),
				this.isChangingOrder$,
				this.selectedPlan$
			)
		).subscribe(([sag, pb, job, inChangeOrder, selectedPlan]) =>
		{
			this.job = job;
			this.jobPlanId = job.planId;
			this.salesPrice = !!sag ? sag.salePrice : 0;
			this.selectionPrice = !!sag && !!pb ? pb.nonStandardSelections + pb.priceAdjustments - pb.salesProgram : 0;

			// In plan change order, include the selection price if the current selected plan is the same as the job plan
			if (inChangeOrder && selectedPlan.id === this.jobPlanId && pb)
			{
				this.selectionPrice += pb.selections;
			}
		});

		this.selectedPlanPrice$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.selectedPlanPrice)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lite)
		).subscribe(lite => this.isPhdLite = lite?.isPhdLite);
	}

	sortPlans(sortBy: planSortByType)
	{
		this.selectedSortBy$.next(sortBy);
	}

	toggleSelectedPlan(event: { plan: Plan, isSelected: boolean })
	{
		//if a spec home, remove the currently selected lot and spec
		if (!this.inChangeOrder && this.job && this.job.id !== 0)
		{
			// remove the spec
			this.store.dispatch(new JobActions.DeselectSpec());

			// remove the lot
			this.store.dispatch(new LotActions.DeselectLot());
			this.store.dispatch(new ScenarioActions.SetScenarioLot(null, null, 0));
		}

		//if the plan was not selected, choose it
		if (!event.isSelected)
		{
			this.store.dispatch(new PlanActions.SelectPlan(event.plan.id, event.plan.treeVersionId, event.plan.marketingPlanId));
			this.store.dispatch(new ScenarioActions.SetScenarioPlan(event.plan.treeVersionId, event.plan.id));

			if (!this.inChangeOrder)
			{
				this.selectedLot$.subscribe(lot =>
				{
					if (!lot)
					{
						this.store.dispatch(new NavActions.SetSelectedSubNavItem(3));
					}
				});

				if (this.buildMode === 'spec' || this.buildMode === 'model')
				{
					this.store.dispatch(new ScenarioActions.LoadTree(this.scenario));
				}
			}
		}
		else
		{
			this.store.dispatch(new PlanActions.DeselectPlan());
			this.store.dispatch(new ScenarioActions.SetScenarioPlan(null, null));
		}

		this.onPlanToggled.emit();
	}

	onCallToAction($event: { actionBarCallType: ActionBarCallType })
	{
		switch ($event.actionBarCallType)
		{
			case (ActionBarCallType.PRIMARY_CALL_TO_ACTION):
				if (this.inChangeOrder)
				{
					if (this.jobPlanId !== this.selectedPlan.id)
					{
						if (!this.changeOrderPlanId || this.changeOrderPlanId !== this.selectedPlan.id)
						{
							this.isPhdLite
								? this.store.dispatch(new LiteActions.LoadLitePlan(this.selectedPlan.id))
								: this.store.dispatch(new PlanActions.LoadSelectedPlan(this.selectedPlan.id, this.selectedPlan.treeVersionId));
						}
						this.router.navigateByUrl('/scenario-summary');
					}
				}
				else if (this.isPhdLite)
				{
					this.store.dispatch(new NavActions.SetSubNavItems(ExteriorSubNavItems));		
					this.store.dispatch(new NavActions.SetSelectedSubNavItem(LiteSubMenu.Elevation));
					this.router.navigateByUrl('/lite/elevation');						
				}
				else
				{
					this.navToEditHome();
				}

				break;
		}
	}

	navToEditHome()
	{
		this.store.pipe(
			select(state => state.scenario),
			map(scenarioState => { return { scenarioId: scenarioState.scenario.scenarioId, divDPointCatalogId: scenarioState.tree.treeVersion.groups[0].subGroups[0].points[0].divPointCatalogId }; }),
			take(1)
		).subscribe(state =>
		{
			this.router.navigate(['/edit-home', (state.scenarioId || ''), state.divDPointCatalogId]);
		});
	}
}
