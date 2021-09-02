import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { ConfirmModalComponent, ModalRef, ModalService } from 'phd-common';
import { IColor } from '../../../shared/models/color.model';
import { IOptionCategory, IOptionSubCategory } from '../../../shared/models/option.model';
import { OptionService } from '../../services/option.service';

@Component({
  selector: 'add-color-dialog',
  templateUrl: './add-color-dialog.component.html',
  styleUrls: ['./add-color-dialog.component.scss']
})
export class AddColorDialogComponent implements OnInit {
	@Input() communityId: number;
	@Input() subcategories: IOptionSubCategory[];
	@Output() newColorsWereSaved = new EventEmitter();
	@Output() closeDialogWasRequested = new EventEmitter();
	dialogCategories: IOptionCategory[] = [];
	dialogSubCategories: IOptionSubCategory[];
	selectedDialogCategory: IOptionCategory;
	selectedDialogSubCategory: IOptionSubCategory;
	newColors: IColor[] = [];
	modalReference: ModalRef;

  constructor(
	private _optionService: OptionService,
	private _modalService: ModalService
  ) { }

  ngOnInit(): void {
	this.initializeEmptyListOfNewColors();
	this.initializeDialogCategories();
  }

  private initializeEmptyListOfNewColors()
  {
	for(let i=0; i < 50; i++) {
		this.newColors[i] = {
			name: '',
			colorId: 0,
			sku: '',
			edhOptionSubcategoryId: 0,
			edhFinancialCommunityId: this.communityId,
			isActive: true
		};
	}
  }

  private initializeDialogCategories()
  {
	this.dialogCategories = [];
	this.dialogSubCategories = [];
	let category: IOptionCategory;

	this.subcategories.forEach((subcategory) => {
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
		return;
	}

	let entriesToSave = this.newColors.filter(x => x.name.length > 0);
	entriesToSave.forEach(newColor => newColor.edhOptionSubcategoryId = this.selectedDialogSubCategory.id);
	this._optionService.saveNewColors(entriesToSave).subscribe((savedColors) => {
		const saveWasSuccessful = savedColors.length > 0;

		if (saveWasSuccessful)
		{
		this.newColorsWereSaved.emit();
		}
	});
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
		this.closeDialogWasRequested.emit();
		return;
	}

	const msg = 'Do you want to cancel without saving? If so, the data entered will be lost.';
	const closeWithoutSavingData = await this.showConfirmModal(msg, 'Warning', 'Cancel');

	if (closeWithoutSavingData)
	{
		this.closeDialogWasRequested.emit();
	}
  }

  private async showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
  {
	const confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

	confirm.componentInstance.title = title;
	confirm.componentInstance.body = body;
	confirm.componentInstance.defaultOption = defaultButton;

	const response = await confirm.result;
	return response === 'Continue';
  }

  onCategorySelected(category: IOptionCategory)
  {
	this.dialogSubCategories = category.optionSubCategory;
	this.selectedDialogSubCategory = this.dialogSubCategories.length === 1
		? this.dialogSubCategories[0]
		: null;
  }
}
