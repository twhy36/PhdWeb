import { Component, Input, Output, EventEmitter, ViewEncapsulation, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { SelectItem } from 'primeng/api';

import { environment } from '../../../../../environments/environment';
import { LinkAction } from '../../models/action.model';
import { SearchResult, IFilterItem, IFilterItems, ISearchResultAgreement } from '../../models/search.model';
import { SearchService } from '../../../core/services/search.service';
import { PhdTableComponent } from 'phd-common/components/table/phd-table.component';

@Component({
	encapsulation: ViewEncapsulation.None,
	selector: 'phd-search',
	styleUrls: ['./phd-search.component.scss'],
	templateUrl: './phd-search.component.html'
})

export class PHDSearchComponent
{
	@Input() action: LinkAction;
	@Output() onClose = new EventEmitter<void>();

	@ViewChild('homesiteField') homesiteRef: ElementRef;
	@ViewChild('salesAgreementNumberField') salesAgreementNumberRef: ElementRef;
	@ViewChild('firstNameField') firstNameRef: ElementRef;
	@ViewChild('lastNameField') lastNameRef: ElementRef;
	@ViewChild('streetAddressField') streetAddressRef: ElementRef;
	@ViewChild('searchButton') searchButton: ElementRef;

	private _optionsShown: boolean = true;
	private _searchResults: Array<SearchResult>; // see the getter and setter for usage

	readonly NO_RECORDS_MESSAGES = {
		SEARCH: 'There are no lot matches for your entry.',
		SPECS: 'There are no available spec homes for this Community.',
		PENDING: 'There are no pending agreements for this Community.'
	};

	readonly SEARCH_STATUS = {
		NO_RESULTS: 'No search results',
		READY: 'Search',
		REQUEST_ERROR: 'Error Searching',
		SEARCHING: 'Searching...'
	};

	readonly SOLD_IN_HOMES: string = 'Sold in Home Selections';

	buildTypesOptions: Array<SelectItem> = [
		{ label: "Dirt", value: 'Dirt' },
		{ label: "Model", value: 'Model' },
		{ label: "Spec", value: 'Spec' }
	];

	environment = environment;
	filterSpecs: boolean = false;
	homesiteNumber: string = null;

	homesiteStatusOptions: Array<SelectItem> = [
		{ label: "Available", value: 'Available' },
		{ label: "Closed", value: 'Closed' },
		//{ label: "On Hold", value: 'On Hold' },
		{ label: "Pending Release", value: 'PendingRelease' },
		{ label: "Pending Sale", value: 'PendingSale' },
		{ label: "Sold", value: 'Sold' },
		{ label: "Unavailable", value: 'Unavailable' }
	];

	salesAgreementStatusOptions: Array<SelectItem> = [
		{ label: "Pending", value: 'Pending' },
		{ label: "Out For Signature", value: 'OutforSignature' },
		{ label: "Signed", value: 'Signed' },
		{ label: "Approved", value: 'Approved' },
		{ label: "Closed", value: 'Closed' },
		{ label: "Void", value: 'Void' },
		{ label: "Cancel", value: 'Cancel' }
	];

	homesiteTypeOptions: Array<SelectItem> = [
		{ label: "Base View", value: 'Base View' },
		{ label: "City View", value: 'City View' },
		{ label: "Golf Course", value: 'Golf Course' },
		{ label: "Nature/Preserve", value: 'Nature/Preserve' },
		{ label: "Open Space", value: 'Open Space' },
		{ label: "Other View", value: 'Other View' },
		{ label: "Water View", value: 'Water View' },
		{ label: "Waterfront", value: 'Waterfront' }
	];

	noRecordsMessage: string;
	resultsShown: boolean = false;
	salesAgreementNumber: string = null;
	search_button_label: string;
	searchError: string;
	selectedBuildTypes: Array<string> = [];
	selectedCommunity: number;
	selectedFinancialCommunity: number;
	selectedHomesiteStatus: Array<string | number> = [];
	selectedHomesiteTypes: Array<string> = [];
	streetAddress: string = null;
	selectedMarket: number;
	selectedSalesAgreementStatus: Array<string> = [];
	firstName: string;
	lastName: string;

	constructor(private cd: ChangeDetectorRef, private _searchService: SearchService) { }

	/*
	 *
	 * ACTIONS
	 * close, search and edit
	 *
	 */

	close()
	{
		this.onClose.emit();
	}

	search()
	{
		const filters: Array<IFilterItems> = [];

		this.searchError = null;
		this.searchResults = null;

		this.optionsShown = false;

		if (this.homesiteNumber)
		{
			filters.push({ items: [{ name: 'lotBlock', value: this.homesiteNumber }] });
		}

		if (this.streetAddress)
		{
			let addresses = [];

			addresses.push({ name: 'streetAddress1', value: this.streetAddress, andOr: 'or' });
			addresses.push({ name: 'streetAddress2', value: this.streetAddress, andOr: 'or' });
			addresses.push({ name: 'city', value: this.streetAddress, andOr: 'or' });
			addresses.push({ name: 'stateProvince', value: this.streetAddress });

			filters.push({ items: addresses });
		}

		if (this.selectedHomesiteStatus.length > 0)
		{
			filters.push(this.getFilterFromSelectItems('lotStatusDescription', this.selectedHomesiteStatus));
		}

		if (this.selectedBuildTypes.length > 0)
		{
			let buildTypesCopy = this.selectedBuildTypes.slice();

			if (this.selectedBuildTypes.find(b => b === 'Dirt'))
			{
				buildTypesCopy.push(null);
			};

			filters.push(this.getFilterFromSelectItems('lotBuildTypeDesc', buildTypesCopy));
		}

		const financialCommunityString = this.selectedFinancialCommunity && this.selectedFinancialCommunity.toString();
		const salesCommunityString = this.selectedCommunity && this.selectedCommunity.toString();

		this.search_button_label = this.SEARCH_STATUS.SEARCHING;

		this._searchService.searchHomeSites(filters, financialCommunityString, salesCommunityString).subscribe(results =>
		{
			let filteredLots = this.salesAgreementNumber || this.selectedSalesAgreementStatus.length > 0 || this.lastName || this.firstName ? [] : null;
			if (filteredLots && results && results.length > 0)
			{
				results.map(result =>
				{
					// Add filtering by first and last name
					// filter the results for a sales agreement id that contains the sales agreement # string if needed
					if (result.salesAgreements && result.salesAgreements.length > 0 && (this.salesAgreementNumber || this.selectedSalesAgreementStatus.length > 0))
					{
						let addLot = false;
						result.salesAgreements.map(agreement =>
						{
							if (agreement.salesAgreementNumber.indexOf(this.salesAgreementNumber) >= 0 || (this.selectedSalesAgreementStatus.length > 0 && this.selectedSalesAgreementStatus.indexOf(agreement.status) !== -1))
							{
								addLot = true;
							}
						});
						if (addLot) {
							filteredLots.push(result);
						}
					}
				});
			}

			if (filteredLots && (this.lastName || this.firstName)) {
				if (this.salesAgreementNumber || this.selectedSalesAgreementStatus.length > 0) {
					filteredLots = filteredLots.filter(lot => lot.buyers && lot.buyers.some(buyer => (this.firstName ? buyer.firstName.toLowerCase() === this.firstName.toLowerCase() : true) && (this.lastName ? buyer.lastName.toLowerCase() === this.lastName.toLowerCase() : true)));
				} else {
					filteredLots = results.filter(lot => lot.buyers && lot.buyers.some(buyer => (this.firstName ? buyer.firstName.toLowerCase().includes(this.firstName.toLowerCase()) : true) && (this.lastName ? buyer.lastName.toLowerCase().includes(this.lastName.toLowerCase()) : true)));
				}
			}
			this.searchResults = filteredLots ? filteredLots : results;
		}, error =>
			{
				this.searchResults = [];
				this.optionsShown = true;
				this.filterSpecs = false;
				this.searchError = (error && error.error && error.error.message) || 'Error retrieving search results';
			});
	}

	edit(field?: string)
	{
		if (!this.optionsShown)
		{
			this.optionsShown = true;
			this.filterSpecs = false;

			if (field && field.length > 0)
			{
				// Give it a moemnt to display before trying to set focus on it.
				setTimeout(t =>
				{
					this[field].nativeElement.focus();
				}, 100);
			}
		}
	}

	searchSpec()
	{
		this.clear();
		this.filterSpecs = true;
		this.selectedBuildTypes = ["Spec"];

		setTimeout(t =>
		{
			this.search();
		}, 200);
	}

	searchPending()
	{
		this.clear();
		this.selectedSalesAgreementStatus = ['Pending'];
		setTimeout(t =>
		{
			this.search();
		}, 200);
	}

	clear()
	{
		this.selectedBuildTypes = [];
		this.selectedHomesiteStatus = [];
		this.selectedHomesiteTypes = [];
		this.selectedSalesAgreementStatus = [];
		this.homesiteNumber = null;
		this.salesAgreementNumber = null;
		this.firstName = null;
		this.lastName = null;
		this.streetAddress = null;
	}

	/*
	 *
	 * EVENT HANDLERS
	 * market, sales community and financial community change handlers
	 *
	 */

	onMarketChange(market)
	{
		this.selectedMarket = market;
		this.onLocationChange();
	}

	onCommunityChange(community)
	{
		this.selectedCommunity = community;
		this.selectedFinancialCommunity = null;
		this.onLocationChange();
	}

	onFinancialCommunityChange(community)
	{
		this.selectedFinancialCommunity = community;
		this.onLocationChange();
	}

	onLocationChange()
	{
		this.searchResults = null;
		this.optionsShown = true;
	}

	/*
	 *
	 * HELPERS
	 * Misc functions to prevent repeating code
	 *
	 */

	getFilterFromSelectItems(name: string, selections: Array<string | number>, collection?: string): IFilterItems
	{
		const filterItems: IFilterItems = { items: [], collection: collection };

		selections.map((s, i, arr) =>
		{
			const item: IFilterItem = { name: name, value: s, equals: true };

			if (i < arr.length - 1)
			{
				item.andOr = 'or';
			}

			filterItems.items.push(item);
		});

		return filterItems;
    }

    getSalesAgreementLink(agreement: ISearchResultAgreement): string {
        let agreementUrl = '';

        if (agreement.salesAgreementNumber.toUpperCase().startsWith('HB'))
        {
            const length = agreement.salesAgreementNumber.length;
            const said = agreement.salesAgreementNumber.substring(length - 6);

            agreementUrl = `${environment.baseUrl['homeSelections']}SalesAgreement/SalesAgreement.aspx?Panel=Details&SAID=${said}`;
        }
        else
        {
            agreementUrl = `${environment.baseUrl[this.action.envBaseUrl]}point-of-sale/people/${agreement.id}`;
        }

        return agreementUrl;
	}

	isHslMigrated(jobCreatedBy: string): boolean
	{
		return jobCreatedBy && (jobCreatedBy.toUpperCase().startsWith('PHCORP') || jobCreatedBy.toUpperCase().startsWith('PHBSSYNC'));
	}

	/*
	 *
	 * GETTERS AND SETTERS
	 * get and set searchResults, get isValid (for submit button)
	 *
	 */

	get searchResults()
	{
		return this._searchResults;
	}

	set searchResults(results: Array<SearchResult>)
	{
		this._searchResults = results;

		if (results)
		{
			if (results.length > 0)
			{
				this.search_button_label = this.SEARCH_STATUS.READY;
			}
			else
			{
				this.search_button_label = this.SEARCH_STATUS.NO_RESULTS;
			}

			this.resultsShown = true;
		}
		else
		{
			this.search_button_label = this.SEARCH_STATUS.READY;
			this.resultsShown = false;
		}
		this.cd.detectChanges();
	}

	get optionsShown(): boolean
	{
		return this._optionsShown;
	}

	set optionsShown(b: boolean)
	{
		this._optionsShown = b;

		if (b)
		{
			this.search_button_label = this.SEARCH_STATUS.READY;
		}
	}

	get isValid()
	{
		return !!this.homesiteNumber ||
			!!this.streetAddress ||
			!!this.firstName ||
			!!this.lastName ||
			!!this.salesAgreementNumber ||
			this.selectedBuildTypes.length > 0 ||
			this.selectedHomesiteStatus.length > 0 ||
			this.selectedSalesAgreementStatus.length > 0 ;
	}

	onOptionPanelClosed() {
		setTimeout(() => {
			this.searchButton.nativeElement.focus();
		});
	}

	getLotBuildType(lot: SearchResult): string {
		return this.isHslMigrated(lot.jobCreatedBy)
			? `${lot.buildType} - HS`
			: lot.buildType;
	}

	showTooltip(event: any, tooltipText: string, tableComponent: PhdTableComponent): void
	{
		tableComponent.showTooltip(event, tooltipText);
	}

	hideTooltip(tableComponent: PhdTableComponent): void
	{
		tableComponent.hideTooltip();
	}

}
