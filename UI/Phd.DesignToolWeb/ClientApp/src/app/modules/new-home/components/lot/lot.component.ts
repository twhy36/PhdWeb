import { ChangeOrderHanding } from './../../../shared/models/job-change-order.model';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Observable, ReplaySubject } from 'rxjs';
import { combineLatest, map, filter, take, withLatestFrom } from 'rxjs/operators';

import { Lot, ViewAdjacency, Handing, PhysicalLotType, PlanAssociation, MonotonyRuleLot, SalesPhase } from '../../../shared/models/lot.model';
import { Plan } from '../../../shared/models/plan.model';

import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';
import { flipOver } from '../../../shared/classes/animations.class';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromLot from '../../../ngrx-store/lot/reducer';
import * as LotActions from '../../../ngrx-store/lot/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as JobActions from '../../../ngrx-store/job/actions';
import * as fromJobs from '../../../ngrx-store/job/reducer';

import { ActionBarCallType } from '../../../shared/classes/constants.class';
import { Choice } from '../../../shared/models/tree.model.new';
import { FinancialCommunity } from '../../../shared/models/community.model';
import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';
import { Job } from '../../../shared/models/job.model';
import { selectSelectedLot } from '../../../ngrx-store/lot/reducer';
import { ModalService } from '../../../core/services/modal.service';
import { NewHomeService } from '../../services/new-home.service';
import { Scenario } from '../../../shared/models/scenario.model';

@Component({
	selector: 'lot',
	templateUrl: 'lot.component.html',
	styleUrls: ['lot.component.scss'],
	animations: [flipOver]
})
export class LotComponent extends UnsubscribeOnDestroy implements OnInit, OnDestroy
{
	lots: Array<LotComponentLot>;
	filteredLots: Array<LotComponentLot>;
	selectedLot: Lot;
	selectedFilterBy$ = new ReplaySubject<number>(1);

	lotsLoading$: Observable<boolean>;
	selectedLot$: Observable<Lot>;

	plans$: Observable<Array<Plan>>;
	selectedPlan$: Observable<Plan>;
	selectedPlanId: number;

	canOverride: boolean;
	canConfigure: boolean;

	elevationChoice: Choice;
	colorSchemeChoice: Choice;
	override: number;
	overrideNote: string;
	colorSchemeConflictOverride: number;
	elevationConflictOverride: number;
	colorSchemeMonotonyConflict: boolean;
	overrideReason: string;
	selectedPlanPrice$: Observable<number>;
	buildMode: 'buyer' | 'spec' | 'model' | 'preview' = 'buyer';
	job: Job;
	scenario: Scenario;

