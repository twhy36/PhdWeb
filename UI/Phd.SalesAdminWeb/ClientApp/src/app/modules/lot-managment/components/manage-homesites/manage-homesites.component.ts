import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { tap, switchMap, map, finalize } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';

import { MessageService, SelectItem } from 'primeng/api';

import { OrganizationService } from '../../../core/services/organization.service';
import { ReleasesService } from '../../../core/services/releases.service';
import { HomeSiteService } from '../../../core/services/homesite.service';

import { HandingsPipe } from '../../../shared/pipes/handings.pipe';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { IHomeSiteReleaseDto } from '../../../shared/models/homesite-releases.model';
import { HomeSite, HomeSiteDtos } from '../../../shared/models/homesite.model';
import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ManageHomesitesSidePanelComponent } from '../manage-homesites-side-panel/manage-homesites-side-panel.component';

import * as moment from "moment";
import { MonotonyRule } from '../../../shared/models/monotonyRule.model';
import { PhdTableComponent } from 'phd-common/components/table/phd-table.component';

@Component({
	selector: 'manage-homesites',
	templateUrl: './manage-homesites.component.html',
	styleUrls: ['./manage-homesites.component.scss']
})
export class ManageHomesitesComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(ManageHomesitesSidePanelComponent)
	private sidePanel: ManageHomesitesSidePanelComponent;

	saving: boolean = false;
	sidePanelOpen: boolean = false;
	activeCommunities: Observable<Array<FinancialCommunityViewModel>>;
	selectedHomesite: HomeSite;
	selectedCommunity: FinancialCommunityViewModel = null;
	lots: Array<HomeSite> = [];
	lotStatus: SelectItem[] = [{ label: 'Available', value: 'Available' }, { label: 'Sold', value: 'Sold' }, { label: 'Unavailable', value: 'Unavailable' }, { label: 'Closed', value: 'Closed' }, { label: 'Model', value: 'Model' }, { label: 'Pending Release', value: 'Pending Release' }, { label: 'Pending Sale', value: 'Pending Sale' }, { label: 'Spec', value: 'Spec' }, { label: 'Spec Unavailable', value: 'Spec Unavailable' }];
	handingOptions: SelectItem[] = [{ label: 'Left', value: 1 }, { label: 'Right', value: 2 }, { label: 'N/A', value: 3 }];
	isLoading: boolean = true;
	monotonyRules: Array<MonotonyRule>;
	lotCount: number = 0;
	canEdit: boolean = false;

	constructor(
		private _orgService: OrganizationService,
		private _homeSiteService: HomeSiteService,
		private _releaseService: ReleasesService,
		private _msgService: MessageService,
		private _route: ActivatedRoute) { super() }

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return this.sidePanelOpen ? !(this.sidePanel.homesiteForm.dirty || this.sidePanel.monotonyForm.dirty) : true
	}

	ngOnInit()
	{
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
				this.loadHomeSites();
			}
		});

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	loadHomeSites()
	{
		this.isLoading = true;
		this.lots = [];

		let fc = this.selectedCommunity;

		if (!fc.lotsInited)
		{
			const commId = fc.id;

			const lotDtosObs = this._homeSiteService.getCommunityHomeSites(commId);
			const releasesDtosObs = this._releaseService.getHomeSiteReleases(commId);

			let obs = forkJoin(lotDtosObs, releasesDtosObs).pipe(map(([lotDto, rDto]) =>
			{
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
			});
		}
		else
		{
			this.isLoading = false;
		}
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

				Object.assign(this.lots.find(l => l.dto.id === dto.id),
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
				console.log(error);
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

	get availabilityDate()
	{
		return this.release && this.release.releaseDate ? moment(this.release.releaseDate).utc().format(HomeSiteDateFormat) : "";
	}

	constructor(dto: HomeSiteDtos.ILotDto, community: FinancialCommunity, release: IHomeSiteReleaseDto)
	{
		super(dto);

		this.community = community;
		this.release = release;
	}
}
