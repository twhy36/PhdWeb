import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, of, forkJoin } from 'rxjs';
import { tap, switchMap, map, finalize } from 'rxjs/operators';

import { MessageService, SelectItem } from 'primeng/api';

import { environment } from '../../../../../environments/environment';
import { PhdTableComponent, ConfirmModalComponent, FeatureSwitchService, IFeatureSwitchOrgAssoc, Constants } from 'phd-common';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { OrganizationService } from '../../../core/services/organization.service';
import { ReleasesService } from '../../../core/services/releases.service';
import { HomeSiteService } from '../../../core/services/homesite.service';

import { HandingsPipe } from '../../../shared/pipes/handings.pipe';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { IHomeSiteReleaseDto } from '../../../shared/models/homesite-releases.model';
import { HomeSite, HomeSiteDtos } from '../../../shared/models/homesite.model';
import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ManageHomesitesSidePanelComponent } from '../manage-homesites-side-panel/manage-homesites-side-panel.component';

import * as moment from 'moment';
import { MonotonyRule, MonotonyRuleDtos } from '../../../shared/models/monotonyRule.model';
import { Settings } from '../../../shared/models/settings.model';
import { SettingsService } from '../../../core/services/settings.service';
import { clone, intersection, orderBy, union, unionBy } from 'lodash';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';

