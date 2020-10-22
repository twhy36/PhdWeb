import { Component, OnInit, ChangeDetectorRef, ViewChild, OnDestroy } from '@angular/core';
import { OrganizationService } from '../../../../core/services/organization.service';
import { Option } from '../../../../shared/models/option.model';
import { MessageService } from 'primeng/api';
import { orderBy } from "lodash";
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { DivisionalOptionService } from '../../../../core/services/divisional-option.service';
import { DivAttributeWizardService, DivAttributeWizOption, DivAttributeWizChoice } from '../../../services/div-attribute-wizard.service';
import { Router, ActivatedRoute } from '@angular/router';
import { WizardTemplateComponent } from '../../../../shared/components/wizard-template/wizard-template.component';
import { bind } from '../../../../shared/classes/decorators.class';
import { of } from 'rxjs';
import { flatMap, filter, map, distinctUntilChanged } from 'rxjs/operators';
import { TreeService } from '../../../../core/services/tree.service';
import { UnsubscribeOnDestroy } from '../../../../shared/classes/unsubscribeOnDestroy';

@Component({
	selector: 'divisional-attribute-wizard',
	templateUrl: './divisional-attribute-wizard.component.html',
	styleUrls: ['./divisional-attribute-wizard.component.scss'],
	providers: [DivAttributeWizardService]
})
export class DivisionalAttributeWizardComponent extends UnsubscribeOnDestroy implements OnInit, OnDestroy
{
	@ViewChild(WizardTemplateComponent) private wizardTemplate: WizardTemplateComponent;

