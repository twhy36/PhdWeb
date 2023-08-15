import { Injectable } from "@angular/core";

import { Action } from '@ngrx/store';
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from "@ngrx/effects";
import { switchMap, map, take, skipWhile } from "rxjs/operators";
import { Observable, forkJoin } from "rxjs";

import { IMarket, IdentityService, Claims } from "phd-common";
import { SetPermissions } from "./actions";

@Injectable()
export class UserEffects {
	getUserPermissions$: Observable<Action> = createEffect(() => {
		return forkJoin([
			this.$actions.pipe(
				ofType<Action>(ROOT_EFFECTS_INIT),
				take(1)
			),
			this.identityService.isLoggedIn.pipe(
				skipWhile(isLoggedIn => !isLoggedIn),
				take(1)
			)
		]).pipe(
			switchMap(() => forkJoin([
				this.identityService.getClaims(),
				this.identityService.getAssignedMarkets(),
				this.identityService.getContactId()
			])),
			map(([claims, markets, contactId]: [Claims, IMarket[], number]) => new SetPermissions(claims, markets, contactId))
		);
	});

	constructor(
		private $actions: Actions,
		private identityService: IdentityService) { }
}
