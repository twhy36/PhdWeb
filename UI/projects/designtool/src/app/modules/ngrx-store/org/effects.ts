import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { Observable ,  of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

import { OrganizationService } from '../../core/services/organization.service';
import { LoadSalesCommunity, SalesCommunityLoaded, LoadError, OrgActionTypes } from './actions';
import { tryCatch } from '../error.action';


@Injectable()
export class OrgEffects {
	loadSalesCommunity$: Observable<Action> = createEffect(() => {
		return this.actions$.pipe(
			ofType<LoadSalesCommunity>(OrgActionTypes.LoadSalesCommunity),
			tryCatch(source => source.pipe(
				switchMap(action => this.orgService.getSalesCommunity(action.salesCommunityId)),
				switchMap(community => of(new SalesCommunityLoaded(community)))
			), LoadError, "Error loading sales community!!")
		);
	});

	constructor(private actions$: Actions, private orgService: OrganizationService){}
}
