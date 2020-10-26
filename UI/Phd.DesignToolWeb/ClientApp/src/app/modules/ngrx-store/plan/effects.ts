import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable, of, from } from 'rxjs';
import { switchMap, withLatestFrom, combineLatest, map } from 'rxjs/operators';

import { PlanService } from '../../core/services/plan.service';
import { TreeService } from '../../core/services/tree.service';
import { OptionService } from '../../core/services/option.service';
import { PlanActionTypes, LoadPlans, PlansLoaded, LoadError, LoadSelectedPlan, SelectedPlanLoaded } from './actions';
import { TreeLoadedFromJob } from '../scenario/actions';
import { SetChangeOrderPlanId } from '../change-order/actions';
import { tryCatch } from '../error.action';
import { setTreePointsPastCutOff } from '../../shared/classes/tree.utils';

import * as fromRoot from '../reducers';

@Injectable()
export class PlanEffects
{
	@Effect()
	loadPlans$: Observable<Action> = this.actions$.pipe(
		ofType<LoadPlans>(PlanActionTypes.LoadPlans),
		tryCatch(source => source.pipe(
			switchMap(action => this.planService.loadPlans(action.salesCommunityId).pipe(
				map(plans => {
					if (action.selectedPlanPrice) {
						let plan = plans.find(p => p.id === action.selectedPlanPrice.planId);
						if (plan) {
							plan.price = action.selectedPlanPrice.listPrice;
						}
					}
					return plans;
				})
			)),
			map(plans => new PlansLoaded(plans))
		), LoadError, "Error loading plan!!")
	);

	@Effect()
	loadSelectedPlan$: Observable<Action> = this.actions$.pipe(
		ofType<LoadSelectedPlan>(PlanActionTypes.LoadSelectedPlan),
		withLatestFrom(this.store),
		tryCatch(source => source.pipe(
			switchMap(([action, store]) =>
				this.treeService.getTree(action.treeVersionId).pipe(
					combineLatest(
						this.treeService.getRules(action.treeVersionId, true),
						this.optionService.getPlanOptions(action.planId, null, true),
						this.treeService.getOptionImages(action.treeVersionId, [], null, true),
						this.planService.getWebPlanMappingByPlanId(action.planId)
					),
					map(([tree, rules, options, images, mappings]) =>
					{
						return { tree, rules, options, images, job: store.job, mappings, sc: store.org.salesCommunity, planId: action.planId };
					}),
					map(data =>
					{
						setTreePointsPastCutOff(data.tree, data.job);

						return data;
					})
				)),
			switchMap(data =>
				from([
					new TreeLoadedFromJob([], data.tree, data.rules, data.options, data.images, data.job.lot, data.job, data.sc),
					new SelectedPlanLoaded(),
					new SetChangeOrderPlanId(data.planId)
				]))
		), LoadError, "Error loading selected plan!!")
	);

	constructor(private actions$: Actions,
		private store: Store<fromRoot.State>,
		private planService: PlanService,
		private treeService: TreeService,
		private optionService: OptionService) { }
}
