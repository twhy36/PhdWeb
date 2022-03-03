import { Component, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { PointStatus, UnsubscribeOnDestroy } from 'phd-common';
import { ColorItem, IOptionCategory, IOptionSubCategory, LitePlanOptionUI, ScenarioOption, ScenarioOptionColorDto } from '../../../shared/models/lite.model';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as LiteActions from '../../../ngrx-store/lite/actions';
import * as _ from 'lodash';
import { combineLatest } from 'rxjs';
import * as fromLite from '../../../ngrx-store/lite/reducer';
import * as NavActions from '../../../ngrx-store/nav/actions';
import { take } from 'rxjs/operators';

@Component({
  selector: 'colors',
  templateUrl: './colors.component.html',
  styleUrls: ['./colors.component.scss']
})
export class ColorsComponent extends UnsubscribeOnDestroy implements OnInit {
	selectedCategory: IOptionCategory;
	scenarioId: number;
	scenarioOptions: ScenarioOption[];
	selectedOptions: LitePlanOptionUI[];
	selectedColorIds: { [id: number] : number } = {};
	allOptions: LitePlanOptionUI[];
	categories: IOptionCategory[] = [];
	cannotEditAgreement: boolean;

  constructor(
	private store: Store<fromRoot.State>,
	) { super(); }


	ngOnInit(): void
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canEditAgreementOrSpec)
		)
		.subscribe(canEditAgreement => {
			this.cannotEditAgreement = !canEditAgreement;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.selectScenario)
		).subscribe(scenario =>
		{
			this.scenarioId = scenario.scenario.scenarioId;
		});

		this.store
		.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lite.options))
		.subscribe(options => this.allOptions = options.map(x => x as LitePlanOptionUI) );

		this.store
		.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lite.scenarioOptions))
		.subscribe(options => this.scenarioOptions = _.cloneDeep(options) );

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromLite.selectedOptionCategories)).subscribe(categories =>
			{
				this.categories = _.cloneDeep(categories);
			});

		combineLatest([
			this.store.select(state => state.nav),
			this.store.pipe(select(fromLite.selectedElevation))
		])
		.pipe(take(1))
		.subscribe(([nav, selectedElevationOption]) => {
			//filter out the selected options have valid active color items and have one or more related active colors
			const selectedOptions = this.allOptions
			  .filter(option => this.scenarioOptions.some(so => so.edhPlanOptionId === option.id)
								  && option.id !== selectedElevationOption?.id
								  && option.colorItems.length > 0
								  && option.colorItems.some(ci => ci.isActive && ci.color.length > 0 && ci.color.some(c => c.isActive)));

			if (selectedOptions.length > 0)
			{
			  const selectedCategoryGroups = _.groupBy(selectedOptions, o => o.optionCategoryId);

			  const categorySubMenus = Object.keys(selectedCategoryGroups).map(categoryId =>
			  {
				const categoryName = this.categories.find(c => c.id.toString() === categoryId).name;

				return {
				  label: categoryName,
				  status: PointStatus.UNVIEWED,
				  id: Number.parseInt(categoryId)
				}
			  });

			  //check if base house is one of the options that has the properly configured color items and if so use it as default selected sub menu
			  const baseHouseOptionFound = selectedOptions.some(o => o.isBaseHouse);
			  let defaultSubnavId = categorySubMenus[0].id;

			  if (baseHouseOptionFound)
			  {
				const baseHouseCategory = this.categories.find(c => c.name.toLowerCase() === 'base house');

				if (baseHouseCategory)
				{
				  defaultSubnavId = baseHouseCategory.id;
				}
			  }

			  this.store.dispatch(new NavActions.SetSubNavItems(categorySubMenus));
			  this.store.dispatch(new NavActions.SetSelectedSubNavItem(defaultSubnavId));
			}
		  });

		this.store
		.pipe(
			this.takeUntilDestroyed(),
			select(state => state.nav.selectedItem))
		.subscribe(selectedItem => {
			this.selectedColorIds = {};
			this.selectedCategory = this.categories.find(x => x.id === selectedItem);

			this.selectedOptions = this.allOptions
								.filter(option => (this.scenarioOptions.some(so => so.edhPlanOptionId === option.id)
												&& option.optionCategoryId === this.selectedCategory.id))
								.map(x => x as LitePlanOptionUI);

			this.selectedCategory.optionSubCategories.forEach(subcategory => {
				const subcategoryOptions = this.selectedOptions.filter(x => x.optionSubCategoryId === subcategory.id && x.colorItems.length > 0);
				subcategory.planOptions = _.cloneDeep(subcategoryOptions)
												.sort((option1,option2) => {
													return option1.name > option2.name ? 1 : -1;
												});

				subcategory.planOptions.forEach(po => {
					//only keep color items that are active and has one or more active colors associated with it
					po.colorItems = po.colorItems
										.filter(ci => ci.isActive && ci.color.length > 0 && ci.color.some(c => c.isActive))
										.sort((ci1,ci2) => ci1.name > ci2.name ? 1 : -1);

					//only keep colors that are active
					po.colorItems.forEach(ci => {
						ci.color = ci.color
										.filter(c => c.isActive)
										.sort((c1,c2) => c1.name > c2.name ? 1 : -1 )

						if (ci.colorItemId in this.selectedColorIds === false)
						{
							this.setColorItemsDefaultColor(po, ci);
						}
					})
				})
			});

			let subcategories: IOptionSubCategory[] = [];

			//Only keep subCategories where the option has some related color items defined;
			this.selectedCategory.optionSubCategories.forEach(subcategory => {
				subcategory.planOptions?.forEach(option => {
					if (option.colorItems.length && subcategories.every(x => x.id !== option.optionSubCategoryId)) {
						subcategories.push(subcategory);
					}
				});
			});

			this.selectedCategory.optionSubCategories = subcategories;
		});
	}

	setColorItemsDefaultColor(option: LitePlanOptionUI, colorItem: ColorItem)
	{
		const selectedScenarioOption = this.scenarioOptions.find(x => x.edhPlanOptionId === option.id);

		if (selectedScenarioOption?.scenarioOptionColors)
		{
			let selectedScenarioColor = selectedScenarioOption.scenarioOptionColors.find(x => x.colorItemId === colorItem.colorItemId);

			if (selectedScenarioColor)
			{
				this.selectedColorIds[colorItem.colorItemId] = selectedScenarioColor.colorId;
				return;
			}
		}

		if (colorItem.color.length === 1)
		{
			this.selectedColorIds[colorItem.colorItemId] = colorItem.color[0].colorId;
			let scenarioColors: ScenarioOptionColorDto[] = [];

			scenarioColors.push({
				scenarioOptionColorId: 0,
				scenarioOptionId: selectedScenarioOption.scenarioOptionId,
				colorItemId: colorItem.colorItemId,
				colorId: this.selectedColorIds[colorItem.colorItemId],
				isDeleted: false,
				edhPlanOptionId: selectedScenarioOption.edhPlanOptionId
			});

			this.store.dispatch(new LiteActions.SelectOptionColors(scenarioColors));
			this.store.dispatch(new LiteActions.SaveScenarioOptionColors(scenarioColors));
		}
		else
		{
			this.selectedColorIds[colorItem.colorItemId] = null;
		}
	}

	onColorWasSelected(option: LitePlanOptionUI, item: ColorItem)
	{
		const previousSelectedOption = this.scenarioOptions.find(x => x.edhPlanOptionId === option.id);

		if (previousSelectedOption.scenarioOptionColors === undefined)
		{
			previousSelectedOption.scenarioOptionColors = [];
		}

		let scenarioColors = previousSelectedOption.scenarioOptionColors
			.map(x => x as ScenarioOptionColorDto);

		const previousSelectedColor = scenarioColors.find(x => x.colorItemId === item.colorItemId);
		let colorsToSave: ScenarioOptionColorDto[] = [];
		const newColorWasSelected = this.selectedColorIds[item.colorItemId] !== null

		if (previousSelectedColor)
		{
			colorsToSave.push({
				scenarioOptionColorId: previousSelectedColor.scenarioOptionColorId,
				scenarioOptionId: previousSelectedColor.scenarioOptionId,
				colorItemId: previousSelectedColor.colorItemId,
				colorId: previousSelectedColor.colorId,
				isDeleted: true,
				edhPlanOptionId: previousSelectedOption.edhPlanOptionId
			});
		}

		if (newColorWasSelected)
		{
			colorsToSave.push({
				scenarioOptionColorId: 0,
				scenarioOptionId: previousSelectedOption.scenarioOptionId,
				colorItemId: item.colorItemId,
				colorId: this.selectedColorIds[item.colorItemId],
				isDeleted: false,
				edhPlanOptionId: previousSelectedOption.edhPlanOptionId
			});
		}

		if (!!colorsToSave.length)
		{
			this.store.dispatch(new LiteActions.SelectOptionColors(colorsToSave));
			this.store.dispatch(new LiteActions.SaveScenarioOptionColors(colorsToSave));
		}
	}
}
