import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { distinctUntilChanged, switchMap } from 'rxjs/operators';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as CommonActions from '../../../ngrx-store/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { UnsubscribeOnDestroy, SalesAgreement, SubGroup, FloorPlanImage, TreeVersion, ImagePlugins } from 'phd-common';
import { BrandService } from '../../../core/services/brand.service';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { ErrorFrom } from '../../../ngrx-store/error.action';
import { ScrollTop } from '../../../shared/classes/utils.class';

@Component({
	selector: 'home',
	templateUrl: 'home.component.html',
	styleUrls: ['home.component.scss']
})
export class HomeComponent extends UnsubscribeOnDestroy implements OnInit
{
	communityName: string = '';
	planName: string = '';
	planImageUrl: string = '';
	floorPlanImages: FloorPlanImage[] = [];
	salesAgreement: SalesAgreement;
	isPreview: boolean;
	isPresale: boolean;
	selectedFavoritesId: number;
	hasFloorPlanImages: boolean = false;
	marketingPlanId$ = new BehaviorSubject<number>(0);
	isFloorplanFlipped: boolean;
	floorplanSG: SubGroup;
	noVisibleFP: boolean = false;
	selectedFloor;
	filteredTree: TreeVersion;

	defaultImage: string = this.brandService.getBrandImage('logo');
	imagePlugins: ImagePlugins[] = [ImagePlugins.LazyLoad];

	constructor(
		private activatedRoute: ActivatedRoute,
		private store: Store<fromRoot.State>,
		private router: Router,
		private brandService: BrandService)
	{
		super();
	}

	ngOnInit()
	{
		ScrollTop();

		combineLatest([
			this.activatedRoute.paramMap,
			this.store.pipe(select(state => state.salesAgreement)),
		]).pipe(
			withLatestFrom(this.activatedRoute.data,
				this.store.pipe(select(state => state.scenario)),
				this.store.pipe(select(state => state.plan))),
			switchMap(([[params, salesAgreementState], routeData, scenarioState, planState]) =>
			{
				if (salesAgreementState.salesAgreementLoading || salesAgreementState.loadError)
				{
					return new Observable<never>();
				}
				this.isFloorplanFlipped = salesAgreementState?.isFloorplanFlipped;
				// flags for loading favorites or UI display
				// reading existing store buildmode or url buildmode
				this.isPreview = scenarioState.buildMode === BuildMode.Preview || routeData['buildMode'] === BuildMode.Preview;
				this.isPresale = scenarioState.buildMode === BuildMode.Presale || routeData['buildMode'] === BuildMode.Presale;

				// Load Store data on first home load if not loaded based on URL route
				const urlBuildMode = routeData['buildMode'];
				switch (urlBuildMode)
				{
					case BuildMode.Preview:
					//set current buildmode to preview for Preview URL path
						this.isPreview = true;

						const treeVersionId = +params.get('treeVersionId');

						if (!scenarioState.tree ||
								scenarioState.tree.treeVersion.id !== treeVersionId
								|| scenarioState.buildMode != BuildMode.Preview)
						{
							this.store.dispatch(new ScenarioActions.LoadPreview(treeVersionId));
							return new Observable<never>();
						}
						break;
					case BuildMode.Presale:
					//set current buildmode to presale for presale URL path
						this.isPresale = true;

						const planCommunityId = Number(sessionStorage.getItem('presale_plan_community_id'));

						if (planCommunityId === 0)
						{
							this.store.dispatch(new CommonActions.LoadError(new Error('load presale error'), 'CommunityId and/or PlanId are missing or invalid IDs', ErrorFrom.HomeComponent));
						}

						//plan not loaded before, or plan changed, or build mode changed 
						if (!planState.selectedPlan || planState.selectedPlan !== planCommunityId || scenarioState.buildMode !== BuildMode.Presale)
						{
							this.store.dispatch(new ScenarioActions.LoadPresale(planCommunityId));

							return new Observable<never>();
						}
						break;
					default:
					// PostContract ID changes or store BuildMode is not PostContract
					// reload SA and update buildmode to Buyer
						const salesAgreementId = +params.get('salesAgreementId');

						if (salesAgreementId > 0 &&
								(salesAgreementState.id !== salesAgreementId
									|| scenarioState.buildMode !== BuildMode.Buyer)
						)
						{
						//load store data in Buyer mode with pass querystring ID
							this.store.dispatch(new CommonActions.LoadSalesAgreement(salesAgreementId));
							return new Observable<never>();
						}
						break;
				}

				return of(_.pick(salesAgreementState, _.keys(new SalesAgreement())));
			}),
			this.takeUntilDestroyed(),
			distinctUntilChanged()
		).subscribe((salesAgreement: SalesAgreement) =>
		{
			this.salesAgreement = salesAgreement;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.elevationImageUrl)
		).subscribe(imageUrl =>
		{
			this.planImageUrl = imageUrl;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData =>
		{
			this.planName = planData && planData.salesName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName =>
		{
			this.communityName = communityName;
		});

		combineLatest([
			this.store.pipe(select(fromRoot.contractedTree)),
			this.store.pipe(select(state => state.scenario)),
			this.store.pipe(select(fromPlan.planState))
		]).subscribe(([contractedTree, scenarioState, plan]) =>
		{
			const tree = scenarioState?.tree?.treeVersion;
			const contractedSgs = _.flatMap(contractedTree?.groups, g => g.subGroups.filter(sg => sg.useInteractiveFloorplan));
			const sgs = _.flatMap(tree?.groups, g => g.subGroups.filter(sg => sg.useInteractiveFloorplan));

			if ((tree || contractedTree) && plan && plan.marketingPlanId && plan.marketingPlanId.length)
			{
				let fpSubGroup;

				if (contractedSgs?.length)
				{
					fpSubGroup = contractedSgs.pop();
				}
				else if (sgs?.length)
				{
					fpSubGroup = sgs.pop();
				}
				if (fpSubGroup)
				{
					this.floorplanSG = fpSubGroup;

					this.marketingPlanId$.next(plan.marketingPlanId[0]);
				}
				else
				{
					this.noVisibleFP = true;
				}
			}
			else
			{
				this.noVisibleFP = true;
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.favorite)
		).subscribe(fav =>
		{
			if (fav)
			{
				//nav to top subgroup choice
				this.selectedFavoritesId = fav.selectedFavoritesId;
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree =>
		{
			if (tree)
			{
				this.filteredTree = tree;
			}
		});
	}

	viewOptions()
	{
		const firstSubGroup = _.flatMap(this.filteredTree.groups, g => _.flatMap(g.subGroups))[0] || null;

		if (firstSubGroup)
		{
			this.store.dispatch(new NavActions.SetSelectedSubgroup(firstSubGroup.id));

			this.router.navigate(['favorites', 'my-favorites', this.selectedFavoritesId, firstSubGroup.subGroupCatalogId], { queryParamsHandling: 'merge' });
		}
		else
		{
			this.router.navigate(['favorites', 'my-favorites', this.selectedFavoritesId], { queryParamsHandling: 'merge' });
		}
	}

	getImageSrc()
	{
		return this.brandService.getBrandImage('logo');
	}

	getBannerImage(position: number)
	{
		return this.brandService.getBannerImage(position);
	}

	loadFloorPlan(fp)
	{
		if (!this.selectedFloor)
		{
			const floor1 = fp.floors.find(floor => floor.name === 'Floor 1');

			if (floor1)
			{
				this.selectedFloor = floor1;
			}
			else
			{
				this.selectedFloor = fp.floors[0];
			}
		}
	}
}
