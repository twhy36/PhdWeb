import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import
{
	take,
	withLatestFrom,
	map,
	distinctUntilChanged,
	filter,
	combineLatest
} from 'rxjs/operators';

import { Store, select } from '@ngrx/store';

import { UnsubscribeOnDestroy, FinancialCommunity, ChangeTypeEnum, Job } from 'phd-common';

import { LoadSpecs } from '../../../ngrx-store/job/actions';
import * as LotActions from '../../../ngrx-store/lot/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as OrgActions from '../../../ngrx-store/org/actions';
import * as PlanActions from '../../../ngrx-store/plan/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as OppActions from '../../../ngrx-store/opportunity/actions';

import * as fromJobs from '../../../ngrx-store/job/reducer';
import * as fromLot from '../../../ngrx-store/lot/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromOpportunity from '../../../ngrx-store/opportunity/reducer';

import { ReplaySubject } from 'rxjs/ReplaySubject';
import { SubNavItems, SpecSubNavItems } from '../../subNavItems';
import { NewHomeService } from '../../services/new-home.service';

@Component({
	selector: 'new-home',
	templateUrl: './new-home.component.html',
	styleUrls: ['./new-home.component.scss'],
	providers: [NewHomeService]
})
export class NewHomeComponent extends UnsubscribeOnDestroy implements OnInit
{
	subNavItems$: Observable<any>;
	selectedSubNavItem$: Observable<number>;
	marketId: number;
	communityId: number;
	params$ = new ReplaySubject<{ marketid: number; communityid: number }>(1);
	scenario: any;
	communities$: Observable<Array<FinancialCommunity>>;
	selectedFilterBy$ = new ReplaySubject<FinancialCommunity>(1);
	active: 'quick' | 'plan' | 'lot';
	showNav: boolean = true;

	@ViewChild('content') content: any;
	buildMode: 'buyer' | 'spec' | 'model' | 'preview' = 'buyer';
	selectedLot: number;
	selectedPlan: number;
	scenarioName: string = '';
	job: Job;
	isChangingOrder$: Observable<boolean>;

	constructor(
		private store: Store<fromRoot.State>,
		private router: Router,
		private activatedRoute: ActivatedRoute,
		private newHomeService: NewHomeService
	)
	{
		super();
	}

