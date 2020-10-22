import { Injectable } from '@angular/core';

import { Option } from '../../shared/models/option.model';
import { DivDGroup } from '../../shared/models/group.model';
import { DivDChoice } from '../../shared/models/choice.model';
import { IPlan } from '../../shared/models/plan.model';
import { FinancialCommunity } from '../../shared/models/financial-community.model';
import { Subject } from 'rxjs';
import { StorageService } from '../../core/services/storage.service';
import { IDivisionalCatalogGroupDto } from '../../shared/models/divisional-catalog.model';
import { DivisionalService } from '../../core/services/divisional.service';

@Injectable()
export class DivAttributeWizardService
{
	marketId: number;
	filteredOptions: DivAttributeWizOption[];
	selectedOption: DivAttributeWizOption;
	selectedChoices: DivAttributeWizChoice[];
	selectedPlans: DivAttributeWizPlan[];
	error$: Subject<any>;

	keyword: string;
	keywordStep2: string;
	step: number = 0;
	selectedMapping: string;
	searchResultsCount: number;
	showSearchResults: boolean;

	get groups(): DivDGroup[]
	{
		let groupDtos = this._storageService.getLocal<IDivisionalCatalogGroupDto[]>('CA_DIV_CAT_GROUPS');

		return groupDtos ? this._divService.buildDivisionalCatalog(groupDtos) : [];
	}

	set groups(val: DivDGroup[])
	{
		let groupDtos = val.map(g => g.dto);

		this._storageService.setLocal('CA_DIV_CAT_GROUPS', groupDtos);
	}

	get hasSelectedOption(): boolean
	{
		return this.selectedOption && this.selectedOption !== null;
	}

	get hasSelectedChoices(): boolean
	{
		return this.selectedChoices && this.selectedChoices.length > 0;
	}

	get hasSelectedPlans(): boolean
	{
		return this.selectedPlans && this.selectedPlans.length > 0;
	}

	get hasSelectedMapping(): boolean
	{
		return this.selectedMapping && this.selectedMapping !== '';
	}

	get hasFilteredOptions(): boolean
	{
		return this.filteredOptions && this.filteredOptions.length > 0;
	}

	constructor(private _storageService: StorageService, private _divService: DivisionalService)
	{
		this.filteredOptions = [];
		this.selectedChoices = [];
		this.selectedOption = null;
		this.groups = [];
		this.selectedPlans = [];
		this.error$ = new Subject<any>();

		this.keyword = '';
		this.keywordStep2 = '';
		this.step = 0;
		this.selectedMapping = '';
		this.searchResultsCount = 0;
		this.showSearchResults = false;
	}

	removeStoredData()
	{
		this._storageService.remove(['CA_DIV_ATTR_WIZ_OPTION', 'CA_DIV_ATTR_WIZ_MAPPING', 'CA_DIV_ATTR_WIZ_CHOICES', 'CA_DIV_ATTR_WIZ_PLANS', 'CA_DIV_CAT_GROUPS', 'CA_DIV_ATTR_WIZ_FILTERED_OPTIONS', 'CA_DIV_ATTR_WIZ_STEP']);
	}

	getStep()
	{
		let step = this._storageService.getLocal<number>('CA_DIV_ATTR_WIZ_STEP');

		this.step = step || 1;
	}

	saveStep()
	{
		this._storageService.setLocal('CA_DIV_ATTR_WIZ_STEP', this.step);
	}

	getSelectedChoices()
	{
		let choices = this._storageService.getLocal<DivAttributeWizChoice[]>('CA_DIV_ATTR_WIZ_CHOICES');

		this.selectedChoices = choices || [];
	}

	saveSelectedChoices()
	{
		this._storageService.setLocal('CA_DIV_ATTR_WIZ_CHOICES', this.selectedChoices);
	}

	getSelectedPlans()
	{
		let plans = this._storageService.getLocal<DivAttributeWizPlan[]>('CA_DIV_ATTR_WIZ_PLANS');

		this.selectedPlans = plans || [];
	}

	saveSelectedPlans()
	{
		this._storageService.setLocal('CA_DIV_ATTR_WIZ_PLANS', this.selectedPlans);
	}

	getSelectedOption()
	{
		let option = this._storageService.getLocal<DivAttributeWizOption>('CA_DIV_ATTR_WIZ_OPTION');

		this.selectedOption = option || null;
	}

	saveSelectedOption()
	{
		this._storageService.setLocal('CA_DIV_ATTR_WIZ_OPTION', this.selectedOption);
	}

	getFilteredOptions()
	{
		let options = this._storageService.getLocal<DivAttributeWizOption[]>('CA_DIV_ATTR_WIZ_FILTERED_OPTIONS');

		this.filteredOptions = options || [];
	}

	saveFilteredOptions()
	{
		this._storageService.setLocal('CA_DIV_ATTR_WIZ_FILTERED_OPTIONS', this.filteredOptions);
	}

	getSelectedMapping()
	{
		let mapping = this._storageService.getLocal<string>('CA_DIV_ATTR_WIZ_MAPPING');

		this.selectedMapping = mapping || '';
	}

	saveSelectedMapping()
	{
		this._storageService.setLocal('CA_DIV_ATTR_WIZ_MAPPING', this.selectedMapping);
	}

	reset()
	{
		this.removeStoredData();
		this.step = 1;
		this.resetStep1();
		this.resetStep2();
		this.resetStep3();
	}

	resetStep1()
	{
		this.selectedOption = null;
		this.filteredOptions = [];
		this.keyword = '';
	}

	resetStep2()
	{
		this.selectedChoices = [];
		this.selectedMapping = '';
		this.keywordStep2 = '';
		this.searchResultsCount = 0;
		this.showSearchResults = false;
	}

	resetStep3()
	{
		this.selectedPlans = [];
	}

	setError(error: any)
	{
		this.error$.next(error);
	}
}

export class DivAttributeWizOption
{
	id: number;
	optionId: number;
	marketId: number;
	financialCommunityId: number;
	financialOptionIntegrationKey: string;
	optionSalesName: string;
	category: string;
	subCategory: string;

	public constructor(option: Option)
	{
		if (option)
		{
			this.id = option.id;
			this.optionId = option.optionId;
			this.marketId = option.marketId;
			this.financialCommunityId = option.financialCommunityId;
			this.financialOptionIntegrationKey = option.financialOptionIntegrationKey;
			this.optionSalesName = option.optionSalesName;
			this.category = option.category;
			this.subCategory = option.subCategory;
		}
	}
}

export class DivAttributeWizChoice
{
	id: number;
	label: string;
	pointLabel: string;

	public constructor(choice?: DivDChoice)
	{
		if (choice)
		{
			this.id = choice.id;
			this.label = choice.label;
			this.pointLabel = choice.parent.label;
		}
	}
}

export class DivAttributeWizPlan
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
