import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ConfirmModalComponent, Elevations, ModalService} from 'phd-common';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ColorService} from '../../services/color.service';
import {IColor} from '../../../shared/models/color.model';
import {
	IOptionCommunity,
	IPlanCommunity,
	IPlanOptionCommunityDto
} from '../../../shared/models/community.model';

@Component({
  selector: 'add-color-item-dialog',
  templateUrl: './add-color-item-dialog.component.html',
  styleUrls: ['./add-color-item-dialog.component.scss']
})
export class AddColorItemDialogComponent implements OnInit {
	addColorItemForm: FormGroup;
	nameIsMissing: boolean;
	availableColors: IColor[] = [];
	selectedColors: IColor[] = [];
	selectedPlans: Array<IPlanCommunity> = [];
	availablePlans: Array<IPlanCommunity> = [];
	@Input() allPlans: Array<IPlanCommunity> = [];
	@Input() communityId: number;
	@Input() selectedOption: IOptionCommunity;
	@Input() plansUsedInSearch: Array<number> = [];
	@Input() optionsWithColorItemInfo: Array<IPlanOptionCommunityDto> = [];
	@Output() dialogWasCanceled = new EventEmitter();

	constructor(
	  private _modalService: ModalService,
	  private _fb: FormBuilder,
	  private _colorService: ColorService
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

		const isElevationOption = [Elevations.AttachedElevation, Elevations.DetachedElevation].includes(this.selectedOption.optionSubCategoryId);
		const somePlansHaveActiveColorItem = this.optionsWithColorItemInfo.some(x => x.colorItem.isActive);

		//remove any plans that already have an active color item
		if (isElevationOption && somePlansHaveActiveColorItem)
		{
			const plansWithActiveColorItems = this.optionsWithColorItemInfo.filter(x => x.colorItem.isActive).map(x => x.planCommunity);
			this.allPlans = this.allPlans.filter(ap => plansWithActiveColorItems.every(plan => plan.id !== ap.id));
		}

		const searchedByAllPlans = this.plansUsedInSearch.some(x => x === 0);

		if (searchedByAllPlans)
		{
			//find all plans related to the selectedOption and default them to the selected control
			this.selectedPlans = this.allPlans
				.filter(plan => this.selectedOption.planOptionCommunities.some(optionPlan => optionPlan.planId === plan.id))
				.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1)
		}
		else
		{
			//find individual plans that were used to search by on the color items page and default them to the selected control
			this.selectedPlans = this.allPlans
				.filter(plan => this.plansUsedInSearch.filter(searchId => searchId === plan.id))
				.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);

			const remainingPlans = this.selectedOption.planOptionCommunities.filter(plan => this.selectedPlans.every(sp => sp.id !== plan.planId));
			this.availablePlans = this.allPlans.filter(plan => remainingPlans.some(rp => plan.id === rp.planId ))
		}
	}

	async cancelButtonWasClicked() {
		const noChangesWereFound = this.addColorItemForm.get('name').value.length === 0
			&& this.selectedColors.length === 0
			&& this.selectedPlans.length === 0;

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

	onMovePlanToSource() {
		this.availablePlans.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);
	}

	onMoveAllPlansToSource() {
		this.availablePlans.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);
	}

	onMovePlanToTarget() {
		this.selectedPlans.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);
	}

	onMoveAllPlansToTarget() {
		this.selectedPlans.sort((planA, planB) => planA.planSalesName.toLowerCase() > planB.planSalesName.toLowerCase() ? 1 : -1);
	}
}