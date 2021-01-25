import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';

import { IPlan, ITreeVersion } from '../../models/community.model';
import { LinkAction } from '../../models/action.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { environment } from '../../../../../environments/environment';

@Component({
	selector: 'plan-preview',
	templateUrl: './plan-preview.component.html',
	styleUrls: ['./plan-preview.component.scss'],
	encapsulation: ViewEncapsulation.None
})

export class PlanPreviewComponent implements OnInit
{
	@Input() action: LinkAction;
	@Output() onClose = new EventEmitter<void>();

	selectedMarket: number = null;
	selectedSalesCommunity: number = null;
	selectedFinancialCommunity: number = null;
	selectedPlan: number = 0;
	selectedTreeVersion: number = 0;

	plans: Array<IPlan>;
	planStatus: string;
	treeVersions: Array<ITreeVersion>;
	treeStatus: string;

	PLAN_STATUS = {
		WAITING: 'Loading Plans...',
		READY: 'Select A Plan',
		EMPTY: 'No Plans Available'
	}

	TREE_STATUS = {
		WAITING: 'Loading Previews...',
		READY: 'Select Preview',
		EMPTY: 'No Previews Available'
	}

	constructor(private organizationService: OrganizationService) { }

	ngOnInit()
	{
		if (!this.plans)
		{
			this.planStatus = this.PLAN_STATUS.EMPTY;
			this.treeStatus = this.TREE_STATUS.EMPTY;
		}
	}

	get noPlans()
	{
		return (!this.plans) ? true : false;
	}

	get noPreviews()
	{
		return (!this.treeVersions) ? true : false;
	}
	
	onMarketChange(market)
	{
		if (this.selectedMarket && (this.selectedMarket != market))
		{
			this.organizationService.currentPlan = 0;
			this.plans = null;
			this.treeVersions = null;
		}
		this.selectedMarket = market;
	}

	onSalesCommunityChange(sales)
	{
		this.selectedSalesCommunity = sales;
	}

	onFinancialCommunityChange(financialId)
	{
		// If financial community is not null, get plans
		this.selectedFinancialCommunity = financialId;
		if (this.selectedFinancialCommunity)
		{
			this.setPlan();
		}
	}

	onChangePlan()
	{
		// Set plan selected
		this.organizationService.currentPlan = this.selectedPlan;

		// Get draft and last published tree versions for plan
		this.setTreeVersion();
	}

	onChangeVersion()
	{
		// Set tree version selected (dTreeVersionId)
		this.organizationService.currentTreeVersion = this.selectedTreeVersion;
	}

	launchPreview()
	{
		const url = `${environment.baseUrl.designTool}${this.action.path}/${this.selectedTreeVersion}`;
		window.open(url, '_blank');
		
	}

	setFinancialCommunity()
	{
		if (this.organizationService.currentFinancialCommunity)
		{
			this.selectedFinancialCommunity = +this.organizationService.currentFinancialCommunity;
		}
	}

	setPlan()
	{
		// Get plans for selected financial community
		this.selectedPlan = 0;
		this.getPlans();
	}

	setTreeVersion()
	{
		this.selectedTreeVersion = 0;
		this.getTreeVersions();
	}

	getPlans()
	{
		this.planStatus = this.PLAN_STATUS.EMPTY;

		// Get plans for the financial community selected
		this.organizationService.getPlans(this.selectedFinancialCommunity)
			.subscribe(plans => {
				if (plans.length > 0)
				{
					this.plans = plans;
					this.selectedPlan = this.organizationService.currentPlan;
					this.planStatus = this.PLAN_STATUS.READY;

					// Set Tree Version, has to happen after getting plans.
					this.setTreeVersion();
				}
			});
	}

	getTreeVersions()
	{
		// Clear out current tree versions
		this.treeVersions = null;
		this.treeStatus = this.TREE_STATUS.EMPTY;

		// Get current selected plan
		const currentPlan = this.plans.find(x => x.id == this.selectedPlan);

		// Get tree versions for selected plan
		if (currentPlan)
		{
			this.organizationService.getTreeVersions(this.selectedFinancialCommunity, currentPlan.financialPlanIntegrationKey)
				.subscribe((treeVersions: Array<ITreeVersion>) => {
					if (treeVersions.length > 0) {
						// Tree versions found
						this.treeVersions = [];
						let currentDate = new Date();

						for (var item in treeVersions) {
							let tree = treeVersions[item];

							// Check if tree is last published or draft, set name accordingly
							if ((tree.publishStartDate) && (new Date(tree.publishStartDate) < currentDate)) {
								tree.displayName = 'Last Published';
								this.treeVersions.push(tree);
							}
							else if ((!tree.publishStartDate) || (new Date(tree.publishStartDate) > currentDate)) {
								tree.displayName = 'Draft';
								this.treeVersions.push(tree);
							}
						}

						this.treeStatus = this.TREE_STATUS.READY;
					}
					else {
						// No tree versions found
						this.treeStatus = this.TREE_STATUS.EMPTY;
						this.treeVersions = null;
					}
				});
		}
	}

	close() {
		this.onClose.emit();
	}
}
