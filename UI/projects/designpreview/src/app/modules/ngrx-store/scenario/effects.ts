import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';

import { Observable } from 'rxjs';
import { combineLatest, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';

import { LoadPreview, LoadPresale, ScenarioActionTypes, SelectChoices, SetStatusForPointsDeclined, TreeLoaded, SetTreeFilter } from './actions';
import * as fromRoot from '../reducers';
import * as fromFavorite from '../favorite/reducer';
import * as _ from 'lodash';
import { DeleteMyFavoritesPointDeclined } from '../favorite/actions';
import { from } from 'rxjs';
import { ErrorFrom, tryCatch } from '../error.action';
import { TreeService } from '../../core/services/tree.service';
import { OptionService } from '../../core/services/option.service';
import { OrganizationService } from '../../core/services/organization.service';
import { PlanService } from '../../core/services/plan.service';
import { Plan } from 'phd-common';
import { LoadError } from '../actions';
import { PlansLoaded, SelectPlan, SetWebPlanMapping } from '../plan/actions';
import { AdobeService } from '../../core/services/adobe.service';

@Injectable()
export class ScenarioEffects
{
	selectChoices$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
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
					fav.myFavoritesPointDeclined.forEach(mfpd =>
					{
						let disabledDeclinedPoint = disabledPoints.find(dp => dp.divPointCatalogId === mfpd.divPointCatalogId);
						if (disabledDeclinedPoint)
						{
							actions.push(new DeleteMyFavoritesPointDeclined(fav.id, mfpd.id));
						} else
						{
							completedDeclinePoints.push(mfpd.divPointCatalogId);
						}
					});
					actions.push(new SetStatusForPointsDeclined(completedDeclinePoints, false));
					return from(actions);
				}
				else
				{
					return new Observable<never>();
				}
			})
		)
	);

	loadPreview$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
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
						new TreeLoaded(result[0].tree, result[0].rules, result[0].opt, result[0].optionImages, salesCommunity),
						new PlansLoaded(plans),
						new SelectPlan(plan.id, plan.treeVersionId, plan.marketingPlanId),
						new SetWebPlanMapping(result[1]),
					]);
				})
			), LoadError, 'Error loading preview!!', ErrorFrom.LoadPreview)
		)
	);

	loadPresale$: Observable<Action> = createEffect(() =>
		this.actions$.pipe(
			ofType<LoadPresale>(ScenarioActionTypes.LoadPresale),
			tryCatch(source => source.pipe(
				switchMap(action =>
				{
					return this.planService.getPlanCommunityDetail(action.planCommunityId).pipe(
						switchMap(planComm => 
						{
							const friendlyMsg = 'The ' + planComm.planName + ' plan at the ' + planComm.communityName + ' community is currently unavailable for personalization. Please browse our collection of available homes at ';
							if (!planComm.isActive)
							{
								this.store.dispatch(new LoadError(new Error('Inactive for presale plan community!'), friendlyMsg, ErrorFrom.LoadPresaleInactive));
								return new Observable<never>();
							}
							else if (planComm.dTreeVersionId === 0)
							{
								this.store.dispatch(new LoadError(new Error('No published tree for presale plan community!'), friendlyMsg, ErrorFrom.LoadPresaleNoPubleshed));
								return new Observable<never>();
							}

							const treeversionId = planComm.dTreeVersionId;

							return this.treeService.getTree(treeversionId).pipe(
								combineLatest(
									this.treeService.getRules(treeversionId),
									this.treeService.getOptionImages(treeversionId),
									this.treeService.getTreeBaseHouseOptions(treeversionId)
								)
							);
						})
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
						new TreeLoaded(result[0].tree, result[0].rules, result[0].opt, result[0].optionImages, salesCommunity),
						new PlansLoaded(plans),
						new SelectPlan(plan.id, plan.treeVersionId, plan.marketingPlanId),
						new SetWebPlanMapping(result[1]),
					]);
				})
			), LoadError, 'Error loading presale!!', ErrorFrom.LoadPresale)
		)
	);

	pushSearchEvent$ = createEffect(() =>
		this.actions$.pipe(
			ofType<SetTreeFilter>(ScenarioActionTypes.SetTreeFilter),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree))),
			tap(([action, tree]) =>
			{
				this.adobeService.setSearchEvent(action?.treeFilter?.keyword, tree);
			})),
		{ dispatch: false }
	);

	constructor(
		private actions$: Actions,
		private store: Store<fromRoot.State>,
		private treeService: TreeService,
		private adobeService: AdobeService,
		private optionService: OptionService,
		private planService: PlanService,
		private orgService: OrganizationService) { }
}
