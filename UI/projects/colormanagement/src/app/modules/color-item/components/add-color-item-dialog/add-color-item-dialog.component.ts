import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ConfirmModalComponent, Elevations, ModalService} from 'phd-common';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ColorService} from '../../../core/services/color.service';
import {IColor} from '../../../shared/models/color.model';
import {
	IOptionCommunity,
	IPlanCommunity, IPlanOptionCommunity,
	IPlanOptionCommunityDto
} from '../../../shared/models/community.model';
import {IColorItemDto} from '../../../shared/models/colorItem.model';
import { PlanOptionService } from '../../../core/services/plan-option.service';

@Component({
  selector: 'add-color-item-dialog',
  templateUrl: './add-color-item-dialog.component.html',
  styleUrls: ['./add-color-item-dialog.component.scss']
})
export class AddColorItemDialogComponent implements OnInit {
	get requiredFieldMessage() { return 'This is a required field';	}
	addColorItemForm: FormGroup;
	isDuplicateName = false;
	nameErrorMessage = '';
	noPlansSelected = false;
	availableColors: IColor[] = [];
	selectedColors: IColor[] = [];
	selectedPlans: Array<IPlanCommunity> = [];
	availablePlans: Array<IPlanCommunity> = [];
	plansAndColorsArePristine = true;
	optionsByPlan: Array<IPlanOptionCommunity> = [];

	@Input() allPlans: Array<IPlanCommunity> = [];
	@Input() communityId: number;
	@Input() selectedOption: IOptionCommunity;
	@Input() planIdsUsedInSearch: Array<number> = [];
	@Input() searchedByAllPlans: boolean;
	@Input() optionsWithColorItemInfo: Array<IPlanOptionCommunityDto> = [];
	@Output() dialogWasCanceled = new EventEmitter();
	@Output() colorItemSaveAttempted = new EventEmitter<boolean>();

	constructor(
	  private _modalService: ModalService,
	  private _fb: FormBuilder,
	  private _colorService: ColorService,
	  private _planService: PlanOptionService
	) { }

	ngOnInit(): void {
		this.addColorItemForm = this._fb.group({
			name: ['', [Validators.required, Validators.maxLength(50)]],
		});

		this._colorService.getColors(this.communityId, '', this.selectedOption.optionSubCategoryId)
			.subscribe(colors => {
					this.availableColors = colors.filter(x => x.isActive);
				}
			);

		this._planService.getPlanOptionsByOption(this.selectedOption.id).subscribe(result => {
				const  allOptionRelatedPlanIds = result.map(x => x.planId);
				this.optionsByPlan = result;
				const isElevationOption = [Elevations.AttachedElevation, Elevations.DetachedElevation].includes(this.selectedOption.optionSubCategoryId);
				const somePlansHaveActiveColorItem = this.optionsWithColorItemInfo.some(x => x.colorItem.isActive);
				let plansLookupList = this.allPlans.filter(x => x.planSalesName.toLowerCase() !== 'all plans' && allOptionRelatedPlanIds.some(optionId => x.id === optionId));

				//remove any plans that already have an active color item
				if (isElevationOption && somePlansHaveActiveColorItem)
				{
					const plansWithActiveColorItems = this.optionsWithColorItemInfo.filter(x => x.colorItem.isActive).map(x => x.planCommunity);
					plansLookupList = plansLookupList.filter(ap => plansWithActiveColorItems.every(plan => plan.id !== ap.id));
				}

				if (this.searchedByAllPlans)
				{
					//find all plans related to the selectedOption and default them to the selected control
					this.selectedPlans = plansLookupList
						.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);
				}
				else
				{
					//find individual plans that were used to search by on the color items page and default them to the selected control
					this.selectedPlans = plansLookupList
						.filter(plan => this.planIdsUsedInSearch.some(searchId => searchId === plan.id))
						.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);

					this.availablePlans = plansLookupList
						.filter(plan => this.selectedPlans.every(sp => sp.id !== plan.id))
						.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);;
				}
			});
	}

	async cancelButtonWasClicked() {
		const noChangesWereFound = this.addColorItemForm.get('name').value.length === 0
			&& (this.selectedColors.length === 0
			&& this.selectedPlans.length === 0
		    || this.plansAndColorsArePristine);

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

	private async showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true, windowClass: "phd-modal-window" });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		const response = await confirm.result;
		return response === 'Continue';
	}

	saveButtonWasClicked() {
		if (this.validateForm() === false)
		{
			return;
		}

		const colorItems: Array<IColorItemDto> = [];

		this.selectedPlans.forEach(plan => {
			const planOption = this.optionsByPlan.find(x => x.planId === plan.id);

			if (planOption)
			{
				const item = {
					colorItemId: 0,
					name: this.addColorItemForm.get('name').value.toString().trim(),
					isActive: true,
					edhPlanOptionId: planOption.id,
					colors: this.selectedColors
				} as IColorItemDto;

				colorItems.push(item);
			}
		})

		if (colorItems.length > 0)
		{
			this._colorService.saveColorItem(colorItems).subscribe(savedColorItems => {
					this.colorItemSaveAttempted.emit(savedColorItems.length > 0);
				},
				error => {
					this.colorItemSaveAttempted.emit(false);
				});
		}
		else
		{
			this.colorItemSaveAttempted.emit(false);
		}
	}

	validateForm(): boolean
	{
		this.isDuplicateName = false;
		this.noPlansSelected = false;
		const colorItemName = this.addColorItemForm.get('name').value.toString().toLowerCase().trim();

		if (colorItemName.length === 0)
		{
			this.nameErrorMessage = this.requiredFieldMessage;
			return false;
		}

		if (this.selectedPlans.length === 0)
		{
			this.noPlansSelected = true;
			return false;
		}

		this.isDuplicateName = this.optionsWithColorItemInfo.some(option => option.colorItem.name.toLowerCase() === colorItemName)

		if (this.isDuplicateName)
		{
			this.nameErrorMessage = 'A color item with the same name already exists for this option.';
			return false;
		}

		return true;
	}

	onNameChanged(event: any) {
		const nameMissing = event.target.value.length === 0;
		this.nameErrorMessage = nameMissing ? this.requiredFieldMessage : '';
		//possible that duplicate message may have been set to true so reset to false just in case
		this.isDuplicateName = false;
	}

	onMoveColorToSource() {
		this.plansAndColorsArePristine = false;
		this.availableColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);
	}

	onMoveAllColorsToSource() {
		this.plansAndColorsArePristine = false;
		this.availableColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);
	}

	onMoveColorToTarget() {
		this.plansAndColorsArePristine = false;
		this.selectedColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);
	}

	onMoveAllColorsToTarget() {
		this.plansAndColorsArePristine = false;
		this.selectedColors.sort((colorA, colorB) => colorA.name.toLowerCase() > colorB.name.toLowerCase() ? 1 : -1);
	}

	onMovePlanToSource() {
		this.plansAndColorsArePristine = false;
		this.availablePlans.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);
	}

	onMoveAllPlansToSource() {
		this.plansAndColorsArePristine = false;
		this.availablePlans.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);
	}

	onMovePlanToTarget() {
		this.plansAndColorsArePristine = false;
		this.selectedPlans.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);
	}

	onMoveAllPlansToTarget() {
		this.plansAndColorsArePristine = false;
		this.selectedPlans.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);
	}
}
