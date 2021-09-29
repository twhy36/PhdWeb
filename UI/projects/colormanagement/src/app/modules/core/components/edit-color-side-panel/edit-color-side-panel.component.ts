import {Component, OnInit, Output, EventEmitter, Input} from '@angular/core';
import {ConfirmModalComponent, ModalService} from 'phd-common';
import { FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ColorService} from '../../services/color.service';
import {IColorDto} from '../../../shared/models/color.model';
import {IToastInfo} from '../../../../../../../phd-common/src/lib/models/toast-info.model';

@Component({
	selector: 'edit-color-side-panel',
	templateUrl: './edit-color-side-panel.component.html',
	styleUrls: ['./edit-color-side-panel.component.scss']
})
export class EditColorSidePanelComponent implements OnInit {
	isSaving: boolean;
	sidePanelHeader: string = 'Edit Color';
	sidePanelSubheader: string = '';
	editColorForm: FormGroup;
	sidePanelIsOpen: boolean;

	@Input() selectedColor: IColorDto;
	@Input() communityId: number;
	@Input() allColors: Array<IColorDto> = [];
	@Output() sidePanelWasClosed = new EventEmitter();
	@Output() colorWasEdited = new EventEmitter<IToastInfo>();

	constructor(
		private _colorService: ColorService,
		private _modalService: ModalService,
		private _fb: FormBuilder
	) { }

	ngOnInit(): void {
		this.sidePanelIsOpen = true;
		this.editColorForm = this._fb.group({
			category: [this.selectedColor.optionCategoryName, [Validators.required]],
			subcategory: [this.selectedColor.optionSubCategoryName, [Validators.required]],
			name: [this.selectedColor.name, [Validators.required, Validators.maxLength(50)]],
			sku: [this.selectedColor.sku, [Validators.maxLength(50), Validators.minLength(0)]],
		});
	}

	saveEdit() {
		if (this.editColorForm.invalid)
		{
			return;
		}

		const originalName = this.editColorForm.get('name').value.toString().trim();
		const colorName = originalName.toLowerCase().trim();
		const nameExistsAlready =
			this.allColors.some(color => color.colorId !== this.selectedColor.colorId
									  && color.name.toLowerCase().trim() === colorName
									  && color.optionSubCategoryId === this.selectedColor.optionSubCategoryId);

		if (nameExistsAlready)
		{
			this._modalService.showOkOnlyModal(`A color with this name already exists. Please use a different name in the color field.`, 'Duplicate Color');
			return;
		}

		const colorToSave = {
			colorId: this.selectedColor.colorId,
			name: originalName,
			sku: this.editColorForm.get('sku').value.toString().trim(),
			optionSubCategoryId: this.selectedColor.optionSubCategoryId,
			isActive: this.selectedColor.isActive
		} as IColorDto;

		this._colorService.updateColor(colorToSave, this.communityId).subscribe((successful) => {
			let toast: IToastInfo;

			if (successful) {
				this.sidePanelIsOpen = false;
				toast = {
					severity: 'success',
					summary: 'Color',
					detail: 'Save was successful! Refreshing grid...'
				} as IToastInfo;
			}
			else
			{
				toast = {
					severity: 'error',
					summary: 'Color',
					detail: 'Save failed. Please try again.'
				} as IToastInfo;
			}

			this.colorWasEdited.emit(toast);
		},
		error => {
			const toast = {
				severity: 'error',
				summary: 'Color',
				detail: 'Save failed due to an unexpected error.'
			} as IToastInfo;

			this.colorWasEdited.emit(toast);
		});
	}

	async onCloseSidePanel() {
		if (this.editColorForm.dirty === false)
		{
			this.sidePanelIsOpen = false;
			this.sidePanelWasClosed.emit();
			return;
		}

		const msg = 'Do you want to cancel without saving? If so, the data entered will be lost.';
		const closeWithoutSavingData = await this.showConfirmModal(msg, 'Warning', 'Continue');

		if (closeWithoutSavingData)
		{
			this.sidePanelIsOpen = false;
			this.sidePanelWasClosed.emit();
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
