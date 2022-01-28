import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from "@angular/router";
import { Observable, combineLatest } from 'rxjs';
import { withLatestFrom, filter } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromLite from '../../../ngrx-store/lite/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { UnsubscribeOnDestroy, PriceBreakdown, PointStatus, LotExt } from 'phd-common';

import { ActionBarCallType } from '../../../shared/classes/constants.class';
import { LiteSubMenu, LitePlanOption, ScenarioOptionColor } from '../../../shared/models/lite.model';
import { LiteService } from '../../../core/services/lite.service';
import { LotService } from '../../../core/services/lot.service';

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
	salesAgreementId: number;
	buildMode: string;
	lotStatus: string;
	selectedLot: LotExt;

	constructor(
		private store: Store<fromRoot.State>, 
		private router: Router, 
		private liteService: LiteService,
		private lotService: LotService
	)
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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.buildMode),
			withLatestFrom(this.store.pipe(select(state => state.salesAgreement)))
		).subscribe(([build, salesAgreement]) =>
		{
			if (salesAgreement.id)
			{
				this.salesAgreementId = salesAgreement.id;
				this.primaryAction = 'Agreement Info';
			}
			else if (build === 'spec')
			{
				this.primaryAction = 'Create Spec';
			}
			else if (build === 'model')
			{
				this.primaryAction = 'Create Model';
			}
			
			this.buildMode = build;
		});
		
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lot)
		).subscribe(lot => {
			if (lot.selectedLot)
			{
				this.selectedLot = lot.selectedLot;
				this.lotStatus = lot.selectedLot.lotStatusDescription;
			}
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
				if (this.salesAgreementId)
				{
					this.router.navigateByUrl(`/point-of-sale/people/${this.salesAgreementId}`);
				}
				else
				{
					this.onBuildIt();
				}

				break;
		}
	}

	onBuildIt()
	{
		this.lotService.hasMonotonyConflict().subscribe(mc =>
		{
			if (mc.monotonyConflict)
			{
				alert('Danger! Monotony Issues!  Please fix!')
			}
			else
			{
				this.liteService.onGenerateSalesAgreement(
					this.buildMode, 
					this.lotStatus,
					this.selectedLot.id,
					this.salesAgreementId
				);
			}
		});
	}

}
