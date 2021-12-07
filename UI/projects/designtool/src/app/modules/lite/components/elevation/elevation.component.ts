import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromLite from '../../../ngrx-store/lite/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

import * as LiteActions from '../../../ngrx-store/lite/actions';

import { UnsubscribeOnDestroy } from 'phd-common';
import { LitePlanOption, ScenarioOption, Color } from '../../../shared/models/lite.model';

@Component({
	selector: 'elevation',
	templateUrl: './elevation.component.html',
	styleUrls: ['./elevation.component.scss']
})
export class ElevationComponent extends UnsubscribeOnDestroy implements OnInit
{
	elevationOptions: LitePlanOption[];
	scenarioOptions: ScenarioOption[];
	scenarioId: number;
	selectedElevation: LitePlanOption;

	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromLite.elevationOptions)
		).subscribe(elevations =>
		{
			this.elevationOptions = elevations;
		});	
		
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lite.scenarioOptions)
		).subscribe(scenarioOptions =>
		{
			this.scenarioOptions = scenarioOptions;
		});	

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromLite.selectedElevation)
		).subscribe(elevation =>
		{
			this.selectedElevation = elevation;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.selectScenario)
		).subscribe(scenario =>
		{
			this.scenarioId = scenario?.scenario?.scenarioId;
		});
	}

	onToggleElevation(data: { option: LitePlanOption, color: Color })
	{
		const elevationToggled = this.elevationOptions.find(option => option.id === data.option?.id);

		if (elevationToggled)
		{
			let selectedOptions = [];

			const scenarioOption = this.scenarioOptions.find(opt => opt.edhPlanOptionId === data.option?.id && opt.planOptionQuantity > 0);
			
			if (scenarioOption)
			{
				// De-select an elevation
				selectedOptions.push({
					scenarioOptionId: scenarioOption.scenarioOptionId,
					scenarioId: scenarioOption.scenarioId,
					edhPlanOptionId: scenarioOption.edhPlanOptionId,
					planOptionQuantity: 0
				});
			}
			else
			{
				// Deselect current selected elevation
				const currentElevation = this.elevationOptions.find(option => this.scenarioOptions.find(opt => opt.edhPlanOptionId === option.id && opt.planOptionQuantity > 0));
				
				if (currentElevation)
				{
					const currentScenarioOption = this.scenarioOptions.find(opt => opt.edhPlanOptionId === currentElevation.id);				
					selectedOptions.push({
						scenarioOptionId: currentScenarioOption.scenarioOptionId,
						scenarioId: currentScenarioOption.scenarioId,
						edhPlanOptionId: currentScenarioOption.edhPlanOptionId,
						planOptionQuantity: 0
					});
				}

				// Select elevation
				selectedOptions.push({
					scenarioOptionId: 0,
					scenarioId: this.scenarioId,
					edhPlanOptionId: elevationToggled.id,
					planOptionQuantity: 1,
					scenarioOptionColors: []
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
