import {Component, EventEmitter, OnInit, Output, ViewChild} from '@angular/core';
import {OptionService} from '../../services/option.service';
import {IOptionCategory, IOptionSubCategory} from '../../../shared/models/option.model';
import {OrganizationService} from '../../../core/services/organization.service';
import {filter, map, switchMap} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {ConfirmModalComponent, ModalRef, UnsubscribeOnDestroy} from 'phd-common';
import {IColorDto, IColor} from '../../../shared/models/color.model';
import {ColorService} from '../../services/color.service';
import {SettingsService} from '../../services/settings.service';
import {Settings} from '../../../shared/models/settings.model';

import {ModalService} from '../../services/modal.service';
import {FormGroup} from '@angular/forms';

@Component({
	selector: 'colors-search-header',
	templateUrl: './colors-search-header.component.html',
	styleUrls: ['./colors-search-header.component.scss']
})
export class ColorsSearchHeaderComponent
	extends UnsubscribeOnDestroy
	implements OnInit
{

	@Output() newColorsWereSaved = new EventEmitter();
	@ViewChild('addColorModal') addColorModal: any;
	dialogCategories: IOptionCategory[] = [];
	dialogSubCategories: IOptionSubCategory[];
	selectedDialogCategory: IOptionCategory;
	selectedDialogSubCategory: IOptionSubCategory;
	colorname: string = null;
	isCounterVisible: boolean;
	saveColorsDisabled: boolean
	optionSubCategory: Array<IOptionSubCategory>;
	optionSubCategory$: Observable<Array<IOptionSubCategory>>;
	selectedSubCategory: IOptionSubCategory;
	colorsDtoList: Array<IColorDto> = [];
	currentCommunityId: number;
	allDataLoaded: boolean;
	isActiveColor: boolean;
	isLoading: boolean = true;
	currentPage: number = 0;
	skip: number;
	settings: Settings;
	modalReference: ModalRef;
	newColors: IColor[] = [];
	addColorDialogForm: FormGroup;

	constructor(
		private _optionService: OptionService,
		private _orgService: OrganizationService,
		private _colorService: ColorService,
		private _settingsService: SettingsService,
		private _modalService: ModalService,

	) {
		super();
	}

	ngOnInit() {
		this.settings = this._settingsService.getSettings();

		this.optionSubCategory$ = this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			filter((comm) => !!comm),
			switchMap((comm) => {
				this.currentCommunityId = comm.id;
				return this._optionService.getOptionsCategorySubcategory(
					this.currentCommunityId
				);
			})
		);
		this.optionSubCategory$.subscribe((x) => {
			this.optionSubCategory = x;
			this.resetfilter();
			this.loadColors();
		});
	}
	showCounter() {
		this.isCounterVisible = true;
	}
	hideCounter() {
		this.isCounterVisible = false;
	}
	loadColors() {
		this.allDataLoaded = false;

		this._colorService
			.getColors(
				this.currentCommunityId,
				this.colorname,
				this.selectedSubCategory?.id,
				this.settings.infiniteScrollPageSize,
				this.skip,
				this.isActiveColor
			)
			.pipe(
				map((colors) => {
					let colorsList = colors.map((color) => {
						let categorySubcategory = this.optionSubCategory.find(
							(x) => x.id === color.edhOptionSubcategoryId
						);
						let colorsDto: IColorDto = {
							colorId: color.colorId,
							name: color.name,
							sku: color.sku,
							optionCategoryName:
								categorySubcategory?.optionCategory?.name,
							optionSubCategoryName: categorySubcategory?.name,
							isActive: color.isActive,
						};
						return colorsDto;
					}) as Array<IColorDto>;
					return colorsList;
				})
			)
			.subscribe((x) => {
				this.currentPage++;
				this.allDataLoaded =
					x.length < this.settings.infiniteScrollPageSize;
				this.colorsDtoList = [...this.colorsDtoList, ...x];
			});
	}
	filterColors() {
		this.colorsDtoList = [];
		this.currentPage = 0;
		this.loadColors();
	}
	onPanelScroll() {
		this.isLoading = true;
		this.skip = this.currentPage * this.settings.infiniteScrollPageSize;
		this.loadColors();
	}
	resetfilter() {
		this.colorname = '';
		this.selectedSubCategory = null;
		this.isActiveColor = null;
		this.colorsDtoList = [];
	}

	showAddColorsDialog()
	{
		this.initializeEmptyListOfNewColors();
		this.initializeDialogCategories();
		this.modalReference = this._modalService.open(this.addColorModal);
		this.modalReference.result.catch(err => console.log(err));
	}

	private initializeEmptyListOfNewColors()
	{
		for(let i=0; i < 50; i++) {
			this.newColors[i] = {
				name: '',
				colorId: 0,
				sku: '',
				edhOptionSubcategoryId: 0,
				edhFinancialCommunityId: this.currentCommunityId,
				isActive: true
			};
		}
	}

	private initializeDialogCategories()
	{
		this.dialogCategories = [];
		this.dialogSubCategories = [];
		let category: IOptionCategory;

		this.optionSubCategory.forEach((subcategory) => {
			let notInListAlready = this.dialogCategories.some(x => x.id === subcategory.optionCategory.id) === false;

			if (notInListAlready && subcategory.optionCategory)
			{
				category = {
					name: subcategory.optionCategory.name,
					id: subcategory.optionCategory.id,
					optionSubCategory: []
				};

				this.dialogCategories.push(category);
			}

			const subcategoryNotInList = category.optionSubCategory.some(x => x.id === subcategory.id) === false;

			if (subcategoryNotInList)
			{
				category.optionSubCategory.push(subcategory);
			}
		});
	}

	saveColors()
	{
		const requiredFieldsAreMissing = this.validateRequiredFields() === false;

		if (requiredFieldsAreMissing)
		{
			console.log('save failed validation');
			return;
		}

		let entriesToSave = this.newColors.filter(x => x.name.length > 0);
		entriesToSave.forEach(newColor => newColor.edhOptionSubcategoryId = this.selectedDialogSubCategory.id);
		this._optionService.saveNewColors(entriesToSave).subscribe((x) => {
			console.log(x.length > 0 ? "Save was successful" : 'Save failed')
		});
		this.loadColors();
		this.modalReference.dismiss();
	}

	validateRequiredFields(): boolean
	{
		const categoryWasSelected = this.selectedDialogCategory !== null || undefined;
		const subcategoryWasSelected = this.selectedDialogSubCategory !== null || undefined;
		const hasAtLeastOneNameEntry = this.newColors.some(x => x.name.trim().length > 0);
		const allSkuEntriesIncludeName = this.newColors.filter(x => x.sku.trim().length > 0).every(x => x.name.trim().length > 0);
		const hasNoSkuEntries = this.newColors.every(x => x.sku.trim().length === 0);

		return categoryWasSelected
			&& subcategoryWasSelected
			&& hasAtLeastOneNameEntry
			&& (allSkuEntriesIncludeName || hasNoSkuEntries);
	}

	async cancelAddColorDialog()
	{
		const noNewColorsWereAdded = this.newColors.every((item) => item.name.trim().length === 0);

		if (noNewColorsWereAdded)
		{
			this.modalReference.dismiss();
			return;
		}

		const msg = 'Do you want to cancel without saving? If so, the data entered will be lost.';
		const closeWithoutSavingData = await this.showConfirmModal(msg, 'Warning', 'Cancel');

		if (closeWithoutSavingData)
		{
			this.modalReference.dismiss();
		}
	}

	private async showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		const response = await confirm.result;
		return response == 'Continue';
	}

	onCategorySelected(category: IOptionCategory)
	{
		this.dialogSubCategories = category.optionSubCategory;
		this.selectedDialogSubCategory = this.dialogSubCategories.length === 1
		 ? this.dialogSubCategories[0]
		 : null;
	}
}
