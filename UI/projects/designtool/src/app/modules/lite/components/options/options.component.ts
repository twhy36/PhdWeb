import { Component, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { delay, take } from 'rxjs/operators';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy, ModalService, ScenarioOption, PointStatus, ConfirmModalComponent } from 'phd-common';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as LiteActions from '../../../ngrx-store/lite/actions';
import * as fromLite from '../../../ngrx-store/lite/reducer';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { Elevation, IOptionCategory, LitePlanOptionUI, LitePlanOption, OptionRelationEnum } from '../../../shared/models/lite.model';
import { ConfirmOptionRelationComponent } from '../confirm-option-relation/confirm-option-relation.component';
import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';

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
	originalScenarioOptions: ScenarioOption[];
	scenarioId: number;
	options: LitePlanOption[];
	canConfigure: boolean;
	canEditAgreementOrSpec: boolean;
	canOverride: boolean;
	overrideReason: string;

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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canConfigure)
		).subscribe(canConfigure =>
		{
			this.canConfigure = canConfigure;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canEditAgreementOrSpec)
		)
		.subscribe(canEditAgreementOrSpec =>
		{
			this.canEditAgreementOrSpec = canEditAgreementOrSpec;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canOverride)
		).subscribe(canOverride =>
		{
			this.canOverride = canOverride;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lite)
		).subscribe(lite =>
		{
			this.overrideReason = lite.elevationOverrideNote || lite.colorSchemeOverrideNote;
		});

		combineLatest([
			this.store.select(state => state.lite),
			this.store.pipe(select(fromLite.selectedOptionCategories))
		])
			.pipe(delay(0), take(1))
			.subscribe(([lite, categories]) =>
			{
				const groups = _.groupBy(this.filteredOptions(lite.options), o => o.optionCategoryId);

				const subMenuitems = [];

				Object.keys(groups).forEach(key =>
				{
					const category = _.cloneDeep(categories.find(c => c.id.toString() === key));

					if (category)
					{
						const allCategoryRelatedOptions = this.filteredOptions(lite.options).filter(x => x.optionCategoryId === category.id);

						category.optionSubCategories.forEach(subcategory =>
						{
							const subcategoryOptions = allCategoryRelatedOptions.filter(x => x.optionSubCategoryId === subcategory.id);

							subcategory.planOptions = _.cloneDeep(subcategoryOptions).map(x => x as LitePlanOptionUI);
						});

						category.optionSubCategories = category.optionSubCategories.filter(x => x.planOptions.some(po => po.isActive));
					}

					if (category.optionSubCategories && category.optionSubCategories.length > 0 && category.optionSubCategories.some(osc => osc.planOptions))
					{
						subMenuitems.push({
							label: category.name,
							status: PointStatus.UNVIEWED,
							id: Number.parseInt(key)
						});
					}
				});

				this.store.dispatch(new NavActions.SetSubNavItems(subMenuitems));

				const firstCategory = subMenuitems.length ? subMenuitems[0].id : 0;

				this.store.dispatch(new NavActions.SetSelectedSubNavItem(firstCategory));
			});

		this.store.select(state => state.lite)
			.pipe(take(1))
			.subscribe(lite => this.originalScenarioOptions = _.cloneDeep(lite.scenarioOptions));

		combineLatest([
			this.store.select(state => state.nav),
			this.store.select(state => state.lite)
		])
			.pipe(delay(0), this.takeUntilDestroyed())
			.subscribe(([nav, lite]) =>
			{
				this.options = lite.options;
				this.scenarioOptions = _.cloneDeep(lite.scenarioOptions);
				this.selectedCategory = _.cloneDeep(lite.categories.find(x => x.id === nav.selectedItem));

				let subtotal = 0;

				if (this.selectedCategory)
				{
					const allCategoryRelatedOptions = this.filteredOptions(this.options).filter(x => x.optionCategoryId === this.selectedCategory.id);

					this.selectedCategory.optionSubCategories.forEach(subcategory =>
					{
						const subcategoryOptions = allCategoryRelatedOptions.filter(x => x.optionSubCategoryId === subcategory.id);

						subcategory.planOptions = _.cloneDeep(subcategoryOptions)
							.map(x => x as LitePlanOptionUI)
							.sort((option1, option2) =>
							{
								return option1.name > option2.name ? 1 : -1;
							});

						subcategory.planOptions.forEach(option =>
						{
							option.maxOrderQuantity = option.maxOrderQuantity === 0 ? 1 : option.maxOrderQuantity;
							option.selectedQuantity = 1;
							option.previousQuantity = 0;
							option.isSelected = lite.scenarioOptions.some(so => so.edhPlanOptionId === option.id);
							option.previouslySelected = this.originalScenarioOptions.some(so => so.edhPlanOptionId === option.id);
							option.isReadonly = this.isReadonlyOption(option);

							if (option.isSelected)
							{
								const selectedScenario = lite.scenarioOptions.find(so => so.edhPlanOptionId === option.id);

								option.selectedQuantity = selectedScenario.planOptionQuantity;
								option.previousQuantity = selectedScenario.planOptionQuantity;

								subtotal += option.listPrice * option.selectedQuantity;
							}
						});
					});

					this.selectedCategory.optionSubCategories = this.selectedCategory.optionSubCategories.filter(x => x.planOptions.some(po => po.isActive || po.previouslySelected));
				}

				this.categorySubTotal = subtotal;
			});
	}

	private filteredOptions(options: LitePlanOption[])
	{
		return options.filter(x => !x.isBaseHouse
			&& !x.isBaseHouseElevation
			&& x.optionSubCategoryId !== Elevation.Attached
			&& x.optionSubCategoryId !== Elevation.Detached);
	}

	async onSelectedOptionWasToggled($event: any, option: LitePlanOptionUI)
	{
		$event.preventDefault();

		if (!option.isActive && option.isSelected)
		{
			const confirmed = await this.confirmDeselectInactiveOption();

			if (!confirmed)
			{
				return;
			}
		}

		if (option.isPastCutOff && !this.overrideReason)
		{
			const noOverrideReasonWasProvided = await this.onOverride(option) === false;

			if (noOverrideReasonWasProvided)
			{
				return;
			}
		}

		const cantHaveOptions = this.allCantHaveOptions(option);

		if (cantHaveOptions?.length)
		{
			// Display the cant-have dialog first
			this.confirmOptionRelations(OptionRelationEnum.CantHave, cantHaveOptions.map(o => o.edhPlanOptionId))
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
				});
		}
		else if (option.mustHavePlanOptionIds?.length)
		{
			// If it is selecting the checkbox, display the must-have dialog
			// If it is unselecting the checkbox, unselect the option
			option.isSelected ? this.deselectOption(option) : this.confirmMustHaveOptions(option);
		}
		else
		{
			// Toggle the checkbox as normal
			option.isSelected = !option.isSelected;
			option.selectedQuantity = option.isSelected ? 1 : 0;

			this.saveSelectedOptionToStore(option);
		}
	}

	saveSelectedOptionToStore(option: LitePlanOptionUI)
	{
		if (option.selectedQuantity === option.previousQuantity) 
		{
			return;
		}

		option.previousQuantity = option.selectedQuantity;

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

	confirmOptionRelations(relationType: number, relatedOptionIds: number[]): Promise<any>
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
						? [...mustHaveOptionIds, option.id]
						: [option.id];

					let selectedOptions = [];

					selectedOptionIds.forEach(id =>
					{
						selectedOptions.push({
							scenarioOptionId: 0,
							scenarioId: this.scenarioId,
							edhPlanOptionId: id,
							planOptionQuantity: 1,
							scenarioOptionColors: []
						});
					});

					this.store.dispatch(new LiteActions.SelectOptions(selectedOptions));
				}
				else if (result === 'Cancel')
				{
					this.deselectOption(option);
				}
			});
	}

	getMustHaveOptionIds(options: LitePlanOption[]): number[]
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
		const cantHaveOptions = this.allCantHaveOptions(option);

		if (cantHaveOptions?.length)
		{
			cantHaveOptions.forEach(o =>
			{
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
	}

	private allCantHaveOptions(option: LitePlanOptionUI): ScenarioOption[]
	{
		return option.cantHavePlanOptionIds?.length || option.cantHaveInactivePlanOptionIds?.length
			? this.scenarioOptions.filter(o =>
				option.cantHavePlanOptionIds.includes(o.edhPlanOptionId) ||
				option.cantHaveInactivePlanOptionIds.includes(o.edhPlanOptionId))
			: [];
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
		}
	}

	isReadonlyOption(option: LitePlanOptionUI): boolean
	{
		let isReadonly = false;

		if (option.isSelected)
		{
			isReadonly = !!this.scenarioOptions
				.filter(scenarioOption => scenarioOption.edhPlanOptionId !== option.id)
				.find(scenarioOption =>
				{
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
		else 
		{
			isReadonly = !option.isActive;
		}

		return isReadonly;
	}

	async onOverride(option: LitePlanOptionUI): Promise<boolean>
	{
		const confirm = this.modalService.open(ModalOverrideSaveComponent);
		confirm.componentInstance.title = 'Warning';
		confirm.componentInstance.body = `This will override the Cut-off`;
		confirm.componentInstance.defaultOption = 'Cancel';

		return confirm.result.then((result) =>
		{
			const overrideReasonWasProvided = result !== 'Close';

			if (overrideReasonWasProvided)
			{
				this.store.dispatch(new LiteActions.SetLiteOverrideReason(result, false));
			}

			return overrideReasonWasProvided;
		});
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
