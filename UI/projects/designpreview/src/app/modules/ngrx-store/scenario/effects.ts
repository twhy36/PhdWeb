import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store, select } from '@ngrx/store';

import { combineLatest, Observable, of } from 'rxjs';
import { switchMap, tap, withLatestFrom } from 'rxjs/operators';

import { LoadPreview, LoadPresale, ScenarioActionTypes, SelectChoices, SetStatusForPointsDeclined, TreeLoaded, SetTreeFilter, SetPresalePricingEnabled } from './actions';
import * as fromRoot from '../reducers';
import * as fromFavorite from '../favorite/reducer';
import * as _ from 'lodash';
import { DeleteMyFavoritesPointDeclined, LoadDefaultFavorite } from '../favorite/actions';
import { from } from 'rxjs';
import { ErrorFrom, tryCatch } from '../error.action';
import { OptionService } from '../../core/services/option.service';
import { OrganizationService } from '../../core/services/organization.service';
import { PlanService } from '../../core/services/plan.service';
import { Plan, mergeTreeChoiceImages, getChoiceIdsHasChoiceImages, FeatureSwitchService, TreeService, IOrg } from 'phd-common';
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
					const subGroups = _.flatMap(tree.groups, g => g.subGroups);
					const disabledPoints = _.flatMap(subGroups, sg => sg.points).filter(p => !p.enabled);
					const completedDeclinePoints = [];
					const actions = [];
					fav.myFavoritesPointDeclined.forEach(mfpd =>
					{
						const disabledDeclinedPoint = disabledPoints.find(dp => dp.divPointCatalogId === mfpd.divPointCatalogId);
						if (disabledDeclinedPoint)
						{
							actions.push(new DeleteMyFavoritesPointDeclined(fav.id, mfpd.id));
						}
						else
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
					const fetchChoiceCatalogData = true;
					return combineLatest([
						this.treeService.getTree(action.treeVersionId, fetchChoiceCatalogData),
						this.treeService.getRules(action.treeVersionId),
						this.treeService.getOptionImages(action.treeVersionId),
						this.treeService.getTreeBaseHouseOptions(action.treeVersionId)
					]);
				}),
				switchMap(([tree, rules, optionImages, baseHouseOptions]) =>
				{
					const optionIds = baseHouseOptions.map(bho => bho.planOption.integrationKey);

					// get all choice images with hasImage flag true
					const choiceIds = getChoiceIdsHasChoiceImages(tree, false);

					return combineLatest([
						combineLatest([
							of(tree),
							of(rules),
							of(optionImages)
						]),
						this.optionService.getPlanOptionsByPlanKey(tree.financialCommunityId, tree.planKey),
						this.planService.getWebPlanMapping(tree.planKey, tree.financialCommunityId),
						this.planService.getPlanByPlanKey(tree.planKey, tree.financialCommunityId, optionIds),
						this.orgService.getSalesCommunityByFinancialCommunityId(tree.financialCommunityId, true),
						this.treeService.getChoiceImageAssoc(choiceIds),
					]);
				}),
				switchMap(([[tree, rules, optionImages], planOptions, webPlanMapping, plan, salesCommunity, choiceImages]) =>
				{
					// map choice level images
					mergeTreeChoiceImages(choiceImages, tree);

					const plans: Plan[] = [plan];

					return from([
						new TreeLoaded(tree, rules, planOptions, optionImages, salesCommunity),
						new PlansLoaded(plans),
						new SelectPlan(plan.id, plan.treeVersionId, plan.marketingPlanId),
						new SetWebPlanMapping(webPlanMapping),
						new LoadDefaultFavorite()
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
							const fetchChoiceCatalogData = true;

							return combineLatest([
								this.treeService.getTree(treeversionId, fetchChoiceCatalogData),
								this.treeService.getRules(treeversionId),
								this.treeService.getOptionImages(treeversionId),
								this.treeService.getTreeBaseHouseOptions(treeversionId)
							]);
						})
					);
				}),
				switchMap(([tree, rules, optionImages, baseHouseOptions]) =>
				{
					const optionIds = baseHouseOptions.map(bho => bho.planOption.integrationKey);

					// get all choice images with hasImage flag true
					const choiceIds = getChoiceIdsHasChoiceImages(tree, false);

					return combineLatest([
						combineLatest([
							of(tree),
							of(rules),
							of(optionImages),
							this.featureSwitchService.isFeatureEnabled('Design Preview Presale Pricing', { orgID: tree.orgId, edhFinancialCommunityId: tree.financialCommunityId } as IOrg),
						]),
						this.optionService.getPlanOptionsByPlanKey(tree.financialCommunityId, tree.planKey),
						this.planService.getWebPlanMapping(tree.planKey, tree.financialCommunityId),
						this.planService.getPlanByPlanKey(tree.planKey, tree.financialCommunityId, optionIds),
						this.orgService.getSalesCommunityByFinancialCommunityId(tree.financialCommunityId, true),
						this.treeService.getChoiceImageAssoc(choiceIds),
					]);
				}),
				switchMap(([[tree, rules, optionImages, isPresalePricingEnabled], planOptions, webPlanMapping, plan, salesCommunity, choiceImages]) =>
				{
					//map choice level images
					mergeTreeChoiceImages(choiceImages, tree);

					const plans: Plan[] = [plan];

					return from([
						new TreeLoaded(tree, rules, planOptions, optionImages, salesCommunity),
						new PlansLoaded(plans),
						new SelectPlan(plan.id, plan.treeVersionId, plan.marketingPlanId),
						new SetWebPlanMapping(webPlanMapping),
						new SetPresalePricingEnabled(isPresalePricingEnabled),
						new LoadDefaultFavorite()
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
		private orgService: OrganizationService,
		private featureSwitchService: FeatureSwitchService) { }
}
