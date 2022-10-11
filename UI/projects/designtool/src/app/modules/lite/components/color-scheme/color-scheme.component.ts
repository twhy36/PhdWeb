import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { combineLatest } from 'rxjs';

import * as _ from "lodash";

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromLite from '../../../ngrx-store/lite/reducer';

import * as LiteActions from '../../../ngrx-store/lite/actions';

import { UnsubscribeOnDestroy, flipOver, ScenarioOption, ScenarioOptionColor } from 'phd-common';
import { LitePlanOption, Color } from '../../../shared/models/lite.model';

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
	legacyColorScheme: string;

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

			// If the color exists in both generic and elevation options, use the one from generic option 
			if (legacyColorScheme)
			{
				const index = colorSchemes.findIndex(c => c.name.toLowerCase() === legacyColorScheme.toLowerCase());
				if (index > -1)
				{
					colorSchemes.splice(index, 1);					
				}

				colorSchemes.push({ name: legacyColorScheme } as Color);
			}

			this.colorSchemes = _.sortBy(colorSchemes, 'name');

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
	}

	onToggleColorScheme(data: { option: LitePlanOption, color: Color })
	{
		const scenarioOption = this.scenarioOptions.find(opt => opt.edhPlanOptionId === data.option?.id);

		if (scenarioOption)
		{
			let optionColors = [];

			const selectedColorScheme = scenarioOption.scenarioOptionColors?.find(c => c.colorItemId === data.color?.colorItemId && c.colorId === data.color?.colorId);

			if (selectedColorScheme)
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

			if (!!optionColors.length)
			{
				this.store.dispatch(new LiteActions.SelectOptionColors(optionColors));
			}
		}

	}
}