@Component({
	selector: 'manage-homesites',
	templateUrl: './manage-homesites.component.html',
	styleUrls: ['./manage-homesites.component.scss']
})
export class ManageHomesitesComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(ManageHomesitesSidePanelComponent)
	private sidePanel: ManageHomesitesSidePanelComponent;

	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	environment = environment;
	saving: boolean = false;
	sidePanelOpen: boolean = false;
	activeCommunities: Observable<Array<FinancialCommunityViewModel>>;
	selectedHomesite: HomeSite;
	selectedCommunity: FinancialCommunityViewModel = null;
	selectedCommunityWebsiteKey: string | null = null;
	lots: Array<HomeSite> = [];
	filteredLots: Array<HomeSite> = [];
	lotStatus: SelectItem[] = [
		{ label: 'Available', value: 'Available' },
		{ label: 'Closed', value: 'Closed' },
		{ label: 'Pending Release', value: 'Pending Release' },
		{ label: 'Pending Sale', value: 'Pending Sale' },
		{ label: 'Sold', value: 'Sold' },
		{ label: 'Unavailable', value: 'Unavailable' }
	];
	handingOptions: SelectItem[] = [
		{ label: 'Left', value: 'Left' },
		{ label: 'Right', value: 'Right' },
		{ label: 'N/A', value: 'NA' }
	];
	buildTypeOptions: SelectItem[] = [
		{ label: 'Spec', value: 'Spec' },
		{ label: 'Model', value: 'Model' },
		{ label: 'Dirt', value: 'Dirt' }
	];
	currentPage: number = 0;
	filteredCurrentPage: number = 0;
	allDataLoaded: boolean;
	allFilteredDataLoaded: boolean;
	isSearchingFromServer: boolean;
	isLoading: boolean = true;
	monotonyRules: Array<MonotonyRule>;
	lotCount: number = 0;
	canEdit: boolean = false;
	settings: Settings;
	releaseDTOs: IHomeSiteReleaseDto[];
	keyword: string = null;
	statusFilter: string[] = [];
	handingFilter: string[] = [];
	buildTypeFilter: string[] = [];
	selectedSearchFilter: string = 'Homesite';
	viewAdjacencies: Array<HomeSiteDtos.ILabel> = [];
	physicalLotTypes: Array<HomeSiteDtos.ILabel> = [];
	isColorSchemePlanRuleEnabled: boolean;
	featureSwitchOrgAssocs: IFeatureSwitchOrgAssoc[] = [];
	canChangeBuildType: boolean;

	constructor(
		private _orgService: OrganizationService,
		private _homeSiteService: HomeSiteService,
		private _releaseService: ReleasesService,
		private _modalService: NgbModal,
		private _msgService: MessageService,
		private _route: ActivatedRoute,
		private _settingsService: SettingsService,
		private _featureSwitchService: FeatureSwitchService) { super(); }

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return this.sidePanelOpen ? !(this.sidePanel.homesiteForm.dirty || this.sidePanel.monotonyForm.dirty) : true;
	}

	ngOnInit()
	{
		this.settings = this._settingsService.getSettings();

		this.activeCommunities = this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			tap(mkt =>
			{
				this.onSidePanelClose(false);

				this.lots = [];
			}),
			switchMap(mkt =>
			{
				return mkt ? this._orgService.getFinancialCommunities(mkt.id) : of([]);
			}),
			map(comms => comms.map(comm => new FinancialCommunityViewModel(comm)).filter(c => c.isActive)),
			switchMap(activeComms =>
			{
				return forkJoin([of(activeComms), this._featureSwitchService.getFeatureSwitchForCommunities('Phd Lite', activeComms.map(c => c.id))]);
			}),
			map(([activeComms, featureSwitchOrgAssocs]) =>
			{
				this.featureSwitchOrgAssocs = featureSwitchOrgAssocs;

				return activeComms;
			})
		);

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			map(comm => comm ? new FinancialCommunityViewModel(comm) : null)
		).subscribe(comm =>
		{
			if (comm == null)
			{
				this.selectedCommunity = null;
			}
			else if (!this.selectedCommunity || comm.id !== this.selectedCommunity.id)
			{
				this.selectedCommunity = comm;
				this.selectedCommunity.isPhdLiteEnabled = this.getIsPhdLiteEnabled(comm.id);

				this._homeSiteService.loadCommunityLots(comm.id);

				this.getWebsiteIntegrationKey(this.selectedCommunity.salesCommunityId);

				this.isColorSchemePlanRuleEnabled = comm.dto.isColorSchemePlanRuleEnabled;

				this.loadHomeSites();
				this.setReleaseData();
			}
		});

		this._orgService.canEdit(this._route.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);

		this._homeSiteService.getViewAdjacencies().subscribe(data =>
		{
			this.viewAdjacencies = data;
		});

		this._homeSiteService.getPhysicalLotTypes().subscribe(data =>
		{
			this.physicalLotTypes = data;
		});
	}

	getWebsiteIntegrationKey(salesCommunityId: number)
	{
		if (salesCommunityId === null)
		{
			this._orgService.getWebsiteCommunity(salesCommunityId).subscribe(data =>
			{
				this.selectedCommunityWebsiteKey = data?.webSiteIntegrationKey;
			});
		}
	}

	setReleaseData()
	{
		this._releaseService.trySetCommunity(this.selectedCommunity.dto).subscribe();
	}

	loadHomeSites()
	{
		this.allDataLoaded = false;
		this.isLoading = true;
		this.lots = [];

		const fc = this.selectedCommunity;

		if (!fc.lotsInited)
		{
			const commId = fc.id;

			const lotDtosObs = this._homeSiteService.getCommunityHomeSites(commId, this.settings.infiniteScrollPageSize, 0);
			const releasesDtosObs = this._releaseService.getHomeSiteReleases(commId);

			forkJoin([lotDtosObs, releasesDtosObs]).pipe(map(([lotDto, rDto]) =>
			{
				this.releaseDTOs = rDto;

				return lotDto.map(l => new HomeSiteViewModel(l, fc.dto, rDto.find(r => r.homeSitesAssociated.findIndex(x => x == l.id) != -1)));
			})).subscribe(l =>
			{
				const pipe = new HandingsPipe();

				l.forEach(n =>
				{
					(<any>n).handingDisplay = pipe.transform(n.handing);
					(<any>n).handingValues = (n.handing || []).map(h => h.handingId);
				});

				this.lots = l;
				this.lotCount = l.length;
				fc.lotsInited = true;
				this.isLoading = false;

				// Initial load, sets page count to 1. No filters added yet.
				this.currentPage = 1;
				this.allDataLoaded = l.length < this.settings.infiniteScrollPageSize;

				this.resetSearchBar();
			});
		}
		else
		{
			this.isLoading = false;
		}
	}

	resetSearchBar()
	{
		this.keyword = '';

		this.searchBar.clearFilter();
	}

	onPanelScroll()
	{
		this.isLoading = true;
		const top = this.settings.infiniteScrollPageSize;

		// Use filtered page numbering in case of active filters
		const skip = this.keyword || this.statusFilter.length || this.handingFilter.length || this.buildTypeFilter.length ? this.filteredCurrentPage * this.settings.infiniteScrollPageSize : this.currentPage * this.settings.infiniteScrollPageSize;

		this._homeSiteService.getCommunityHomeSites(this.selectedCommunity.id, top, skip, this.keyword, this.statusFilter, this.handingFilter, this.buildTypeFilter).subscribe(data =>
		{
			var result = data.map(l => new HomeSiteViewModel(l, this.selectedCommunity.dto, this.releaseDTOs.find(r => r.homeSitesAssociated.findIndex(x => x == l.id) != -1)));

			const pipe = new HandingsPipe();

			result.forEach(n =>
			{
				(<any>n).handingDisplay = pipe.transform(n.handing);
				(<any>n).handingValues = (n.handing || []).map(h => h.handingId);
			});

			// If filtered data is being scrolled, then combine filtered result
			if (this.keyword || this.statusFilter.length || this.handingFilter.length || this.buildTypeFilter.length)
			{
				this.filteredLots = unionBy(this.filteredLots, result);
				this.allFilteredDataLoaded = !result.length || result.length < this.settings.infiniteScrollPageSize;

				this.filteredCurrentPage++;
			}
			else
			{
				// Scrolling unfiltered data, combine initially loaded lots with new ones
				this.lots = unionBy(this.lots, result);
				this.filteredLots = this.lots;
				this.allDataLoaded = !result.length || result.length < this.settings.infiniteScrollPageSize;

				this.currentPage++;
			}

			this.lotCount = this.filteredLots.length;
			this.isLoading = false;
		});
	}

	keywordSearch(event: any)
	{
		this.searchBar.keyword = this.keyword = event['keyword'].trim();

		this.onFilterChange();
	}

	onBuildTypeChange(event: any)
	{
		this.buildTypeFilter = event.value;

		this.onFilterChange();
	}

	onStatusChange(event: any)
	{
		this.statusFilter = event.value;

		this.onFilterChange();
	}

	onHandingChange(event: any)
	{
		this.handingFilter = event.value;

		this.onFilterChange();
	}

	onFilterChange()
	{
		// Any filter change should re run the query and remove current filters
		this.resetFilteredData(); 

		this.filterHomesites();

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	filterHomesites()
	{
		const setFilteredLots = (filteredByLots: any[]) =>
		{
			// Intersect results if there are filtered results else just set the non empty results
			this.filteredLots = this.filteredLots.length > 0 && filteredByLots.length > 0 ? intersection(this.filteredLots, filteredByLots) : this.filteredLots.length > 0 ? this.filteredLots : filteredByLots;
		};
		this.isSearchingFromServer = false;

		if (this.keyword || this.statusFilter.length || this.handingFilter.length || this.buildTypeFilter.length)
		{
			if (this.allDataLoaded)
			{
				this.filteredLots = [];

				var keywordLots = [];
				var statusLots = [];
				var handingLots = [];
				var buildTypeLots = [];

				if (this.keyword)
				{
					const splittedKeywords = this.keyword.split(' ');

					splittedKeywords.forEach(keyword =>
					{
						if (keyword)
						{
							const filteredResults = this.lots.filter(lot => this.searchBar.wildcardMatch(lot.lotBlock, keyword));

							keywordLots = union(keywordLots, filteredResults);
						}
					});
				}

				this.filteredLots = keywordLots;

				this.statusFilter.forEach(status =>
				{
					const filteredResults = this.lots.filter(lot => lot.lotStatusDescription === status);

					statusLots = union(statusLots, filteredResults);
				});

				// Intersect results if there are filtered results from keywordSearch & statusSearch, else just set the non empty results
				setFilteredLots(statusLots);

				this.handingFilter.forEach(handing =>
				{
					const filteredResults = this.lots.filter(lot =>
					{
						var handingRec = (<any>lot).handingDisplay;

						return handingRec.includes(handing);
					});

					handingLots = union(handingLots, filteredResults);
				});

				// Intersect results if there are filtered results from keywordSearch + statusSearch & handingSearch, else just set the non empty results
				setFilteredLots(handingLots);

				this.buildTypeFilter.forEach(buildType =>
				{
					let filteredResults: HomeSite[] = [];

					if (buildType === 'Dirt')
					{
						filteredResults = this.lots.filter(lot => lot.lotBuildTypeDescription === buildType || lot.lotBuildTypeDescription === null)
					}
					else if (buildType === 'Model')
					{
						filteredResults = this.lots.filter(lot => lot.lotBuildTypeDescription === buildType || (lot.lotBuildTypeDescription === 'Spec' && lot.dto?.job?.jobTypeName === 'Model'));
					}
					else if (buildType === 'Spec')
					{
						filteredResults = this.lots.filter(lot => lot.lotBuildTypeDescription === buildType && lot.dto?.job?.jobTypeName !== 'Model');
					}

					buildTypeLots = union(buildTypeLots, filteredResults);
				});

				// Intersect results if there are filtered results from keywordSearch + buildTypeSearch & handingSearch, else just set the non empty results
				setFilteredLots(buildTypeLots);
			}
			else
			{
				// filter server to fetch data
				this.filterHomesitesFromServer(this.keyword, this.statusFilter, this.handingFilter, this.buildTypeFilter);
			}
		}
		else
		{
			// Set filtered lots to the list of lots, before the filters were set
			this.filteredLots = orderBy(this.lots, [lot => lot.lotBlock.toLowerCase()]);
		}

		this.lotCount = this.filteredLots.length;
	}

	private onSearchResultUpdated()
	{
		if (this.filteredLots.length === 0)
		{
			this._msgService.clear();
			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
		else
		{
			this.filteredLots = orderBy(this.filteredLots, [lot => lot.lotBlock.toLowerCase()]);
		}
	}

	filterHomesitesFromServer(keyword: string, statusFilter?: string[], handingFilter?: string[], buildTypeFilter?: string[])
	{
		this.isSearchingFromServer = true;

		keyword = this.searchBar.handleSingleQuotes(keyword);

		const top = this.settings.infiniteScrollPageSize;
		const skip = this.filteredCurrentPage * this.settings.infiniteScrollPageSize;

		this._homeSiteService.getCommunityHomeSites(this.selectedCommunity.id, top, skip, keyword, statusFilter, handingFilter, buildTypeFilter)
			.pipe(finalize(() =>
			{
				this.isSearchingFromServer = false;
				this.isLoading = false;
			}))
			.subscribe(data =>
			{
				if (data.length)
				{
					var result = data.map(l => new HomeSiteViewModel(l, this.selectedCommunity.dto, this.releaseDTOs.find(r => r.homeSitesAssociated.findIndex(x => x == l.id) != -1)));

					const pipe = new HandingsPipe();

					result.forEach(n =>
					{
						(<any>n).handingDisplay = pipe.transform(n.handing);
						(<any>n).handingValues = (n.handing || []).map(h => h.handingId);
					});

					this.filteredLots = result;
					this.lotCount = this.filteredLots.length;

					this.filteredCurrentPage++;

					this.allFilteredDataLoaded = !result.length || result.length < this.settings.infiniteScrollPageSize;
				}
				else
				{
					// No results found
					this.filteredLots = [];
				}
			});
	}

	clearFilter()
	{
		this.keyword = null;

		this.resetFilteredData();

		this.filterHomesites();
	}

	resetFilteredData()
	{
		this.filteredCurrentPage = 0;
		this.allFilteredDataLoaded = false;
	}

	onSidePanelClose(status: boolean)
	{
		this.sidePanelOpen = status;
	}

	onFilter(count: number)
	{
		this.lotCount = count;
	}

	onChangeCommunity(comm: FinancialCommunity)
	{
		this.onSidePanelClose(false);

		if (comm != null)
		{
			this._orgService.selectCommunity(comm);
		}
	}

	editHomesite(lot: HomeSite)
	{
		this._homeSiteService.getMonotonyRules(lot.dto.id).subscribe(data =>
		{
			this.monotonyRules = data;
			this.sidePanelOpen = false;
			this.selectedHomesite = lot;
			this.canChangeBuildType = this.getCanChangeBuildType();
			this.sidePanelOpen = true;
		});
	}

	releaseLot(homesite: HomeSite)
	{
		const ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};
		const confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = 'Release Homesite';
		confirm.componentInstance.body = 'Click Continue to release this lot.';
		confirm.componentInstance.defaultOption = Constants.CONTINUE;
		confirm.componentInstance.primaryButtonText = 'Release';

		confirm.result.then((result) =>
		{
			if (result === Constants.CONTINUE)
			{
				this.saving = true;

				const dto: IHomeSiteReleaseDto = {
					releaseDate: new Date().toDateString(),
					releaseDescription: 'Single release of ' + homesite.lotBlock,
					releaseRank: null,
					homeSitesAssociated: [homesite.commLbid]
				};

				dto.financialCommunityId = this.selectedCommunity.id;

				this._releaseService.saveRelease(dto).pipe(
					finalize(() => { this.saving = false; })
				).subscribe(newDto =>
				{
					this._releaseService.updateHomeSiteAndReleases(newDto);

					this.selectedCommunity.lotsInited = false;

					this.loadHomeSites();

					this._msgService.add({ severity: 'success', summary: 'Release', detail: `has been saved!` });
				},
				error =>
				{
					this._msgService.add({ severity: 'error', summary: 'Error', detail: 'Release failed to save.' });
				});
			}
		}, (reason) =>
		{
		});
	}

	/**
	 * Saves Homesite Details and Monotony Rules via an emitted event from the side panel.
	 * @param event The event containing the updated Homesite Details and Monotony Rules.
	 */
	saveHomesiteAndMonotonyRules(event: { homesite: HomeSiteDtos.IHomeSiteEventDto, rule: MonotonyRuleDtos.IMonotonyRuleEventDto; }): void
	{
		this.saving = true;

		const commLbId = this.selectedHomesite.commLbid;

		const saveHomesite$ = event.homesite ? this._homeSiteService.saveHomesite(commLbId, event.homesite.homesiteDto, event.homesite.lotBuildTypeUpdated) : of({} as HomeSiteDtos.ILotDto);
		const saveMonotonyRules$ = event.rule ? this._homeSiteService.saveMonotonyRules(event.rule.monotonyRules, event.rule.lotId) : of({} as Response);

		forkJoin([saveHomesite$, saveMonotonyRules$]).pipe(
			finalize(() =>
			{
				this.saving = false;
			})
		).subscribe(([lotDto, monotonyResp]) =>
		{
			if (event.homesite)
			{
				this.selectedHomesite.dto = lotDto;

				const pipe = new HandingsPipe();

				Object.assign(this.filteredLots.find(l => l.dto.id === lotDto.id),
					{
						handingDisplay: pipe.transform(lotDto.lotHandings),
						handingValues: (lotDto.lotHandings || []).map(h => h.handingId)
					});

				this._msgService.add({ severity: 'success', summary: 'Homesite', detail: `${this.selectedHomesite.lotBlock} Saved!` });
			}

			if (event.rule)
			{
				this._msgService.add({ severity: 'success', summary: 'Monotony Rules', detail: 'Monotony Rules Saved successfully' });
			}

			this.sidePanelOpen = false;
		},
		error =>
		{
			this._msgService.add({ severity: 'error', summary: 'Error', detail: error });
		});
	}

	formatAddress(address: HomeSiteDtos.IAddress)
	{
		let fa = address.streetAddress1;

		fa += address.streetAddress2 && address.streetAddress2.length > 0 ? ` ${address.streetAddress2}` : '';
		fa += ` ${address.city}, ${address.stateProvince} ${address.postalCode}`;

		return fa;
	}

	showTooltip(event: any, tooltipText: string, tableComponent: PhdTableComponent): void
	{
		tableComponent.showTooltip(event, tooltipText);
	}

	hideTooltip(tableComponent: PhdTableComponent): void
	{
		tableComponent.hideTooltip();
	}

	getAvailable(homesite: HomeSite)
	{
		return homesite.lotStatusDescription === 'Available';
	}

	toggleIsHiddenTho(lot: HomeSite)
	{
		// Wait to change the value of the original until the patch completes
		const lotDto = clone(lot.dto);

		lotDto.isHiddenInTho = !lotDto.isHiddenInTho;

		this._homeSiteService.saveHomesite(lot.commLbid, lotDto, false)
			.subscribe(dto =>
			{
				lot.dto = dto;

				const toggleResultText = !!dto.isHiddenInTho ? 'Hidden in THO!' : 'Available in THO!';

				this._msgService.add({ severity: 'success', summary: 'Homesite', detail: `${lot.lotBlock + ' ' + toggleResultText}` });
			},
			error =>
			{
				this._msgService.add({ severity: 'error', summary: 'Error', detail: error });
			});
	}

	getIsPhdLiteEnabled(financialCommunityId: number)
	{
		return !!this.featureSwitchOrgAssocs
			.find(r => financialCommunityId === r.org.edhFinancialCommunityId
				&& r.state === true
			);
	}

	getBuildTypeDisplay(lot: HomeSite): boolean
	{
		return(lot.lotStatusDescription.trim() === 'Available' || lot.lotStatusDescription.trim() === 'Unavailable')
			&& (lot.dto.job.jobTypeName.trim() === 'Spec' || lot.dto.job.jobTypeName.trim() === 'Model')
	}

	getBuildTypeUrl(lot: HomeSite)
	{
		const url = `${environment.designToolUrl}scenario-summary/${lot.dto.job.id}`;

		return url;
	}

	// #398751
	// Do not display the "Change Lot Build Type' drop down for:
	// - any model that was created in PHD or PHD Lite
	// - any model that was created in Home Selections and the community is a PHD Lite community
	//
	// Display the "Change Lot Build Type' drop down for:
	// - any model that was created in Home Selections and the community is not a PHD Lite community
	getCanChangeBuildType()
	{
		return (this.selectedHomesite.lotBuildTypeDescription === 'Model' || (this.selectedHomesite.dto.job && this.selectedHomesite.dto.job.jobTypeName === 'Model'))
			&& (this.selectedHomesite.dto.job && (this.selectedHomesite.dto.job.createdBy.toUpperCase().startsWith('PHCORP') || this.selectedHomesite.dto.job.createdBy.toUpperCase().startsWith('PHBSSYNC')))
			&& !this.selectedCommunity.isPhdLiteEnabled;
	}
}

