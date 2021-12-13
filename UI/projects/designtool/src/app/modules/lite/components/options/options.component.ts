import {Component, OnInit} from '@angular/core';
import {Elevation, IOptionCategory, LitePlanOptionUI, ScenarioOption} from '../../../shared/models/lite.model';
import {select, Store} from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import {UnsubscribeOnDestroy} from 'phd-common';
import * as LiteActions from '../../../ngrx-store/lite/actions';
import * as _ from "lodash";
import { combineLatest } from 'rxjs';

@Component({
  selector: 'options-config',
  templateUrl: './options.component.html',
  styleUrls: ['./options.component.scss']
})
export class OptionsComponent extends UnsubscribeOnDestroy implements OnInit
{
	selectedCategory: IOptionCategory;
	categorySubTotal: number;
	scenarioOptions: ScenarioOption[];
	scenarioId: number;

  	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnInit(): void
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.selectScenario)
		).subscribe(scenario =>
		{
			this.scenarioId = scenario.scenario.scenarioId;
		});

		combineLatest([
			this.store.select(state => state.nav),
			this.store.select(state => state.lite)
		])
		.pipe(this.takeUntilDestroyed())
		.subscribe(([nav, lite]) => {
			this.scenarioOptions = _.cloneDeep(lite.scenarioOptions);
			this.selectedCategory = _.cloneDeep(lite.categories.find(x => x.id === nav.selectedItem));
			const allCategoryRelatedOptions = lite.options.filter(x => x.optionCategoryId === this.selectedCategory.id
																	&& x.isActive
																	&& !x.isBaseHouse
																	&& !x.isBaseHouseElevation
																	&& x.optionSubCategoryId !== Elevation.Attached
																	&& x.optionSubCategoryId !== Elevation.Detached);

			let subtotal = 0;

			this.selectedCategory.optionSubCategories.forEach(subcategory => {
				const subcategoryOptions = allCategoryRelatedOptions.filter(x => x.optionSubCategoryId === subcategory.id);

				subcategory.planOptions = _.cloneDeep(subcategoryOptions)
												.map(x => x as LitePlanOptionUI)
												.sort((option1,option2) => {
													return option1.name > option2.name ? 1 : -1;
												});

				subcategory.planOptions.forEach(option => {
					option.maxOrderQuantity = option.maxOrderQuantity === 0 ? 1 : option.maxOrderQuantity;
					const quantities = Array.from(Array(option.maxOrderQuantity).keys()); //e.g. maxOrderQuantity = 4 then array equals 0,1,2,3
					option.quantityRange = quantities.map(x => x + 1); //make array 1-based instead of 0-based; used for select drop-down
					option.selectedQuantity = 1;
					option.isSelected = lite.scenarioOptions.some(so => so.edhPlanOptionId === option.id);

					if (option.isSelected)
					{
						const selectedScenario = lite.scenarioOptions.find(so => so.edhPlanOptionId === option.id);
						option.selectedQuantity = selectedScenario.planOptionQuantity;
						subtotal += option.listPrice * option.selectedQuantity;
					}
				});
			});

			this.selectedCategory.optionSubCategories = this.selectedCategory.optionSubCategories.filter(x => x.planOptions.length > 0);
			this.categorySubTotal = subtotal;
		});
	}

	onSelectedOptionWasToggled(option: LitePlanOptionUI)
	{
		option.isSelected = !option.isSelected;
		this.saveSelectedOptionToStore(option);
	}

	saveSelectedOptionToStore(option: LitePlanOptionUI) {
		let selectedOptions: ScenarioOption[] = [];
		const previousSelection = this.scenarioOptions.find(x => x.edhPlanOptionId === option.id);

		if (previousSelection)
		{
			previousSelection.planOptionQuantity = option.isSelected ? option.selectedQuantity : 0;
			selectedOptions.push(previousSelection);
		}
		else
		{
			selectedOptions.push({
				scenarioOptionId: 0,
				scenarioId: this.scenarioId,
				edhPlanOptionId: option.id,
				planOptionQuantity: option.selectedQuantity,
				scenarioOptionColors: []
			});
		}

		if (!!selectedOptions.length)
		{
			this.store.dispatch(new LiteActions.SelectOptions(selectedOptions));
		}
	}
}
