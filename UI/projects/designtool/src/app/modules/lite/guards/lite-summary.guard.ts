import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import * as fromRoot from '../../ngrx-store/reducers';

@Injectable({
  providedIn: 'root'
})
export class LiteSummaryGuard implements CanActivate {
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.store.pipe(
			take(1),
			select(state =>
			{
				return state.lite?.isPhdLite ? this.router.createUrlTree(['/', 'lite-summary']) : true;
			})
		);
  }
  constructor(private store: Store<fromRoot.State>, private router: Router) {}
}
