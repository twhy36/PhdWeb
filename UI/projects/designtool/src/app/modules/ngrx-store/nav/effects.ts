import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { Observable ,  from } from 'rxjs';
import { withLatestFrom, switchMap, tap } from 'rxjs/operators';
import * as _ from 'lodash';

import { ScenarioActionTypes } from '../scenario/actions';
import * as NavActions from './actions';
import * as fromRoot from '../reducers';
import { NavActionTypes, SetSelectedSubNavItem } from './actions';
import { Router } from '@angular/router';

@Injectable()
export class NavEffects
{
	loadPlans$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<Action>(ScenarioActionTypes.SelectChoices, ScenarioActionTypes.SetPointViewed),
			withLatestFrom(this.store),
			switchMap(([action, state]) => {
				let newActions = [];
				let subgroups = _.flatMap(state.scenario.tree.treeVersion.groups, g => g.subGroups);

				if (state.nav && state.nav.subNavItems) {
					state.nav.subNavItems.forEach(item => {
						let sg = subgroups.find(sg => sg.id === item.id);

						if (sg && sg.status !== item.status) {
							newActions.push(new NavActions.SetSubNavItemStatus(sg.id, sg.status));
						}
					});
				}

				return from(newActions);
			})
		);
	});

	navigateToPlanOrLot$: Observable<Action> = createEffect(
		() => this.actions$.pipe(
			ofType<Action>(NavActionTypes.SetSelectedSubNavItem),
			tap((action: SetSelectedSubNavItem) => {
				if (this.router.url.indexOf("new-home") !== -1 && (action.selectedItem === 2 || action.selectedItem === 3 || action.selectedItem === 4)) {
					this.router.navigate([`new-home/${action.selectedItem === 2 ? 'plan' : action.selectedItem === 3 ? 'lot' : 'quick-move-in'}`]);
				}
			})
		),
		{ dispatch: false }
	);

	constructor(private actions$: Actions, private store: Store<fromRoot.State>, private router: Router) { }
}
