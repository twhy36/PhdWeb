import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from "@angular/router";
import { Observable, combineLatest } from 'rxjs';
import { withLatestFrom, filter } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromLite from '../../../ngrx-store/lite/reducer';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { UnsubscribeOnDestroy, PriceBreakdown, PointStatus } from 'phd-common';

import { ActionBarCallType } from '../../../shared/classes/constants.class';
import { LiteSubMenu, LitePlanOption, ScenarioOptionColor } from '../../../shared/models/lite.model';

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
	isLiteComplete$: Observable<boolean>;

	primaryAction: string = 'Generate Agreement';
	showStatusIndicator: boolean;

	constructor(private store: Store<fromRoot.State>, private router: Router)
	{
		super();
	}

	ngOnInit()
	{
		this.router.events.pipe(
			filter(evt => evt instanceof NavigationEnd),
			withLatestFrom(
				this.store.pipe(select(fromLite.selectedElevation)),
				this.store.pipe(select(fromLite.selectedColorScheme))
			)
		)
		.subscribe(([evt, elevation, colorScheme]) => {
			this.showStatusIndicator = !this.router.url.includes('options');

			if (this.router.url.includes('elevation') || this.router.url.includes('color-scheme'))
			{
				this.setExteriorItemsStatus(elevation, colorScheme);			
			}
		});
		
		this.showStatusIndicator = !this.router.url.includes('options');

		this.canConfigure$ = this.store.pipe(select(fromRoot.canConfigure));

		this.priceBreakdown$ = this.store.pipe(
			select(fromRoot.priceBreakdown)
		);

		this.isLiteComplete$ = this.store.pipe(
			select(fromRoot.isLiteComplete)
		);

		this.subNavItems$ = this.store.pipe(
			select(state => state.nav.subNavItems)
		);

		this.selectedSubNavItem$ = this.store.pipe(
			select(state => state.nav.selectedItem)
		);

		combineLatest([
			this.store.pipe(select(fromLite.selectedElevation), this.takeUntilDestroyed()),
			this.store.pipe(select(fromLite.selectedColorScheme), this.takeUntilDestroyed())
		])
		.subscribe(([elevation, colorScheme]) =>
		{
			this.setExteriorItemsStatus(elevation, colorScheme);
		});
	}

	setExteriorItemsStatus(elevation: LitePlanOption, colorScheme: ScenarioOptionColor)
	{
		const elevationStatus = !!elevation ? PointStatus.COMPLETED : PointStatus.REQUIRED;
		this.store.dispatch(new NavActions.SetSubNavItemStatus(LiteSubMenu.Elevation, elevationStatus));

		const colorSchemeStatus = !!colorScheme ? PointStatus.COMPLETED : PointStatus.REQUIRED;
		this.store.dispatch(new NavActions.SetSubNavItemStatus(LiteSubMenu.ColorScheme, colorSchemeStatus));
	}

	onSubNavItemSelected(id: number)
	{
		this.store.dispatch(new NavActions.SetSelectedSubNavItem(id));

		switch (id)
		{
			case  LiteSubMenu.Elevation:
				this.router.navigateByUrl('/lite/elevation');
				break;

			case  LiteSubMenu.ColorScheme:
				this.router.navigateByUrl('/lite/color-scheme');
				break;
		}
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
