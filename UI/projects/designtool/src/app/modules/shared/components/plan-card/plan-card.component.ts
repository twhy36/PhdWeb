import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { flipOver, LotExt, Plan } from 'phd-common';

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

	@Output() onTogglePlan = new EventEmitter<{ plan: Plan, isSelected: boolean }>();

	noImageAvailable = 'assets/pultegroup_logo.jpg';

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

	toggleSelectedPlan(plan: Plan, selected: boolean)
	{
		this.onTogglePlan.emit({ plan: plan, isSelected: selected });
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	loadImageError(event: any)
	{
		event.srcElement.src = 'assets/pultegroup_logo.jpg';
	}

	getButtonLabel(): string
	{
		let btnLabel;

		if (this.selectedPlan && this.selectedPlan.treeVersionId === this.plan.treeVersionId)
		{
			btnLabel = 'Unselect';
		}
		else
		{
			btnLabel = this.isJobPlan ? 'Removed' : 'CHOOSE';
		}

		return btnLabel;
	}

	getDisabled(): boolean
	{
		return this.isJobPlan && this.getButtonLabel() === 'Removed';
	}

	get planPrice(): number
	{
		if (this.selectedLot && this.selectedLot.salesPhase && this.selectedLot.salesPhase.salesPhasePlanPriceAssocs) {
			const isPhaseEnabled = this.selectedLot.financialCommunity && this.selectedLot.financialCommunity.isPhasedPricingEnabled;
			const phasePlanPrice = this.selectedLot.salesPhase.salesPhasePlanPriceAssocs.find(x => x.planId === this.plan.id);
			if (isPhaseEnabled && phasePlanPrice) {
				return phasePlanPrice.price;
			}
		}

		return this.plan.price;
	}
}
