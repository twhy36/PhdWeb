import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, of } from 'rxjs';
import { tap, switchMap, map, finalize } from 'rxjs/operators';

import { MessageService } from 'primeng/api';

import { PhdTableComponent } from 'phd-common/components/table/phd-table.component';

import { OrganizationService } from '../../../core/services/organization.service';
import { ReleasesService } from '../../../core/services/releases.service';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { HomeSiteRelease, IHomeSiteReleaseDto, IHomeSiteReleaseSidePanelItem } from '../../../shared/models/homesite-releases.model';

import { ConfirmationService } from 'primeng/api';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { ReleasesSidePanelComponent } from '../releases-side-panel/releases-side-panel.component';

@Component({
	selector: 'releases',
	templateUrl: './releases.component.html',
	styleUrls: ['./releases.component.scss']
})
export class ReleasesComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(ReleasesSidePanelComponent)
	private sidePanel: ReleasesSidePanelComponent;

	sidePanelOpen: boolean = false;
	saving: boolean = false;
	activeCommunities: Observable<Array<FinancialCommunityViewModel>>;
	selectedCommunity: FinancialCommunityViewModel = null;
	canEdit: boolean = false;
	workingReleaseIndex: number;

	get releases(): Array<HomeSiteRelease>
	{
		return this._releaseService.releases;
	}

	private _selectedRelease: IHomeSiteReleaseSidePanelItem;
	get selectedRelease(): IHomeSiteReleaseSidePanelItem
	{
		return this._selectedRelease;
	}

	set selectedRelease(item: IHomeSiteReleaseSidePanelItem)
	{
		this._selectedRelease = item;
	}

	loading: boolean = false;

	constructor(
		private _confirmationService: ConfirmationService,
		private _route: ActivatedRoute,
		private _orgService: OrganizationService,
		private _releaseService: ReleasesService,
		private _msgService: MessageService)
	{
		super();
	}

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return this.sidePanelOpen ? !this.sidePanel.releaseForm.dirty : true
	}

	ngOnInit()
	{
		this.activeCommunities = this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			tap(mkt =>
			{
				this.onSidePanelClose(false);
				this._releaseService.releases = [];
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
				this.setData();
			}
		});

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	setData()
	{
		this.loading = true;

		const obs = this._releaseService.trySetCommunity(this.selectedCommunity.dto);

		obs.subscribe(() =>
		{
			this.loading = false;
		});
	}

	onChangeCommunity(comm: FinancialCommunity)
	{
		this.onSidePanelClose(false);

		if (comm != null)
		{
			this._orgService.selectCommunity(comm);
		}
	}

	createRelease()
	{
		this.editRelease();
	}

	saveRelease(dto: IHomeSiteReleaseDto)
	{
		this.saving = true;

		dto.financialCommunityId = this.selectedCommunity.dto.id;

		this._releaseService.saveRelease(dto).pipe(
			finalize(() => { this.saving = false; })
		)
			.subscribe(newDto =>
			{
				//Updates any associated homesites
				this._releaseService.updateHomeSiteAndReleases(newDto);
				this._msgService.add({ severity: 'success', summary: 'Release', detail: `has been saved!` });
				this.onSidePanelClose(false);
			},
			error =>
			{
					this._msgService.add({ severity: 'error', summary: 'Error', detail: 'Release failed to save.' });
					console.log(error);
				});
	}

	editRelease(release?: HomeSiteRelease)
	{
		this.sidePanelOpen = false;

		// filter lots that have already been added to a release.
		let lots = this._releaseService.homeSites.filter(l => !this.releases.some(x => (release == null || release.releaseId != x.releaseId) && x.associatedHomeSites.indexOf(l.commLbid) > -1));

		this.selectedRelease = {
			homeSiteRelease: release,
			homeSites: lots
		} as IHomeSiteReleaseSidePanelItem;

		this.sidePanelOpen = true;
	}

	confirmDelete(release: HomeSiteRelease, index: number)
	{
		this._confirmationService.confirm({
			message: 'Do you want to delete this record?',
			accept: () =>
			{
				this.deleteRelease(release, index);
			}
		});
	}

	deleteRelease(release: HomeSiteRelease, index: number)
	{
		this.saving = true;
		this.workingReleaseIndex = index;
		let dto = release.dto;
		let hasRelease = this._releaseService.releases.find(r => r.releaseId === dto.releaseId);

		if (hasRelease != null)
		{

			this._releaseService.deleteRelease(dto.releaseId)
				.pipe(finalize(() => { this.saving = false; this.workingReleaseIndex = null; }))
				.subscribe(() =>
				{
					//updates any associated homesites.
					this._releaseService.updateAssociatedHomesites(dto);
					this._msgService.add({ severity: 'success', summary: 'Release', detail: `has been deleted!` });
				},
				error =>
				{
						this._msgService.add({ severity: 'error', summary: 'Error', detail: error });
						console.log(error);
					});
		}
		else
		{
			this.saving = false;
			this._msgService.add({ severity: 'error', summary: 'Release', detail: `${dto.releaseId} not found!` });
		}
	}

	onSidePanelClose(status: boolean)
	{
		this.sidePanelOpen = status;
	}

	editDateCheck(release: HomeSiteRelease): boolean
	{
		return release.date.isAfter(release.minDate);
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
