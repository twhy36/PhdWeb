import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Observable, ReplaySubject, combineLatest } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';

import 
{ 
	UnsubscribeOnDestroy, flipOver, FinancialCommunity, ChangeTypeEnum, Job, LotExt, Plan, Scenario, SalesCommunity, ModalService, LotChoiceRules, ChoiceRules, PointRules, 
	Choice, ConfirmModalComponent, Constants, ScenarioOption
} from 'phd-common';

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
import { ExteriorSubNavItems, LitePlanOption, LiteSubMenu } from '../../../shared/models/lite.model';
import * as LiteActions from '../../../ngrx-store/lite/actions';
import { NewHomeService } from '../../../new-home/services/new-home.service';
import { LotService } from '../../../core/services/lot.service';

import * as _ from 'lodash';

type planSortByType = 'Price - Low to High' | 'Price - High to Low';

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
	prevSelectedPlan: Plan;
	jobPlanId: number;
	changeOrderPlanId: number;
	salesPrice: number = 0;
	selectionPrice: number = 0;
	selectedPlanPrice$: Observable<number>;
	job: Job;
	isPhdLite: boolean = false;
	scenarioOptions: ScenarioOption[] = [];
	liteOptions: LitePlanOption[] = [];
	salesCommunity: SalesCommunity;
	totalPrice: number;

	lotChoiceRules: LotChoiceRules[] = null;
	choiceRules: ChoiceRules[] = null;
	pointRules: PointRules[] = null;
	currentChoices: Choice[] = null;
	chooseClicked: boolean = false;

	constructor(public planService: PlanService,
		private router: Router,
		private store: Store<fromRoot.State>,
		private route: ActivatedRoute,
		private newHomeService: NewHomeService,
		private modalService: ModalService,
		private lotService: LotService
	)
	{
		super();

		this.selectedSortBy$.next('Price - Low to High');
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
			select(state => state.org.salesCommunity)).subscribe(sc =>
			{
				this.salesCommunity = sc;
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

		this.selectedPlan$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state =>
			{
				this.selectedPlan = state.plan.selectedTree && state.plan.plans ? state.plan.plans.find(p => p.treeVersionId === state.plan.selectedTree) : null;

				if (!this.selectedPlan && state.plan.selectedPlan)
				{
					this.selectedPlan = state.plan.plans.find(p => p.id === state.plan.selectedPlan);
				}

				return this.selectedPlan;
			})
		);

		this.plans$ = combineLatest([
			this.store.pipe(select(state => state.plan.plans), filter(plans => !!plans)),
			this.store.pipe(select(state => state.lot.selectedLot ? state.lot.selectedLot.id : null)),
			this.selectedFilterBy$,
			this.selectedSortBy$
		]).pipe(
			this.takeUntilDestroyed(),
			map(([plans, selectedLot, financialCommunity, sortBy]) =>
			{
				return plans
					.filter(p =>
					{
						return (financialCommunity === 0 || p.communityId === financialCommunity)
							&& p.lotAssociations.length > 0
							&& p.isActive;
					})
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
						if (sortBy === 'Price - Low to High')
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
			select(state => state.lite)
		).subscribe(lite => 
		{
			this.isPhdLite = lite?.isPhdLite;
			this.scenarioOptions = lite?.scenarioOptions;
			this.liteOptions = lite?.options;
		});

		combineLatest([
			this.store.pipe(select(fromSalesAgreement.salesAgreementState)),
			this.store.pipe(select(fromRoot.priceBreakdown)),
			this.store.pipe(select(fromJob.jobState)),
			this.isChangingOrder$,
			this.selectedPlan$
		])
			.pipe(this.takeUntilDestroyed())
			.subscribe(([sag, pb, job, inChangeOrder, selectedPlan]) =>
			{
				this.job = job;
				this.jobPlanId = job.planId;
				this.salesPrice = !!sag ? sag.salePrice : 0;
				this.selectionPrice = !!sag && !!pb ? pb.nonStandardSelections + pb.priceAdjustments - pb.salesProgram : 0;

				// In plan change order, include the selection price if the current selected plan is the same as the job plan
				if (inChangeOrder && selectedPlan?.id === this.jobPlanId && pb)
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
			select(fromRoot.priceBreakdown)
		).subscribe(price => this.totalPrice = price.totalPrice);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.rules)
		).subscribe(rules =>
		{
			this.lotChoiceRules = rules?.lotChoiceRules;
			this.choiceRules = rules?.choiceRules;
			this.pointRules = rules?.pointRules;
		});

		combineLatest([
			this.store.pipe(
				select(state => state.scenario.tree),
				map(tree =>
				{
					return _.flatMap(tree?.treeVersion?.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));
				})
			),
			this.selectedLot$
		])
			.pipe(this.takeUntilDestroyed())
			.subscribe(([choices, lot]) =>
			{
				this.currentChoices = choices;

				// only try to run the check when the user makes a new selection
				if (this.chooseClicked)
				{
					// need to let the plan and tree load first before checking for changes
					this.checkLotChoiceRuleChanges(this.selectedPlan, lot);
				}
			});
	}

	sortPlans(sortBy: planSortByType)
	{
		this.selectedSortBy$.next(sortBy);
	}

	checkLotChoiceRuleChanges(plan: Plan, lot: LotExt)
	{
		this.chooseClicked = false;

		this.lotService.getLotChoiceRuleAssocs(lot.id).subscribe(lotChoiceRuleAssoc =>
		{
			let lotChoiceRuleResults = this.newHomeService.compileLotChoiceRuleChanges(lot.id, lotChoiceRuleAssoc, this.lotChoiceRules, this.currentChoices, this.choiceRules, this.pointRules, plan.treePlanId, this.buildMode, this.scenario);

			let mustHaveSelections = lotChoiceRuleResults.mustHaveSelections;
			let disabledByRules = lotChoiceRuleResults.disabledByRules;
			let mustNotHaveSelections = lotChoiceRuleResults.mustNotHaveSelections;
			let noLongerRequiredSelections = lotChoiceRuleResults.noLongerRequiredSelections;

			if (plan.id && ((mustHaveSelections?.length || disabledByRules?.length) || mustNotHaveSelections?.length || noLongerRequiredSelections?.length))
			{
				const body = this.newHomeService.createLotChoiceRuleChangeMessageBody(lot.lotBlock, this.currentChoices, mustHaveSelections, mustNotHaveSelections, disabledByRules, noLongerRequiredSelections);

				if (body.length)
				{
					const confirm = this.modalService.open(ConfirmModalComponent, { centered: true });

					confirm.componentInstance.title = 'Attention!';
					confirm.componentInstance.body = body;
					confirm.componentInstance.defaultOption = Constants.CONTINUE;

					return confirm.result.then((result) =>
					{
						if (result !== Constants.CLOSE)
						{
							// 376203: if we have choices that are no longer required then we need to remove them.
							this.newHomeService.unselectNoLongerRequiredChoices(noLongerRequiredSelections, this.currentChoices);
						}
						else
						{
							// Didn't want to change so lets revert back to the previous selection
							this.toggleSelectedPlan(this.prevSelectedPlan, lot, this.prevSelectedPlan === null);
						}
					});
				}
			}
		});
	}

	toggleSelection(event: { plan: Plan, lot: LotExt, isSelected: boolean })
	{
		this.toggleSelectedPlan(event.plan, event.lot, event.isSelected, true);
	}

	toggleSelectedPlan(plan: Plan, lot: LotExt, isSelected: boolean, chooseClicked: boolean = false)
	{
		//if a spec home, remove the currently selected lot and spec
		if (!this.inChangeOrder && this.job && this.job.id !== 0)
		{
			// remove the spec
			this.store.dispatch(new JobActions.DeselectSpec());

			// remove the lot
			this.store.dispatch(new LotActions.DeselectLot());
			this.store.dispatch(new ScenarioActions.SetScenarioLot(null, null, 0, null, true));

			// remove spec selections
			this.removeSpecSelections(plan);
		}

		//if the plan was not selected, choose it
		if (!isSelected)
		{
			this.chooseClicked = chooseClicked;
			this.prevSelectedPlan = this.selectedPlan;

			this.store.dispatch(new PlanActions.SelectPlan(plan.id, plan.treeVersionId, plan.marketingPlanId));
			this.store.dispatch(new ScenarioActions.SetScenarioPlan(plan.treeVersionId, plan.id));

			if (!this.inChangeOrder)
			{
				if (!lot)
				{
					// no lot you say? lets nav to the lots tab
					this.store.dispatch(new NavActions.SetSelectedSubNavItem(3));
				}

				if (this.buildMode === Constants.BUILD_MODE_SPEC || this.buildMode === Constants.BUILD_MODE_MODEL)
				{
					if (this.isPhdLite)
					{
						this.store.dispatch(new LiteActions.LoadLiteSpecOrModel(this.scenario));
					}
					else
					{
						this.store.dispatch(new ScenarioActions.LoadTree(this.scenario));
					}
				}
			}
		}
		else
		{
			this.store.dispatch(new PlanActions.DeselectPlan());
			this.store.dispatch(new ScenarioActions.SetScenarioPlan(null, null));

			// Clear tree when a spec is deselected
			if (this.buildMode === Constants.BUILD_MODE_SPEC || this.buildMode === Constants.BUILD_MODE_MODEL)
			{
				this.store.dispatch(new ScenarioActions.TreeLoaded(null, null, null, null, null, this.salesCommunity));
			}

			this.prevSelectedPlan = null;
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

	isLitePlanDisabled(plan: Plan): boolean
	{
		return this.inChangeOrder
			? this.isPhdLite && !!plan.treeVersionId || !this.isPhdLite && !plan.treeVersionId
			: false;
	}

	removeSpecSelections(plan: Plan)
	{
		if (this.isPhdLite)
		{
			const isPlanChanged = this.selectedPlan?.id !== plan.id;

			const baseHouseOption = this.liteOptions.find(o => o.isBaseHouse && o.isActive);

			// Remove selected options
			const deselectedOptions = this.scenarioOptions
				?.filter(opt => isPlanChanged || opt.edhPlanOptionId !== baseHouseOption.id)
				?.map(opt =>
				{
					return { ...opt, planOptionQuantity: 0 };
				});

			if (!!deselectedOptions?.length)
			{
				this.store.dispatch(new LiteActions.SelectOptions(deselectedOptions));				
			}

			// Remove options in the spec plan
			if (isPlanChanged)
			{
				this.store.dispatch(new LiteActions.LiteOptionsLoaded([], []));
			}
		}
		else
		{
			// Clear tree 
			this.store.dispatch(new ScenarioActions.TreeLoaded(null, null, null, null, null, this.salesCommunity));						
		}
	}
}
