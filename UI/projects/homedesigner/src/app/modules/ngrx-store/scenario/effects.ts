import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';

import { Observable } from 'rxjs/Observable';
import { combineLatest, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

import { LoadPreview, ScenarioActionTypes, SelectChoices, SetStatusForPointsDeclined, TreeLoaded } from './actions';
import * as fromRoot from '../reducers';
import * as fromFavorite from '../favorite/reducer';
import * as _ from 'lodash';
import { DeleteMyFavoritesPointDeclined } from '../favorite/actions';
import { from } from 'rxjs';
import { tryCatch } from '../error.action';
import { TreeService } from '../../core/services/tree.service';
import { OptionService } from '../../core/services/option.service';
import { OrganizationService } from '../../core/services/organization.service';
import { PlanService } from '../../core/services/plan.service';
import { Plan } from 'phd-common';
import { LoadError } from '../actions';
import { PlansLoaded, SelectPlan, SetWebPlanMapping } from '../plan/actions';
import { LoadLots } from '../lot/actions';

@Injectable()
export class ScenarioEffects
{
	@Effect()
	selectChoices$: Observable<Action> = this.actions$.pipe(
		ofType<SelectChoices>(ScenarioActionTypes.SelectChoices),
		withLatestFrom(this.store.pipe(select(fromRoot.filteredTree)), this.store.pipe(select(fromFavorite.currentMyFavorite))),
		switchMap(([action, tree, fav]) =>
		{
			if (fav?.myFavoritesPointDeclined?.length)
			{
				let subGroups = _.flatMap(tree.groups, g => g.subGroups);
				let disabledPoints = _.flatMap(subGroups, sg => sg.points).filter(p => !p.enabled);
				let completedDeclinePoints = [];
				let actions = [];
				fav.myFavoritesPointDeclined.forEach(mfpd => {
					let disabledDeclinedPoint = disabledPoints.find(dp => dp.divPointCatalogId === mfpd.divPointCatalogId);
					if (disabledDeclinedPoint) {
						actions.push(new DeleteMyFavoritesPointDeclined(fav.id, mfpd.id));
					} else {
						completedDeclinePoints.push(mfpd.divPointCatalogId);
					}
				})
				actions.push(new SetStatusForPointsDeclined(completedDeclinePoints, false));
				return from(actions);
			}
			else
			{
				return new Observable<never>();
			}
		})
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
						this.planService.getPlanByPlanKey(tree.planKey, tree.financialCommunityId, optionIds),
						this.orgService.getSalesCommunityByFinancialCommunityId(tree.financialCommunityId, true)
					)
				);
			}),
			switchMap(result =>
			{
				const plan: Plan = result[2];
				const plans: Plan[] = [plan];
				const salesCommunity = result[3];

				return from([
					new TreeLoaded(result[0].tree, result[0].rules, result[0].opt, result[0].optionImages, salesCommunity ),
					new PlansLoaded(plans),
					new SelectPlan(plan.id, plan.treeVersionId, plan.marketingPlanId),
					new SetWebPlanMapping(result[1]),
					new LoadLots(salesCommunity.id),
				]);
			})
		), LoadError, 'Error loading preview!!')
	);

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private treeService: TreeService,
		private optionService: OptionService,
		private planService: PlanService,
		private orgService: OrganizationService) { }
}
