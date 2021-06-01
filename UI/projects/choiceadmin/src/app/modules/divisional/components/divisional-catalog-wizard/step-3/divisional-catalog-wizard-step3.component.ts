import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';

import * as _ from 'lodash';

import { DivDChoice } from '../../../../shared/models/choice.model';
import { DivisionalCatalogWizardService, ChoiceActionEnum, DivCatWizPlan, DivCatWizChoice } from '../../../services/div-catalog-wizard.service';
import { OrganizationService } from '../../../../core/services/organization.service';
import { FinancialCommunity } from '../../../../shared/models/financial-community.model';
import { IPlan } from '../../../../shared/models/plan.model';
import { TreeService } from '../../../../core/services/tree.service';
import { switchMap } from 'rxjs/operators';

@Component({
	selector: 'divisional-catalog-wizard-step3',
	templateUrl: './divisional-catalog-wizard-step3.component.html',
	styleUrls: ['./divisional-catalog-wizard-step3.component.scss']
})
export class DivisionalCatalogWizardStep3Component implements OnInit
{
	@ViewChild('headerTemplate') headerTemplate: TemplateRef<any>;

	get selectedChoices(): DivCatWizChoice[]
	{
		return this.filteredChoices;
	}

	get selectedPlans(): DivCatWizPlan[]
	{
		return this.wizardService.selectedPlans;
	}

	set selectedPlans(val: DivCatWizPlan[])
	{
		this.wizardService.selectedPlans = val;
	}

	filteredChoices: DivCatWizChoice[] = [];
	communities: FinancialCommunity[] = [];

	constructor(private wizardService: DivisionalCatalogWizardService, private orgService: OrganizationService, private treeService: TreeService) { }

	ngOnInit()
	{
		if (!this.wizardService.hasSelectedChoices)
		{
			this.wizardService.getSelectedChoices();
		}

		if (this.wizardService.hasSelectedChoices)
		{
			this.filteredChoices = this.wizardService.getChoices();

			if (this.wizardService.market)
			{
				const marketId = this.wizardService.market.id;

				this.treeService.getPlansWithActiveTrees(marketId).pipe(
					switchMap(plans =>
					{
						return this.orgService.getCommunitiesWithPlans(marketId, plans);
					})
				).subscribe(communities =>
				{
					this.communities = communities.map(c =>
					{
						let fc = new FinancialCommunity(c);

						// default to closed
						fc.open = false;

						return fc;
					});
				});
			}
		}
		else
		{
			// do something
		}
	}
	
	getChoiceAction(choice: DivDChoice): string
	{
		let selectedChoice = this.wizardService.selectedChoices.find(c => c.id === choice.id);

		return selectedChoice.action === ChoiceActionEnum.Update ? '<strong>UPDATE</strong>' : 'INACTIVATE';
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
			let p = new DivCatWizPlan(community, plan);

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
				let plan = new DivCatWizPlan(community, pc);

				this.selectedPlans.push(plan);
			}
			else if(!isChecked)
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
					let plan = new DivCatWizPlan(c, p);

					this.selectedPlans.push(plan);
				});
			});
		}
		else
		{
			this.selectedPlans = [];
		}
	}
}
