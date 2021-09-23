import { Component, Input, OnInit, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
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
export class AddColorDialogComponent implements OnInit, OnChanges {
	@Input() communityId: number;
	@Input() subcategories: IOptionSubCategory[];
	@Output() newColorsWereSaved = new EventEmitter();
	@Output() closeDialogWasRequested = new EventEmitter();
	newColors: IColor[] = [];
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
			}));
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

		const colorsToSave: IColor[] = [];
		let validEntries = this.colors.controls.filter(x => x.touched && x.dirty && x.valid);

		validEntries.forEach(control => {
			colorsToSave.push({
				name:control.value.name,
				colorId: 0,
				sku:control.value.sku,
				edhOptionSubcategoryId: this.currentSubCategory.id,
				edhFinancialCommunityId:this.communityId,
				isActive: control.value.isActive
			});
		});

		this._optionService.saveNewColors(colorsToSave).subscribe((savedColors) => {
			if (savedColors.length)
			{
				this.newColorsWereSaved.emit();
			}
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
