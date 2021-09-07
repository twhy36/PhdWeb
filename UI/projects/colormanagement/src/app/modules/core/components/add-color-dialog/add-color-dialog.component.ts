import { group } from '@angular/animations';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, FormArray } from '@angular/forms';
import * as _ from 'lodash';
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
	newColors: IColor[] = [];
	modalReference: ModalRef;

	currentCategory: AbstractControl;
	currentSubCategory: AbstractControl;
	addColorForm: FormGroup;

	get colors() {
		return this.addColorForm.controls['colors'] as FormArray;
	}

	constructor(
		private _optionService: OptionService,
		private _modalService: ModalService,
		private _fb: FormBuilder,
  	) { }

	ngOnInit(): void
	{
		this.addColorForm = this._fb.group({
			category: [this.currentCategory, [Validators.required]],
			subcategory: [this.currentSubCategory, [Validators.required]],
			colors: this._fb.array([])
		});

		this.currentCategory = this.addColorForm.get('category');
		this.currentSubCategory = this.addColorForm.get('subcategory');
		this.initializeDialogCategories();
		this.initColorsFormArray();

		this.currentCategory.valueChanges.subscribe((value: IOptionCategory) => {
			this.dialogSubCategories = value.optionSubCategory;
		});
	}

	private initColorsFormArray()
	{
		for(let i=0; i < 50; i++) {
			this.colors.push(this._fb.group({
				name: ['', [Validators.required, Validators.maxLength(50)]],
				sku: ['', [Validators.maxLength(50), Validators.minLength(0)]],
				isActive: [true]
			}));
		};
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
					id: subcategory.optionCategory.id,
					name: subcategory.optionCategory.name,
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
		let validEntries = this.colors.controls.filter(x => x.touched && x.dirty && x.valid);
		const formIsValid = validEntries.length && this.currentCategory.valid && this.currentSubCategory.valid;

		if (formIsValid == false)
		{
			return;
		}

		const colorsToSave: IColor[] = [];

		validEntries.forEach(control => {
			colorsToSave.push({
				name:control.value.name,
				colorId: 0,
				sku:control.value.sku,
				edhOptionSubcategoryId: this.currentSubCategory.value.id,
				edhFinancialCommunityId:this.communityId,
				isActive: control.value.isActive
			});
		});

		this._optionService.saveNewColors(colorsToSave).subscribe((saveWasSuccessful) => {
			if (saveWasSuccessful)
			{
				this.newColorsWereSaved.emit();
			}
		});
	}

	async cancelAddColorDialog()
	{
		if (this.addColorForm.dirty === false)
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
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true, size: 'sm' });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		const response = await confirm.result;
		return response === 'Continue';
	}
}
