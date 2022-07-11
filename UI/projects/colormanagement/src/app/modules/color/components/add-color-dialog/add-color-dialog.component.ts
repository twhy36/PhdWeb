import { Component, Input, OnInit, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import {FormGroup, FormBuilder, Validators, FormArray, AbstractControl} from '@angular/forms';
import * as _ from 'lodash';
import { ConfirmModalComponent, ModalRef, ModalService } from 'phd-common';
import { OptionService } from '../../../core/services/option.service';
import {IColor, IColorDto} from '../../../shared/models/color.model';
import { IOptionCategory, IOptionSubCategory } from '../../../shared/models/option.model';

@Component({
  selector: 'add-color-dialog',
  templateUrl: './add-color-dialog.component.html',
  styleUrls: ['./add-color-dialog.component.scss']
})
export class AddColorDialogComponent implements OnInit, OnChanges {
	@Input() communityId: number;
	@Input() subcategories: IOptionSubCategory[];
	@Input() allColors: Array<IColorDto> = [];
	@Output() newColorsWereSaved = new EventEmitter<boolean>();
	@Output() closeDialogWasRequested = new EventEmitter();
	modalReference: ModalRef;

	categories: IOptionCategory[];
	currentCategory: IOptionCategory;
	currentSubCategory: IOptionSubCategory;
	addColorForm: FormGroup;
	colorIsMissing: boolean;
	categoryIsMissing: boolean;
	subCategoryIsMissing: boolean;

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

		this.initColorsFormArray();

		this.addColorForm.get("category").valueChanges.subscribe(cat => {
			this.currentCategory = cat;
			this.categoryIsMissing = false;
		});
		this.addColorForm.get("subcategory").valueChanges.subscribe(subcat => {
			this.currentSubCategory = subcat;
			this.subCategoryIsMissing = false;
		});
	}

	ngOnChanges(changes: SimpleChanges) {
		if (changes["subcategories"]){
			let groups = _.groupBy(this.subcategories, sc => sc.optionCategory.id);
			this.categories = Object.keys(groups).map(g => ({
			  ...groups[g][0].optionCategory,
			  optionSubCategories: groups[g].map(sc => ({ ...sc, optionCategory: undefined }))
			})).sort((category1,category2) => {
				return category1.name > category2.name ? 1 : -1;
			});
		}
	}

	private initColorsFormArray()
	{
		for(let i=0; i < 50; i++) {
			this.colors.push(this._fb.group({
				name: ['', [Validators.required, Validators.maxLength(50)]],
				sku: ['', [Validators.maxLength(50), Validators.minLength(0)]],
				isActive: [true]
			}));
		}
	}

	saveColors()
	{
		if (! this.isFormValid())
		{
			return;
		}

		let validEntries = this.colors.controls.filter(x => x.touched && x.dirty && x.valid);

		if (this.isDuplicate(validEntries))
		{
			this._modalService.showOkOnlyModal(`A color with this name and subcategory already exists.`, 'Duplicate Color');
			return;
		}

		const colorsToSave: IColor[] = [];
		validEntries.forEach(control => {
			colorsToSave.push({
				name:control.value.name.toString().trim(),
				colorId: 0,
				sku:control.value.sku,
				edhOptionSubcategoryId: this.currentSubCategory.id,
				edhFinancialCommunityId:this.communityId,
				isActive: control.value.isActive
			});
		});

		this._optionService.saveNewColors(colorsToSave).subscribe((savedColors) => {
			this.newColorsWereSaved.emit(savedColors.length > 0);
		});
	}

	isFormValid(): boolean
	{
		const categoryWasSelected = this.currentCategory !== undefined;
		const subcategoryWasSelected = this.currentSubCategory !== undefined;
		const atLeastOneNewColorExists = this.colors.controls.some(x => x.get('name').valid);
		const hasNoOrphanedSkuEntries = this.colors.controls
			.filter(x => x.get('sku').value.toString().trim().length > 0)
			.every(x => x.get('name').valid);

		this.categoryIsMissing = ! categoryWasSelected;
		this.subCategoryIsMissing = ! subcategoryWasSelected;
		this.colorIsMissing = ! atLeastOneNewColorExists;

		return categoryWasSelected
			&& subcategoryWasSelected
			&& atLeastOneNewColorExists
			&& hasNoOrphanedSkuEntries;
	}

	private isDuplicate(colors: AbstractControl[]): boolean
	{
		return colors.some(color => this.allColors.some(existingColor => existingColor.name.toLowerCase() === color.get('name').value.toString().toLowerCase().trim()
			&& existingColor.optionSubCategoryId === this.currentSubCategory.id));
	}

	async cancelAddColorDialog()
	{
		if (this.addColorForm.dirty === false)
		{
			this.closeDialogWasRequested.emit();
			return;
		}

		const msg = 'Do you want to cancel without saving? If so, the data entered will be lost.';
		const closeWithoutSavingData = await this.showConfirmModal(msg, 'Warning', 'Continue');

		if (closeWithoutSavingData)
		{
			this.closeDialogWasRequested.emit();
		}
	}

	private async showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true, windowClass: "phd-modal-window" });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		const response = await confirm.result;
		return response === 'Continue';
	}

	onColorChanged(event: any) {
		this.colorIsMissing = event.target.value.length === 0;
	}
}
