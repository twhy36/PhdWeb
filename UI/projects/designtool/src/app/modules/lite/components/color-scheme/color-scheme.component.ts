import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { combineLatest } from 'rxjs';

import * as _ from "lodash";

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromLite from '../../../ngrx-store/lite/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

import * as LiteActions from '../../../ngrx-store/lite/actions';

import { UnsubscribeOnDestroy, flipOver, ScenarioOption, ScenarioOptionColor } from 'phd-common';
import { LitePlanOption, Color, LegacyColorScheme } from '../../../shared/models/lite.model';

@Component({
	selector: 'color-scheme',
	templateUrl: './color-scheme.component.html',
	styleUrls: ['./color-scheme.component.scss'],
	animations: [flipOver]
})
export class ColorSchemeComponent extends UnsubscribeOnDestroy implements OnInit
{
	colorSchemes: Color[];
	scenarioOptions: ScenarioOption[];
	selectedElevation: LitePlanOption;
	selectedColorScheme: ScenarioOptionColor;
	errorMessage: string = '';
	legacyColorScheme: LegacyColorScheme;
	scenarioId: number;

	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnInit()
	{
		combineLatest([
			this.store.pipe(select(fromLite.selectedElevation)),
			this.store.pipe(select(fromLite.selectedColorScheme)),
			this.store.pipe(select(fromRoot.legacyColorScheme))
		])
		.pipe(this.takeUntilDestroyed())
		.subscribe(([elevation, colorScheme, legacyColorScheme]) =>
		{
			this.selectedElevation = elevation;
			this.selectedColorScheme = colorScheme;
			this.legacyColorScheme = legacyColorScheme;

			let colorSchemes = _.flatMap(elevation?.colorItems, item => item.color);

			if (!this.colorSchemes || !this.colorSchemes.length)
			{
				// If the color exists in both generic and elevation options, use the one from generic option 
				if (legacyColorScheme)
				{
					const index = colorSchemes.findIndex(c => c.name.toLowerCase() === legacyColorScheme.colorName?.toLowerCase());
					if (index > -1)
					{
						colorSchemes.splice(index, 1);					
					}

					colorSchemes.push({ name: legacyColorScheme.colorName } as Color);
				}

				this.colorSchemes = _.sortBy(colorSchemes, 'name');				
			}

			if (!this.selectedElevation && !legacyColorScheme)
			{
				this.errorMessage = 'Seems that no elevation has been selected.  Please select an elevation to continue.';
			}
			else if (!colorSchemes || !colorSchemes.length)
			{
				this.errorMessage = 'Seems there are no color schemes that are set up for the selected elevation.';
			}
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
			select(fromScenario.selectScenario)
		).subscribe(scenario =>
		{
			this.scenarioId = scenario?.scenario?.scenarioId;
		});		
	}

	onToggleColorScheme(data: { option: LitePlanOption, color: Color })
	{
		const scenarioOption = this.scenarioOptions.find(opt => opt.edhPlanOptionId === data.option?.id);

		if (scenarioOption)
		{
			let selectedOptions = [];
			let optionColors = [];

			const deselectLegacyColorScheme = this.legacyColorScheme?.isSelected && this.legacyColorScheme.colorName === data.color?.name;
			const genericOption = this.scenarioOptions.find(opt => opt.edhPlanOptionId === this.legacyColorScheme?.genericPlanOptionId);
			const selectedColorScheme = scenarioOption.scenarioOptionColors?.find(c => c.colorItemId === data.color?.colorItemId && c.colorId === data.color?.colorId);

			if (deselectLegacyColorScheme)
			{
				// De-select a legacy color scheme in generic option
				if (genericOption)
				{
					selectedOptions.push({
						scenarioOptionId: genericOption.scenarioOptionId,
						scenarioId: genericOption.scenarioId,
						edhPlanOptionId: genericOption.edhPlanOptionId,
						planOptionQuantity: 0
					});						
				}
			}
			else if (selectedColorScheme)
			{
				// De-select a color scheme
				optionColors.push({
					scenarioOptionColorId: selectedColorScheme.scenarioOptionColorId,
					scenarioOptionId: selectedColorScheme.scenarioOptionId,
					colorItemId: selectedColorScheme.colorItemId,
					colorId: selectedColorScheme.colorId,
					isDeleted: true,
					edhPlanOptionId: scenarioOption.edhPlanOptionId
				});
			}
			else
			{
				if (this.legacyColorScheme?.isSelected)
				{
					// Deselect current selected legacy color scheme
					if (genericOption)
					{
						selectedOptions.push({
							scenarioOptionId: genericOption.scenarioOptionId,
							scenarioId: genericOption.scenarioId,
							edhPlanOptionId: genericOption.edhPlanOptionId,
							planOptionQuantity: 0
						});						
					}					
				}
				else
				{
					// Deselect current selected color scheme
					const currentColorScheme = scenarioOption.scenarioOptionColors?.length ? scenarioOption.scenarioOptionColors[0] : null;

					if (currentColorScheme)
					{
						optionColors.push({
							scenarioOptionColorId: currentColorScheme.scenarioOptionColorId,
							scenarioOptionId: currentColorScheme.scenarioOptionId,
							colorItemId: currentColorScheme.colorItemId,
							colorId: currentColorScheme.colorId,
							isDeleted: true,
							edhPlanOptionId: scenarioOption.edhPlanOptionId
						});
					}					
				}

				if (this.legacyColorScheme && !this.legacyColorScheme.isSelected &&  !!data.color?.name && this.legacyColorScheme.colorName === data.color.name)
				{
					// Select generic option which is tied to a legacy color scheme
					selectedOptions.push({
						scenarioOptionId: 0,
						scenarioId: this.scenarioId,
						edhPlanOptionId: this.legacyColorScheme.genericPlanOptionId,
						planOptionQuantity: 1,
						scenarioOptionColors: []
					});
				}
				else
				{
					// Select color scheme
					optionColors.push({
						scenarioOptionColorId: 0,
						scenarioOptionId: scenarioOption.scenarioOptionId,
						colorItemId: data.color.colorItemId,
						colorId: data.color.colorId,
						isDeleted: false,
						edhPlanOptionId: scenarioOption.edhPlanOptionId
					});					
				}
			}

			if (!!selectedOptions.length)
			{
				this.store.dispatch(new LiteActions.SelectOptions(selectedOptions, optionColors));
			}
			else if (!!optionColors.length)
			{
				this.store.dispatch(new LiteActions.SelectOptionColors(optionColors));
			}				
		}

	}
}
