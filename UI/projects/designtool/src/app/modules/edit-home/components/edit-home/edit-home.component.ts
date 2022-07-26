import { Component, ViewChild, OnInit, ChangeDetectorRef, TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store, select } from '@ngrx/store';

import * as _ from 'lodash';

import { map, filter, combineLatest, distinctUntilChanged, withLatestFrom, debounceTime, switchMap } from 'rxjs/operators';
import { Observable, ReplaySubject, of } from 'rxjs';

import * as fromLot from '../../../ngrx-store/lot/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as ChangeOrderActions from '../../../ngrx-store/change-order/actions';
import * as CommonActions from '../../../ngrx-store/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as LotActions from '../../../ngrx-store/lot/actions';
import * as fromJobs from '../../../ngrx-store/job/reducer';

import
	{
		UnsubscribeOnDestroy, ModalRef, ChangeTypeEnum, Job, TreeVersionRules, ScenarioStatusType, PriceBreakdown,
		TreeFilter, Tree, SubGroup, Group, DecisionPoint, Choice, getDependentChoices, LotExt, getChoiceToDeselect,
		PlanOption, ModalService, Plan, TimeOfSaleOptionPrice, ITimeOfSaleOptionPrice
	} from 'phd-common';

import { LotService } from '../../../core/services/lot.service';

import { ChoiceCardComponent } from '../../../shared/components/choice-card/choice-card.component';
import { DecisionPointFilterType } from '../../../shared/models/decisionPointFilter';
import { MonotonyConflict } from '../../../shared/models/monotony-conflict.model';

// PHD Lite
import { LiteService } from '../../../core/services/lite.service';
import { ExteriorSubNavItems, LiteSubMenu } from '../../../shared/models/lite.model';

