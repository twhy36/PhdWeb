import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';

import { IFinancialCommunity, IPlan, ITreeVersion, IWebSiteCommunity } from '../../models/community.model';
import { LinkAction } from '../../models/action.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { environment } from '../../../../../environments/environment';
import { BrandService, FinancialBrand, getBrandUrl } from 'phd-common';

@Component({
	selector: 'plan-preview',
	templateUrl: './plan-preview.component.html',
	styleUrls: ['./plan-preview.component.scss'],
	encapsulation: ViewEncapsulation.None
})

export class PlanPreviewComponent implements OnInit
{
	@Input() action: LinkAction;
	@Input() roles: string[];
	@Output() onClose = new EventEmitter<void>();

	selectedMarket: number = null;
	selectedSalesCommunity: number = null;
	selectedFinancialCommunity: number = null;
	selectedPlan: number = 0;
	selectedType: number = 0;
	selectedTreeVersion: number = 0;
	
	currentFinancialBrand: FinancialBrand;

	types: Array<{
		typeId: number;
		typeName: string;
	}> = [];
	typeStatus: string;
	plans: Array<IPlan>;
	planStatus: string;
	treeVersions: Array<ITreeVersion>;
	treeStatus: string;
	webSiteCommunity: IWebSiteCommunity;
	designPreviewEnabled: boolean;

	TYPE_STATUS = {
		WAITING: 'Loading Types...',
		READY: 'Select A Type',
		EMPTY: 'No Types Available'
	}

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

	constructor(private organizationService: OrganizationService, private brandService: BrandService) { }

	ngOnInit()
	{
		if (!this.plans)
		{
			this.planStatus = this.PLAN_STATUS.EMPTY;
			this.typeStatus = this.TYPE_STATUS.EMPTY;
			this.treeStatus = this.TREE_STATUS.EMPTY;
		}
	}

	get noPlans()
	{
		return (!this.plans) ? true : false;
	}

	get noTypes()
	{
		return (!this.types) ? true : false;
	}

	get noPreviews()
	{
		return (!this.treeVersions) ? true : false;
	}

	get disableLaunchPreview()
	{
		let disabled = false;

		// No previews should display unless market and sales community are present
		if (!this.selectedMarket || !this.selectedSalesCommunity)
		{
			disabled = true;
		}
		else
		{
			// For THO Preview, financial community doesn't matter.
			if (this.selectedType === 2)
			{
				disabled = false;
			}
			else if (!this.selectedFinancialCommunity)
			{
				disabled = true;
			}
			else if (this.selectedType === 0)
			{
				disabled = true;
			}
			else
			{
				if (!this.selectedPlan || !this.selectedTreeVersion)
				{
					disabled = true;
				}
			}
		}

		return disabled;
	}

	onMarketChange(market)
	{
		if (this.selectedMarket && (this.selectedMarket != market))
		{
			this.organizationService.currentPlan = 0;
			this.plans = null;
			this.types = null;
			this.treeVersions = null;
		}

		this.selectedMarket = market;
	}

	onSalesCommunityChange(sales)
	{
		this.selectedSalesCommunity = sales;
		this.selectedType = 0;
		this.webSiteCommunity = null;
		this.types = [];
		this.typeStatus = this.TYPE_STATUS.EMPTY;

		if (this.selectedSalesCommunity)
		{
			this.organizationService.getWebsiteCommunity(this.selectedSalesCommunity).subscribe(wc =>
			{
				this.webSiteCommunity = wc;

				if (this.webSiteCommunity && !this.types.find(t => t.typeId === 2))
				{
					this.types.push({
						typeId: 2,
						typeName: 'THO Preview'
					});

					this.typeStatus = this.TYPE_STATUS.READY;
				}
			});
		}
	}

	onFinancialCommunityChange(financialCommunity: IFinancialCommunity)
	{
		// If financial community is not null, get plans
		this.selectedFinancialCommunity = financialCommunity?.id;
		this.designPreviewEnabled = financialCommunity?.isDesignPreviewEnabled;

		if (this.designPreviewEnabled)
		{
      		// Get the finacial brand if DP Enabled
      		this.brandService.getFinancialBrand(financialCommunity.financialBrandId, environment.apiUrl).subscribe(brand => {
        		this.currentFinancialBrand = brand;
      		});
		}
		else
		{
			this.currentFinancialBrand = null;
		}

		this.setType();
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
		let url = '';

		if (this.selectedType === 1)
		{
			// Open in design Tool
			url = `${environment.baseUrl.designTool}${this.action.path}/${this.selectedTreeVersion}`;
		}
		else if (this.selectedType === 2)
		{
			// Open in THO Preview
			const webSiteIntegrationKey = this.webSiteCommunity.webSiteIntegrationKey;

			url = `${environment.baseUrl.thoPreview}${webSiteIntegrationKey}?preview=true`;
		}
		else if (this.selectedType === 3)
		{
			// Open in Design Preview
			url = `${getBrandUrl(this?.currentFinancialBrand?.key, environment.baseUrl.designPreview)}preview/${this.selectedTreeVersion}`;
		}

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

	setType()
	{
		// Get types for selected plan
		this.selectedType = 0;
		this.types = [];

		this.getTypes();
	}

	setTreeVersion()
	{
		this.selectedTreeVersion = 0;

		this.getTreeVersions();
	}

	getTypes()
	{
		this.typeStatus = this.TYPE_STATUS.EMPTY;

		// Get plans for the financial community selected
		if (this.selectedSalesCommunity)
		{
			if (this.webSiteCommunity)
			{
				this.types.push({
					typeId: 2,
					typeName: 'THO Preview'
				});
			}

			if (this.selectedFinancialCommunity)
			{
				this.types.push({
					typeId: 1,
					typeName: 'Design Tool'
				});

				let showDesignPreview = false;

				// Toggle between two lines below and sub in your role for testing
				// if (this.designPreviewEnabled || this.roles.find(role => role === ''<YOUR_ROLE_HERE>'')) {
				if (this.designPreviewEnabled || this.roles.find(role => role === 'SalesManager'))
				{
					showDesignPreview = true;
				}

				if (showDesignPreview)
				{
					this.types.push({
						typeId: 3,
						typeName: 'Design Preview'
					});
				}

				this.setPlan();
			}
		}

		if (this.types.length > 0)
		{
			this.typeStatus = this.TYPE_STATUS.READY;
		}
	}

	getPlans()
	{
		this.planStatus = this.PLAN_STATUS.EMPTY;

		// Get plans for the financial community selected
		this.organizationService.getPlans(this.selectedFinancialCommunity)
			.subscribe(plans =>
			{
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
				.subscribe((treeVersions: Array<ITreeVersion>) =>
				{
					if (treeVersions.length > 0)
					{
						// Tree versions found
						this.treeVersions = [];
						let currentDate = new Date();

						for (var item in treeVersions)
						{
							let tree = treeVersions[item];

							// Check if tree is last published or draft, set name accordingly
							if ((tree.publishStartDate) && (new Date(tree.publishStartDate) < currentDate))
							{
								tree.displayName = 'Last Published';

								this.treeVersions.push(tree);
							}
							else if ((!tree.publishStartDate) || (new Date(tree.publishStartDate) > currentDate))
							{
								tree.displayName = 'Draft';

								this.treeVersions.push(tree);
							}
						}

						this.treeStatus = this.TREE_STATUS.READY;
					}
					else
					{
						// No tree versions found
						this.treeStatus = this.TREE_STATUS.EMPTY;
						this.treeVersions = null;
					}
				});
		}
	}

	close()
	{
		this.onClose.emit();
	}
}
