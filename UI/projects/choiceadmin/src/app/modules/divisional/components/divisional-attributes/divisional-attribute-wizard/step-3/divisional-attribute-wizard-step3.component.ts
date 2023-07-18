import { Component, TemplateRef, ViewChild } from '@angular/core';
import { DivAttributeWizardService, DivAttributeWizPlan, DivAttributeWizOption, DivAttributeWizChoice } from '../../../../services/div-attribute-wizard.service';
import { TreeService } from '../../../../../core/services/tree.service';
import { FinancialCommunity } from '../../../../../shared/models/financial-community.model';
import { IPlan, IPlanOptionResult } from '../../../../../shared/models/plan.model';
import * as _ from 'lodash';
import { switchMap } from 'rxjs/operators';
import { OrganizationService } from '../../../../../core/services/organization.service';

@Component({
	selector: 'divisional-attribute-wizard-step3',
	templateUrl: './divisional-attribute-wizard-step3.component.html',
	styleUrls: ['./divisional-attribute-wizard-step3.component.scss']
})
/** divisional-attribute-wizard-step3 component*/
export class DivisionalAttributeWizardStep3Component
{
	@ViewChild('headerTemplate') headerTemplate: TemplateRef<any>;

	communities: FinancialCommunity[] = [];
	plans: IPlanOptionResult[] = [];

	get selectedPlans(): DivAttributeWizPlan[]
	{
		return this.wizardService.selectedPlans;
	}

	set selectedPlans(val: DivAttributeWizPlan[])
	{
		this.wizardService.selectedPlans = val;
	}

	get selectedMapping(): string
	{
		return this.wizardService.selectedMapping;
	}

	get selectedChoices(): DivAttributeWizChoice[]
	{
		return this.wizardService.selectedChoices;
	}

	get selectedOption(): DivAttributeWizOption
	{
		return this.wizardService.selectedOption;
	}

	get selectedOptionHeader(): string
	{
		return this.selectedOption ? `${this.selectedOption.category} >> ${this.selectedOption.subCategory} >> ${this.selectedOption.financialOptionIntegrationKey} -  ${this.selectedOption.optionSalesName}` : '';
	}

	constructor(private wizardService: DivAttributeWizardService,
		private treeService: TreeService,
		private orgService: OrganizationService)
	{

	}

	ngOnInit()
	{
		if (!this.wizardService.hasSelectedOption)
		{
			this.wizardService.getSelectedOption();
		}

		if (!this.wizardService.hasSelectedMapping)
		{
			this.wizardService.getSelectedMapping();
		}

		if (!this.wizardService.hasSelectedChoices)
		{
			this.wizardService.getSelectedChoices();
		}

		if (this.wizardService.marketId)
		{
			this.treeService.getPlanKeysForOption(this.selectedOption.financialOptionIntegrationKey, this.wizardService.marketId).pipe(
				switchMap(plans =>
				{
					return plans.length > 0 ? this.treeService.getTreeWithChoices(plans, this.selectedChoices) : []
				}),
				switchMap(treeWithChoices =>
				{
					this.plans = treeWithChoices;

					return treeWithChoices.length > 0 ? this.orgService.getCommunitiesWithPlans(this.wizardService.marketId, treeWithChoices) : []
				})
			).subscribe(comms =>
			{
				this.communities = comms.map(c =>
				{
					let fc = new FinancialCommunity(c);

					// Check each plan found in the financial community, which has the included choices and set hasChoices
					let planObject = this.plans.filter(pl => pl.org.edhFinancialCommunityId === fc.id && pl.choicesExist);

					planObject.forEach(po =>
					{
						var pcFound = fc.dto.planCommunities.find(pc => pc.financialPlanIntegrationKey === po.integrationKey);
						var pcId = pcFound ? pcFound.id : null;

						if (pcId)
						{
							fc.dto.planCommunities.find(pc => pc.id === pcId).hasChoices = true;
						}
					});

					// default to closed
					fc.open = false;

					return fc;
				})
			});
		}
	}

	isCommunitySelected(community: FinancialCommunity): boolean
	{
		return community.planCommunities.length > 0 && community.planCommunities.every(pc => this.selectedPlans.findIndex(p => p.id === pc.id) > -1);
	}

	isPlanSelected(plan: IPlan): boolean
	{
		return this.selectedPlans.some(p => p.id === plan.id);
	}

	areAllPlansSelected(): boolean
	{
		let plans: IPlan[] = _.flatMap(this.communities, c => c.planCommunities);

		return this.selectedPlans.length === plans.length;
	}

	setPlanSelected(community: FinancialCommunity, plan: IPlan): void
	{
		let index = this.selectedPlans.findIndex(p => p.id === plan.id);

		if (index > -1)
		{
			this.selectedPlans.splice(index, 1);
		}
		else
		{
			let p = new DivAttributeWizPlan(community, plan);

			this.selectedPlans.push(p);
		}
	}

	toggleAllCommunityPlans(community: FinancialCommunity, event: any): void
	{
		let isChecked = event.target.checked;

		community.planCommunities.forEach(pc =>
		{
			let index = this.selectedPlans.findIndex(p => p.id === pc.id);

			if (isChecked && index === -1)
			{
				let plan = new DivAttributeWizPlan(community, pc);

				if (this.selectedMapping === 'Remove' || pc.hasChoices)
				{
					this.selectedPlans.push(plan);
				}
			}
			else if (!isChecked && index !== -1)
			{
				this.selectedPlans.splice(index, 1);
			}
		});
	}

	toggleAllPlans(event: any): void
	{
		let isChecked = event.target.checked;

		if (isChecked)
		{
			this.communities.forEach(c =>
			{
				c.planCommunities.forEach(p =>
				{
					let plan = new DivAttributeWizPlan(c, p);

					if (this.selectedMapping === 'Remove' || p.hasChoices)
					{
						this.selectedPlans.push(plan);
					}
				});
			});
		}
		else
		{
			this.selectedPlans = [];
		}
	}

	isCommunityDisabled(community: FinancialCommunity): boolean
	{
		return !community.planCommunities.some(pc => pc.hasChoices);
	}
}
