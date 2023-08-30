import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { distinctUntilChanged, switchMap } from 'rxjs/operators';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { UnsubscribeOnDestroy, SalesAgreement, SubGroup, FloorPlanImage, TreeVersion, ImagePlugins } from 'phd-common';
import { BrandService } from '../../../core/services/brand.service';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { ScrollTop } from '../../../shared/classes/utils.class';

@Component({
	selector: 'home',
	templateUrl: 'home.component.html',
	styleUrls: ['home.component.scss']
// eslint-disable-next-line indent
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
			this.store.pipe(select(state => state.scenario)),
			this.store.pipe(select(state => state.salesAgreement)),
		]).pipe(
			switchMap(([scenarioState, salesAgreementState]) =>
			{
				if (salesAgreementState.salesAgreementLoading || salesAgreementState.loadError)
				{
					return new Observable<never>();
				}

				this.isPresale = scenarioState.buildMode === BuildMode.Presale;

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
