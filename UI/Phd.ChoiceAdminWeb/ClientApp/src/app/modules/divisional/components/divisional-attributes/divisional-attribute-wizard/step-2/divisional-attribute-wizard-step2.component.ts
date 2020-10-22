import { Component, ViewChild, TemplateRef, OnInit } from '@angular/core';
import { DivAttributeWizardService, DivAttributeWizOption, DivAttributeWizChoice } from '../../../../services/div-attribute-wizard.service';
import { DivDGroup } from '../../../../../shared/models/group.model';
import { DTChoice } from '../../../../../shared/models/tree.model';
import { MessageService } from 'primeng/api';
import { DivDChoice } from '../../../../../shared/models/choice.model';
import { DivisionalService } from '../../../../../core/services/divisional.service';

@Component({
	selector: 'divisional-attribute-wizard-step2',
	templateUrl: './divisional-attribute-wizard-step2.component.html',
	styleUrls: ['./divisional-attribute-wizard-step2.component.scss']
})
/** divisional-attribute-wizard-step2 component*/
export class DivisionalAttributeWizardStep2Component implements OnInit
{
	@ViewChild('headerTemplate') headerTemplate: TemplateRef<any>;

	searchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];
	selectedSearchFilter = 'All';
	isSearchFilterOn: boolean;
	isSearchingFromServer: boolean;
	displayButtons: boolean = false;
	displayChoiceSelector: boolean = false;
	mappingChecked: boolean = null;
	groups: DivDGroup[];

	get selectedChoices(): DivAttributeWizChoice[]
	{
		return this.wizardService.selectedChoices;
	}

	get keywordStep2(): string
	{
		return this.wizardService.keywordStep2;
	}

	get selectedOption(): DivAttributeWizOption
	{
		return this.wizardService.selectedOption;
	}

	get selectedOptionHeader(): string
	{
		return this.selectedOption ? `${this.selectedOption.category} >> ${this.selectedOption.subCategory} >> ${this.selectedOption.financialOptionIntegrationKey} -  ${this.selectedOption.optionSalesName}` : '';
	}

	get selectedMapping(): string
	{
		return this.wizardService.selectedMapping;
	}

	get searchResultsCount(): number
	{
		return this.wizardService.searchResultsCount;
	}

	get showSearchResults(): boolean
	{
		return this.wizardService.showSearchResults;
	}

	get marketId(): number
	{
		return this.wizardService.marketId;
	}

	constructor(private wizardService: DivAttributeWizardService, private _msgService: MessageService, private _divService: DivisionalService)
	{

	}

	ngOnInit(): void
	{
		if (!this.wizardService.hasSelectedOption)
		{
			this.wizardService.getSelectedOption();
		}

		if (!this.wizardService.hasSelectedChoices)
		{
			this.wizardService.getSelectedChoices();
		}
	}

	getDivisionalCatalog()
	{
		if (!this.wizardService.groups || this.wizardService.groups.length === 0)
		{
			this._divService.getDivisionalCatalog(this.marketId).subscribe(catalog =>
			{
				this.wizardService.groups = catalog.groups;
				this.groups = this.wizardService.groups;

			});
		}
		else
		{
			this.groups = this.wizardService.groups;
		}
	}

	selectMapping(mapping: string)
	{
		this.wizardService.selectedMapping = mapping;

		if (mapping === 'AddUpdate')
		{
			this.getDivisionalCatalog();
		}
		else
		{
			this.clearFilter();
		}
	}

	isChecked(mapping: string)
	{
		let isChecked = false;

		if (this.selectedMapping === mapping)
		{
			isChecked = true;
		}

		return isChecked;
	}
	
	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.wizardService.keywordStep2 = event['keyword'];
		this.filterOptionsFromServer(this.selectedSearchFilter, this.keywordStep2);
	}

	private filterOptionsFromServer(searchFilter: any, keyword: string)
	{
		this.isSearchingFromServer = true;

		this._resetAllMatchValues(true);

		this.wizardService.searchResultsCount = this.mainSearch(keyword, searchFilter);

		this.wizardService.showSearchResults = true;
	}

	private _resetAllMatchValues(value: boolean)
	{
		this.wizardService.showSearchResults = false;
		this.wizardService.searchResultsCount = 0;

		this.groups.forEach(gp =>
		{
			gp.matched = value;

			if (gp.subGroups != null)
			{
				gp.subGroups.forEach(sg =>
				{
					sg.matched = value;

					if (sg.points != null)
					{
						sg.points.forEach(dp =>
						{
							dp.matched = value;
						});
					}
				});
			}
		});
	}

	private mainSearch = (keyword: string, searchFilter: string): number =>
	{
		let count = 0;

		if (this.groups != null)
		{
			const isFilteredGroup = this.isFiltered('Group');
			const isFilteredSubGroup = this.isFiltered('SubGroup');
			const isFilteredPoint = this.isFiltered('Decision Point');
			const isFilteredChoice = this.isFiltered('Choice');

			this.groups.forEach(gp =>
			{
				// filtered by group or all and label matches keyword
				if (isFilteredGroup && this.isMatch(gp.label, keyword))
				{
					// show group
					gp.matched = true;
					gp.open = false;

					count++;
				}
				else
				{
					gp.matched = false;
				}

				if (gp.subGroups != null)
				{
					gp.subGroups.forEach(sg =>
					{
						// filtered by subGroup or all and label matches keyword
						if (isFilteredSubGroup && this.isMatch(sg.label, keyword))
						{
							// show subgroup
							sg.matched = true;
							sg.open = false;

							// show group
							gp.matched = true;
							gp.open = true;

							count++;
						}
						else
						{
							sg.matched = false;
						}

						if (sg.points != null)
						{
							sg.points.forEach(dp =>
							{
								// filtered by point or all and label matches keyword
								if (isFilteredPoint && this.isMatch(dp.label, keyword))
								{
									// show point
									dp.matched = true;

									// show subgroup
									sg.matched = true;
									sg.open = true;

									// show group
									gp.matched = true;
									gp.open = true;

									count++;
								}
								else
								{
									dp.matched = false;
								}

								if (dp.choices != null)
								{
									dp.choices.forEach(ch =>
									{
										if (isFilteredChoice && this.isMatch(ch.label, keyword))
										{
											// show choice
											ch.matched = true;

											// show point
											dp.matched = true;
											dp.open = true;

											// show subgroup
											sg.matched = true;
											sg.open = true;

											// show group
											gp.matched = true;
											gp.open = true;

											count++;
										}
										else
										{
											ch.matched = false;
										}
									});
								}

							});
						}
					});
				}
			});
		}

		return count;
	}

	private isMatch = (label: string, keyword: string): boolean =>
	{
		return label.toLowerCase().indexOf(keyword.toLowerCase()) >= 0;
	}

	private isFiltered = (filterType: string) =>
	{
		let filtered = false;

		if (this.selectedSearchFilter === filterType || this.selectedSearchFilter === 'All')
		{
			filtered = true;
		}

		return filtered;
	}

	onAddItemClick(item: DivDChoice)
	{
		this.addItem(item);
	}


	addItem(choice: DivDChoice)
	{
		const idList = this.selectedChoices.map(x => x.id);
		const index = idList.indexOf(choice.id);

		if (index === -1)
		{
			// add choice to a list of choices to be added when the user clicks save
			this.wizardService.selectedChoices.push(new DivAttributeWizChoice(choice));
		}
		else
		{
			// alert user that the item has already been added.
			this._msgService.add({ severity: 'info', summary: 'Item Alreaded Added', detail: `This item has already been added.` });
		}
	}

	removeItemClick(item: DTChoice)
	{
		const index = this.wizardService.selectedChoices.findIndex(c => c.id === item.id);

		this.wizardService.selectedChoices.splice(index, 1);
	}

	clearFilter()
	{
		this.wizardService.showSearchResults = false;
		this.wizardService.keywordStep2 = '';
		this.wizardService.selectedChoices = [];
	}
}
