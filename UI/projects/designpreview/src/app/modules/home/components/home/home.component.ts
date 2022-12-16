import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BehaviorSubject, Observable, of } from 'rxjs';
import { distinctUntilChanged, combineLatest, switchMap, withLatestFrom, take } from 'rxjs/operators';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as CommonActions from '../../../ngrx-store/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';

import { UnsubscribeOnDestroy, SalesAgreement, SubGroup, FloorPlanImage } from 'phd-common';
import { JobService } from '../../../core/services/job.service';
import { BrandService } from '../../../core/services/brand.service';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { ErrorFrom } from '../../../ngrx-store/error.action';
import { Buffer } from 'buffer';
import { PresalePayload } from '../../../shared/models/presale-payload.model';

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
	isLoadingMyFavorite: boolean = false;
	hasFloorPlanImages: boolean = false;
	marketingPlanId$ = new BehaviorSubject<number>(0);
	isFloorplanFlipped: boolean;
	floorplanSG: SubGroup;
	noVisibleFP: boolean = false;
	selectedFloor: any;

	constructor(
		private activatedRoute: ActivatedRoute,
		private store: Store<fromRoot.State>,
		private router: Router,
		private jobService: JobService,
		private brandService: BrandService)
    {
        super();
    }

	ngOnInit() {
		this.activatedRoute.paramMap
			.pipe(
				combineLatest(this.store.pipe(select(state => state.salesAgreement))),
				withLatestFrom(this.activatedRoute.data,
					this.store.pipe(select(state => state.scenario)),
					this.store.pipe(select(state => state.plan))
				),
				switchMap(([[params, salesAgreementState], routeData, scenarioState, planState]) => {
					if (salesAgreementState.salesAgreementLoading || salesAgreementState.loadError) {
						return new Observable<never>();
					}

					this.isFloorplanFlipped = salesAgreementState?.isFloorplanFlipped;
					this.isPreview = scenarioState.buildMode === BuildMode.Preview || routeData["isPreview"];
					this.isPresale = scenarioState.buildMode === BuildMode.Presale || routeData["isPresale"];

					// we only want to fetch on treeVersion during first load of home page
					if (routeData["isPreview"])
					{
						const treeVersionId = +params.get('treeVersionId');
						if (!scenarioState.tree || scenarioState.tree.treeVersion.id !== treeVersionId)
						{
							this.store.dispatch(new ScenarioActions.LoadPreview(treeVersionId));
							return new Observable<never>();
						}
					}
					else if (routeData["isPresale"])
					{
						if (!planState.selectedPlan)
						{
							const token = sessionStorage.getItem('presale_token');
							const tokenParts = token.split('.');
							const payload = new PresalePayload(JSON.parse(Buffer.from(tokenParts[1], 'base64').toString()));

							if (!sessionStorage.getItem('presale_issuer'))
							{
								sessionStorage.setItem('presale_issuer', payload.iss);
							}

							const planCommunityId = payload.planCommunityId;

							if (planCommunityId && (!planState.selectedPlan || planState.selectedPlan !== planCommunityId))
							{
								this.store.dispatch(new ScenarioActions.LoadPresale(planCommunityId));
	
								return new Observable<never>();
							}
							else
							{
								this.store.dispatch(new CommonActions.LoadError(new Error('load presale error'), 'CommunityId and/or PlanId are missing or invalid IDs', ErrorFrom.HomeComponent));
							}
						}
					}
					else
					{
						// if sales agreement is not in the store and the id has been passed in to the url
						// or the passed in sales agreement id is different than that of the id in the store...
						const salesAgreementId = +params.get('salesAgreementId');

						if (salesAgreementId > 0 && salesAgreementState.id !== salesAgreementId)
						{
							this.store.dispatch(new CommonActions.LoadSalesAgreement(salesAgreementId));
							return new Observable<never>();
						}
					}

					return of(_.pick(salesAgreementState, _.keys(new SalesAgreement())));
				}),
				this.takeUntilDestroyed(),
				distinctUntilChanged()
			)
			.subscribe((salesAgreement: SalesAgreement) => {
				this.salesAgreement = salesAgreement;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.elevationImageUrl)
		).subscribe(imageUrl => {
			this.planImageUrl = imageUrl;
		});

		this.store.pipe(
			take(1),
			select(fromScenario.floorPlanImages)
		).subscribe(ifpImages => {
			this.floorPlanImages = ifpImages;
			this.hasFloorPlanImages = ifpImages.length > 0;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData => {
			this.planName = planData && planData.salesName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName => {
			this.communityName = communityName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.contractedTree),
			combineLatest(this.store.pipe(select(state => state.scenario)), this.store.pipe(select(fromPlan.planState)))
		).subscribe(([contractedTree, scenarioState, plan]) => {
			const tree = scenarioState?.tree?.treeVersion;
			const contractedSgs = _.flatMap(contractedTree?.groups, g => g.subGroups.filter(sg => sg.useInteractiveFloorplan));
			const sgs = _.flatMap(tree?.groups, g => g.subGroups.filter(sg => sg.useInteractiveFloorplan));
			if ((tree || contractedTree) && plan && plan.marketingPlanId && plan.marketingPlanId.length) {
				let fpSubGroup;
				if (contractedSgs?.length) {
					fpSubGroup = contractedSgs.pop();
				} else if (sgs?.length) {
					fpSubGroup = sgs.pop();
				}
				if (fpSubGroup) {
					this.floorplanSG = fpSubGroup;
					this.marketingPlanId$.next(plan.marketingPlanId[0]);
				} else {
					this.noVisibleFP = true;
				}
			} else {
				this.noVisibleFP = true;
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree),
			withLatestFrom(this.store.select(state => state.favorite), this.store.select(state => state.nav)),
		).subscribe(([tree, fav, nav]) => {
			if (fav)
			{
				if (this.isLoadingMyFavorite && !fav.isLoading)
				{
					this.isLoadingMyFavorite = false;

					const subGroups = _.flatMap(tree.groups, g => _.flatMap(g.subGroups)) || [];
					const selectedSubGroup = subGroups.find(sg => sg.id === nav.selectedSubGroup);
					if (selectedSubGroup)
					{
						this.router.navigate(['favorites', 'my-favorites', fav.selectedFavoritesId, selectedSubGroup.subGroupCatalogId], { queryParams: { presale: sessionStorage.getItem('presale_token')} })
					}
					else
					{
						this.router.navigate(['favorites', 'my-favorites', fav.selectedFavoritesId], { queryParams: { presale: sessionStorage.getItem('presale_token')} })
					}
				}
			}
		});
	}

	viewOptions()
	{
		this.isLoadingMyFavorite = true;
		if (this.isPreview || this.isPresale) {
			this.store.dispatch(new FavoriteActions.LoadDefaultFavorite());
		} else {
			this.store.dispatch(new FavoriteActions.LoadMyFavorite());
		}
	}

	getImageSrc() {
		return this.brandService.getBrandImage('logo');
	}

	getBannerImage(position: number) {
		return this.brandService.getBannerImage(position);
	}

	loadFloorPlan(fp) {
		if (!this.selectedFloor) {
			const floor1 = fp.floors.find(floor => floor.name === 'Floor 1');
			if (floor1) {
				this.selectedFloor = floor1;
			} else {
				this.selectedFloor = fp.floors[0];
			}
		}
	}
}