@Component({
	selector: 'edit-home',
	templateUrl: './edit-home.component.html',
	styleUrls: ['./edit-home.component.scss']
})
export class EditHomeComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild('content') content: any;
	@ViewChild('lotConflict') lotConflictModal: TemplateRef<any>;
	// Using a setter with ViewChild since the choice card component has an ngIf
	private choiceCard: ChoiceCardComponent;
	@ViewChild(ChoiceCardComponent) set card(choiceCard: ChoiceCardComponent)
	{
		this.choiceCard = choiceCard;

		if (choiceCard)
		{
			this.choiceCard.onChoiceDetail(this.viewChoice, this.choiceCard.content);
		}
	}
	@ViewChild('optionMappingChangedModal') optionMappingChangedModal: TemplateRef<any>;
	@ViewChild('impactedChoicesModal') impactedChoicesModal: TemplateRef<any>;
	@ViewChild('optionPriceChangedModal') optionPriceChangedModal: TemplateRef<any>;

	acknowledgedMonotonyConflict: boolean;
	agreementStatus$: Observable<string>;
	buildMode: string;
	canConfigure$: Observable<boolean>;
	canOverride$: Observable<boolean>;
	choicesById = {};
	complete$: Observable<boolean>;
	enabledPointFilters$: Observable<DecisionPointFilterType[]>;
	errorMessage: string = '';
	isChangingOrder$: Observable<boolean>;
	isChangingOrder: boolean;
	lotcheckModalDisplayed: boolean;
	marketingPlanId: number[];
	modal: ModalRef;
	monotonyConflict: MonotonyConflict;
	overrideReason$: Observable<string>;
	scenarioHasSalesAgreement: boolean;
	pointsById = {};
	priceBreakdown$: Observable<PriceBreakdown>;
	scenarioStatus$: Observable<ScenarioStatusType>;
	selectedDecisionPoint$: ReplaySubject<DecisionPoint> = new ReplaySubject<DecisionPoint>(1);
	selectedDivPointCatalogId: number;
	selectedPointFilter$: Observable<DecisionPointFilterType>;
	selectedSubGroup$: ReplaySubject<SubGroup> = new ReplaySubject<SubGroup>(1);
	selectedSubNavItem$: Observable<number>;
	showPhaseProgressBarItems: boolean = true;
	showStatusIndicator: boolean;
	subNavItems$: Observable<any>;
	tree: Tree;
	treeFilter$: Observable<TreeFilter>;
	treeVersionRules: TreeVersionRules;
	options: PlanOption[];
	viewChoice: Choice;
	viewPoint: DecisionPoint;
	salesAgreementId: number;
	impactedChoices: string = '';
	lotStatus: string;
	selectedLot: LotExt;
	plan: Plan;
	isPhdLite: boolean = false;
	jobId: number;
	timeOfSaleOptionPrices: TimeOfSaleOptionPrice[];

	private params$ = new ReplaySubject<{ scenarioId: number, divDPointCatalogId: number, treeVersionId: number, choiceId?: number }>(1);
	private selectedGroupId: number;
	private selectedSubgroupId: number;
	private subGroups: SubGroup[];

	constructor(private cd: ChangeDetectorRef,
		private lotService: LotService,
		private liteService: LiteService,
		private store: Store<fromRoot.State>,
		private route: ActivatedRoute,
		private router: Router,
		private modalService: ModalService) { super(); }

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lot)
		).subscribe(lot =>
		{
			if (lot.selectedLot)
			{
				this.selectedLot = lot.selectedLot;
				this.lotStatus = lot.selectedLot.lotStatusDescription;
			}
		});

		this.enabledPointFilters$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.enabledPointFilters)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.buildMode)
		).subscribe(build =>
		{
			this.buildMode = build;
		});

		this.subNavItems$ = this.store.pipe(
			select(state => state.nav.subNavItems)
		);

		this.selectedSubNavItem$ = this.store.pipe(
			select(state => state.nav.selectedItem)
		);

		this.treeFilter$ = this.store.pipe(
			select(state => state.scenario.treeFilter)
		);

		this.store.pipe(
			select(fromScenario.getPointsById),
			withLatestFrom(this.store.pipe(select(fromScenario.getChoicesById)))
		).subscribe(([pointsById, choicesById]) =>
		{
			this.pointsById = pointsById;
			this.choicesById = choicesById;
		});

		this.route.paramMap.pipe(
			this.takeUntilDestroyed(),
			map(params => { return { scenarioId: +params.get('scenarioId'), divDPointCatalogId: +params.get('divDPointCatalogId'), treeVersionId: +params.get('treeVersionId'), viewDivDPointCatalogId: +params.get('viewDivDPointCatalogId') }; }),
			distinctUntilChanged()
		).subscribe(params => this.params$.next(params));

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
			combineLatest(this.params$,
				this.store.pipe(select(state => state.lite)),
				this.store.pipe(select(fromPlan.selectedPlanData))
			),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree)),
				this.route.data,
				this.store.pipe(select(state => state.salesAgreement))
			)
		).subscribe(([[scenarioState, params, lite, plan], filteredTree, routeData, sag]) =>
		{
			this.errorMessage = '';
			this.showPhaseProgressBarItems = true;
			this.salesAgreementId = sag && sag.id;

			if (scenarioState.treeLoading)
			{
				return;
			}

			this.liteService.isPhdLiteEnabled(scenarioState.scenario?.financialCommunityId).subscribe(isPhdLiteEnabled => 
			{
				this.isPhdLite = isPhdLiteEnabled && (lite.isPhdLite || this.liteService.checkLiteScenario(scenarioState?.scenario?.scenarioChoices, scenarioState?.scenario?.scenarioOptions));

				if (routeData["isPreview"])
				{
					if (!scenarioState.tree || scenarioState.tree.treeVersion.id !== params.treeVersionId)
					{
						this.store.dispatch(new ScenarioActions.LoadPreview(params.treeVersionId));
					}
					else if (filteredTree)
					{
						this.router.navigateByUrl(`edit-home/0/${filteredTree.groups[0].subGroups[0].points[0].divPointCatalogId}`);
					}
				}
				else if ((!scenarioState.scenario || params.scenarioId !== scenarioState.scenario.scenarioId) && !sag.id && this.buildMode === 'buyer')
				{
					this.store.dispatch(new CommonActions.LoadScenario(params.scenarioId));
				}
				else if (filteredTree && params.divDPointCatalogId > 0 && !this.isPhdLite)
				{
					let groups = filteredTree.groups;
					let sg;
					let dp;

					if (groups.length)
					{
						sg = _.flatMap(groups, g => g.subGroups).find(sg => sg.points.some(p => p.divPointCatalogId === params.divDPointCatalogId));
						dp = !!sg ? sg.points.find(p => p.divPointCatalogId === params.divDPointCatalogId) : null;

						if (!dp)
						{
							let divPointCatalogId = groups[0].subGroups[0].points[0].divPointCatalogId;

							//this happens if the decision point has been filtered out of the tree - find a new decision point to navigate to
							if (!!this.selectedGroupId)
							{
								let origGroup = groups.find(g => g.id === this.selectedGroupId);

								if (origGroup)
								{
									let origSg = origGroup.subGroups.find(sg => sg.id === this.selectedSubgroupId);

									if (origSg)
									{
										divPointCatalogId = origSg.points[0].divPointCatalogId;
									}
									else
									{
										divPointCatalogId = origGroup.subGroups[0].points[0].divPointCatalogId;
									}
								}
							}

							this.router.navigate(['..', divPointCatalogId], { relativeTo: this.route });
						}
						else
						{
							this.setSelectedGroup(groups.find(g => g.subGroups.some(sg1 => sg1.id === sg.id)), sg);
							this.selectedSubGroup$.next(sg);
							this.selectedDecisionPoint$.next(dp);

							//this is when they've actually navigated to a different decision point:
							if (params.divDPointCatalogId !== this.selectedDivPointCatalogId)
							{
								this.selectedDivPointCatalogId = dp.divPointCatalogId;

								if (!dp.viewed)
								{
									this.store.dispatch(new ScenarioActions.SetPointViewed(dp.id));
								}
							}
						}
					}
					else if (scenarioState.treeFilter)
					{
						// find the last point we were on using the full tree
						groups = scenarioState.tree.treeVersion.groups;
						sg = _.flatMap(groups, g => g.subGroups).find(sg => sg.points.some(p => p.divPointCatalogId === params.divDPointCatalogId));
						dp = !!sg ? sg.points.find(p => p.divPointCatalogId === params.divDPointCatalogId) : null;

						if (dp)
						{
							this.setSelectedGroup(groups.find(g => g.subGroups.some(sg1 => sg1.id === sg.id)), sg);
							this.selectedSubGroup$.next(sg);
							this.selectedDecisionPoint$.next(dp);
						}

						this.errorMessage = 'Seems there are no results that match your search criteria.';
						this.showPhaseProgressBarItems = false;
					}
				}
				else if (filteredTree && !this.isPhdLite)
				{
					this.router.navigate([filteredTree.groups[0].subGroups[0].points[0].divPointCatalogId], { relativeTo: this.route });
				}
				else if (this.isPhdLite && !this.plan && !!plan)
				{
					this.loadPhdLite();
				}
			});

			this.plan = plan;
		});

		//subscribe to changes in phase progress selection
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.nav.selectedItem),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree), map(tree => tree && tree.groups), filter(groups => !!groups))),
			debounceTime(100)
		).subscribe(([sg, groups]) =>
		{
			if (this.selectedSubgroupId && sg !== this.selectedSubgroupId)
			{
				let subGroup = _.flatMap(groups, g => g.subGroups).find(s => s.id === sg);

				if (subGroup)
				{
					this.router.navigate(['..', subGroup.points[0].divPointCatalogId], { relativeTo: this.route });
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.isGanked),
			combineLatest(
				this.store.pipe(select(fromScenario.scenarioHasSalesAgreement)),
				this.store.pipe(select(fromLot.lotsLoaded))
			),
			withLatestFrom(this.store.pipe(select(state => state.scenario?.scenario?.treeVersionId)))
		).subscribe(([[isGanked, hasAgreement, lotsLoaded], treeVersionId]) =>
		{
			if (lotsLoaded)
			{
				this.scenarioHasSalesAgreement = hasAgreement;

				if (isGanked && this.lotConflictModal && !this.lotcheckModalDisplayed)
				{
					this.lotcheckModalDisplayed = true;

					const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };
					const secondaryButton = { text: 'Cancel', result: true, cssClass: 'btn-secondary' };

					this.showConfirmModal(this.lotConflictModal, 'Attention!', primaryButton, secondaryButton).subscribe(result =>
					{
						if (result)
						{
							if (this.scenarioHasSalesAgreement)
							{
								const summaryUrl = !this.isPhdLite ? '/scenario-summary' : '/lite-summary';
								this.router.navigateByUrl(summaryUrl);
							}
							else
							{
								this.store.dispatch(new LotActions.DeselectLot());
								this.store.dispatch(new ScenarioActions.SetScenarioLot(null, null, 0));
								this.store.dispatch(new NavActions.SetSelectedSubNavItem(3));

								this.router.navigateByUrl('/new-home/lot');
							}
						}
						else
						{
							window.close();
						}
					});
				}
			}
		});

		this.priceBreakdown$ = this.store.pipe(
			select(fromRoot.priceBreakdown)
		);

		this.complete$ = this.store.pipe(
			select(fromRoot.isComplete)
		);

		this.agreementStatus$ = this.store.pipe(select(fromRoot.salesAgreementStatus));
		this.overrideReason$ = this.store.pipe(select(state => state.scenario.overrideReason));

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.plan.marketingPlanId),
			withLatestFrom(this.store.select(fromRoot.canEditAgreementOrSpec))
		).subscribe(([marketingPlanId, canEditAgreement]) =>
		{
			this.marketingPlanId = marketingPlanId;
			this.showStatusIndicator = canEditAgreement;
		});

		this.selectedPointFilter$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.selectedPointFilter)
		);

		this.scenarioStatus$ = this.store.pipe(
			select(fromRoot.scenarioStatus)
		);

		//monotony conflict advisement
		this.store.pipe(
			select(state => state.lot),
			withLatestFrom(this.store.pipe(select(fromRoot.monotonyConflict))),
			this.takeUntilDestroyed()
		).subscribe(([selectedLot, monotonyConflict]) => 
		{
			if (selectedLot.selectedLot) 
			{
				if (((monotonyConflict.elevationConflict && !monotonyConflict.elevationConflictOverride) || ((monotonyConflict.colorSchemeAttributeConflict || monotonyConflict.colorSchemeConflict) && !monotonyConflict.colorSchemeConflictOverride)) && !monotonyConflict.conflictSeen)
				{
					this.monotonyConflict = monotonyConflict;

					this.store.dispatch(new ScenarioActions.MonotonyAdvisementShown());

					setTimeout(() => this.loadMonotonyModal());
				}
			}
		}
		);

		this.isChangingOrder$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder),
			map(changeOrder =>
			{
				this.isChangingOrder = (changeOrder.changeInput
					&& (changeOrder.changeInput.type === ChangeTypeEnum.CONSTRUCTION
						|| changeOrder.changeInput.type === ChangeTypeEnum.PLAN))
					? changeOrder.isChangingOrder
					: false;

				return this.isChangingOrder;
			})
		);

		this.store.pipe(
			select(fromScenario.selectScenario)
		).subscribe(scenario =>
		{
			this.tree = scenario.tree;
			this.treeVersionRules = _.cloneDeep(scenario.rules);
			this.options = _.cloneDeep(scenario.options);
		});

		this.canConfigure$ = this.store.pipe(select(fromRoot.canConfigure));
		this.canOverride$ = this.store.pipe(select(fromRoot.canOverride));

		this.store.pipe(
			select(fromJobs.jobState)
		).subscribe(job =>
		{
			this.jobId = job?.id;
			this.timeOfSaleOptionPrices = job?.timeOfSaleOptionPrices;
		});
	}

	ngOnDestroy()
	{
		// reset the treeFilter when we leave the edit page
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));

		super.ngOnDestroy();
	}

	navigateToElevation()
	{
		this.modal.dismiss();

		this.store.pipe(
			select(fromScenario.elevationDP),
			withLatestFrom(this.store.pipe(select(store => store.scenario.scenario.scenarioId))),
		).subscribe(([mytree, scenario]) =>
		{
			const elevationUrl = 'edit-home/' + scenario + '/' + mytree.divPointCatalogId;

			this.router.navigateByUrl(elevationUrl);
		});
	}

	navigateToColorScheme()
	{
		this.modal.dismiss();
		this.store.pipe(
			select(fromScenario.elevationDP),
			combineLatest(
				this.store.pipe(select(store => store.scenario.scenario.scenarioId)),
				this.store.pipe(select(fromScenario.colorSchemeDP))
			)
		).subscribe(([elevationDP, scenario, colorSchemeDP]) =>
		{
			if (colorSchemeDP)
			{
				const colorSchemeUrl = 'edit-home/' + scenario + '/' + colorSchemeDP.divPointCatalogId;

				this.router.navigateByUrl(colorSchemeUrl);
			}
			else
			{
				const elevationUrl = 'edit-home/' + scenario + '/' + elevationDP.divPointCatalogId;

				this.router.navigate([elevationUrl, { 'choiceId': elevationDP.choices.find(z => z.quantity > 0).id }]);
			}
		});
	}

	navigate(path: any[])
	{
		this.modal.dismiss();
		this.router.navigate([...path]);
	}

	acknowledgeMonotonyConflict()
	{
		this.acknowledgedMonotonyConflict = !this.acknowledgedMonotonyConflict;
	}

	onBuildIt() 
	{
		this.lotService.hasMonotonyConflict().subscribe(mc =>
		{
			if (mc.monotonyConflict)
			{
				this.loadMonotonyModal();
			}
			else
			{
				if (this.buildMode === 'spec' || this.buildMode === 'model')
				{
					if (this.buildMode === 'model' && this.lotStatus === 'Available')
					{
						const title = 'Create Model';
						const body = 'The Lot Status for this model will be set to UNAVAILABLE.';
						const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };

						this.showConfirmModal(body, title, primaryButton).subscribe(result =>
						{
							this.lotService.buildScenario();
						});
					}
					else if (this.buildMode === 'model' && this.lotStatus === 'PendingRelease')
					{
						this.lotService.getLotReleaseDate(this.selectedLot.id).pipe(
							switchMap((releaseDate) =>
							{
								const title = 'Create Model';
								const body = 'The selected lot is scheduled to be released on ' + releaseDate + '. <br><br> If you continue, the lot will be removed from the release and the Lot Status will be set to UNAVAILABLE.';

								const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };
								const secondaryButton = { text: 'Cancel', result: false, cssClass: 'btn-secondary' };

								return this.showConfirmModal(body, title, primaryButton, secondaryButton);
							})).subscribe(result =>
							{
								if (result)
								{
									this.lotService.buildScenario();
								}
							});
					}
					else
					{
						this.lotService.buildScenario();
					}
				}
				else if (this.salesAgreementId)
				{
					this.router.navigateByUrl(`/point-of-sale/people/${this.salesAgreementId}`);
				}
				else
				{
					const title = 'Generate Home Purchase Agreement';
					const body = 'You are about to generate an Agreement for your configuration. Do you wish to continue?';

					const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };
					const secondaryButton = { text: 'Cancel', result: false, cssClass: 'btn-secondary' };

					this.showConfirmModal(body, title, primaryButton, secondaryButton).subscribe(result =>
					{
						if (result)
						{
							// this really needs to get fixed.  the alert messsage isn't correct.
							this.lotService.buildScenario();
						}
					});
				}
			}
		});
	}

	onChoiceChange(c: Choice)
	{
		if (c)
		{
			this.viewChoice = { ...c, quantity: !c.quantity ? 1 : 0 };
		}
		else
		{
			this.viewChoice = c;
		}
	}

	showChoiceModal(choice: Choice)
	{
		if (choice)
		{
			// set viewChoice, which will add the ChoiceCardComponent to the DOM and fire off the choiceCard setter
			this.viewPoint = this.pointsById[choice.treePointId];
			this.viewChoice = choice;
		}
		else
		{
			this.viewChoice = this.viewPoint = null;
		}

		this.cd.detectChanges();
	}

	private showConfirmModal(body: TemplateRef<any> | string, title: string, primaryButton: any = null, secondaryButton: any = null): Observable<boolean>
	{
		const buttons = [];

		if (primaryButton)
		{
			buttons.push(primaryButton);
		}

		if (secondaryButton)
		{
			buttons.push(secondaryButton);
		}

		return this.modalService.showModal({
			buttons: buttons,
			content: body,
			header: title,
			type: 'normal'
		});
	}

	//change subgroups displayed in phase progress when selected group changes
	private setSelectedGroup(newGroup: Group, newSubGroup: SubGroup)
	{
		//check to see if the sub nav needs to be updated
		if (!this.subGroups || _.xor(this.subGroups.map(sg => sg.id), newGroup.subGroups.map(sg => sg.id)).length)
		{
			this.store.dispatch(new NavActions.SetSubNavItems(newGroup.subGroups.map(sg =>
			{
				return { label: sg.label, id: sg.id, status: sg.status };
			})));
		}

		if (!this.selectedGroupId || this.selectedGroupId !== newGroup.id)
		{
			this.store.dispatch(new NavActions.SetSelectedSubNavItem(newSubGroup.id));
		}
		else
		{
			if (!this.selectedSubgroupId || this.selectedSubgroupId !== newSubGroup.id)
			{
				this.store.dispatch(new NavActions.SetSelectedSubNavItem(newSubGroup.id));
			}
		}

		this.selectedGroupId = newGroup.id;
		this.selectedSubgroupId = newSubGroup.id;
		this.subGroups = newGroup.subGroups;
	}

	toggleChoice({ choice: choice, saveNow: saveNow, quantity: quantity }: { choice: Choice, saveNow: boolean, quantity?: number })
	{
		const choiceToDeselect = getChoiceToDeselect(this.tree, choice);

		// #353697 Determine what options are being replaced by this choice, and track their original price
		const timeOfSaleOptionPrices = this.getReplacedOptionPrices(choice);

		let selectedChoices = [{ choiceId: choice.id, overrideNote: choice.overrideNote, quantity: !choice.quantity ? quantity || 1 : 0, attributes: choice.selectedAttributes, timeOfSaleOptionPrices: timeOfSaleOptionPrices }];
		const impactedChoices = getDependentChoices(this.tree, this.treeVersionRules, this.options, choice);

		impactedChoices.forEach(c =>
		{
			selectedChoices.push({ choiceId: c.id, overrideNote: c.overrideNote, quantity: 0, attributes: c.selectedAttributes, timeOfSaleOptionPrices: this.getReplacedOptionPrices(c) });
		});

		// #353697 Prompt the user of affected choices with an adjusted price by deselecting this choice
		let impactedOptionPriceChoices = [];

		if (choiceToDeselect)
		{
			impactedOptionPriceChoices = this.getImpactedChoicesForReplacedOptionPrices(timeOfSaleOptionPrices);
		}

		let obs: Observable<boolean>;

		if (choiceToDeselect && ((choiceToDeselect.changedDependentChoiceIds && choiceToDeselect.changedDependentChoiceIds.length > 0) || choiceToDeselect.mappingChanged))
		{
			obs = this.showOptionMappingChangedModal(impactedChoices);
		}
		else if (this.isChangingOrder && impactedChoices && impactedChoices.length)
		{
			obs = this.showChoiceImpactModal(impactedChoices);
		}
		else if (impactedOptionPriceChoices && impactedOptionPriceChoices.length)
		{
			obs = this.showOptionPriceChangedModal(impactedOptionPriceChoices);
		}
		else
		{
			obs = of(true);
		}

		obs.subscribe(res =>
		{
			if (res)
			{
				this.store.dispatch(new ScenarioActions.SelectChoices(true, ...selectedChoices));

				const pointRules = this.treeVersionRules.pointRules;
				const choiceRules = this.treeVersionRules.choiceRules;

				// Fetch point to point rules
				const point2PointRules = pointRules.filter(pr => pr.rules.some(rule => rule.points.some(p => p === choice.treePointId)));

				// Fetch point to choice rules
				const point2ChoiceRules = pointRules.filter(pr => pr.rules.some(rule => rule.choices.some(c => c === choice.id)));

				// Fetch choice to choice rules
				const choice2choiceRules = choiceRules.filter(pr => pr.rules.some(rule => rule.choices.some(c => c === choice.id)));

				// Check for any required choices that might be impacted by the point to point rule
				const requiredChoicesP2P = _.flatMap(this.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices.filter(c => c.isRequired && c.enabled && point2PointRules.some(p => p.pointId === c.treePointId)))));

				// Check for any required choices that might be impacted by the point to choice rule
				const requiredChoiceP2C = _.flatMap(this.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices.filter(c => c.isRequired && c.enabled && point2ChoiceRules.some(ch => ch.pointId === c.treePointId)))));

				// Check for any required choices that might be impacted by the choice to choice rule
				const requiredChoiceC2C = _.flatMap(this.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices.filter(c => c.isRequired && c.enabled && choice2choiceRules.some(ch => ch.choiceId === c.id)))));


				const impactedChoices = [...requiredChoicesP2P, ...requiredChoiceP2C, ...requiredChoiceC2C];

				// Select required choice attributes for impacted choices
				if (impactedChoices.length > 0)
				{
					this.store.dispatch(new ScenarioActions.SelectRequiredChoiceAttributes(impactedChoices));
				}

				if (!choice.quantity && this.isChangingOrder && choice.overrideNote)
				{
					this.store.dispatch(new ChangeOrderActions.SetChangeOrderOverrideNote(choice.overrideNote));
				}

				if (saveNow && this.buildMode === 'buyer')
				{
					if (this.isChangingOrder)
					{
						this.store.dispatch(new ChangeOrderActions.SaveChangeOrderScenario());
					}
					else if (this.salesAgreementId === 0)
					{
						this.store.dispatch(new ScenarioActions.SaveScenario());
					}
				}
			}
		});
	}

	saveScenario(event: any)
	{
		if (this.buildMode === 'buyer' && this.isChangingOrder)
		{
			this.store.dispatch(new ChangeOrderActions.SaveChangeOrderScenario());
		}
	}

	onSubNavItemSelected(id: number)
	{
		this.store.dispatch(new NavActions.SetSelectedSubNavItem(id));
	}

	onPointTypeFilterChanged(pointTypeFilter: DecisionPointFilterType)
	{
		// set the new filter type
		this.store.dispatch(new ScenarioActions.SetPointTypeFilter(pointTypeFilter));
	}

	loadMonotonyModal()
	{
		this.modal = this.modalService.open(this.content);

		this.modal.result.catch(err => console.log(err));
	}

	private showChoiceImpactModal(choices: Array<Choice>): Observable<boolean>
	{
		this.impactedChoices = choices.map(c => c.label).sort().join(', ');
		const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };
		const secondaryButton = { text: 'Cancel', result: false, cssClass: 'btn-secondary' };
		return this.showConfirmModal(this.impactedChoicesModal, 'Impact', primaryButton, secondaryButton);
	}

	private showOptionMappingChangedModal(choices: Array<Choice>): Observable<boolean>
	{
		this.impactedChoices = choices.map(c => c.label).sort().join(', ');
		const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };
		const secondaryButton = { text: 'Cancel', result: false, cssClass: 'btn-secondary' };
		return this.showConfirmModal(this.optionMappingChangedModal, 'Warning', primaryButton, secondaryButton);
	}

	private showOptionPriceChangedModal(choices: Array<Choice>): Observable<boolean>
	{
		this.impactedChoices = choices.map(c => c.label).sort().join(', ');
		const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };
		const secondaryButton = { text: 'Cancel', result: false, cssClass: 'btn-secondary' };
		return this.showConfirmModal(this.optionPriceChangedModal, 'Warning', primaryButton, secondaryButton);
	}

	loadPhdLite()
	{
		this.store.dispatch(new NavActions.SetSubNavItems(ExteriorSubNavItems));
		this.store.dispatch(new NavActions.SetSelectedSubNavItem(LiteSubMenu.Elevation));
		this.router.navigateByUrl('/lite/elevation');
	}

	getReplacedOptionPrices(choice: Choice): TimeOfSaleOptionPrice[]
	{
		let timeOfSaleOptionPrices: TimeOfSaleOptionPrice[] = [];

		if (this.jobId)
		{
			// Get all options being replaced by this choice
			let replacedOptions = _.flatMap(this.treeVersionRules.optionRules.filter(o => o.choices.map(ch => ch.id).includes(choice.id)), r => r.replaceOptions);

			// Make the list distinct
			replacedOptions = replacedOptions.filter((o, i) => replacedOptions.indexOf(o) === i);

			const choices = _.flatMap(this.tree.treeVersion.groups,
				g => _.flatMap(g.subGroups,
					sg => _.flatMap(sg.points,
						p => p.choices)));

			// Find their current price
			replacedOptions.forEach(o =>
			{
				const option = this.options.find(opt => opt.financialOptionIntegrationKey === o);
				if (option)
				{
					// Get the DivChoiceCatalogID for the choice mapped to the replaced option
					const replacedChoices = _.flatMap(this.treeVersionRules.optionRules.filter(r => r.optionId === o), r => r.choices).map(c => c.id);

					timeOfSaleOptionPrices = timeOfSaleOptionPrices.concat(choices
						.filter(c => replacedChoices.includes(c.id))
						.map(c => new TimeOfSaleOptionPrice({
							edhJobID: this.jobId,
							edhPlanOptionID: option.id,
							divChoiceCatalogID: c.divChoiceCatalogId,
							listPrice: option.listPrice
						} as ITimeOfSaleOptionPrice)));
				}
			});
		}

		return timeOfSaleOptionPrices;
	}

	getImpactedChoicesForReplacedOptionPrices(timeOfSaleOptionPrices: TimeOfSaleOptionPrice[]): Choice[]
	{
		let choices: Choice[] = [];

		// Compare option prices already being tracked to replaced options that are impacted by the selection
		if (this.timeOfSaleOptionPrices && this.timeOfSaleOptionPrices.length)
		{
			const treeChoices = _.flatMap(this.tree.treeVersion.groups,
				g => _.flatMap(g.subGroups,
					sg => _.flatMap(sg.points,
						p => p.choices)));

			timeOfSaleOptionPrices.forEach(t1 =>
			{
				let comparedOpt = this.timeOfSaleOptionPrices.find(t2 => t1.edhPlanOptionID === t2.edhPlanOptionID && t1.divChoiceCatalogID === t2.divChoiceCatalogID && t1.listPrice !== t2.listPrice);

				if (comparedOpt)
				{
					let choice = treeChoices.find(c => c.divChoiceCatalogId === comparedOpt.divChoiceCatalogID);

					if (choice)
					{
						choices.push(choice);
					}
				}
			});
		}

		return choices;
	}
}
