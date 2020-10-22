import { Injectable } from '@angular/core';

import * as _ from 'lodash';

import { DivDGroup } from '../../shared/models/group.model';
import { DivDSubGroup } from '../../shared/models/subgroup.model';
import { DivDPoint } from '../../shared/models/point.model';
import { DivDChoice } from '../../shared/models/choice.model';
import { IFinancialMarket } from '../../shared/models/financial-market.model';
import { StorageService } from '../../core/services/storage.service';
import { DivisionalService } from '../../core/services/divisional.service';
import { IDivisionalCatalogGroupDto } from '../../shared/models/divisional-catalog.model';
import { IPlan } from '../../shared/models/plan.model';
import { FinancialCommunity } from '../../shared/models/financial-community.model';
import { Subject } from 'rxjs';

@Injectable()
export class DivisionalCatalogWizardService
{
	market: IFinancialMarket;
	selectedChoices: DivCatWizChoice[];
	selectedPlans: DivCatWizPlan[];
	step: number;
	error$: Subject<any>;

	get groups(): DivDGroup[]
	{
		let groupDtos = this._storageService.getLocal<IDivisionalCatalogGroupDto[]>('CA_DIV_CAT_GROUPS');

		return groupDtos ?  this._divService.buildDivisionalCatalog(groupDtos) : [];
	}

	set groups(val: DivDGroup[])
	{
		let groupDtos = val.map(g => g.dto);

		this._storageService.setLocal('CA_DIV_CAT_GROUPS', groupDtos);
	}

	get hasSelectedChoices(): boolean
	{
		return this.selectedChoices && this.selectedChoices.length > 0;
	}

	get hasSelectedPlans(): boolean
	{
		return this.selectedPlans && this.selectedPlans.length > 0;
	}
		
	public constructor(private _storageService: StorageService, private _divService: DivisionalService)
	{
		this.selectedChoices = [];
		this.selectedPlans = [];
		this.step = 1;
		this.error$ = new Subject<any>();
	}

	removeStoredData()
	{
		this._storageService.remove(['CA_DIV_CAT_GROUPS', 'CA_DIV_CAT_WIZ_CHOICES', 'CA_DIV_CAT_WIZ_PLANS']);
	}

	getChoices()
	{
		let subGroups: DivDSubGroup[] = _.flatMap(this.groups, g => g.subGroups);
		let points: DivDPoint[] = _.flatMap(subGroups, sg => sg.points);
		let choices: DivDChoice[] = _.flatMap(points, p => p.choices);

		return choices.filter(c => this.selectedChoices.findIndex(x => x.id === c.id) > -1).map(c =>
		{
			let selectedChoice = this.selectedChoices.find(sc => sc.id === c.id);

			return { id: c.id, pointLabel: c.parent.label, choiceLabel: c.label, action: selectedChoice.action } as DivCatWizChoice;
		});
	}

	getSelectedChoices()
	{
		let choices = this._storageService.getLocal<DivCatWizChoice[]>('CA_DIV_CAT_WIZ_CHOICES');

		this.selectedChoices = choices || [];
	}

	saveSelectedChoices()
	{
		this._storageService.setLocal('CA_DIV_CAT_WIZ_CHOICES', this.selectedChoices);
	}

	getSelectedPlans()
	{
		let plans = this._storageService.getLocal<DivCatWizPlan[]>('CA_DIV_CAT_WIZ_PLANS');

		this.selectedPlans = plans || [];
	}

	saveSelectedPlans()
	{
		this._storageService.setLocal('CA_DIV_CAT_WIZ_PLANS', this.selectedPlans);
	}

	setError(error: any)
	{
		this.error$.next(error);
	}
}

export class DivCatWizChoice
{
	id: number;
	choiceLabel: string;
	pointLabel: string;
	action: ChoiceActionEnum;
}

export class DivCatWizPlan
{
	id: number;
	financialPlanIntegrationKey: string;
	planSalesName: string;
	financialCommunityId: number;
	financialCommunityNumber: string;
	financialCommunityName: string;
	draftType: string;

	public constructor(community?: FinancialCommunity, plan?: IPlan)
	{
		if (community)
		{
			this.financialCommunityId = community.id;
			this.financialCommunityName = community.name;
			this.financialCommunityNumber = community.number;
		}

		if (plan)
		{
			this.financialPlanIntegrationKey = plan.financialPlanIntegrationKey;
			this.id = plan.id;
			this.planSalesName = plan.planSalesName;
		}
	}
}

export interface IDivCatWizChoice
{
	id: number;
	action: ChoiceActionEnum;
}

export enum ChoiceActionEnum
{
	Update,
	Inactivate
}
