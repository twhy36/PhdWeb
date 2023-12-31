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

import { ChangeTypeEnum } from '../../../shared/models/job-change-order.model';
import { PointStatus } from '../../../shared/models/point.model';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';

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

import { FinancialCommunity } from '../../../shared/models/community.model';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { SubNavItems, SpecSubNavItems } from '../../subNavItems';

@Component({
	selector: 'new-home',
	templateUrl: './new-home.component.html',
	styleUrls: ['./new-home.component.scss']
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
	isChangingOrder$: Observable<boolean>;

	constructor(
		private store: Store<fromRoot.State>,
		private router: Router,
		private activatedRoute: ActivatedRoute
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
				take(1)
			)
			.subscribe(scenarioState =>
			{
				if (scenarioState.scenario)
				{
					// check if scenario name has already been entered
					if (this.buildMode === 'buyer' && scenarioState.scenario.scenarioName.length)
					{
						SubNavItems[0].status = PointStatus.COMPLETED;
						SubNavItems[1].status = PointStatus.REQUIRED;
						SubNavItems[2].status = PointStatus.REQUIRED;
						SubNavItems[3].status = PointStatus.REQUIRED;
					}

					// check if plan has already been selected
					if (scenarioState.scenario.planId)
					{
						this.store.dispatch(new PlanActions.SelectPlan(scenarioState.scenario.planId, scenarioState.scenario.treeVersionId));

						SubNavItems[2].status = PointStatus.COMPLETED;
					}

					// check if lot has already been selected
					if (scenarioState.scenario.lotId)
					{
						this.store.dispatch(new LotActions.SelectLot(scenarioState.scenario.lotId));

						// check if lot handing has already been selected
						if (scenarioState.scenario.handing)
						{
							this.store.dispatch(new LotActions.SelectHanding(scenarioState.scenario.lotId, scenarioState.scenario.handing.handing));
						}

						SubNavItems[3].status = PointStatus.COMPLETED;
					}
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

						this.store.dispatch(new LotActions.LoadLots(this.communityId));
						this.store.dispatch(new OrgActions.LoadSalesCommunity(this.communityId));
						this.store.dispatch(new PlanActions.LoadPlans(this.communityId));
						this.store.dispatch(new NavActions.SetSelectedSubNavItem(3));
					}
					else
					{
						this.selectedLot = scenario.scenario.lotId;
						this.selectedPlan = scenario.scenario.planId;

						if (this.selectedLot)
						{
							this.store.dispatch(new NavActions.SetSubNavItemStatus(3, PointStatus.COMPLETED));
						}
						else
						{
							this.store.dispatch(new NavActions.SetSubNavItemStatus(3, PointStatus.REQUIRED));
						}

						if (this.selectedPlan)
						{
							this.store.dispatch(new NavActions.SetSubNavItemStatus(2, PointStatus.COMPLETED));
						}
						else
						{
							this.store.dispatch(new NavActions.SetSubNavItemStatus(2, PointStatus.REQUIRED));
						}
					}
				}
				else
				{
					this.store.dispatch(new NavActions.SetSubNavItems(SubNavItems));
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

	setBuildModeToModel()
	{
		this.store.dispatch(new ScenarioActions.SetBuildMode('model'));
		this.store.dispatch(new NavActions.SetSubNavItems(SpecSubNavItems));
		this.store.dispatch(new NavActions.SetSelectedSubNavItem(3));
	}

	setBuildModeToSpec()
	{
		this.store.dispatch(new ScenarioActions.SetBuildMode('spec'));
		this.store.dispatch(new NavActions.SetSubNavItems(SpecSubNavItems));
		this.store.dispatch(new NavActions.SetSelectedSubNavItem(3));
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
