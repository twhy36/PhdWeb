import { Component, Input, Output, EventEmitter, ViewEncapsulation, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { SelectItem } from 'primeng/api';

import { environment } from '../../../../../environments/environment';
import { LinkAction } from '../../models/action.model';
import { SearchResult, IFilterItem, IFilterItems, ISearchResultAgreement } from '../../models/search.model';
import { SearchService } from '../../../core/services/search.service';
import { IFinancialCommunity } from '../../models/community.model';
import { FeatureSwitchService, IFeatureSwitchOrgAssoc } from 'phd-common';

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
	searchActiveOnly: boolean = false;
	pendingLotBlocks: Array<string> = [];
	financialCommunities: IFinancialCommunity[];
	featureSwitchOrgAssoc: IFeatureSwitchOrgAssoc[];

	constructor(
		private cd: ChangeDetectorRef,
		private _searchService: SearchService,
		private _featureSwitchService: FeatureSwitchService) { }

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
		
		if (this.pendingLotBlocks.length > 0)
		{
			let lotBlocks = []
			this.pendingLotBlocks.forEach(lot => 
			{
				lotBlocks.push({ name: 'lotBlock', value: lot, andOr: 'or' });
			});
			lotBlocks[lotBlocks.length - 1].andOr = null;
			filters.push({ items: lotBlocks });
			this.pendingLotBlocks = [];
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

			// if only searching Models pull back specs as well so we can get the PHD Models that have been released and have a lotbuildtypedesc of spec
			if (this.selectedBuildTypes.find(type => type === 'Model') && !this.selectedBuildTypes.find(type => type === 'Spec'))
			{
				buildTypesCopy.push('Spec');
			}

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
							//if the salesAgreement number is truthy and is found or in the list of selected sales agreement statuses, the selected agreement status exists
							// flag the lot as able to be added to the filtered lots
							if ((this.salesAgreementNumber && agreement.salesAgreementNumber.indexOf(this.salesAgreementNumber) >= 0) || (this.selectedSalesAgreementStatus.length > 0 && this.selectedSalesAgreementStatus.indexOf(agreement.status) !== -1))
							{
								addLot = true;
							}
						});

						if (addLot)
						{
							filteredLots.push(result);
						}
					}
				});
			}

			if (filteredLots && (this.lastName || this.firstName))
			{
				if (this.salesAgreementNumber || this.selectedSalesAgreementStatus.length > 0)
				{
					filteredLots = filteredLots.filter(lot => lot.buyers && lot.buyers.some(buyer => (this.firstName ? buyer.firstName.toLowerCase() === this.firstName.toLowerCase() : true) && (this.lastName ? buyer.lastName.toLowerCase() === this.lastName.toLowerCase() : true)));
				}
				else
				{
					filteredLots = results.filter(lot => lot.buyers && lot.buyers.some(buyer => (this.firstName ? buyer.firstName.toLowerCase().includes(this.firstName.toLowerCase()) : true) && (this.lastName ? buyer.lastName.toLowerCase().includes(this.lastName.toLowerCase()) : true)));
				}
			}

			// if only searching for Models filter out specs that do not have a jobTypeName of Model.
			if (this.selectedBuildTypes && this.selectedBuildTypes.includes('Model') && !this.selectedBuildTypes.includes('Spec'))
			{
				filteredLots = filteredLots ? filteredLots : results;
				filteredLots = filteredLots.filter(lot => lot.jobTypeName === 'Model' || lot.buildType === 'Model')
			}
			else if (this.selectedBuildTypes && !this.selectedBuildTypes.includes('Model') && this.selectedBuildTypes.includes('Spec'))
			{
				filteredLots = filteredLots ? filteredLots : results;
				filteredLots = filteredLots.filter(lot => lot.jobTypeName === 'Spec' && lot.buildType === 'Spec')
			}

			if (this.searchActiveOnly)
			{
				filteredLots = results.filter(lot => !!lot.activeChangeOrder);
			}

			this.searchResults = filteredLots ? filteredLots : results;
			this.populateIsPhdLiteEnabled();
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
				if (field === 'searchActiveOnly')
				{
					this.searchActiveOnly = false;
				}
				else
				{
					// Give it a moemnt to display before trying to set focus on it.
					setTimeout(t =>
					{
						this[field].nativeElement.focus();
					}, 100);
				}
			}
		}
	}

	searchAvailableSpecs()
	{
		this.clear();
		this.filterSpecs = true;
		this.selectedBuildTypes = ['Spec'];
		this.selectedHomesiteStatus = ['Available'];

		setTimeout(t =>
		{
			this.search();
		}, 200);
	}

	searchPending()
	{
		this.clear();

		this.selectedSalesAgreementStatus = ['Pending', 'OutforSignature', 'Signed'];

		setTimeout(t =>
		{
			this.search();
		}, 200);
	}

	searchPendingCOs()
	{
		this.clear();
		this.searchActiveOnly = true;
		const financialCommunityString = this.selectedFinancialCommunity && this.selectedFinancialCommunity.toString();
		const salesCommunityString = this.selectedCommunity && this.selectedCommunity.toString();
		this._searchService.searchActiveCOHomesites(financialCommunityString, salesCommunityString).subscribe(lots => 
		{
			this.pendingLotBlocks = lots.map(lot => lot.lot.lotBlock);
			setTimeout(t =>
			{
				this.search();
			}, 200);
		});
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

	onFinancialCommunityChange(community: IFinancialCommunity)
	{
		this.selectedFinancialCommunity = community?.id;

		this.onLocationChange();
	}

	onLocationChange()
	{
		this.searchResults = null;
		this.optionsShown = true;
	}

	onFinancialCommunitiesForMarket(financialCommunitiesForMarket)
	{
		this._featureSwitchService.getFeatureSwitchForCommunities('Phd Lite', financialCommunitiesForMarket)
			.subscribe(featureSwitchOrgAssoc =>
			{
				this.featureSwitchOrgAssoc = featureSwitchOrgAssoc;
				this.populateIsPhdLiteEnabled();
			});
	}

	private populateIsPhdLiteEnabled()
	{
		this.searchResults?.forEach(sr =>
		{
			sr.isPhdLiteEnabled = this.featureSwitchOrgAssoc.find(r => sr.financialCommunityId === r.org.edhFinancialCommunityId) ? true : false;
		});
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

	getSalesAgreementLink(agreement: ISearchResultAgreement): string
	{
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

	getChangeOrderLink(lot: SearchResult): string
	{
		let agreementUrl = '';

		if (lot.activeChangeOrder.SalesAgreementId)
		{
			agreementUrl = `${environment.baseUrl[this.action.envBaseUrl]}change-orders/change-orders-summary/salesagreement/${lot.activeChangeOrder.SalesAgreementId}`;
		}
		else
		{
			agreementUrl = `${environment.baseUrl[this.action.envBaseUrl]}change-orders/change-orders-summary/spec/${lot.jobId}`;
		}

		return agreementUrl;
	}

	isHslMigrated(jobCreatedBy: string): boolean
	{
		return jobCreatedBy && (jobCreatedBy.toUpperCase().startsWith('PHCORP') || jobCreatedBy.toUpperCase().startsWith('PHBSSYNC'));
	}

	getLatestAgreementStatus(lot: SearchResult): string
	{
		if (lot.salesAgreements?.length)
		{
			return lot.salesAgreements[lot.salesAgreements.length - 1].status;
		}

		return null;
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
			this.selectedSalesAgreementStatus.length > 0;
	}

	onOptionPanelClosed()
	{
		setTimeout(() =>
		{
			this.searchButton.nativeElement.focus();
		});
	}

	getLotBuildType(lot: SearchResult): string
	{
		return this.isHslMigrated(lot.jobCreatedBy) && !lot.isPhdLiteEnabled
			? `${lot.buildType} - HS`
			: lot.buildTypeDisplayName;
	}

	getBuildTypeUrl(lot: SearchResult)
	{
		let url = `${environment.baseUrl.designTool}`;

		url += lot.buildTypeDisplayName === 'Spec' ? `spec` : `scenario-summary`;
		url += `/${lot.jobId}`;

		return url;
	}

	getBuildTypeDisplay(lot): boolean
	{
		const lotCheck = (lot.lotStatusDescription.trim() === 'Available' || lot.lotStatusDescription.trim() === 'Unavailable')
			&& (lot.buildType.trim() === 'Spec' || lot.buildType.trim() === 'Model')
			&& (this.getLatestAgreementStatus(lot) !== 'Signed');
		return lot.isPhdLiteEnabled ? lotCheck : !this.isHslMigrated(lot.jobCreatedBy) && lotCheck;
	}
}
