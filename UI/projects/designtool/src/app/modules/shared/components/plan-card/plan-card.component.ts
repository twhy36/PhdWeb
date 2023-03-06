import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { flipOver, LotExt, Plan } from 'phd-common';
import { environment } from '../../../../../environments/environment';

@Component({
	selector: 'plan-card',
	templateUrl: 'plan-card.component.html',
	styleUrls: ['plan-card.component.scss'],
	animations: [
		flipOver
	],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanCardComponent implements OnInit
{
	@Input() plan: Plan;
	@Input() selectedPlan: Plan;
	@Input() selectedLot: LotExt;
	@Input() isJobPlan: boolean;
	@Input() canConfigure: boolean;
	@Input() isSpecSelected: boolean;
	@Input() isLitePlanDisabled: boolean;

	@Output() onTogglePlan = new EventEmitter<{ plan: Plan, lot: LotExt, isSelected: boolean }>();

	noImageAvailable = environment.defaultImageURL;

	constructor() { }

	ngOnInit() { }

	get isAssociatedWithSelectedLot(): boolean
	{
		// if no lot has been selected then return true
		if (!this.selectedLot)
		{
			return true;
		}

		return this.plan.lotAssociations.some(l => l === this.selectedLot.id);
	}

	toggleSelectedPlan(plan: Plan)
	{
		this.onTogglePlan.emit({ plan: plan, lot: this.selectedLot, isSelected: this.isPlanSelected(plan) });
	}

	isPlanSelected(plan: Plan)
	{
		return !this.isSpecSelected && this.selectedPlan?.id === plan.id;
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	loadImageError(event: any)
	{
		event.srcElement.src = environment.defaultImageURL;
	}

	getButtonLabel(): string
	{
		let btnLabel;

		//if a spec wasn't selected, but a plan was, allow them to unselect it
		//if a spec was selected or it isn't a job plan, allow them to choose another plan
		//otherwise, it's removed
		if (this.selectedPlan && this.isPlanActive())
		{
			btnLabel = 'Unselect';
		}
		else if (this.isLitePlanDisabled)
		{
			btnLabel = 'Disabled';
		}		
		else if (!this.isJobPlan || this.isSpecSelected)
		{
			btnLabel = 'CHOOSE';
		}
		else
		{
			btnLabel = 'Removed';
		}

		return btnLabel;
	}

	getDisabled(): boolean
	{
		return this.isJobPlan && this.getButtonLabel() === 'Removed';
	}

	get planPrice(): number
	{
		if (this.selectedLot && this.selectedLot.salesPhase && this.selectedLot.salesPhase.salesPhasePlanPriceAssocs)
		{
			const isPhaseEnabled = this.selectedLot.financialCommunity && this.selectedLot.financialCommunity.isPhasedPricingEnabled;
			const phasePlanPrice = this.selectedLot.salesPhase.salesPhasePlanPriceAssocs.find(x => x.planId === this.plan.id);

			if (isPhaseEnabled && phasePlanPrice)
			{
				return phasePlanPrice.price;
			}
		}

		return this.plan.price;
	}

	isPlanActive(): boolean
	{
		// It is in PhdLite when the plan does not have tree. 
		// In this case it will determine if the plan is active by checking if the plan has been selected
		return (this.plan.treeVersionId
			? this.selectedPlan?.treeVersionId === this.plan.treeVersionId
			: this.selectedPlan?.id === this.plan.id)
			&& !this.isSpecSelected;
	}
}
