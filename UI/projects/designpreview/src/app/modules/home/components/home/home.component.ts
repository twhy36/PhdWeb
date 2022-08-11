import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { BehaviorSubject, Observable, of } from 'rxjs';
import { distinctUntilChanged, combineLatest, switchMap, withLatestFrom, take } from 'rxjs/operators';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as CommonActions from '../../../ngrx-store/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';

import { UnsubscribeOnDestroy, SalesAgreement, SDImage, SubGroup, FloorPlanImage } from 'phd-common';
import { JobService } from '../../../core/services/job.service';
import { BrandService } from '../../../core/services/brand.service';
import { BuildMode } from '../../../shared/models/build-mode.model';

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
	floorPlanImages: SDImage[] = [];
	salesAgreement: SalesAgreement;
	isPreview: boolean;
	isPresale: boolean;
	isLoadingMyFavorite: boolean = false;
	hasFloorPlanImages: boolean = true;
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
					this.store.pipe(select(state => state.scenario))
				),
				switchMap(([[params, salesAgreementState], routeData, scenarioState]) => {
					if (salesAgreementState.salesAgreementLoading || salesAgreementState.loadError) {
						return new Observable<never>();
					}

					this.isFloorplanFlipped = salesAgreementState?.isFloorplanFlipped;
					this.isPreview = scenarioState.buildMode === BuildMode.Preview || routeData["isPreview"];
					this.isPresale = scenarioState.buildMode === BuildMode.Presale || routeData["isPresale"];

					// we only want to fetch on treeVersion during first load of home page
					if (routeData["isPreview"]) {
						const treeVersionId = +params.get('treeVersionId');
						if (!scenarioState.tree || scenarioState.tree.treeVersion.id !== treeVersionId) {
							this.store.dispatch(new ScenarioActions.LoadPreview(treeVersionId));
							return new Observable<never>();
						}
					} else if (routeData["isPresale"]) {
						const financialCommunityId = +params.get('financialCommunityId');
						const lawsonPlanId = +params.get('lawsonPlanId');
						let lawsonPlanIdAsString = lawsonPlanId + '';
						if (!scenarioState.tree || (scenarioState.tree.planKey !== lawsonPlanIdAsString || scenarioState.tree.financialCommunityId !== financialCommunityId)) {
							this.store.dispatch(new ScenarioActions.LoadPresale(financialCommunityId, lawsonPlanId));
							return new Observable<never>();
						}
					} else {
						// if sales agreement is not in the store and the id has been passed in to the url
						// or the passed in sales agreement id is different than that of the id in the store...
						const salesAgreementId = +params.get('salesAgreementId');
						if (salesAgreementId > 0 && salesAgreementState.id !== salesAgreementId) {
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
			select(state => state.job),
			withLatestFrom(this.store.select(state => state.changeOrder)),
			switchMap(([job, changeOrder]) =>
			{
				if (job.id && changeOrder)
				{
					return this.jobService.getFloorPlanImages(job.id, (changeOrder.currentChangeOrder !== null) ? true : false);
				}
				else
				{
					return new Observable<never>();
				}
			}),
			take(1)
		).subscribe(images =>
		{
			this.hasFloorPlanImages = images && images.length > 0;
			images && images.length && images.map(img =>
			{
				img.svg = `data:image/svg+xml;base64,${btoa(img.svg)}`;

				this.floorPlanImages.push({ imageUrl: img.svg, hasDataUri: true, floorIndex: img.floorIndex, floorName: img.floorName } as SDImage);
			});
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

					let url = `/favorites/my-favorites/${fav.selectedFavoritesId}`;
					const subGroups = _.flatMap(tree.groups, g => _.flatMap(g.subGroups)) || [];
					const selectedSubGroup = subGroups.find(sg => sg.id === nav.selectedSubGroup);
					if (selectedSubGroup)
					{
						url += `/${selectedSubGroup.subGroupCatalogId}`;
					}
					this.router.navigateByUrl(url);
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

	/**
	 * Handles a save event from the child floor plan component, in order to render the IFP report.
	 * @param floorPlanImages The images that were saved.
	 */
	onFloorPlanSaved(floorPlanImages: FloorPlanImage[])
	{
		floorPlanImages.forEach(img =>
		{
			img.svg = `data:image/svg+xml;base64,${btoa(img.svg)}`;

			const sdImg = { imageUrl: img.svg, hasDataUri: true, floorIndex: img.floorIndex, floorName: img.floorName } as SDImage;
			const idx = this.floorPlanImages.findIndex(i => i.floorIndex === img.floorIndex);

			if (idx === -1)
			{
				this.floorPlanImages.push(sdImg);
			}
			else
			{
				this.floorPlanImages[idx] = sdImg;
			}
		});
	}

	getImageSrc() {
		return this.brandService.getBrandImage('logo');
	}

	getBannerImage(position: number) {
		return this.brandService.getBannerImage(position);
	}

	getWelcomeText() {
		return this.isPresale ? 'Let\'s review the options available for your home' : 'Let\'s review the rest of the options available for your home';
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
