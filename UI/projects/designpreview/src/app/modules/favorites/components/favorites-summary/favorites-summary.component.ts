import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { take, distinctUntilChanged, switchMap, withLatestFrom } from 'rxjs/operators';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import * as _ from 'lodash';

import
{
	UnsubscribeOnDestroy, PriceBreakdown, Group, DecisionPoint, JobChoice, Tree, TreeVersionRules, SalesAgreement,
	getDependentChoices, ModalService, PlanOption, Choice, ConfirmModalComponent, SubGroup, FloorPlanImage, ModalRef, MyFavorite
} from 'phd-common';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromApp from '../../../ngrx-store/app/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';

import * as AppActions from '../../../ngrx-store/app/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as CommonActions from '../../../ngrx-store/actions';

import { SummaryHeader, SummaryHeaderComponent } from './summary-header/summary-header.component';
import { GroupExt } from '../../../shared/models/group-ext.model';
import { AdobeService } from '../../../core/services/adobe.service';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { DomSanitizer } from '@angular/platform-browser';

import { InfoModalComponent } from '../../../shared/components/info-modal/info-modal.component';
import { WelcomeModalComponent } from '../../../core/components/welcome-modal/welcome-modal.component';
import { ScrollTop } from '../../../shared/classes/utils.class';

