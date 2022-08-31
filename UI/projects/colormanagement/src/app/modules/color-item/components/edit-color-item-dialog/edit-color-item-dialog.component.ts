import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ConfirmModalComponent, ModalService, IColor } from 'phd-common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ColorService } from '../../../core/services/color.service';
import { IColorItemDto } from '../../../shared/models/colorItem.model';
import { IOptionCommunity, IPlanOptionCommunityGridDto } from '../../../shared/models/community.model';
import * as _ from 'lodash';
import { MessageService } from 'primeng/api';
import { IToastInfo } from '../../../../../../../phd-common/src/lib/models/toast-info.model';

@Component({
	selector: 'edit-color-item-dialog',
	templateUrl: './edit-color-item-dialog.component.html',
	styleUrls: ['./edit-color-item-dialog.component.scss']
})

export class EditColorItemDialogComponent implements OnInit
{
	editColorItemForm: FormGroup;
	nameIsMissing: boolean;
	availableColors: IColor[] = [];
	selectedColors: IColor[] = [];
	isDuplicateName: boolean;
	nameErrorMessage = '';
	colorsHasChanged: boolean = false;

	@Input() selectedColorItems: IColorItemDto[];
	@Input() communityId: number;
	@Input() selectedOption: IOptionCommunity;
	@Input() canEditName: boolean;
	@Input() optionsWithColorItemInfo: Array<IPlanOptionCommunityGridDto> = [];
	@Output() ModalWasClosed = new EventEmitter();
	@Output() dialogWasCanceled = new EventEmitter();
	@Output() colorItemWasEdited = new EventEmitter();

	get requiredFieldMessage()
	{
		return 'This is a required field';
	}

	constructor(
		private _modalService: ModalService,
		private _fb: FormBuilder,
		private _colorService: ColorService,
		private _msgService: MessageService
	) { }

	ngOnInit(): void
	{
		this.editColorItemForm = this._fb.group({
			name: [{ value: this.selectedColorItems[0].name ?? '', disabled: !this.canEditName }, [Validators.required, Validators.maxLength(50)]],
		});
		this.selectedColors = _.cloneDeep(this.selectedColorItems[0].colors);
		const selectedColorIdList = this.selectedColors.map(color => color.colorId);
		this._colorService.getColors(this.communityId, '', this.selectedOption.optionSubCategoryId)
			.subscribe(colors =>
			{
				this.availableColors = colors.filter(x => x.isActive && !selectedColorIdList.includes(x.colorId));
			});
	}

	async cancelButtonWasClicked()
	{
		const noChangesWereFound = (this.editColorItemForm.get('name').value.toString().toLowerCase() === this.selectedColorItems[0].name.toLowerCase()) && this.colorsHasChanged === false;

		if (noChangesWereFound)
		{
			this.dialogWasCanceled.emit();

			return;
		}

		const msg = 'Do you want to cancel without saving? If so, the data entered will be lost.';
		const closeWithoutSavingData = await this.showConfirmModal(msg, 'Warning', 'Continue');

		if (closeWithoutSavingData)
		{
			this.dialogWasCanceled.emit();
		}
	}

	saveButtonWasClicked()
	{
		const valid = this.validateForm();

		if (valid)
		{
			let colorItemsToSave: IColorItemDto[] = [];

			this.selectedColorItems.forEach(colorItemToUpdate =>
			{
				const colorItemToSave = {
					colorItemId: colorItemToUpdate.colorItemId,
					name: this.editColorItemForm.get('name').value.toString().trim(),
					edhPlanOptionId: colorItemToUpdate.edhPlanOptionId,
					colors: this.selectedColors,
					isActive: colorItemToUpdate.isActive
				} as IColorItemDto;
				colorItemsToSave.push(colorItemToSave);
			});

			let toast: IToastInfo;

			this._colorService.updateColorItem(colorItemsToSave).subscribe((updatedColor) =>
			{
				if (updatedColor)
				{
					toast = {
						severity: 'success',
						summary: 'Updated Color Item',
						detail: 'Color Item update was successful!'
					};

					this._msgService.add(toast);

					//To refresh grid
					this.colorItemWasEdited.emit();
				}
			},
			error =>
			{
				toast = {
					severity: 'error',
					summary: 'Updated Color Item',
					detail: 'Color Item update failed. Please try again.'
				} as IToastInfo;

				this._msgService.add(toast);

				this.dialogWasCanceled.emit();
			});
		}
	}

	validateForm(): boolean
	{
		this.isDuplicateName = false;
		const colorItemName = this.editColorItemForm.get('name').value.toString().toLowerCase();

		if (colorItemName.length === 0)
		{
			this.nameErrorMessage = this.requiredFieldMessage;

			return false;
		}

		//1) find the selectedOption in the list of options that have their related color items
		//2) then search thru all color items (excluding the color item that is being edited) and compare the names
		this.isDuplicateName = this.optionsWithColorItemInfo
			.find(o => o.optionCommunityId === this.selectedOption.id)
			.colorItem.some(ci => ci.colorItemId !== this.selectedColorItems[0].colorItemId && ci.name.toLowerCase() === colorItemName);

		if (this.isDuplicateName)
		{
			this.nameErrorMessage = 'A color item with the same name already exists for this option.';

			return false;
		}

		return true;
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

	onMoveColorToSource()
	{
		this.availableColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);

		this.colorsHasChanged = true;
	}

	onMoveAllColorsToSource()
	{
		this.availableColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);

		this.colorsHasChanged = true;
	}

	onMoveColorToTarget()
	{
		this.selectedColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);

		this.colorsHasChanged = true;
	}

	onMoveAllColorsToTarget()
	{
		this.selectedColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);

		this.colorsHasChanged = true;
	}
}
