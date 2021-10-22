import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromLite from '../../../ngrx-store/lite/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

import * as LiteActions from '../../../ngrx-store/lite/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { UnsubscribeOnDestroy, PointStatus } from 'phd-common';
import { LitePlanOption } from '../../../shared/models/lite.model';

@Component({
	selector: 'elevation',
	templateUrl: './elevation.component.html',
	styleUrls: ['./elevation.component.scss']
})
export class ElevationComponent extends UnsubscribeOnDestroy implements OnInit
{
	elevationOptions$: Observable<LitePlanOption[]>;
	elevationOptions: LitePlanOption[];
	scenarioId: number;

	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnInit()
	{
		this.elevationOptions$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromLite.elevationOptions),
			map(elevations => {
				this.elevationOptions = elevations;
				return this.elevationOptions;
			})
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromLite.isElevationSelected)
		).subscribe(isElevationSelected =>
		{
			const status = isElevationSelected ? PointStatus.COMPLETED : PointStatus.REQUIRED;
			this.store.dispatch(new NavActions.SetSubNavItemStatus(1, status));
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.selectScenario)
		).subscribe(scenario =>
		{
			this.scenarioId = scenario.scenario.scenarioId;
		});
	}

	onToggleElevation(elevation: LitePlanOption)
	{
		const elevationToggled = this.elevationOptions.find(option => option.id === elevation.id);

		if (elevationToggled)
		{
			let selectedOptions = [];
			if (!!elevationToggled.scenarioOption?.planOptionQuantity)
			{
				// De-select an elevation
				selectedOptions.push({
					scenarioOptionId: elevation.scenarioOption.scenarioOptionId,
					scenarioId: elevation.scenarioOption.scenarioId,
					edhPlanOptionId: elevation.scenarioOption.edhPlanOptionId,
					planOptionQuantity: 0
				});
			}
			else
			{
				// Deselect current selected elevation
				const currentElevation = this.elevationOptions.find(option => option.scenarioOption?.planOptionQuantity > 0);
				if (currentElevation)
				{
					selectedOptions.push({
						scenarioOptionId: currentElevation.scenarioOption.scenarioOptionId,
						scenarioId: currentElevation.scenarioOption.scenarioId,
						edhPlanOptionId: currentElevation.scenarioOption.edhPlanOptionId,
						planOptionQuantity: 0
					});
				}

				// Select elevation
				selectedOptions.push({
					scenarioOptionId: 0,
					scenarioId: this.scenarioId,
					edhPlanOptionId: elevationToggled.id,
					planOptionQuantity: 1
				});
			}

			if (!!selectedOptions.length)
			{
				this.store.dispatch(new LiteActions.SelectOptions(selectedOptions));
				this.store.dispatch(new LiteActions.SaveScenarioOptions(selectedOptions));
			}
		}

	}
}