@Component({
	selector: 'favorites-summary',
	templateUrl: './favorites-summary.component.html',
	styleUrls: ['./favorites-summary.component.scss']
})
export class FavoritesSummaryComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SummaryHeaderComponent) summaryHeaderComponent: SummaryHeaderComponent;

	communityName: string = '';
	planName: string = '';
	groups: GroupExt[];
	priceBreakdown: PriceBreakdown;
	summaryHeader: SummaryHeader = new SummaryHeader();
	isSticky: boolean = false;
	includeContractedOptions: boolean = false;
	favoritesId: number;
	salesChoices: JobChoice[];
	myFavorites: MyFavorite[];
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	options: PlanOption[];
	buildMode: string;
	isPreview: boolean = false;
	isPresale: boolean;
	isEmptyFavorites: boolean;
	isDesignComplete: boolean = false;
	isFloorplanFlipped: boolean;
	floors;
	marketingPlanId = new BehaviorSubject<number>(0);
	noVisibleFP: boolean = false;
	IFPsubGroup: SubGroup;
	firstDisplayedFloor;
	showNextIFP: number = 0;
	floorPlanImages: FloorPlanImage[] = [];
	emptyFavoritesModal: ModalRef;
	confirmModal: ModalRef;
	showFloorplan: boolean = true;
	isInitScrollTop: boolean = false;
	welcomeModal: ModalRef;
	showWelcomeModal: boolean = true;

	constructor(private store: Store<fromRoot.State>,
		private activatedRoute: ActivatedRoute,
		private router: Router,
		private cd: ChangeDetectorRef,
		private modalService: ModalService,
		private location: Location,
		private adobeService: AdobeService,
		public sanitizer: DomSanitizer
	)
	{
		super();
	}

	get disclaimerText()
	{
		return 'This Design Preview is a tool designed to give our customers a general understanding of home options, material and finish upgrades and option/upgrade pricing (where provided) and prepare them for making actual option and upgrade selections in the future. No selections are being made using this tool, nor is this a contract for a home or reservation of a lot. The terms and conditions pertaining to a home purchase, including option and upgrade selections, will be contained only within a fully-executed Home Purchase Agreement or a Change Order to that agreement. Lots, home plans, elevations, options, upgrades, features and specifications and the availability and pricing of each may change without notice. Images are for marketing purposes only and may not reflect exact home designs or dimensions, specific components or materials used in home construction, specific manufacturer or models of components, or exact colors or textures of materials, all of which may vary in the course of actual construction and all of which seller has the right to change. Model homes may vary significantly in design, décor and available options and materials from homes available to purchase in a community.';
	}

	get floorPlanDisclaimer()
	{
		return this.isPresale 
			? '*Floorplans are for illustrative purposes only and may differ from actual available floor plans and actual features and measurements of completed home.'
			: '*Floorplan may show options you selected as well as previously contracted options. Floorplans are for illustrative purposes only and may differ from actual available floor plans and actual features and measurements of completed home.';
	}

	ngOnInit()
	{
		combineLatest([
			this.activatedRoute.paramMap,
			this.store.pipe(select(state => state.salesAgreement)),
			this.store.pipe(select(state => state.scenario))
		]).pipe(
			switchMap(([params, salesAgreementState, scenarioState]) =>
			{
				if (salesAgreementState.salesAgreementLoading || salesAgreementState.loadError)
				{
					return new Observable<never>();
				}

				// if sales agreement is not in the store and the id has been passed in to the url
				// or the passed in sales agreement id is different than that of the id in the store...
				const salesAgreementId = +params.get('salesAgreementId');

				//reload data in BuyerPreview mode when valid passing querystring sales agreement ID changes, 
				//or current store buildMode is not BuyerPreview (assuming BuyerPreview entry with FavoritesSummary)
				if (salesAgreementId > 0 &&
						(salesAgreementState.id !== salesAgreementId
							|| !scenarioState.buildMode
							|| scenarioState.buildMode !== BuildMode.BuyerPreview)
				)
				{
					this.store.dispatch(new CommonActions.LoadSalesAgreement(salesAgreementId, true, true));

					return new Observable<never>();
				}

				return of(_.pick(salesAgreementState, _.keys(new SalesAgreement())));
			}),
			switchMap(() => combineLatest([
				this.store.pipe(select(state => state.scenario)),
				this.store.pipe(select(state => state.favorite)),
				this.store.pipe(select(state => state.salesAgreement)),
				this.store.pipe(select(fromRoot.favoriteTitle)),
			]).pipe(take(1))),
			this.takeUntilDestroyed(),
			distinctUntilChanged()
		).subscribe(([scenario, fav, sag, title]) =>
		{
			this.isPreview = scenario.buildMode === BuildMode.Preview;
			this.isPresale = scenario.buildMode === BuildMode.Presale;
			if (this.isPresale)
			{
				this.showFloorplan = true
			}
			this.isDesignComplete = sag?.isDesignComplete || false;
			this.buildMode = scenario.buildMode;
			this.summaryHeader.favoritesListName = this.isPreview ? 'Preview Favorites' : title;

			if (this.isPreview || this.isPresale)
			{
				this.store.dispatch(new FavoriteActions.LoadDefaultFavorite());
			}
			else if (!fav.selectedFavoritesId)
			{
				this.store.dispatch(new FavoriteActions.LoadMyFavorite());
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavorite)
		).subscribe(favorites =>
		{
			this.favoritesId = favorites && favorites.id;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData =>
		{
			this.planName = planData && planData.salesName;
			this.summaryHeader.planName = this.planName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName =>
		{
			this.communityName = communityName;
			this.summaryHeader.communityName = communityName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.elevationImageUrl)
		).subscribe(imageUrl =>
		{
			this.summaryHeader.elevationImageUrl = imageUrl;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromSalesAgreement.selectSelectedLot)
		).subscribe(lot =>
		{
			this.summaryHeader.lot = lot
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree =>
		{
			if (tree)
			{
				this.groups = this.getGroupExts(tree.groups);
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.favoriteState)
		).subscribe(fav =>
		{
			this.salesChoices = fav && fav.salesChoices;
			this.includeContractedOptions = fav && fav.includeContractedOptions;
			this.myFavorites = fav && fav.myFavorites;
		});

		combineLatest([
			this.store.pipe(select(state => state.scenario), this.takeUntilDestroyed()),
			this.store.pipe(select(fromApp.welcomeAcknowledged), this.takeUntilDestroyed()),
		]).subscribe(([scenarioState, taca]) =>
		{
			this.tree = scenarioState.tree;
			this.treeVersionRules = _.cloneDeep(scenarioState.rules);
			this.options = _.cloneDeep(scenarioState.options);

			if (!taca && scenarioState.buildMode !== BuildMode.Presale)
			{
				this.store.dispatch(new AppActions.ShowWelcomeModal(true));
			}
		});

		this.checkForEmptyFavorites();

		if (this.isPresale && this.isEmptyFavorites)
		{
			this.displayEmptyFavoritesModal();
		}

		this.store.pipe(
			this.takeUntilDestroyed(),
			distinctUntilChanged(),
			select(fromApp.showWelcomeModal),
		).subscribe(showWelcomeModal => 
		{
			this.showWelcomeModal = showWelcomeModal && !this.isPresale;
		});

		if (this.showWelcomeModal) 
		{
			const ngbModalOptions: NgbModalOptions =
			{
				centered: true,
				backdrop: 'static',
				keyboard: false
			};
			this.welcomeModal = this.modalService.open(WelcomeModalComponent, ngbModalOptions, true)
		}

		// marketing plan Id for interactive floorplan
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.planState),
			withLatestFrom(this.store.pipe(select(state => state.scenario)))
		).subscribe(([plan, scenario]) =>
		{
			this.noVisibleFP = false; // Default this value to false
			if (plan && plan.marketingPlanId && plan.marketingPlanId.length)
			{
				if (scenario.tree && scenario.tree.treeVersion)
				{
					const subGroups = _.flatMap(scenario.tree.treeVersion.groups, g => g.subGroups) || [];
					const fpSubGroup = subGroups.find(sg => sg.useInteractiveFloorplan);
					this.IFPsubGroup = fpSubGroup;
					if (fpSubGroup)
					{
						this.marketingPlanId.next(plan.marketingPlanId[0]);
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
			}
			else
			{
				this.noVisibleFP = true;
			}
		});

		// getting the floor plan flipped from the sales agreement
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromSalesAgreement.salesAgreementState)
		).subscribe(sag =>
		{
			this.isFloorplanFlipped = sag.isFloorplanFlipped;
		});

		ScrollTop();
	}

	onBack()
	{
		this.location.back();
	}

	displayPoint(dp: DecisionPoint)
	{
		if (dp.isHiddenFromBuyerView)
		{
			return false;
		}
		const choices = dp && dp.choices ? dp.choices.filter(c => c.quantity > 0 && !c.isHiddenFromBuyerView) : [];
		const favoriteChoices = choices.filter(c => !this.salesChoices || this.salesChoices.findIndex(sc => sc.divChoiceCatalogId === c.divChoiceCatalogId) === -1);

		return this.includeContractedOptions
			? choices && !!choices.length
			: favoriteChoices && !!favoriteChoices.length;
	}

	onSubgroupSelected(id: number)
	{
		this.store.dispatch(new NavActions.SetSelectedSubgroup(id));

		const subGroups = _.flatMap(this.groups, g => _.flatMap(g.subGroups)) || [];
		const selectedSubGroup = subGroups.find(sg => sg.id === id);
		if (selectedSubGroup)
		{
			this.router.navigate(['favorites', 'my-favorites', this.favoritesId, selectedSubGroup.subGroupCatalogId], { queryParamsHandling: 'merge' });
		}
		else
		{
			this.router.navigate(['favorites', 'my-favorites', this.favoritesId], { queryParamsHandling: 'merge' });
		}
	}

	/**
	 * Used to add additional padding to the header when scrolling so the first group header doesn't get hidden
	 * @param isSticky
	 */
	onIsStickyChanged(isSticky: boolean)
	{
		//skip initial load sticky set
		if (this.isInitScrollTop)
		{
			this.isSticky = false;
			this.isInitScrollTop = false;
			return;
		}

		this.isSticky = isSticky;

		this.cd.detectChanges();
	}

	onContractedOptionsToggled()
	{
		this.store.dispatch(new FavoriteActions.ToggleContractedOptions());

		setTimeout(() =>
		{
			this.cd.detectChanges();
		}, 50);
	}

	onViewFavorites(point: DecisionPoint)
	{
		const subGroup = _.flatMap(this.groups, g => g.subGroups).find(sg => (sg.subGroupCatalogId === point.subGroupCatalogId || sg.id === point.subGroupId));

		if (subGroup)
		{
			this.store.dispatch(new NavActions.SetSelectedSubgroup(point.subGroupId, point.id));
			this.router.navigate(['favorites', 'my-favorites', this.favoritesId, subGroup.subGroupCatalogId], { queryParamsHandling: 'merge' });
		}
	}

	onRemoveFavorites(choice: Choice)
	{
		const ngbModalOptions: NgbModalOptions =
		{
			centered: true,
			backdrop: true,
			keyboard: false,
		};

		this.confirmModal = this.modalService.open(ConfirmModalComponent, ngbModalOptions, true);

		this.confirmModal.componentInstance.title = 'Are You Sure?';
		this.confirmModal.componentInstance.body = 'This will delete this item from your list';
		this.confirmModal.componentInstance.defaultOption = 'Continue';

		this.adobeService.setAlertEvent(this.confirmModal.componentInstance.title + ' ' + this.confirmModal.componentInstance.body, 'Remove Favorite Alert');

		this.confirmModal.result.then((result) =>
		{

			if (result == 'Continue')
			{

				const removedChoices = [];

				if (!this.salesChoices || this.salesChoices.findIndex(sc => sc.divChoiceCatalogId === choice.divChoiceCatalogId) === -1)
				{
					removedChoices.push({ choiceId: choice.id, divChoiceCatalogId: choice.divChoiceCatalogId, quantity: 0, attributes: choice.selectedAttributes });

					const impactedChoices = getDependentChoices(this.tree, this.treeVersionRules, this.options, choice);

					impactedChoices.forEach(c =>
					{
						removedChoices.push({ choiceId: c.id, divChoiceCatalogId: c.divChoiceCatalogId, quantity: 0, attributes: c.selectedAttributes });
					});
				}

				this.store.dispatch(new ScenarioActions.SelectChoices(this.isDesignComplete, ...removedChoices));
				this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());

				this.checkForEmptyFavorites();

				if (this.isPresale && this.isEmptyFavorites)
				{
					this.displayEmptyFavoritesModal();
				}

				setTimeout(() =>
				{
					this.cd.detectChanges();
				}, 50);
			}
		}, (reason) =>
		{

		});
	}

	getGroupExts(groups: Group[]): GroupExt[]
	{
		return groups.map(g =>
		{
			return new GroupExt(g);
		})
	}

	checkForEmptyFavorites()
	{
		const favorites = _.flatMap(this.myFavorites, fav => fav.myFavoritesChoice);
		this.isEmptyFavorites = favorites.length === 0;
	}

	displayEmptyFavoritesModal()
	{
		const ngbModalOptions: NgbModalOptions =
		{
			centered: true,
			backdrop: true,
			beforeDismiss: () => false
		};


		this.emptyFavoritesModal = this.modalService.open(InfoModalComponent, ngbModalOptions, true);

		this.emptyFavoritesModal.componentInstance.title = 'Oops. No options have been selected.';
		this.emptyFavoritesModal.componentInstance.body = `
			<p>Select the <i class="fa fa-heart-o"></i> to add options to your favorites.</p>
		`;
		this.emptyFavoritesModal.componentInstance.buttonText = 'Back';
		this.emptyFavoritesModal.componentInstance.defaultOption = 'Back';


		this.adobeService.setAlertEvent(this.emptyFavoritesModal.componentInstance.title + ' ' + this.emptyFavoritesModal.componentInstance.body, 'Empty Favorites Alert');

		this.emptyFavoritesModal.result.then((result) =>
		{

			if (result === 'Back')
			{
				this.location.back();

				setTimeout(() =>
				{
					this.cd.detectChanges();
				}, 50);
			}

		}, (reason) =>
		{

		});

	}

	onFloorPlanSaved(images: FloorPlanImage[])
	{
		if (!images || !images.length)
		{
			return;
		}

		this.floorPlanImages = images;
	}

	getIfpId(image: FloorPlanImage)
	{
		return `phd-ifp-${image.floorIndex}`;
	}

	toggleCollapsed()
	{
		this.showFloorplan = !this.showFloorplan;
		this.cd.detectChanges();
	}
}
