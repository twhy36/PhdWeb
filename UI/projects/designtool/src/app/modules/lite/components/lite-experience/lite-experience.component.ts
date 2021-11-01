import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { ActionBarCallType } from '../../../shared/classes/constants.class';

import { UnsubscribeOnDestroy, PriceBreakdown } from 'phd-common';

@Component({
	selector: 'lite-experience',
	templateUrl: './lite-experience.component.html',
	styleUrls: ['./lite-experience.component.scss']
})
export class LiteExperienceComponent extends UnsubscribeOnDestroy implements OnInit
{
	canConfigure$: Observable<boolean>;
	priceBreakdown$: Observable<PriceBreakdown>;
	subNavItems$: Observable<any>;
	selectedSubNavItem$: Observable<number>;
	primaryAction: string = 'Generate Agreement';

	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnInit()
	{
		this.canConfigure$ = this.store.pipe(select(fromRoot.canConfigure));

		this.priceBreakdown$ = this.store.pipe(
			select(fromRoot.priceBreakdown)
		);
		
		this.subNavItems$ = this.store.pipe(
			select(state => state.nav.subNavItems)
		);

		this.selectedSubNavItem$ = this.store.pipe(
			select(state => state.nav.selectedItem)
		);
	}

	onSubNavItemSelected(id: number)
	{
		this.store.dispatch(new NavActions.SetSelectedSubNavItem(id));
	}	

	onCallToAction($event: { actionBarCallType: ActionBarCallType })
	{
		switch ($event.actionBarCallType)
		{
			case (ActionBarCallType.PRIMARY_CALL_TO_ACTION):
				break;
		}
	}
}
