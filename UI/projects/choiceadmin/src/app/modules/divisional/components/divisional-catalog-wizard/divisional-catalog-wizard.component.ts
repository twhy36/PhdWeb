import { Component, OnInit, ViewChild,  OnDestroy } from '@angular/core';

import { OrganizationService } from '../../../core/services/organization.service';
import { DivisionalService } from '../../../core/services/divisional.service';
import { IFinancialMarket } from '../../../shared/models/financial-market.model';
import { DivDGroup } from '../../../shared/models/group.model';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { DivisionalCatalogWizardService, IDivCatWizChoice } from '../../services/div-catalog-wizard.service';
import { WizardTemplateComponent } from '../../../shared/components/wizard-template/wizard-template.component';
import { TreeService } from '../../../core/services/tree.service';
import { flatMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { bind } from '../../../shared/classes/decorators.class';

@Component({
	selector: 'divisional-catalog-wizard',
	templateUrl: './divisional-catalog-wizard.component.html',
	styleUrls: ['./divisional-catalog-wizard.component.scss'],
	providers: [DivisionalCatalogWizardService]
})
export class DivisionalCatalogWizardComponent implements OnInit, OnDestroy
{
	@ViewChild(WizardTemplateComponent) private wizardTemplate: WizardTemplateComponent;

	marketsLoaded: boolean = false;

	searchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];
	selectedSearchFilter: string = 'All';
	keyword: string = '';

	openGroups: boolean = true;
	openSubGroups: boolean = true;
	openPoints: boolean = true;

	get selectedChoices(): IDivCatWizChoice[]
	{
		return this.wizardService.selectedChoices;
	}

	get groups(): DivDGroup[]
	{
		return this.wizardService.catalogGroups;
	}

	get currentStep(): number
	{
		return this.wizardService.step;
	}

	get selectedMarket(): IFinancialMarket
	{
		return this.wizardService.market;
	}

	get isDirty(): boolean
	{
		return this.wizardService.hasSelectedChoices;
	}

	lockedFromChanges: boolean = false;

	get disableContinue(): boolean
	{
		let btnDisabled = this.selectedChoices.length === 0;

		if (this.wizardService.step === 2)
		{
			btnDisabled = this.wizardService.selectedChoices.some(c => c.action == null);
		}

		if (this.wizardService.step === 3)
		{
			btnDisabled = this.wizardService.selectedPlans.length === 0;
		}

		return btnDisabled;
	}
	
	constructor(
		private router: Router,
		private _orgService: OrganizationService,
		private _divService: DivisionalService,
		private _treeService: TreeService,
		private _msgService: MessageService,
		private wizardService: DivisionalCatalogWizardService) { }

	ngOnInit()
	{
		this.wizardService.error$.subscribe(error =>
		{
			if (error !== null)
			{
				this.error(error);
			}
		});

		this._orgService.getMarkets().subscribe(markets =>
		{
			const storedMarket = this._orgService.currentFinancialMarket;

			// check for stored market.  If found try to set the current market to that value.
			if (storedMarket != null)
			{
				this.wizardService.market = markets.find(x => x.number === storedMarket);

				this.getDivisionalCatalog();
			}

			this.marketsLoaded = true;
		});
	}

	ngOnDestroy()
	{
		// remove any stored data saved by the wizard
		this.wizardService.removeStoredData();
	}

	getDivisionalCatalog()
	{
		if (!this.wizardService.groups || this.wizardService.groups.length === 0)
		{
			this._divService.getDivisionalCatalog(this.selectedMarket.id).subscribe(catalog =>
			{
				this.wizardService.groups = catalog.groups;
			});
		}
	}

	onChangeMarket()
	{
		// set local storage 
		this._orgService.currentFinancialMarket = this.selectedMarket.number;

		this.getDivisionalCatalog();
	}

	@bind
	complete()
	{
		return this._treeService.muChoiceUpdate(this.wizardService.selectedPlans, this.wizardService.selectedChoices).pipe(
			flatMap(selectedPlans =>
			{
				this.wizardService.selectedPlans = selectedPlans;

				this.wizardService.saveSelectedPlans();

				return of(true);
			}));
	}

	error($event)
	{
		this._msgService.add({ severity: 'error', summary: 'Division Catalog - Update Tree', detail: `An error has occured!` });

		this.wizardService.setError(null);
	}

	cancel()
	{
		this.router.navigateByUrl('/divisional/divisional-catalog');
	}

	stepChange($event: { step: number })
	{
		let newStep = $event.step;

		if (this.wizardService.step > newStep && newStep === 1)
		{
			// clear out selected action when going back to step 1
			this.wizardService.selectedChoices.forEach(c => c.action = null);
		}

		if (this.wizardService.step > newStep && newStep === 2)
		{
			// clear out selected plans when going back to step 2
			this.wizardService.selectedPlans = [];
		}

		if (this.wizardService.step !== newStep)
		{
			this.wizardService.saveSelectedChoices();
		}

		this.wizardService.step = newStep;
	}

	keywordSearch = () =>
	{
		//reset everything to unmatched.
		this.resetAllMatchValues(false);
		let matchCount = 0;

		matchCount = this.mainSearch();

		if (matchCount === 0)
		{
			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
	}

	private mainSearch = (): number =>
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
				if (isFilteredGroup && this.isMatch(gp.label, this.keyword))
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
						if (isFilteredSubGroup && this.isMatch(sg.label, this.keyword))
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
								if (isFilteredPoint && this.isMatch(dp.label, this.keyword))
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
										if (isFilteredChoice && this.isMatch(ch.label, this.keyword))
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

	private resetAllMatchValues(value: boolean)
	{
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

							if (dp.choices != null)
							{
								dp.choices.forEach(c =>
								{
									c.matched = value;
								});
							}
						});
					}
				});
			}
		});
	}

	clearFilter()
	{
		this.keyword = '';
		this.resetAllMatchValues(true);
	}
}
