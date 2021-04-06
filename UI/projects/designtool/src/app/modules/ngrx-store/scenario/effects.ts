import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';

import { Observable } from 'rxjs/Observable';
import { switchMap, withLatestFrom, share, combineLatest, flatMap, map, take, delay } from 'rxjs/operators';
import { from } from 'rxjs/observable/from';
import { of } from 'rxjs/observable/of';
import { timer } from 'rxjs/observable/timer';
import { never } from 'rxjs/observable/never';
import { filter } from 'rxjs/operators';

import { AppInsights } from 'applicationinsights-js';

import * as _ from 'lodash';

import { CommonActionTypes, JobLoaded, SalesAgreementLoaded, ScenarioLoaded } from './../actions';
import { OptionService } from '../../core/services/option.service';
import { OrganizationService } from '../../core/services/organization.service';
import { PlanService } from '../../core/services/plan.service';
import { ScenarioService } from '../../core/services/scenario.service';
import { TreeService } from '../../core/services/tree.service';

import
{
	ScenarioActionTypes, SaveScenario, ScenarioSaved, SaveError, SetChoicePriceRanges,
	SetScenarioPlan, SetScenarioLot, SetScenarioLotHanding, TreeLoaded, LoadError, SetPointViewed, SetOverrideReason,
	LoadPreview, SaveScenarioInfo, ScenarioInfoSaved, LoadTree, SelectChoices, SetIsFloorplanFlippedScenario, IsFloorplanFlippedScenario, TreeLoadedFromJob
} from './actions';
import { SaveChangeOrderScenario, SavePendingJio } from '../change-order/actions';
import { SetWebPlanMapping, PlansLoaded, SelectPlan } from '../plan/actions';
import * as fromRoot from '../reducers';
import { tryCatch, MapFunction } from '../error.action';
import { DtoScenarioInfo } from '../../shared/models/scenario.model';
import { Plan } from '../../shared/models/plan.model';
import { SalesCommunityLoaded } from '../org/actions';

@Injectable()
export class ScenarioEffects
{
	// Save the Scenario when Plan, Lot, or Handing is set
	@Effect()
	setScenario$: Observable<Action> = this.actions$.pipe(
		ofType<SetScenarioPlan | SetScenarioLot | SetScenarioLotHanding>(ScenarioActionTypes.SetScenarioPlan, ScenarioActionTypes.SetScenarioLot, ScenarioActionTypes.SetScenarioLotHanding),
		withLatestFrom(this.store),
		switchMap(([action, store]) =>
		{
			if (store.changeOrder && store.changeOrder.currentChangeOrder && (store.changeOrder.currentChangeOrder.id || store.changeOrder.currentChangeOrder.salesStatusDescription === 'Pending'))
			{
				return of(new SaveChangeOrderScenario());
			}
			else if (!store.changeOrder || !store.changeOrder.isChangingOrder && store.scenario.buildMode === 'buyer')
			{
				return of(new SaveScenario());
			}

			return never();
		})
	);