	ngOnInit()
	{
		this.activatedRoute.firstChild && this.activatedRoute.firstChild.paramMap
			.pipe(
				this.takeUntilDestroyed(),
				distinctUntilChanged(),
				combineLatest(this.store.pipe(select(state => state.opportunity))),
				withLatestFrom(this.store.pipe(select(fromOpportunity.opportunityId)))
			)
			.subscribe(([[params, oppState], oppId]) =>
			{
				if (oppState.loadingOpportunity)
				{
					return;
				}

				if (params && params.get('opportunityId'))
				{
					const opportunityId = params.get('opportunityId').toLowerCase();

					// see if opp has already been loaded
					if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opportunityId) && oppId !== opportunityId)
					{
						this.store.dispatch(new OppActions.LoadOpportunity(opportunityId));
					}
				}
			});

		this.showNav = !this.router.url.includes('name-scenario');

		this.router.events
			.pipe(
				this.takeUntilDestroyed(),
				filter(evt => evt instanceof NavigationEnd)
			)
			.subscribe((evt: NavigationEnd) =>
			{
				this.showNav = !evt.url.includes('name-scenario');
			});

		this.activatedRoute.data.pipe(this.takeUntilDestroyed()).subscribe(data =>
		{
			if (data['buildMode'])
			{
				this.store.dispatch(new ScenarioActions.SetBuildMode(data['buildMode']));
			}
		});

		this.subNavItems$ = this.store.pipe(
			select(state => state.nav.subNavItems)
		);

		this.selectedSubNavItem$ = this.store.pipe(
			select(state => state.nav.selectedItem)
		);

		this.communities$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.org),
			map(state =>
			{
				if (state.salesCommunity)
				{
					return state.salesCommunity.financialCommunities;
				}
			})
		);

		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select(fromScenario.buildMode),
				combineLatest(
					this.store.pipe(select(fromJobs.specJobs)),
					this.store.pipe(select(fromLot.lotsLoaded))
				)
			)
			.subscribe(([buildMode, specJobs, lotsLoaded]) =>
			{
				this.buildMode = buildMode;

				if (buildMode === 'buyer' && lotsLoaded && specJobs == null)
				{
					this.store.dispatch(new LoadSpecs());
				}
			});

		this.activatedRoute.paramMap
			.pipe(
				this.takeUntilDestroyed(),
				map(params =>
				{
					return {
						marketid: +params.get('marketid'),
						communityid: +params.get('communityid')
					};
				}),
				distinctUntilChanged()
			)
			.subscribe(params => this.params$.next(params));


		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select(state => state.nav.selectedItem)
			)
			.subscribe(selected =>
			{
				this.active = selected === 2 ? 'plan' : selected === 3 ? 'lot' : 'quick';
			});

		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select(state => state.scenario),
				combineLatest(
					this.store.pipe(select(fromJobs.jobState))
				),
				take(1)
			)
			.subscribe(([scenario, job]) =>
			{
				this.job = job;

				// set default nav items
				this.store.dispatch(new NavActions.SetSubNavItems(SubNavItems));

				if (scenario.scenario)
				{
					this.scenarioName = scenario.scenario.scenarioName;
					this.selectedPlan = scenario.scenario.planId;
					this.selectedLot = scenario.scenario.lotId;

					// check if plan has already been selected
					if (this.selectedPlan)
					{
						this.store.dispatch(new PlanActions.SelectPlan(scenario.scenario.planId, scenario.scenario.treeVersionId));
					}

					// check if lot has already been selected
					if (this.selectedLot)
					{
						this.store.dispatch(new LotActions.SelectLot(scenario.scenario.lotId));

						// check if lot handing has already been selected
						if (scenario.scenario.handing)
						{
							this.store.dispatch(new LotActions.SelectHanding(scenario.scenario.lotId, scenario.scenario.handing.handing));
						}
					}

					this.newHomeService.setSubNavItemsStatus(scenario.scenario, scenario.buildMode, this.job);
				}
			});

		this.params$
			.pipe(
				this.takeUntilDestroyed(),
				withLatestFrom(
					this.store.pipe(select(state => state.scenario))
				)
			)
			.subscribe(([params, scenario]) =>
			{
				if (this.buildMode === 'spec' || this.buildMode === 'model')
				{
					this.store.dispatch(new NavActions.SetSubNavItems(SpecSubNavItems));

					if (+params.communityid !== 0)
					{
						this.marketId = +params.marketid;
						this.communityId = +params.communityid;

						this.store.dispatch(new LotActions.LoadLots(this.communityId, (this.buildMode === 'model')));
						this.store.dispatch(new OrgActions.LoadSalesCommunity(this.communityId));
						this.store.dispatch(new PlanActions.LoadPlans(this.communityId));

						// select lots tab
						this.store.dispatch(new NavActions.SetSelectedSubNavItem(3));
					}
					else
					{
						this.selectedLot = scenario.scenario.lotId;
						this.selectedPlan = scenario.scenario.planId;

						this.newHomeService.setSubNavItemsStatus(scenario.scenario, scenario.buildMode, this.job);
					}
				}
			});

		this.isChangingOrder$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder),
			map(changeOrder =>
			{
				return changeOrder.changeInput &&
					changeOrder.changeInput.type === ChangeTypeEnum.PLAN
					? changeOrder.isChangingOrder
					: false;
			})
		);
	}

	onSubNavItemSelected(id: number)
	{
		this.store.dispatch(new NavActions.SetSelectedSubNavItem(id));
	}

	private setNavActions(subNavItem: number)
	{
		this.store.dispatch(new NavActions.SetSelectedSubNavItem(subNavItem));
	}

	navigateToPlans()
	{
		this.setNavActions(2);
		this.active = 'plan';

		this.router.navigate(['plan'], { relativeTo: this.activatedRoute });
	}

	navigateToLots()
	{
		this.setNavActions(3);
		this.active = 'lot';

		this.router.navigate(['lot'], { relativeTo: this.activatedRoute });
	}

	navigateToQuickMoveIn()
	{
		this.setNavActions(4);
		this.active = 'quick';

		this.router.navigate(['quick-move-in'], { relativeTo: this.activatedRoute });
	}

	setCommunityFilter(filterBy: FinancialCommunity)
	{
		this.selectedFilterBy$.next(filterBy);

		this.store.dispatch(new ScenarioActions.SetFinancialCommunityFilter(filterBy ? filterBy.id : 0));
	}

	
}
