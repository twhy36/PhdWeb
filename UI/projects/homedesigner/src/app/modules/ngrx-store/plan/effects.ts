import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable } from 'rxjs';
import { switchMap, map, combineLatest } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

import { PlanActionTypes, LoadSelectedPlan, SelectedPlanLoaded, LoadError } from './actions';
import { tryCatch } from '../error.action';

import { PlanService } from '../../core/services/plan.service';
import { TreeService } from '../../core/services/tree.service';
import { OptionService } from '../../core/services/option.service';

@Injectable()
export class PlanEffects
{
	constructor(private actions$: Actions,
		private planService: PlanService,
		private optionService: OptionService,
		private treeService: TreeService
	) { }

	@Effect()
	loadSelectedPlan$: Observable<Action> = this.actions$.pipe(
		ofType<LoadSelectedPlan>(PlanActionTypes.LoadSelectedPlan),
		tryCatch(source => source.pipe(
			switchMap(action => {
				return this.planService.getSelectedPlan(action.planId).pipe(
					map(plans => {
						return { plans, planPrice: action.planPrice }
					})
				);
			}),
			switchMap(result => {
				if (result.plans && result.plans.length)
				{
					let includedPlanOptions: string[] = [];
					const baseHouseKey = '00001';
					const plan = result.plans[0];

					return this.treeService.getTreeVersions(plan.integrationKey, plan.communityId).pipe(
						switchMap(treeVersions => {
							if (treeVersions && treeVersions.length) {
								includedPlanOptions = treeVersions[0].includedOptions;
								plan.treeVersionId = treeVersions[0].id;
								includedPlanOptions.push(baseHouseKey);

								return this.optionService.getPlanOptions(plan.id, includedPlanOptions, true)
									.pipe(
										combineLatest(this.treeService.getOptionImages(plan.treeVersionId, includedPlanOptions, null, true)),
										map(([optionsResponse, optionImages]) => {
											if (optionsResponse && optionsResponse.length > 0) {
												// DEVNOTE: currently only returning where baseHouseKey = '00001'
												// In a future sprint, we'll be pushing more id's from the treeVersion.include options.
												plan.price = result.planPrice || optionsResponse[0].listPrice;
											}

											plan.baseHouseElevationImageUrl = optionImages && optionImages.length > 0
												? optionImages[0].imageURL : 'assets/pultegroup_logo.jpg';

											return result.plans;
										})
									);
							}
							else {
								return of(result.plans);
							}
						})
					);
				}
				else
				{
					return of(result.plans);
				}
			}),
			switchMap(plans => {
				return <Observable<Action>>of(new SelectedPlanLoaded(plans));
			})
		), LoadError, "Error loading selected plan!!")
	);
}
