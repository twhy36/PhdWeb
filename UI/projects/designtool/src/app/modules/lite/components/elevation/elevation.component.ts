import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { distinctUntilChanged } from 'rxjs/operators';

import * as _ from 'lodash';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromLite from '../../../ngrx-store/lite/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as LiteActions from '../../../ngrx-store/lite/actions';

import { UnsubscribeOnDestroy, flipOver, ScenarioOption, ModalService, ConfirmModalComponent } from 'phd-common';
import { LitePlanOption, Color, LitePlanOptionUI } from '../../../shared/models/lite.model';

@Component({
	selector: 'elevation',
	templateUrl: './elevation.component.html',
	styleUrls: ['./elevation.component.scss'],
	animations: [flipOver]
})
export class ElevationComponent extends UnsubscribeOnDestroy implements OnInit
{
	elevationOptions: LitePlanOptionUI[];
	scenarioOptions: ScenarioOption[];
	scenarioId: number;
	selectedElevation: LitePlanOption;

	constructor(
		private store: Store<fromRoot.State>,
		private modalService: ModalService)
	{
		super();
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromLite.elevationOptions),
			distinctUntilChanged((x,y) => JSON.stringify(x) === JSON.stringify(y)),
		).subscribe(elevations =>
		{
			this.elevationOptions = _.cloneDeep(elevations) as LitePlanOptionUI[];
			this.mapPreviouslySelected();
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
			this.mapPreviouslySelected();
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.selectScenario)
		).subscribe(scenario =>
		{
			this.scenarioId = scenario?.scenario?.scenarioId;
		});
	}

	private mapPreviouslySelected() {
		if (this.selectedElevation && this.elevationOptions) {
			this.elevationOptions.map(e => e.previouslySelected = e.id === this.selectedElevation.id);
		}
	}

	async onToggleElevation(data: { option: LitePlanOptionUI, color: Color })
	{
		const elevationToggled = this.elevationOptions.find(option => option.id === data.option?.id);

		if (elevationToggled)
		{
			let selectedOptions = [];

			const scenarioOption = this.scenarioOptions.find(opt => opt.edhPlanOptionId === data.option?.id && opt.planOptionQuantity > 0);

			if (scenarioOption)
			{
				// Confirm de-select an inactive elevation
				if (!data.option.isActive && data.option.previouslySelected)
				{
					const confirmed = await this.confirmDeselectInactiveOption();
					if (!confirmed)
					{
						return;
					}
				}

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
					// Confirm de-select an inactive elevation
					if (!currentElevation.isActive && currentElevation.previouslySelected)
					{
						const confirmed = await this.confirmDeselectInactiveOption();
						if (!confirmed)
						{
							return;
						}
					}

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
			}
		}
	}

	async confirmDeselectInactiveOption()
	{
		const confirmTitle = 'This option is no longer active';
		const confirmMessage = 'If unselected, you will not be able to select it again. Are you sure you want to deselect it?';
		const confirmDefaultOption = 'Continue';

		return await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption);
	}

	private async showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
	{
		const confirm = this.modalService.open(ConfirmModalComponent);

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		return confirm.result.then((result) =>
		{
			return result === 'Continue';
		});
	}
}