	// Automatically trigger a tree fetch if the scenario is saved,
	// except if the tree has already been loaded and has not changed.
	@Effect()
	loadTree$: Observable<Action> = this.actions$.pipe(
		ofType<ScenarioSaved | LoadTree>(ScenarioActionTypes.ScenarioSaved, ScenarioActionTypes.LoadTree),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				if (action.scenario.treeVersionId && (!store.scenario.tree || store.scenario.tree.treeVersion.id !== action.scenario.treeVersionId))
				{
					return of(action);
				}

				// plan deselected so clear tree
				if (!action.scenario.treeVersionId && store.scenario.tree && store.scenario.tree.treeVersion.id)
				{

					return of(new TreeLoaded(null, null, null, null, null, store.scenario.salesCommunity));
				}

				return new Observable<never>();
			}),
			switchMap(action =>
			{
				if (action.type === ScenarioActionTypes.TreeLoaded)
				{
					return of(action);
				}
				else
				{
					return this.treeService.getTree(action.scenario.treeVersionId)
						.pipe(
							combineLatest(
								this.treeService.getRules(action.scenario.treeVersionId),
								this.optionService.getPlanOptions(action.scenario.planId),
								this.treeService.getOptionImages(action.scenario.treeVersionId)
							),
							switchMap(([tree, rules, options, optionImages]) =>
							{
								return this.orgService.getSalesCommunityByFinancialCommunityId(tree.financialCommunityId).pipe(map(sc =>
								{
									return { tree, rules, options, optionImages, salesCommunity: sc };
								}));
							}),
							switchMap(result => of(new TreeLoaded(result.tree, result.rules, result.options, result.optionImages, null, result.salesCommunity)))
						);
				}
			})
		), LoadError, "Error loading tree!!"),
		share()
	);

	//delayed scenario saving when choice is selected
	@Effect()
	saveScenarioTimer$: Observable<Action> = this.actions$.pipe(
		ofType<Action>(ScenarioActionTypes.SelectChoices),
		filter(action => (action as SelectChoices).save),
		withLatestFrom(this.store),
		switchMap(([action, store]) =>
		{
			const savingScenario = !store.salesAgreement.id &&
				store.scenario.isUnsaved &&
				!store.scenario.savingScenario &&
				store.scenario.buildMode === 'buyer';

			const savingPendingJio = store.salesAgreement.id && store.salesAgreement.status === 'Pending';

			const savingChangeOrder = !!store.changeOrder &&
				store.changeOrder.currentChangeOrder &&
				(store.changeOrder.currentChangeOrder.id ||
					store.changeOrder.currentChangeOrder.salesStatusDescription === 'Pending');

			if (!savingScenario && !savingPendingJio && savingChangeOrder)
			{
				return of(new SaveChangeOrderScenario());
			}
			else
			{
				return timer(3000).pipe(
					switchMap(data =>
					{
						if (savingScenario)
						{
							return of(new SaveScenario());
						}
						else if (savingPendingJio)
						{
							return of(new SavePendingJio());
						}

						return never();
					})
				);
			}
		})
	);

	@Effect()
	saveScenario$: Observable<Action> = this.actions$.pipe(
		ofType<SaveScenario | JobLoaded>(ScenarioActionTypes.SaveScenario, CommonActionTypes.JobLoaded),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				if (store.scenario.buildMode === 'buyer')
				{
					return of<[Action, fromRoot.State]>([action, store]);
				}
				else
				{
					return new Observable<never>();
				}
			}),
			delay(1),
			switchMap(() => this.store),
			take(1),
			switchMap(store => this.scenarioService.saveScenario(store.scenario.scenario, store.scenario.tree, store.job ? store.job.jobChoices : null)),
			map(scenario => new ScenarioSaved(scenario))
		), SaveError, "Error saving scenario!!", MapFunction.concatMap) 
	);

	@Effect({ dispatch: false })
	setViewed$: Observable<any> = this.actions$.pipe(
		ofType<SetPointViewed>(ScenarioActionTypes.SetPointViewed),
		withLatestFrom(this.store),
		flatMap(([action, store]) =>
		{
			let point = _.flatMap(store.scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points))
				.find(p => p.id === action.pointId);

			if (point && store.scenario.scenario && !!store.scenario.scenario.scenarioId)
			{
				return this.scenarioService.saveScenarioView(store.scenario.scenario.scenarioId, point.divPointCatalogId);
			}
			else
			{
				return never();
			}
		})
	);

	@Effect()
	saveIsFloorplanFlipped$: Observable<Action> = this.actions$.pipe(
		ofType<SetIsFloorplanFlippedScenario>(ScenarioActionTypes.SetIsFloorplanFlippedScenario),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				const scenarioInfo = store.scenario.scenario && store.scenario.scenario.scenarioInfo || { isFloorplanFlipped: false, closingIncentive: 0, designEstimate: 0, discount: 0, homesiteEstimate: 0 };
				const currentFlip: boolean = scenarioInfo.isFloorplanFlipped;
				const info: DtoScenarioInfo = { ...scenarioInfo, isFloorplanFlipped: action.isFlipped };

				if (scenarioInfo.isFloorplanFlipped !== action.isFlipped)
				{
					return this.scenarioService.saveScenarioInfo(store.scenario.scenario.scenarioId, info);
				}

				info.isFloorplanFlipped = currentFlip;

				return of(info);
			}),
			switchMap(results => of(new IsFloorplanFlippedScenario(results.isFloorplanFlipped)))
		), SaveError, "Error saving floorplan flipped!!")
	);

	@Effect()
	loadPreview$: Observable<Action> = this.actions$.pipe(
		ofType<LoadPreview>(ScenarioActionTypes.LoadPreview),
		tryCatch(source => source.pipe(
			switchMap(action =>
			{
				return this.treeService.getTree(action.treeVersionId).pipe(
					combineLatest(
						this.treeService.getRules(action.treeVersionId),
						this.treeService.getOptionImages(action.treeVersionId),
						this.treeService.getTreeBaseHouseOptions(action.treeVersionId)
					)
				);
			}),
			switchMap(([tree, rules, optionImages, baseHouseOptions]) =>
			{
				const optionIds = baseHouseOptions.map(bho => bho.planOption.integrationKey);

				return this.optionService.getPlanOptionsByPlanKey(tree.financialCommunityId, tree.planKey).pipe(
					map(opt =>
					{
						return {
							tree,
							rules,
							opt,
							optionImages
						};
					}),
					combineLatest(
						this.planService.getWebPlanMapping(tree.planKey, tree.financialCommunityId),
						this.orgService.getSalesCommunityByFinancialCommunityId(tree.financialCommunityId),
						this.planService.getPlanByPlanKey(tree.planKey, tree.financialCommunityId, optionIds)
					)
				);
			}),
			switchMap(result =>
			{
				const plan: Plan = result[3];
				const plans: Plan[] = [plan];

				this.router.navigate(['edit-home', 0, result[0].tree.treeVersion.groups[0].subGroups[0].points[0].divPointCatalogId]);

				return from([
					new TreeLoaded(result[0].tree, result[0].rules, result[0].opt, result[0].optionImages),
					new PlansLoaded(plans),
					new SelectPlan(plan.id, plan.treeVersionId, plan.marketingPlanId),
					new SetWebPlanMapping(result[1]),
					new SalesCommunityLoaded(result[2])
				]);
			})
		), LoadError, 'Error loading preview!!')
	);

	@Effect()
	saveScenarioInfo$: Observable<Action> = this.actions$.pipe(
		ofType<SaveScenarioInfo>(ScenarioActionTypes.SaveScenarioInfo),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
			{
				return this.scenarioService.saveScenarioInfo(store.scenario.scenario.scenarioId, action.scenarioInfo).pipe(
					map(() => new ScenarioInfoSaved(action.scenarioInfo)
					));
			})
		), SaveError, "Error saving scenario info!!")
	);

	@Effect()
	calculatePriceRanges$: Observable<Action> = this.actions$.pipe(
		ofType<ScenarioLoaded | TreeLoaded | JobLoaded | SalesAgreementLoaded | TreeLoadedFromJob>(ScenarioActionTypes.TreeLoaded, CommonActionTypes.ScenarioLoaded, CommonActionTypes.JobLoaded, CommonActionTypes.SalesAgreementLoaded, ScenarioActionTypes.TreeLoadedFromJob),
		withLatestFrom(this.store),
		switchMap(([, state]) =>
		{
			if (state.scenario.tree) {

				if (typeof Worker !== 'undefined') {
					AppInsights.startTrackEvent(`Calculate Price Ranges - TreeVersionID: ${state.scenario.tree.treeVersion.id}`);
					return new Observable<any>(observer => {
						const worker = new Worker('../../../app.worker', { type: 'module' });
						worker.onmessage = ({ data }) => {
							observer.next(data);
							observer.complete();
							AppInsights.stopTrackEvent(`Calculate Price Ranges - TreeVersionID: ${state.scenario.tree.treeVersion.id}`);
						};

						worker.postMessage({
							function: 'getChoicePriceRanges',
							args: [state.scenario]
						});
					});
				} else {
					return never();
				}
			}
			else {
				return of(null);
			}
		}),
		map(priceRanges => new SetChoicePriceRanges(priceRanges))
	);

	constructor(
		private actions$: Actions,
		private scenarioService: ScenarioService,
		private treeService: TreeService,
		private optionService: OptionService,
		private orgService: OrganizationService,
		private planService: PlanService,
		private store: Store<fromRoot.State>,
		private router: Router) { }
}
