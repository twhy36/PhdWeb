import { Component, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import * as _ from "lodash";

import { UnsubscribeOnDestroy, ModalService } from 'phd-common';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as LiteActions from '../../../ngrx-store/lite/actions';

import { Elevation, IOptionCategory, LitePlanOptionUI, ScenarioOption, LitePlanOption, OptionRelationEnum } from '../../../shared/models/lite.model';
import { ConfirmOptionRelationComponent } from '../confirm-option-relation/confirm-option-relation.component';

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
	options: LitePlanOption[];

  	constructor(
		  private store: Store<fromRoot.State>,
		  private modalService: ModalService
	) { super(); }

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
			this.options = lite.options;
			this.scenarioOptions = _.cloneDeep(lite.scenarioOptions);
			this.selectedCategory = _.cloneDeep(lite.categories.find(x => x.id === nav.selectedItem));

			let subtotal = 0;
			
			if (this.selectedCategory)
			{
				const allCategoryRelatedOptions = lite.options.filter(x => x.optionCategoryId === this.selectedCategory.id
																		&& x.isActive
																		&& !x.isBaseHouse
																		&& !x.isBaseHouseElevation
																		&& x.optionSubCategoryId !== Elevation.Attached
																		&& x.optionSubCategoryId !== Elevation.Detached);

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
						option.isReadonly = this.isReadonlyOption(option)

						if (option.isSelected)
						{
							const selectedScenario = lite.scenarioOptions.find(so => so.edhPlanOptionId === option.id);
							option.selectedQuantity = selectedScenario.planOptionQuantity;
							subtotal += option.listPrice * option.selectedQuantity;
						}
					});
				});

				this.selectedCategory.optionSubCategories = this.selectedCategory.optionSubCategories.filter(x => x.planOptions.length > 0);
			}
			
			this.categorySubTotal = subtotal;
		});
	}

	onSelectedOptionWasToggled($event: any, option: LitePlanOptionUI)
	{
		$event.preventDefault();

		const canConfirmCantHaveOptions = option.cantHavePlanOptionIds?.length
			? !!this.scenarioOptions.find(o => option.cantHavePlanOptionIds.includes(o.edhPlanOptionId))
			: false;

		if (canConfirmCantHaveOptions)
		{
			// Display the cant-have dialog first
			this.confirmOptionRelations(OptionRelationEnum.CantHave, option.cantHavePlanOptionIds)
				.then((result) =>
				{
					if (result === 'Continue')
					{
						// Select the option while deselecting the cant have options
						this.selectOption(option);

						// If 'Continue' is selected from the first cant-have dialog, 
						// then display the must-have dialog if it selects the checkbox
						if (option.mustHavePlanOptionIds?.length && !option.isSelected)
						{
							this.confirmMustHaveOptions(option);
						}
					}
				})
		}
		else if (option.mustHavePlanOptionIds?.length)
		{
			// If it is selecting the checkbox, display the must-have dialog
			// If it is unselecting the checkbox, unselect the option 
			option.isSelected ?	this.deselectOption(option) : this.confirmMustHaveOptions(option);
		}
		else
		{
			// Toggle the checkbox as normal
			option.isSelected = !option.isSelected;
			this.saveSelectedOptionToStore(option);
		}
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
			this.store.dispatch(new LiteActions.SaveScenarioOptions(selectedOptions));
		}
	}

	confirmOptionRelations(relationType: number, relatedOptionIds: number[]) : Promise<any>
	{
		const confirmModal = this.modalService.open(ConfirmOptionRelationComponent);

		confirmModal.componentInstance.relatedOptions = this.options.filter(o => relatedOptionIds?.includes(o.id));
		confirmModal.componentInstance.relationType = relationType;

		return confirmModal.result;
	}

	confirmMustHaveOptions(option: LitePlanOptionUI)
	{
		const allMustHaveOptionIds = this.getMustHaveOptionIds([option]);

		this.confirmOptionRelations(OptionRelationEnum.MustHave, allMustHaveOptionIds)
			.then((result) =>
			{
				if (result === 'Continue')
				{
					const mustHaveOptionIds = allMustHaveOptionIds.filter(id => !this.scenarioOptions.find(o => o.edhPlanOptionId === id));
				
					const selectedOptionIds = mustHaveOptionIds?.length
						? [ ...mustHaveOptionIds, option.id ]
						: [ option.id ];
				
					let selectedOptions = [];
					selectedOptionIds.forEach(id => {
						selectedOptions.push({
							scenarioOptionId: 0,
							scenarioId: this.scenarioId,
							edhPlanOptionId: id,
							planOptionQuantity: 1,
							scenarioOptionColors: []
						});				
					});
			
					this.store.dispatch(new LiteActions.SelectOptions(selectedOptions));
					this.store.dispatch(new LiteActions.SaveScenarioOptions(selectedOptions));
				}
				else if (result === 'Cancel')
				{
					this.deselectOption(option);
				}
			});
	}

	getMustHaveOptionIds(options: LitePlanOption[]) : number[]
	{
		let optionIds = [];

		const mustHaveOptionIds = _.flatMap(options, o => o.mustHavePlanOptionIds);
		if (mustHaveOptionIds?.length)
		{
			const childOptions = this.options.filter(o => mustHaveOptionIds.includes(o.id));
			optionIds.push(...this.getMustHaveOptionIds(childOptions))

			optionIds.push(...mustHaveOptionIds);
		}

		return optionIds;
	}

	selectOption(option: LitePlanOptionUI)
	{
		let selectedOptions = [];

		// Deselect cant-have options
		const cantHaveOptions = this.scenarioOptions.filter(o => option.cantHavePlanOptionIds.includes(o.edhPlanOptionId));
		if (cantHaveOptions?.length)
		{
			cantHaveOptions.forEach(o => {
				selectedOptions.push({
					scenarioOptionId: o.scenarioOptionId,
					scenarioId: o.scenarioId,
					edhPlanOptionId: o.edhPlanOptionId,
					planOptionQuantity: 0
				});				
			});
		}

		// Select option
		selectedOptions.push({
			scenarioOptionId: 0,
			scenarioId: this.scenarioId,
			edhPlanOptionId: option.id,
			planOptionQuantity: 1,
			scenarioOptionColors: []
		});	

		this.store.dispatch(new LiteActions.SelectOptions(selectedOptions));
		this.store.dispatch(new LiteActions.SaveScenarioOptions(selectedOptions));
	}

	deselectOption(option: LitePlanOptionUI)
	{
		const scenarioOption = this.scenarioOptions.find(scenarioOption => scenarioOption.edhPlanOptionId === option.id);
				
		if (scenarioOption)
		{
			let selectedOptions = [];
			selectedOptions.push({
				scenarioOptionId: scenarioOption.scenarioOptionId,
				scenarioId: scenarioOption.scenarioId,
				edhPlanOptionId: scenarioOption.edhPlanOptionId,
				planOptionQuantity: 0
			});				

			this.store.dispatch(new LiteActions.SelectOptions(selectedOptions));
			this.store.dispatch(new LiteActions.SaveScenarioOptions(selectedOptions));					
		}
	}

	isReadonlyOption(option: LitePlanOptionUI) : boolean
	{
		let isReadonly = false;

		if (option.isSelected)
		{
			isReadonly = !!this.scenarioOptions
				.filter(scenarioOption => scenarioOption.edhPlanOptionId !== option.id)
				.find(scenarioOption => {
					const planOption = this.options.find(o => o.id === scenarioOption.edhPlanOptionId);

					if (planOption)
					{
						const mustHaveOptionIds = this.getMustHaveOptionIds([planOption]);
						if (mustHaveOptionIds.includes(option.id))
						{
							return true;
						}
					}
					
					return false;
				});
		}
		
		return isReadonly;
	}
}