class FinancialCommunityViewModel
{
	lotsInited: boolean = false;
	isPhdLiteEnabled: boolean = false;

	readonly dto: FinancialCommunity;

	constructor(dto: FinancialCommunity)
	{
		this.dto = dto;
	}

	get marketId()
	{
		return this.dto.marketId;
	}

	get id()
	{
		return this.dto.id;
	}

	get name()
	{
		return this.dto.name;
	}

	get key()
	{
		return this.dto.key;
	}

	get salesCommunityId()
	{
		return this.dto.salesCommunityId;
	}

	get isActive()
	{
		return (this.dto.salesStatusDescription === 'Active' || this.dto.salesStatusDescription === 'New');
	}

	static sorter(left: FinancialCommunityViewModel, right: FinancialCommunityViewModel): number
	{
		return left.name.localeCompare(right.name);
	}
}

const HomeSiteDateFormat = 'M/DD/YYYY';

class HomeSiteViewModel extends HomeSite
{
	community: FinancialCommunity;
	release: IHomeSiteReleaseDto;

	get availabilityDate()
	{
		return this.release?.releaseDate ? moment(this.release.releaseDate).utc().format(HomeSiteDateFormat) : '';
	}

	get lotJobType()
	{
		return (this.dto.lotBuildTypeDescription === 'Spec' && this.dto.job?.jobTypeName === 'Model') ? 'Model' : this.dto.lotBuildTypeDescription;
	}

	constructor(dto: HomeSiteDtos.ILotDto, community: FinancialCommunity, release: IHomeSiteReleaseDto)
	{
		super(dto);

		this.community = community;
		this.release = release;
	}
}