	marketLoaded: boolean = false;
	options: Option[] = [];

	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Lawson Number', field: 'financialOptionIntegrationKey' },
		{ name: 'Option Name', field: 'optionSalesName' },
		{ name: 'Category', field: 'category' },
		{ name: 'Subcategory', field: 'subCategory' }
	];

	selectedSearchFilter: string = 'All';
	allDataLoaded: boolean;
	isSearchFilterOn: boolean;
	isSearchingFromServer: boolean;

	get marketId(): number
	{
		return this.wizardService.marketId;
	}

	get keyword(): string
	{
		return this.wizardService.keyword;
	}

	get selectedOption(): DivAttributeWizOption
	{
		return this.wizardService.selectedOption;
	}

	get filteredOptions(): DivAttributeWizOption[]
	{
		return this.wizardService.filteredOptions;
	}

	get filterNames(): Array<string>
	{
		return this.searchFilters.map(f => f.name);
	}

	get currentStep(): number
	{
		return this.wizardService.step;
	}

	get selectedMapping(): string
	{
		return this.wizardService.selectedMapping;
	}

	get selectedChoices(): DivAttributeWizChoice[]
	{
		return this.wizardService.selectedChoices;
	}

	constructor(private _msgService: MessageService,
		private _orgService: OrganizationService,
		private cd: ChangeDetectorRef,
		private _divOptService: DivisionalOptionService,
		private wizardService: DivAttributeWizardService,
		private router: Router,
		private _treeService: TreeService,
		private route: ActivatedRoute,
	)
	{
		super();
	}

	ngOnInit(): void
	{
		this.wizardService.error$.subscribe(error =>
		{
			if (error !== null)
			{
				this.error(error);
			}
		});

		if (this.wizardService.step === 0)
		{
			this.wizardService.getStep();
		}

		this.route.parent.paramMap.pipe(
			this.takeUntilDestroyed(),
			filter(p => p.get('marketId') && p.get('marketId') != '0'),
			map(p => +p.get('marketId')),
			distinctUntilChanged()
		).subscribe(marketId =>
		{
			this.wizardService.marketId = marketId;

			this.marketLoaded = true;
		});
	}

	ngOnDestroy()
	{
		// remove any stored data saved by the wizard
		this.wizardService.removeStoredData();
	}

	@bind
	complete()
	{
		return this._treeService.muDivisionMapping(this.wizardService.selectedPlans, this.wizardService.selectedChoices, this.wizardService.selectedOption, this.wizardService.selectedMapping).pipe(
			flatMap(selectedPlans =>
			{
				this.wizardService.selectedPlans = selectedPlans;

				this.wizardService.saveSelectedPlans();

				return of(true);
			}));
	}

	stepChange($event: { step: number })
	{
		let newStep = $event.step;

		if (this.wizardService.step > newStep && newStep === 1)
		{
			this.wizardService.resetStep2();
		}

		if (this.wizardService.step > newStep && newStep === 2)
		{
			this.wizardService.resetStep3();
		}

		if (this.wizardService.step !== newStep)
		{
			switch (newStep)
			{
				case 2:
					this.wizardService.saveFilteredOptions();
					this.wizardService.saveSelectedOption();

					break;
				case 3:
					this.wizardService.saveSelectedMapping();
					this.wizardService.saveSelectedChoices();

					break;
			}

			this.wizardService.step = newStep;

			this.wizardService.saveStep();
		}
	}

	get disableContinue(): boolean
	{
		let btnDisabled = !this.selectedOption;

		if (this.wizardService.step === 2)
		{
			btnDisabled = this.selectedMapping === "AddUpdate" ? this.selectedChoices.length === 0 : this.selectedMapping === "Remove" ? false : true;
		}

		if (this.wizardService.step === 3)
		{
			btnDisabled = this.wizardService.selectedPlans.length === 0;
		}

		return btnDisabled;
	}

	get disableCancel(): boolean
	{
		return !this.keyword && this.wizardService.step === 1;
	}

	get isDirty(): boolean
	{
		return this.wizardService.hasSelectedOption || this.wizardService.hasFilteredOptions;
	}

	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.wizardService.keyword = event['keyword'];
		this.filterOptions(this.selectedSearchFilter, this.keyword);

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	private onSearchResultUpdated()
	{
		if (this.filteredOptions.length === 0)
		{
			this._msgService.clear();
			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
		else
		{
			this.wizardService.filteredOptions = orderBy(this.filteredOptions, ['category', 'subCategory', 'optionSalesName']);
		}

		this.performChangeDetection();
	}

	private filterOptions(filter: string, keyword: string)
	{
		this.isSearchingFromServer = false;
		let searchFilter = this.searchFilters.find(f => f.name === filter);

		if (searchFilter && keyword)
		{
			this.filterOptionsFromServer(searchFilter, keyword);
		}
		else
		{
			this.clearFilter();
		}
	}

	clearFilter()
	{
		this.wizardService.filteredOptions = orderBy(this.options, ['category', 'subCategory', 'optionSalesName']);
		this.isSearchFilterOn = false;
		this.wizardService.selectedOption = null;
		this.wizardService.keyword = null;
		this.performChangeDetection();
	}

	private filterOptionsFromServer(searchFilter: any, keyword: string)
	{
		this.isSearchingFromServer = true;

		keyword = this.searchBar.handleSingleQuotes(keyword);

		this._divOptService.getDivisionalOptions(this.marketId, null, null, searchFilter.field, keyword).subscribe(data =>
		{
			this.wizardService.filteredOptions = data.map(o =>
			{
				return new DivAttributeWizOption(o);
			});

			this.isSearchFilterOn = true;
			this.isSearchingFromServer = false;

			this.onSearchResultUpdated();
		});
	}

	performChangeDetection()
	{
		this.cd.detectChanges();
	}

	continue()
	{

	}

	cancel()
	{
		this.wizardService.reset();

		this.router.navigateByUrl('/divisional/divisional-attributes/' + this.marketId + '/divisional-attribute-wizard');
	}

	error($event)
	{
		this._msgService.add({ severity: 'error', summary: 'Division Attributes - Division Mapping', detail: `An error has occured!` });

		this.wizardService.setError(null);
	}
}
