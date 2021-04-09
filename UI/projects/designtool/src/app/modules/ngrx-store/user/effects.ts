import { Injectable } from "@angular/core";

import { Action } from '@ngrx/store';
import { Actions, Effect, ofType, ROOT_EFFECTS_INIT } from "@ngrx/effects";
import { switchMap, map, take } from "rxjs/operators";
import { Observable ,  forkJoin } from "rxjs";

import { IMarket, IdentityService } from "phd-common";
import { SetPermissions } from "./actions";
import { Claims } from "phd-common/models";

@Injectable()
export class UserEffects {
	@Effect()
	getUserPermissions$: Observable<Action> = this.$actions.pipe(
		ofType<Action>(ROOT_EFFECTS_INIT),
		take(1),
		switchMap(() => forkJoin(
			this.identityService.getClaims(),
			this.identityService.getAssignedMarkets(),
			this.identityService.getContactId()
		)),
		map(([claims, markets, contactId]: [Claims, IMarket[], number]) => new SetPermissions(claims, markets, contactId))
	);

	constructor(
		private $actions: Actions,
		private identityService: IdentityService) { }
}
