import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ConfirmModalComponent, Elevations, ModalService } from 'phd-common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ColorService } from '../../services/color.service';
import { IColorItemDto } from '../../../shared/models/colorItem.model';
import { IOptionCommunity } from '../../../shared/models/community.model';	
import { IColor } from '../../../shared/models/color.model';


@Component({
	selector: 'edit-color-item-dialog',
	templateUrl: './edit-color-item-dialog.component.html',
	styleUrls: ['./edit-color-item-dialog.component.scss']
})

export class EditColorItemDialogComponent implements OnInit {
	editColorItemForm: FormGroup;
	nameIsMissing: boolean;
	availableColors: IColor[] = [];
	selectedColors: IColor[] = [];
    @Input() selectedColorItems: IColorItemDto[];
	@Input() communityId: number;
    @Input() selectedOption: IOptionCommunity;
	@Input() canEditName: boolean;
	@Output() ModalWasClosed = new EventEmitter();
	@Output() dialogWasCanceled = new EventEmitter();

    constructor(
        private _modalService: ModalService,
        private _fb: FormBuilder,
        private _colorService: ColorService
      ) { }
	  
      ngOnInit(): void {
		this.editColorItemForm = this._fb.group({
			name: [{ value: this.selectedColorItems[0].name, disabled:!this.canEditName},[Validators.required, Validators.maxLength(50)]],			
		}); 
		
		this.selectedColors = this.selectedColorItems[0].colors;
		const selectedColorIdList = this.selectedColors.map(color => color.colorId);
		this._colorService.getColors(this.communityId, '', this.selectedOption.optionSubCategoryId)
			.subscribe(colors => {
					this.availableColors = colors.filter(x => x.isActive && !selectedColorIdList.includes(x.colorId));
				}
			);
		//const isElevationOption = [Elevations.AttachedElevation, Elevations.DetachedElevation].includes(this.selectedOption.optionSubCategoryId);
		//const somePlansHaveActiveColorItem = this.optionsWithColorItemInfo.some(x => x.colorItem.isActive);		
	}

    async cancelButtonWasClicked() {
		const noChangesWereFound = this.editColorItemForm.get('name').value.length === 0
			&& this.selectedColors.length === 0;

		if (noChangesWereFound) {
			this.dialogWasCanceled.emit();
			return;
		}

		const msg = 'Do you want to cancel without saving? If so, the data entered will be lost.';
		const closeWithoutSavingData = await this.showConfirmModal(msg, 'Warning', 'Continue');

		if (closeWithoutSavingData) {
			this.dialogWasCanceled.emit();
		}
	}

	saveButtonWasClicked(){

		this.selectedColorItems.forEach(colorItemToUpdate => {
			const colorItemToSave = {
				colorItemId: colorItemToUpdate.colorItemId,
				name: this.editColorItemForm.get('name').value.toString().trim(),
				edhPlanOptionId: colorItemToUpdate.edhPlanOptionId,
				colors: colorItemToUpdate.colors,
				isActive: colorItemToUpdate.isActive
			} as IColorItemDto;
			this._colorService.updateColorItem(colorItemToSave).subscribe((updatedColor) => {
			
			},
			error => {
			
			});
		});
		
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

    onMoveColorToSource() {
		this.availableColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);
	}

	onMoveAllColorsToSource() {
		this.availableColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);
	}

	onMoveColorToTarget() {
		this.selectedColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);
	}

	onMoveAllColorsToTarget() {
		this.selectedColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);
	}
}