	constructor(private router: Router,
		private store: Store<fromRoot.State>,
		private route: ActivatedRoute,
		private modalService: ModalService,
		private newHomeService: NewHomeService
	)
	{
		super();

		this.selectedFilterBy$.next(null);
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.buildMode)).subscribe((buildMode) =>
			{
				this.buildMode = buildMode;

			});

		this.plans$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.plan.plans),
			filter(plans => !!plans),
			map(plans => plans.sort(function (a, b) { return a.price - b.price; }))
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.financialCommunityFilter)
		).subscribe(filter => this.selectedFilterBy$.next(filter));

		this.selectedPlan$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.plan.selectedTree ? state.plan.plans.find(p => p.treeVersionId === state.plan.selectedTree) : null)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.plan.selectedPlan)
		).subscribe(planId => this.selectedPlanId = planId);

		this.lotsLoading$ = this.store.pipe(select(state => state.lot.lotsLoading));

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.elevationDP),
			map(dp =>
			{
				return dp ? dp.choices.find(c => c.quantity > 0) : null;
			})
		).subscribe(ch => this.elevationChoice = ch);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.colorSchemeDP),
			map(dp =>
			{
				return dp ? dp.choices.find(c => c.quantity > 0) : null;
			})
		).subscribe(ch => this.colorSchemeChoice = ch);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.elevationConflictOverride),
			combineLatest(this.store.pipe(select(fromScenario.colorSchemeConflictOverride))))
			.subscribe(([elevationOverride, colorSchemeOverride]) =>
			{
				this.colorSchemeConflictOverride = colorSchemeOverride;
				this.elevationConflictOverride = elevationOverride;
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromLot.dirtLots),
			filter(lots => !!lots),
			withLatestFrom(this.store.pipe(select(state => state.plan.selectedPlan))),
			map(([lots, selectedPlanId]) => lots.slice().sort(function (a, b)
			{
				// first group by lots that have the selected plan in its planAssocation
				if (selectedPlanId)
				{
					const aHasPlanAssociation = a.planAssociations ? a.planAssociations.some(p => p.planId === selectedPlanId) : false;
					const bHasPlanAssociation = b.planAssociations ? b.planAssociations.some(p => p.planId === selectedPlanId) : false;

					if (aHasPlanAssociation && !bHasPlanAssociation)
					{
						return -1;
					}

					if (!aHasPlanAssociation && bHasPlanAssociation)
					{
						return 1;
					}
				}

				const aLotBuildTypeDesc = a.lotBuildTypeDesc ? a.lotBuildTypeDesc.toLowerCase() : "dirt";
				const bLotBuildTypeDesc = b.lotBuildTypeDesc ? b.lotBuildTypeDesc.toLowerCase() : "dirt";

				// then group by lot build type ("dirt" or "spec")
				if (aLotBuildTypeDesc < bLotBuildTypeDesc)
				{
					return -1;
				}

				if (aLotBuildTypeDesc > bLotBuildTypeDesc)
				{
					return 1;
				}

				// then sort by lotblock
				return a.lotBlock < b.lotBlock ? -1 : a.lotBlock > b.lotBlock ? 1 : 0;
			})),
			combineLatest(
				this.store.pipe(
					select(selectSelectedLot)
				),
				this.store.pipe(select(state => state.lot.selectedHanding)),
				this.selectedFilterBy$
			)
		).subscribe(([lots, selectedLot, selectedHanding, selectedFilter]) =>
		{
			this.lots = lots.map(l => new LotComponentLot(l, selectedLot, selectedHanding));
			this.filteredLots = this.lots;

			if (this.lots && selectedFilter !== 0)
			{
				this.filteredLots = this.lots.filter(lot => lot.financialCommunityId === selectedFilter)
			}

			this.getLotsMontonyConflictMessage();
		});

		this.selectedLot$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(selectSelectedLot)
		);

		this.selectedLot$
			.pipe(this.takeUntilDestroyed())
			.subscribe(lot =>
			{
				// if the selected lot only has one handing then select it
				if (lot && lot.handings && lot.handings.length === 1)
				{
					this.store.dispatch(new LotActions.SelectHanding(lot.id, lot.handings[0].name));
				}

				this.selectedLot = lot;
			});

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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canOverride)
		).subscribe(canOverride => this.canOverride = canOverride);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canConfigure)
		).subscribe(canConfigure => this.canConfigure = canConfigure);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.overrideReason))
			.subscribe(override => this.overrideReason = override);

		this.selectedPlanPrice$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.selectedPlanPrice)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromJobs.jobState)
		).subscribe(job => this.job = job);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario)
		).subscribe(scenario => this.scenario = scenario.scenario);
	}

	isAssociatedWithSelectedPlan(lot: Lot): boolean
	{
		// if no plan has been selected then return true
		if (!this.selectedPlanId)
		{
			return true;
		}

		return lot.planAssociations ? lot.planAssociations.some(p => p.planId === this.selectedPlanId) : false;
	}

	monotonyConflictMessage(lot: LotComponentLot): string 
	{
		if (this.colorSchemeChoice && !this.colorSchemeConflictOverride) 
		{
			lot.colorSchemeMonotonyConflict = lot.monotonyRules.some(x => x.colorSchemeDivChoiceCatalogId === this.colorSchemeChoice.divChoiceCatalogId);
		}

		if (this.elevationChoice && !this.elevationConflictOverride) 
		{
			lot.elevationMonotonyConflict = lot.monotonyRules.some(r => r.elevationDivChoiceCatalogId === this.elevationChoice.divChoiceCatalogId);

			if (!this.colorSchemeChoice && this.elevationChoice.selectedAttributes.length > 0) 
			{
				lot.monotonyRules.forEach(rule => 
				{
					let colorAttributeConflicts = [];

					if (!this.colorSchemeMonotonyConflict) 
					{
						this.elevationChoice.selectedAttributes.forEach(x => 
						{
							if (rule.colorSchemeAttributeCommunityIds.some(colorAttributeIds => colorAttributeIds === x.attributeId)) 
							{
								colorAttributeConflicts.push(true);
							}
							else 
							{
								colorAttributeConflicts.push(false);
							}
						});
					}

					this.colorSchemeMonotonyConflict = !colorAttributeConflicts.some(x => x === false);
				})
			}
		}

		if (lot.elevationMonotonyConflict && lot.colorSchemeMonotonyConflict) 
		{
			lot.colorSchemeMonotonyConflict = true;
			lot.elevationMonotonyConflict = true;

			return "The Homesite selection is unavailable with the elevation and color scheme you have chosen.";
		}

		if (lot.elevationMonotonyConflict) 
		{
			lot.elevationMonotonyConflict = true;

			return "The Homesite selection is unavailable with the elevation you have chosen.";
		}

		if (lot.colorSchemeMonotonyConflict) 
		{
			lot.colorSchemeMonotonyConflict = true;

			return "The Homesite selection is unavailable with the color scheme you have chosen.";
		}

		return "";
	}

	getLotsMontonyConflictMessage() 
	{
		this.lots.forEach(x => x.monotonyConflictMessage = this.monotonyConflictMessage(x));
	}

	toggleSelection(lot: LotComponentLot, selected: boolean)
	{
		if (!!this.colorSchemeConflictOverride)
		{
			this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.colorSchemeChoice.id, overrideNote: null, quantity: 1 }));
		}
		else if (!!this.elevationConflictOverride)
		{
			this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.elevationChoice.id, overrideNote: null, quantity: 1 }));
		}

		if (this.monotonyConflictMessage(lot) && !selected)
		{
			this.onOverride(lot, selected);
		}
		else
		{
			this.toggleSelectedLot(lot, selected, null);
		}
	}

	addOverrideReason(lot: LotComponentLot, selected: boolean, overrideReason: string)
	{
		this.overrideNote = overrideReason;
		this.override = null;

		lot.monotonyConflictMessage = '';

		if (lot.colorSchemeMonotonyConflict)
		{
			this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.colorSchemeChoice.id, overrideNote: this.overrideNote, quantity: 1 }));
		}

		if (lot.elevationMonotonyConflict)
		{
			this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.elevationChoice.id, overrideNote: this.overrideNote, quantity: 1 }));
		}

		this.toggleSelectedLot(lot, selected, overrideReason);
	}

	toggleSelectedLot(lot: LotComponentLot, selected: boolean, overrideReason: string)
	{
		if (!overrideReason)
		{
			if (!!this.colorSchemeConflictOverride)
			{
				this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.colorSchemeChoice.id, overrideNote: null, quantity: 1 }));
			}
			else if (!!this.elevationConflictOverride)
			{
				this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.elevationChoice.id, overrideNote: null, quantity: 1 }));
			}
		}

		if (!selected)
		{
			if (this.job && this.job.id !== 0)
			{
				// remove the spec
				this.store.dispatch(new JobActions.DeselectSpec());
			}

			const handing = new ChangeOrderHanding();

			lot.monotonyConflictMessage = '';

			if (!lot.selectedHanding)
			{
				// if lot only has one handing then select it
				if (lot.handings.length === 1)
				{
					lot.selectedHanding = lot.handings[0].name;
				}
			}

			handing.handing = lot.selectedHanding;

			if (lot.selectedHanding)
			{
				// Set handing that was selected from drop down
				this.store.dispatch(new LotActions.SelectHanding(lot.id, lot.selectedHanding));
				this.store.dispatch(new ScenarioActions.SetScenarioLotHanding(handing));
			}

			this.store.dispatch(new LotActions.SelectLot(lot.id));
			this.store.dispatch(new ScenarioActions.SetScenarioLot(lot.id, handing, lot.premium));

			if (!this.selectedPlanId)
			{
				this.store.dispatch(new NavActions.SetSelectedSubNavItem(2));
			}
		}
		else
		{
			lot.selectedHanding = null;

			this.store.dispatch(new LotActions.DeselectLot());
			this.store.dispatch(new ScenarioActions.SetScenarioLot(null, null, 0));

			this.getLotsMontonyConflictMessage();
		}

		this.newHomeService.setSubNavItemsStatus(this.scenario, this.buildMode, this.job);
	}

	changeHanding(lotId: number, handing: string, monotonyconflict: boolean)
	{
		if (this.selectedLot && lotId === this.selectedLot.id)
		{
			if (!!handing)
			{
				const newHanding = new ChangeOrderHanding();

				newHanding.handing = handing;

				// Set handing that was selected from drop down
				this.store.dispatch(new LotActions.SelectHanding(lotId, handing));
				this.store.dispatch(new ScenarioActions.SetScenarioLotHanding(newHanding));
			}
			else
			{
				// handing not selected so deselect the lot
				this.toggleSelection(this.lots.find(l => l.id === lotId), true);
			}
		}
		else 
		{
			this.toggleSelection(this.lots.find(l => l.id === lotId), false);
		}
	}

	onCallToAction($event: { actionBarCallType: ActionBarCallType })
	{
		switch ($event.actionBarCallType)
		{
			case (ActionBarCallType.PRIMARY_CALL_TO_ACTION):
				this.navToEditHome();

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

	onOverride(lot: LotComponentLot, selected: boolean)
	{
		if (!this.overrideReason)
		{
			const body = `This will override the Monotony Conflict`;
			const confirm = this.modalService.open(ModalOverrideSaveComponent);

			confirm.componentInstance.title = 'Warning';
			confirm.componentInstance.body = body;
			confirm.componentInstance.defaultOption = 'Cancel';

			return confirm.result.then((result) =>
			{
				if (result !== 'Close')
				{
					this.store.dispatch(new ScenarioActions.SetOverrideReason(result));

					this.addOverrideReason(lot, selected, result);
				}
			});
		}
		else
		{
			this.addOverrideReason(lot, selected, this.overrideReason);
		}
	}
}

class LotComponentLot
{
	id: number;
	lotBlock: string;
	premium: number;
	viewAdjacency: ViewAdjacency[];
	lotStatusDescription: string;
	streetAddress1: string;
	streetAddress2: string;
	city: string;
	stateProvince: string;
	postalCode: string;
	handings: Handing[];
	foundationType: string;
	lotBuildTypeDesc: string;
	physicalLotTypes: PhysicalLotType[];
	financialCommunity: FinancialCommunity;
	planAssociations: PlanAssociation[];
	monotonyRules: MonotonyRuleLot[];
	unitNumber: string;
	salesBldgNbr: string;
	alternateLotBlock: string;
	constructionPhaseNbr: string;
	salesPhase: SalesPhase;
	selectedHanding: string = null;
	monotonyConflictMessage: string;
	elevationMonotonyConflict: boolean;
	colorSchemeMonotonyConflict: boolean;
	county: string;
	jobs: Array<Job>;
	financialCommunityId: number;

	constructor(lot: Lot, selectedLot: Lot, selectedHanding: string)
	{
		Object.assign(this, lot);

		if (selectedLot && lot.id === selectedLot.id && selectedHanding)
		{
			this.selectedHanding = selectedHanding;
		}
	}
}
