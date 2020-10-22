import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute, } from '@angular/router';

import { Observable, Subscription, forkJoin, of } from 'rxjs';
import { map, switchMap, tap, finalize } from 'rxjs/operators';

import { MessageService } from 'primeng/api';

import { OrganizationService } from '../../../core/services/organization.service';
import { PlanService } from '../../../core/services/plan.service';
import { ReleasesService } from '../../../core/services/releases.service';
import { HomeSiteService } from '../../../core/services/homesite.service';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { FinancialCommunityViewModel, HomeSiteViewModel, PlanViewModel, ITag } from '../../../shared/models/plan-assignment.model';
import { PlanAssignmentSidePanelComponent } from '../plan-assignment-side-panel/plan-assignment-side-panel.component';

@Component({
	selector: 'plan-assignment',
	templateUrl: './plan-assignment.component.html',
	styleUrls: ['./plan-assignment.component.scss']
})
export class PlanAssignmentComponent extends UnsubscribeOnDestroy implements OnInit 
{
	@ViewChild(PlanAssignmentSidePanelComponent)
	private sidePanel: PlanAssignmentSidePanelComponent;

	private _subscription: Subscription[] = [];
	sidePanelOpen: boolean = false;
	activeCommunities: Observable<Array<FinancialCommunityViewModel>>;

	selectedCommunity: FinancialCommunityViewModel;
	selectedPlan: PlanViewModel;
	selectedLot: HomeSiteViewModel;
	saving: boolean = false;
	canEdit: boolean = false;

	constructor(
		private _activatedRoute: ActivatedRoute,
		private _orgService: OrganizationService,
		private _planService: PlanService,
		private _homeSiteService: HomeSiteService,
		private _releaseService: ReleasesService,
		private _msgService: MessageService,
		private _route: ActivatedRoute)
	{ super(); }

	loading: boolean = false;

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return this.sidePanelOpen ? !this.sidePanel.planAssignmentForm.dirty : true
	}

	ngOnDestroy()
	{
		if (this._subscription.length > 0)
		{
			this._subscription.forEach(s => s.unsubscribe());
		}
	}

	ngOnInit()
	{
		this.activeCommunities = this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			tap(mkt => this.onSidePanelClose(false)),
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
			this.takeUntilDestroyed()
		).subscribe(comm =>
		{
			if (comm != null)
			{
				if (!this.selectedCommunity || this.selectedCommunity.id != comm.id)
				{
					this.selectedCommunity = new FinancialCommunityViewModel(comm);
					this.loadPlansAndHomeSites();
				}
			} else
			{
				this.selectedCommunity = null;
			}
		});

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	onChangeCommunity(comm: FinancialCommunity)
	{
		this.onSidePanelClose(false);

		if (comm != null)
		{
			this._orgService.selectCommunity(comm);
		}
	}

	onSidePanelClose(status: boolean)
	{
		this.sidePanelOpen = status;
	}

	private loadPlansAndHomeSites()
	{
		this.loading = true;

		let fc = this.selectedCommunity;

		if (!fc.inited)
		{
			const commId = fc.id;

			// get promise of homesites for the financial community
			const lotDtosObs = this._homeSiteService.getCommunityHomeSites(commId);

			// get promise plans for the financial community
			let plansObs = this._planService.getCommunityPlans(commId);

			let obs = forkJoin(lotDtosObs, plansObs).pipe(map(([lotDto, plansDto]) =>
			{

				fc.lots = lotDto.filter(l => l.lotStatusDescription !== "Sold" && l.lotStatusDescription !== "Closed").map(l => new HomeSiteViewModel(l, fc.dto)).sort(HomeSiteViewModel.sorter);
				fc.plans = plansDto.map(p => new PlanViewModel(p, fc)).sort(PlanViewModel.sorter);

				// add lots to plans
				fc.plans.forEach(p =>
				{
					p.lots = fc.lots.filter(l => l.plans.some(lp => lp === p.id))
				});
			}));

			obs.subscribe(() =>
			{
				fc.inited = true;

				this.loading = false;
			});
		}
		else
		{
			this.loading = false;
		}
	}

	editPlan(plan: PlanViewModel)
	{
		this.sidePanelOpen = false;

		this.selectedPlan = plan;

		this.sidePanelOpen = true;
	}

	assignPlanLot(selectedItems: Array<ITag>)
	{
		this.saving = true;

		// get selected lots
		var lots = selectedItems.map(i =>
		{
			return this.selectedCommunity.lots.find(l => l.commLbid === i.id);
		}).sort(HomeSiteViewModel.sorter);

		// assign lots to plan
		this.selectedPlan.lots = lots;

		// call api to update Plan Lot Assignment for the selected plan
		let p = this.selectedPlan;

		let lotBlocks = p.lots.map(l => l.commLbid);

		this._homeSiteService.savePlanLotAssignments(p.id, lotBlocks)
			.pipe(finalize(() => { this.saving = false; }))
			.subscribe(() =>
			{
				this._msgService.add({ severity: 'success', summary: 'Lot Assignments', detail: `for Plan ${p.salesName} Saved!` });

				this.sidePanelOpen = false;
			},
			error =>
			{
				this._msgService.add({ severity: 'error', summary: 'Error', detail: error });

				console.log(error);
			});
	}

	toggleHomeSites(plan: PlanViewModel)
	{
		plan.showHomeSites = !plan.showHomeSites;
	}
}//End
