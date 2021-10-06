import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, of, forkJoin } from 'rxjs';
import { tap, switchMap, map, finalize } from 'rxjs/operators';

import { MessageService, SelectItem } from 'primeng/api';

import { PhdTableComponent, ConfirmModalComponent } from 'phd-common';
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
import { MonotonyRule } from '../../../shared/models/monotonyRule.model';
import { Settings } from '../../../shared/models/settings.model';
import { SettingsService } from '../../../core/services/settings.service';
import { clone, intersection, orderBy, union, unionBy } from "lodash";
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

	saving: boolean = false;
	sidePanelOpen: boolean = false;
	activeCommunities: Observable<Array<FinancialCommunityViewModel>>;
	selectedHomesite: HomeSite;
	selectedCommunity: FinancialCommunityViewModel = null;
	selectedCommunityWebsiteKey: string | null = null;
	lots: Array<HomeSite> = [];
	filteredLots: Array<HomeSite> = [];
	lotStatus: SelectItem[] = [{ label: 'Available', value: 'Available' }, { label: 'Sold', value: 'Sold' }, { label: 'Unavailable', value: 'Unavailable' }, { label: 'Closed', value: 'Closed' }, { label: 'Model', value: 'Model' }, { label: 'Pending Release', value: 'Pending Release' }, { label: 'Pending Sale', value: 'Pending Sale' }, { label: 'Spec', value: 'Spec' }, { label: 'Spec Unavailable', value: 'Spec Unavailable' }];
	handingOptions: SelectItem[] = [{ label: 'Left', value: 'Left' }, { label: 'Right', value: 'Right' }, { label: 'N/A', value: 'NA' }];
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
	selectedSearchFilter: string = 'Homesite';
	viewAdjacencies: Array<HomeSiteDtos.ILabel> = [];
	physicalLotTypes: Array<HomeSiteDtos.ILabel> = [];
	isColorSchemePlanRuleEnabled: boolean;

	constructor(
		private _orgService: OrganizationService,
		private _homeSiteService: HomeSiteService,
		private _releaseService: ReleasesService,
		private _modalService: NgbModal,
		private _msgService: MessageService,
		private _route: ActivatedRoute,
		private _settingsService: SettingsService) { super() }

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return this.sidePanelOpen ? !(this.sidePanel.homesiteForm.dirty || this.sidePanel.monotonyForm.dirty) : true
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
				if (mkt)
				{
					return this._orgService.getFinancialCommunities(mkt.id);
				}
				else
				{
					return of([]);
				}
			}),
			map(comms => comms.map(comm => new FinancialCommunityViewModel(comm)).filter(c => c.isActive))
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

				this.getWebsiteIntegrationKey(this.selectedCommunity.salesCommunityId);
				this.isColorSchemePlanRuleEnabled = comm.dto.isColorSchemePlanRuleEnabled;
				this.loadHomeSites();
				this.setReleaseData();
			}
		});

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);

		this._homeSiteService.getViewAdjacencies().subscribe(data => {
			this.viewAdjacencies = data;
		});

		this._homeSiteService.getPhysicalLotTypes().subscribe(data => {
			this.physicalLotTypes = data;
		});
	}

	getWebsiteIntegrationKey(salesCommunityId: number) 
	{
		if (salesCommunityId == null)
		{
			return;
		}
		this._orgService.getWebsiteCommunity(salesCommunityId).subscribe(data =>
			{
				this.selectedCommunityWebsiteKey = data?.webSiteIntegrationKey;
			}
		);
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

		let fc = this.selectedCommunity;

		if (!fc.lotsInited)
		{
			const commId = fc.id;

			const lotDtosObs = this._homeSiteService.getCommunityHomeSites(commId, this.settings.infiniteScrollPageSize, 0);
			const releasesDtosObs = this._releaseService.getHomeSiteReleases(commId);

			let obs = forkJoin(lotDtosObs, releasesDtosObs).pipe(map(([lotDto, rDto]) =>
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
		const skip = this.keyword || this.statusFilter.length || this.handingFilter.length ? this.filteredCurrentPage * this.settings.infiniteScrollPageSize : this.currentPage * this.settings.infiniteScrollPageSize;

		this._homeSiteService.getCommunityHomeSites(this.selectedCommunity.id, top, skip, this.keyword, this.statusFilter, this.handingFilter).subscribe(data =>
		{
			var result = data.map(l => new HomeSiteViewModel(l, this.selectedCommunity.dto, this.releaseDTOs.find(r => r.homeSitesAssociated.findIndex(x => x == l.id) != -1)));

			const pipe = new HandingsPipe();

			result.forEach(n =>
			{
				(<any>n).handingDisplay = pipe.transform(n.handing);
				(<any>n).handingValues = (n.handing || []).map(h => h.handingId);
			});

			// If filtered data is being scrolled, then combine filtered result
			if (this.keyword || this.statusFilter.length || this.handingFilter.length)
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

		})
	}

	resetFilteredData()
	{
		this.filteredCurrentPage = 0;
		this.allFilteredDataLoaded = false;
	}

	keywordSearch(event: any)
	{
		this.resetFilteredData(); // Any filter change should re run the query and remove current filters

		this.keyword = event['keyword'];
		this.filterHomesites();

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	onStatusChange(event: any)
	{
		this.resetFilteredData(); // Any filter change should re run the query and remove current filters

		this.statusFilter = event.value;

		this.filterHomesites();

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	onHandingChange(event: any)
	{
		this.resetFilteredData(); // Any filter change should re run the query and remove current filters

		this.handingFilter = event.value;

		this.filterHomesites();

		if (!this.isSearchingFromServer)
		{
			this.onSearchResultUpdated();
		}
	}

	filterHomesites()
	{
		this.isSearchingFromServer = false;

		if (this.keyword || this.statusFilter.length || this.handingFilter.length)
		{
			if (this.allDataLoaded)
			{
				this.filteredLots = [];

				var keywordLots = [];
				var statusLots = [];
				var handingLots = [];

				if (this.keyword)
				{
					let splittedKeywords = this.keyword.split(' ');

					splittedKeywords.forEach(keyword =>
					{
						if (keyword)
						{
							let filteredResults = this.lots.filter(lot => this.searchBar.wildcardMatch(lot.lotBlock, keyword));

							keywordLots = union(keywordLots, filteredResults);
						}
					});
				}

				this.filteredLots = keywordLots;

				this.statusFilter.forEach(status =>
				{
					if (status === 'Spec')
					{
						let filteredResults = this.lots.filter(lot => lot.lotBuildTypeDescription === status && (lot.dto && lot.dto.job && lot.dto.job.jobTypeName !== 'Model'));

						statusLots = union(statusLots, filteredResults);
					}
					else if (status === 'Model')
					{
						let filteredResults = this.lots.filter(lot => (lot.lotBuildTypeDescription === status || lot.lotBuildTypeDescription === 'Spec') && (lot.dto && lot.dto.job && lot.dto.job.jobTypeName === 'Model'));

						statusLots = union(statusLots, filteredResults);
					}
					else if (status === 'Spec Unavailable')
					{
						let filteredResults = this.lots.filter(lot => lot.lotBuildTypeDescription === 'Spec' && lot.lotStatusDescription === 'Unavailable' && (lot.dto && lot.dto.job && lot.dto.job.jobTypeName !== 'Model'));

						statusLots = union(statusLots, filteredResults);
					}
					else
					{
						let filteredResults = this.lots.filter(lot => lot.lotStatusDescription === status);

						statusLots = union(statusLots, filteredResults);
					}
				});

				// Intersect results if there are filtered results from keywordSearch & statusSearch, else just set the non empty results
				this.filteredLots = this.filteredLots.length > 0 && statusLots.length > 0 ? intersection(this.filteredLots, statusLots) : this.filteredLots.length > 0 ? this.filteredLots : statusLots;

				this.handingFilter.forEach(handing =>
				{
					let filteredResults = this.lots.filter(lot =>
					{
						var handingRec = (<any>lot).handingDisplay;

						return handingRec.includes(handing);
					});

					handingLots = union(handingLots, filteredResults);
				});

				// Intersect results if there are filtered results from keywordSearch + statusSearch & handingSearch, else just set the non empty results
				this.filteredLots = this.filteredLots.length > 0 && handingLots.length > 0 ? intersection(this.filteredLots, handingLots) : this.filteredLots.length > 0 ? this.filteredLots : handingLots;
			}
			else
			{
				// filter server to fetch data
				this.filterHomesitesFromServer(this.keyword, this.statusFilter, this.handingFilter);
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

	filterHomesitesFromServer(keyword: string, statusFilter?: string[], handingFilter?: string[])
	{
		this.isSearchingFromServer = true;

		keyword = this.searchBar.handleSingleQuotes(keyword);

		const top = this.settings.infiniteScrollPageSize;
		const skip = this.filteredCurrentPage * this.settings.infiniteScrollPageSize;

		this._homeSiteService.getCommunityHomeSites(this.selectedCommunity.id, top, skip, keyword, statusFilter, handingFilter).subscribe(data =>
		{
			this.isSearchingFromServer = false;

			if (data.length)
			{
				var result = data.map(l => new HomeSiteViewModel(l, this.selectedCommunity.dto, this.releaseDTOs.find(r => r.homeSitesAssociated.findIndex(x => x == l.id) != -1)));

				const pipe = new HandingsPipe();

				result.forEach(n => {
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

			this.isLoading = false;
		})
	}

	clearFilter()
	{
		this.keyword = null;
		this.allFilteredDataLoaded = false;
		this.filteredCurrentPage = 0;
		this.filterHomesites();
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
			this.sidePanelOpen = true;
		});
	}

	saveHomesite(homesite: { homesiteDto: HomeSiteDtos.ILotDto, lotBuildTypeUpdated: boolean })
	{
		this.saving = true;

		let commLbId = this.selectedHomesite.commLbid;

		this._homeSiteService.saveHomesite(commLbId, homesite.homesiteDto, homesite.lotBuildTypeUpdated)
			.pipe(finalize(() => { this.saving = false; }))
			.subscribe((dto) =>
			{
				this.selectedHomesite.dto = dto;
				const pipe = new HandingsPipe();

				Object.assign(this.filteredLots.find(l => l.dto.id === dto.id),
					{
						handingDisplay: pipe.transform(dto.lotHandings),
						handingValues: (dto.lotHandings || []).map(h => h.handingId)
					});

				this._msgService.add({ severity: 'success', summary: 'Homesite', detail: `${this.selectedHomesite.lotBlock} Saved!` });

				this.sidePanelOpen = false;
			},
				error =>
				{
					this._msgService.add({ severity: 'error', summary: 'Error', detail: error });
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
		confirm.componentInstance.defaultOption = 'Continue';
		confirm.componentInstance.primaryButtonText = 'Release';

		confirm.result.then((result) =>
		{
			if (result === 'Continue')
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
				)
					.subscribe(newDto =>
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

	saveMonotonyRules(rule: {lotId: number, monotonyRules: Array<MonotonyRule>})
	{
		this.saving = true;

		this._homeSiteService.saveMonotonyRules(rule.monotonyRules, rule.lotId).pipe(finalize(() => { this.saving = false; })).subscribe(response =>
		{
			this._msgService.add({ severity: 'success', summary: 'Monotony Rules', detail: 'Monotony Rules Saved successfully' });
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
		let lotDto = clone(lot.dto);
		lotDto.isHiddenInTho = !lotDto.isHiddenInTho;

		this._homeSiteService.saveHomesite(lot.commLbid, lotDto, false)
			.subscribe(dto =>
			{
				lot.dto = dto;
				if (dto.isHiddenInTho === true)
				{
					this._msgService.add({ severity: 'success', summary: 'Homesite', detail: `${lot.lotBlock} Hidden in THO!` });
				}
				else
				{
					this._msgService.add({ severity: 'success', summary: 'Homesite', detail: `${lot.lotBlock} Available in THO!` });
				}
				
			},
			error =>
			{
				this._msgService.add({ severity: 'error', summary: 'Error', detail: error });
			})
	}
}

class FinancialCommunityViewModel
{
	lotsInited: boolean = false;

	readonly dto: FinancialCommunity;

	constructor(dto: FinancialCommunity)
	{
		this.dto = dto;
	}

	get marketId() { return this.dto.marketId; }
	get id() { return this.dto.id; }
	get name() { return this.dto.name; }
	get key() { return this.dto.key; }
	get salesCommunityId() { return this.dto.salesCommunityId; }
	get isActive() { return (this.dto.salesStatusDescription === "Active" || this.dto.salesStatusDescription === "New"); }

	static sorter(left: FinancialCommunityViewModel, right: FinancialCommunityViewModel): number
	{
		return left.name.localeCompare(right.name);
	}
}

const HomeSiteDateFormat = "M/DD/YYYY";
class HomeSiteViewModel extends HomeSite
{
	community: FinancialCommunity;
	release: IHomeSiteReleaseDto;
	lotJobType: string;

	get availabilityDate()
	{
		return this.release && this.release.releaseDate ? moment(this.release.releaseDate).utc().format(HomeSiteDateFormat) : "";
	}

	constructor(dto: HomeSiteDtos.ILotDto, community: FinancialCommunity, release: IHomeSiteReleaseDto)
	{
		super(dto);
		this.lotJobType = (dto.lotBuildTypeDescription === 'Spec' && (dto.job && dto.job.jobTypeName === 'Model')) ? 'Model' : dto.lotBuildTypeDescription;
		this.community = community;
		this.release = release;
	}
}
