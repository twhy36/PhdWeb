import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Observable, ReplaySubject, combineLatest } from 'rxjs';
import { map, filter, take, withLatestFrom } from 'rxjs/operators';

import
{
	UnsubscribeOnDestroy, flipOver, FinancialCommunity, ChangeOrderHanding, Job, Lot, ViewAdjacency, Handing,
	PhysicalLotType, PlanAssociation, MonotonyRuleLot, SalesPhase, Plan, Scenario, Choice, ModalService, LotChoiceRules,
	ConfirmModalComponent, ChoiceRules, PointRules, ScenarioOptionColor
} from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromLot from '../../../ngrx-store/lot/reducer';
import * as PlanActions from '../../../ngrx-store/plan/actions';
import * as LotActions from '../../../ngrx-store/lot/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as JobActions from '../../../ngrx-store/job/actions';
import * as LiteActions from '../../../ngrx-store/lite/actions';
import * as fromJobs from '../../../ngrx-store/job/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromLite from '../../../ngrx-store/lite/reducer';

import { ActionBarCallType } from '../../../shared/classes/constants.class';
import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';
import { selectSelectedLot } from '../../../ngrx-store/lot/reducer';
import { NewHomeService } from '../../services/new-home.service';
import * as _ from 'lodash';

// PHD Lite
import { ExteriorSubNavItems, LiteSubMenu, LiteMonotonyRule, LitePlanOption } from '../../../shared/models/lite.model';
import { LotService } from '../../../core/services/lot.service';


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
	scenarioPlanId?: number;

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
	lotChoiceRules: LotChoiceRules[] = null;
	choiceRules: ChoiceRules[] = null;
	pointRules: PointRules[] = null;
	currentChoices: Choice[] = null;
	financialCommunities: Array<FinancialCommunity>;

	// PHD Lite
	isPhdLite: boolean = false;
	liteMonotonyRules: LiteMonotonyRule[] = null;
	liteElevationOption: LitePlanOption;
	liteColorScheme: ScenarioOptionColor;
	liteElevationOverrideNote: string;
	liteColorSchemeOverrideNote: string;

	totalPrice: number;

	constructor(private router: Router,
		private store: Store<fromRoot.State>,
		private route: ActivatedRoute,
		private modalService: ModalService,
		private newHomeService: NewHomeService,
		private lotService: LotService
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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.rules)
		).subscribe(rules =>
		{
			this.lotChoiceRules = rules?.lotChoiceRules;
			this.choiceRules = rules?.choiceRules;
			this.pointRules = rules?.pointRules;
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
			select(fromPlan.selectedPlanData)
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
			select(state => state.scenario.tree),
			map(tree =>
			{
				this.scenarioPlanId = tree?.planId;

				return _.flatMap(tree?.treeVersion?.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));
			})
		).subscribe(choices => this.currentChoices = choices);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.colorSchemeDP),
			map(dp =>
			{
				return dp ? dp.choices.find(c => c.quantity > 0) : null;
			})
		).subscribe(ch => this.colorSchemeChoice = ch);

		combineLatest([
			this.store.pipe(select(fromScenario.elevationConflictOverride)),
			this.store.pipe(select(fromScenario.colorSchemeConflictOverride))
		])
		.pipe(this.takeUntilDestroyed())
		.subscribe(([elevationOverride, colorSchemeOverride]) =>
		{
			this.colorSchemeConflictOverride = colorSchemeOverride;
			this.elevationConflictOverride = elevationOverride;
		});

		combineLatest([
			this.store.pipe(
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
			),
			this.store.pipe(select(selectSelectedLot)),
			this.store.pipe(select(state => state.org.salesCommunity?.financialCommunities)),
			this.store.pipe(select(state => state.lot.selectedHanding)),
			this.selectedFilterBy$
		])
		.pipe(this.takeUntilDestroyed())
		.subscribe(([lots, selectedLot, financialCommunities, selectedHanding, selectedFilter]) =>
		{
			this.financialCommunities = financialCommunities;
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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lite)
		).subscribe(lite =>
		{
			this.isPhdLite = lite?.isPhdLite;
			this.liteMonotonyRules = lite?.liteMonotonyRules;
			this.liteElevationOverrideNote = lite?.elevationOverrideNote;
			this.liteColorSchemeOverrideNote = lite?.colorSchemeOverrideNote;
		});

		combineLatest([
			this.store.pipe(select(fromLite.selectedElevation)),
			this.store.pipe(select(fromLite.selectedColorScheme))
		])
		.pipe(this.takeUntilDestroyed())
		.subscribe(([elevation, colorScheme]) =>
		{
			this.liteElevationOption = elevation;
			this.liteColorScheme = colorScheme;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(price => this.totalPrice = price.totalPrice);
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
		const planId = this.selectedPlanId ?? 0;
		const isColorSchemePlanRuleEnabled = this.financialCommunities.find(fc => fc.id == lot.financialCommunityId).isColorSchemePlanRuleEnabled;

		if (this.colorSchemeChoice && !this.colorSchemeConflictOverride)
		{
			lot.colorSchemeMonotonyConflict = isColorSchemePlanRuleEnabled ? lot.monotonyRules.some(x => x.colorSchemeDivChoiceCatalogId === this.colorSchemeChoice.divChoiceCatalogId && x.edhPlanId === planId) :
				lot.monotonyRules.some(x => x.colorSchemeDivChoiceCatalogId === this.colorSchemeChoice.divChoiceCatalogId);
		}

		if (this.isPhdLite)
		{
			if (this.liteElevationOption && !this.liteElevationOverrideNote)
			{
				const lotLiteMonotonyRules = this.liteMonotonyRules?.find(monotonyRule => monotonyRule.edhLotId === lot.id)?.relatedLotsElevationColorScheme || [];

				lot.elevationMonotonyConflict = lotLiteMonotonyRules.some(r => r.elevationPlanOptionId === this.liteElevationOption.id);

				if (this.liteColorScheme && !this.liteColorSchemeOverrideNote)
				{
					const colorItem = this.liteElevationOption.colorItems?.find(item => item.colorItemId === this.liteColorScheme.colorItemId);
					const color = colorItem?.color?.find(c => c.colorId === this.liteColorScheme.colorId);

					if (colorItem && color)
					{
						lot.colorSchemeMonotonyConflict = isColorSchemePlanRuleEnabled
							? lotLiteMonotonyRules.some(r =>
								r.colorSchemeColorItemName === colorItem.name
								&& r.colorSchemeColorName === color.name
								&& r.edhPlanId === planId)
							: lotLiteMonotonyRules.some(r =>
								r.colorSchemeColorItemName === colorItem.name
								&& r.colorSchemeColorName === color.name);
					}
				}
			}
		}
		else
		{
			if (this.elevationChoice && !this.elevationConflictOverride)
			{
				lot.elevationMonotonyConflict = lot.monotonyRules.some(r => r.elevationDivChoiceCatalogId === this.elevationChoice.divChoiceCatalogId && r.edhPlanId === planId);

				if (!this.colorSchemeChoice && this.elevationChoice.selectedAttributes.length > 0)
				{
					lot.monotonyRules.forEach(rule =>
					{
						// must be on the same plan
						if (rule.edhPlanId === planId)
						{
							let colorAttributeConflicts = [];

							if (!this.colorSchemeMonotonyConflict)
							{
								this.elevationChoice.selectedAttributes.forEach(x =>
								{
									const doesColorSchemeAttributeExist = rule.colorSchemeAttributeCommunityIds.some(colorAttributeIds => colorAttributeIds === x.attributeId);

									colorAttributeConflicts.push(doesColorSchemeAttributeExist);
								});
							}

							this.colorSchemeMonotonyConflict = !colorAttributeConflicts.some(x => x === false);
						}
					});
				}
			}
		}

		if (lot.elevationMonotonyConflict && lot.colorSchemeMonotonyConflict)
		{
			lot.colorSchemeMonotonyConflict = true;
			lot.elevationMonotonyConflict = true;

			return 'The Homesite selection is unavailable with the elevation and color scheme you have chosen.';
		}

		if (lot.elevationMonotonyConflict)
		{
			lot.elevationMonotonyConflict = true;

			return 'The Homesite selection is unavailable with the elevation you have chosen.';
		}

		if (lot.colorSchemeMonotonyConflict)
		{
			lot.colorSchemeMonotonyConflict = true;

			return 'The Homesite selection is unavailable with the color scheme you have chosen.';
		}

		return '';
	}

	getLotsMontonyConflictMessage()
	{
		this.lots.forEach(x => x.monotonyConflictMessage = this.monotonyConflictMessage(x));
	}

	toggleSelection(lot: LotComponentLot, selected: boolean)
	{
		if (!selected)
		{
			this.lotService.getLotChoiceRuleAssocs(lot.id).subscribe(lotChoiceRuleAssoc =>
			{
				let lotChoiceRuleResults = this.newHomeService.compileLotChoiceRuleChanges(lot.id, lotChoiceRuleAssoc, this.lotChoiceRules, this.currentChoices, this.choiceRules, this.pointRules, this.scenarioPlanId, this.buildMode, this.scenario);

				let mustHaveSelections = lotChoiceRuleResults.mustHaveSelections;
				let disabledByRules = lotChoiceRuleResults.disabledByRules;
				let mustNotHaveSelections = lotChoiceRuleResults.mustNotHaveSelections;
				let noLongerRequiredSelections = lotChoiceRuleResults.noLongerRequiredSelections;
				let prevLotChoiceRules = lotChoiceRuleResults.prevLotChoiceRules;

				this.lotChoiceRules = lotChoiceRuleResults.lotChoiceRules;

				if (this.selectedPlanId && ((mustHaveSelections?.length || disabledByRules?.length) || mustNotHaveSelections?.length || noLongerRequiredSelections?.length))
				{
					const body = this.newHomeService.createLotChoiceRuleChangeMessageBody(lot.lotBlock, this.currentChoices, mustHaveSelections, mustNotHaveSelections, disabledByRules, noLongerRequiredSelections);

					if (body.length)
					{
						const confirm = this.modalService.open(ConfirmModalComponent, { centered: true });

						confirm.componentInstance.title = 'Attention!';
						confirm.componentInstance.body = body;
						confirm.componentInstance.defaultOption = 'Continue';

						return confirm.result.then((result) =>
						{
							if (result !== 'Close')
							{
								this.toggleLot(lot, selected);
							}
							else
							{
								//Set previous lot choice rules if the user cancels
								this.lotChoiceRules = prevLotChoiceRules;
							}
						});
					}
					else
					{
						this.toggleLot(lot, selected);
					}
				}
				else
				{
					this.toggleLot(lot, selected);
				}
			});
		}
		else
		{
			this.lotChoiceRules = [];

			this.toggleLot(lot, selected);
		}
	}

	private toggleLot(lot: LotComponentLot, selected: boolean)
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

		if (this.isPhdLite)
		{
			if (lot.colorSchemeMonotonyConflict)
			{
				this.store.dispatch(new LiteActions.SetLiteOverrideReason(overrideReason, false));
			}

			if (lot.elevationMonotonyConflict)
			{
				this.store.dispatch(new LiteActions.SetLiteOverrideReason(overrideReason, true));
			}
		}
		else
		{
			if (lot.colorSchemeMonotonyConflict)
			{
				this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.colorSchemeChoice.id, overrideNote: this.overrideNote, quantity: 1 }));
			}

			if (lot.elevationMonotonyConflict)
			{
				this.store.dispatch(new ScenarioActions.SelectChoices(true, { choiceId: this.elevationChoice.id, overrideNote: this.overrideNote, quantity: 1 }));
			}
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

		//if lot wasn't selected
		if (!selected)
		{
			// if spec was chosen
			if (this.isSpecSelected)
			{
				// remove the spec
				this.store.dispatch(new JobActions.DeselectSpec());

				// remove the plan
				this.store.dispatch(new PlanActions.DeselectPlan());
				this.store.dispatch(new ScenarioActions.SetScenarioPlan(null, null));
			}

			const handing = new ChangeOrderHanding();

			lot.monotonyConflictMessage = '';

			if (!lot.selectedHanding)
			{
				// if lot only has one handing and it isn't NA, set the selected handing to the name
				// NA has a value of null, so it will not be set
				if (lot.handings.length === 1 && lot.handings[0].name !== 'NA')
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
			this.store.dispatch(new ScenarioActions.SetScenarioLot(lot.id, handing, lot.premium, this.lotChoiceRules));

			if (this.selectedPlanId && !this.isPhdLite)
			{
				this.store.dispatch(new ScenarioActions.SelectRequiredChoiceAttributes());
			}
			else if (!this.selectedPlanId)
			{
				this.store.dispatch(new NavActions.SetSelectedSubNavItem(2));
			}
		}
		else
		{
			lot.selectedHanding = null;

			this.store.dispatch(new LotActions.DeselectLot());
			this.store.dispatch(new ScenarioActions.SetScenarioLot(null, null, 0, this.lotChoiceRules));

			this.getLotsMontonyConflictMessage();
		}

		this.newHomeService.setSubNavItemsStatus(this.scenario, this.buildMode, this.job);
	}

	//when handing is changed
	changeHanding(lot: LotComponentLot)
	{
		let lotId: number = lot.id;
		let handing: string = lot.selectedHanding;

		this.monotonyConflictMessage(lot);

		//if the selected lot is falsy or the dropdown's lot id differs from the previously existing lot id
		//select it
		if (!this.selectedLot || lotId !== this.selectedLot.id)
		{
			this.toggleSelection(this.lots.find(l => l.id === lotId), false);

			return;
		}

		//if chosen handing was null for No Selection, deselect
		if (handing === null)
		{
			// handing not selected so deselect the lot
			this.toggleSelection(this.lots.find(l => l.id === lotId), true);

			return;
		}

		const newHanding = new ChangeOrderHanding();

		//If NA was chosen, pass null to save to the scenario
		if (handing !== 'NA')
		{
			newHanding.handing = handing;
		}

		// Set handing that was selected from drop down
		this.store.dispatch(new LotActions.SelectHanding(lotId, handing));
		this.store.dispatch(new ScenarioActions.SetScenarioLotHanding(newHanding));
	}

	onCallToAction($event: { actionBarCallType: ActionBarCallType })
	{
		switch ($event.actionBarCallType)
		{
			case (ActionBarCallType.PRIMARY_CALL_TO_ACTION):
				if (this.isPhdLite)
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
			map(scenarioState => { return { scenarioId: scenarioState.scenario.scenarioId, divDPointCatalogId: scenarioState.tree?.treeVersion?.groups[0]?.subGroups[0]?.points[0]?.divPointCatalogId || 0 }; }),
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
					if (!this.isPhdLite)
					{
						this.store.dispatch(new ScenarioActions.SetOverrideReason(result));
					}

					this.addOverrideReason(lot, selected, result);
				}
			});
		}
		else
		{
			this.addOverrideReason(lot, selected, this.overrideReason);
		}
	}

	get isSpecSelected(): boolean
	{
		return this.job && this.job.id !== 0;
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

		//if the lot exists with a saved id
		if (selectedLot && lot.id === selectedLot.id)
		{
			//if the selectedHanding was null, it's NA
			if (selectedHanding == null)
			{
				this.selectedHanding = 'NA';

				return;
			}

			this.selectedHanding = selectedHanding;
		}
	}
}
