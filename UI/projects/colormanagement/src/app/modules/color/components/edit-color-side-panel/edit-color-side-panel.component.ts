import {Component, OnInit, OnDestroy, Output, EventEmitter, Input} from '@angular/core';
import {ConfirmModalComponent, ModalService, IColorDto } from 'phd-common';
import { FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ColorService} from '../../../core/services/color.service';
import {ColorAdminService} from '../../../core/services/color-admin.service';

@Component({
	selector: 'edit-color-side-panel',
	templateUrl: './edit-color-side-panel.component.html',
	styleUrls: ['./edit-color-side-panel.component.scss']
})
export class EditColorSidePanelComponent implements OnInit, OnDestroy {
	isSaving: boolean;
	sidePanelHeader: string = 'Edit Color';
	sidePanelSubheader: string = '';
	editColorForm: FormGroup;
	sidePanelIsOpen: boolean;

	@Input() selectedColor: IColorDto;
	@Input() communityId: number;
	@Input() allColors: Array<IColorDto> = [];
	@Output() sidePanelWasClosed = new EventEmitter();
	@Output() colorWasEdited = new EventEmitter<boolean>();

	constructor(
		private _colorService: ColorService,
		private _modalService: ModalService,
		private _fb: FormBuilder,
		private _colorAdminService: ColorAdminService
	) { }

	ngOnInit(): void {
		this.sidePanelIsOpen = true;
		this._colorAdminService.emitEditingColor(true);

		this.editColorForm = this._fb.group({
			category: [this.selectedColor.optionCategoryName, [Validators.required]],
			subcategory: [this.selectedColor.optionSubCategoryName, [Validators.required]],
			name: [this.selectedColor.name, [Validators.required, Validators.maxLength(50)]],
			sku: [this.selectedColor.sku, [Validators.maxLength(50), Validators.minLength(0)]],
		});
	}

	ngOnDestroy(): void {
		this._colorAdminService.emitEditingColor(false);
	}

	saveEdit() {
		if (this.editColorForm.invalid)
		{
			return;
		}

		const originalName = this.editColorForm.get('name').value.toString().trim();
		const colorName = originalName.toLowerCase().trim();
		const sku = this.editColorForm.get('sku').value.toString().toLowerCase().trim();

		this._colorService.getColorsByNames(this.communityId, this.selectedColor.optionSubCategoryId, [{name: colorName, sku: sku}])
		.subscribe(colors =>
		{
			if (colors.length)
			{
				this._modalService.showOkOnlyModal(`This color/SKU combination already exists for this subcategory. <br><br>Please use a different color name or SKU.`, 'Duplicate Color');
			}
			else
			{
				const colorToSave = {
					colorId: this.selectedColor.colorId,
					name: originalName,
					sku: this.editColorForm.get('sku').value?.toString().trim(),
					optionSubCategoryId: this.selectedColor.optionSubCategoryId,
					isActive: this.selectedColor.isActive
				} as IColorDto;
		
				this._colorService.updateColor(colorToSave, this.communityId).subscribe((updatedColor) => {
					const successful = updatedColor !== undefined && updatedColor !== null;
		
					if (successful) {
						this.sidePanelIsOpen = false;
						this._colorAdminService.emitEditingColor(false);
					}
		
					this.colorWasEdited.emit(successful);
				},
				error => {
					this.colorWasEdited.emit(false);
				});
			}
		});				  
	}

	async onCloseSidePanel() {
		if (this.editColorForm.dirty === false)
		{
			this.sidePanelIsOpen = false;
			this.sidePanelWasClosed.emit();
			this._colorAdminService.emitEditingColor(false);
			return;
		}

		const msg = 'Do you want to cancel without saving? If so, the data entered will be lost.';
		const closeWithoutSavingData = await this.showConfirmModal(msg, 'Warning', 'Continue');

		if (closeWithoutSavingData)
		{
			this.sidePanelIsOpen = false;
			this.sidePanelWasClosed.emit();
			this._colorAdminService.emitEditingColor(false);
		}
	}

	private async showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true, windowClass: 'phd-modal-window' });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		const response = await confirm.result;
		return response === 'Continue';
	}
}
