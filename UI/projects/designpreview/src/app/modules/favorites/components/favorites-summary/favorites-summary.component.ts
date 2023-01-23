import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { Location } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { combineLatest as combineLatestOperator, take, distinctUntilChanged, switchMap, withLatestFrom } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { Observable, of } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import * as _ from 'lodash';

import
{
	UnsubscribeOnDestroy, PriceBreakdown, SDGroup, SDSubGroup, SDPoint, SDChoice, SDAttributeReassignment, Group,
	DecisionPoint, JobChoice, Tree, TreeVersionRules, SalesAgreement, getDependentChoices, ModalService, PDFViewerComponent,
	SummaryData, BuyerInfo, PriceBreakdownType, PlanOption, Choice, ConfirmModalComponent, SubGroup, FloorPlanImage, ModalRef
} from 'phd-common';

import { environment } from '../../../../../environments/environment';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';

import * as NavActions from '../../../ngrx-store/nav/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as CommonActions from '../../../ngrx-store/actions';

import { ReportsService } from '../../../core/services/reports.service';

import { SummaryHeader, SummaryHeaderComponent } from './summary-header/summary-header.component';
import { GroupExt } from '../../../shared/models/group-ext.model';
import { AdobeService } from '../../../core/services/adobe.service';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { DomSanitizer } from '@angular/platform-browser';

import { InfoModalComponent } from '../../../shared/components/info-modal/info-modal.component';

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
	myFavorites: any[];
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	options: PlanOption[];
	buildMode: string;
	isPreview: boolean = false;
	isPresale: boolean;
	isEmptyFavorites: boolean;
	isDesignComplete: boolean = false;
	isFloorplanFlipped: boolean;
	floors: any[];
	marketingPlanId = new BehaviorSubject<number>(0);
	noVisibleFP: boolean = false;
	IFPsubGroup: SubGroup;
	firstDisplayedFloor: any;
	showNextIFP: number = 0;
	floorPlanImages: FloorPlanImage[];
	emptyFavoritesModal: ModalRef;
	confirmModal: ModalRef;
	showFloorplan: boolean = true;

	constructor(private store: Store<fromRoot.State>,
		private activatedRoute: ActivatedRoute,
		private router: Router,
		private cd: ChangeDetectorRef,
		private modalService: ModalService,
		private reportsService: ReportsService,
		private location: Location,
		private toastr: ToastrService,
		private adobeService: AdobeService,
		public sanitizer: DomSanitizer
		)
	{
		super();
	}

	get disclaimerText()
	{
		return "This Design Preview is a tool designed to give our customers a general understanding of home options, material and finish upgrades and option/upgrade pricing (where provided) and prepare them for making actual option and upgrade selections in the future. No selections are being made using this tool, nor is this a contract for a home or reservation of a lot. The terms and conditions pertaining to a home purchase, including option and upgrade selections, will be contained only within a fully-executed Home Purchase Agreement or a Change Order to that agreement. Lots, home plans, elevations, options, upgrades, features and specifications and the availability and pricing of each may change without notice. Images are for marketing purposes only and may not reflect exact home designs or dimensions, specific components or materials used in home construction, specific manufacturer or models of components, or exact colors or textures of materials, all of which may vary in the course of actual construction and all of which seller has the right to change. Model homes may vary significantly in design, décor and available options and materials from homes available to purchase in a community.";
	}

	ngOnInit()
	{
		this.activatedRoute.paramMap
			.pipe(
				combineLatestOperator(this.store.pipe(select(state => state.salesAgreement))),
				switchMap(([params, salesAgreementState]) =>
				{
					if (salesAgreementState.salesAgreementLoading || salesAgreementState.loadError)
					{
						return new Observable<never>();
					}

					// if sales agreement is not in the store and the id has been passed in to the url
					// or the passed in sales agreement id is different than that of the id in the store...
					const salesAgreementId = +params.get('salesAgreementId');

					if (salesAgreementId > 0 && salesAgreementState.id !== salesAgreementId)
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
			)
			.subscribe(([scenario, fav, sag, title]) =>
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
		).subscribe(favorites => {
			this.favoritesId = favorites && favorites.id;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.floorPlanImages)
		).subscribe(ifpImages => {
			this.floorPlanImages = ifpImages;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData => {
			this.planName = planData && planData.salesName;
			this.summaryHeader.planName = this.planName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName => {
			this.communityName = communityName;
			this.summaryHeader.communityName = communityName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.elevationImageUrl)
		).subscribe(imageUrl => {
			this.summaryHeader.elevationImageUrl = imageUrl;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromSalesAgreement.selectSelectedLot)
		).subscribe(lot => {
			this.summaryHeader.lot = lot
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree => {
			if (tree) {
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
		).subscribe(fav => {
			this.salesChoices = fav && fav.salesChoices;
			this.includeContractedOptions = fav && fav.includeContractedOptions;
			this.myFavorites = fav && fav.myFavorites;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.selectScenario)
		).subscribe(scenario => {
			this.tree = scenario.tree;
			this.treeVersionRules = _.cloneDeep(scenario.rules);
			this.options = _.cloneDeep(scenario.options);
		});

		this.checkForEmptyFavorites();

		if (this.isPresale && this.isEmptyFavorites) {
			this.displayEmptyFavoritesModal();
		}

		// marketing plan Id for interactive floorplan
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.planState),
			withLatestFrom(this.store.pipe(select(state => state.scenario)))
		).subscribe(([plan, scenario]) =>
		{
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
					} else
					{
						this.noVisibleFP = true;
					}
				} else
				{
					this.noVisibleFP = true;
				}
			} else
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
	}

	onBack()
	{
		this.location.back();
	}

	displayPoint(dp: DecisionPoint)
	{
		if (dp.isHiddenFromBuyerView) {
			return false;
		}
		const choices = dp && dp.choices ? dp.choices.filter(c => c.quantity > 0 && !c.isHiddenFromBuyerView) : [];
		const favoriteChoices = choices.filter(c => !this.salesChoices || this.salesChoices.findIndex(sc => sc.divChoiceCatalogId === c.divChoiceCatalogId) === -1);

		return this.includeContractedOptions
					? choices && !!choices.length
					: favoriteChoices && !!favoriteChoices.length;
	}

	onSubgroupSelected(id: number) {
		this.store.dispatch(new NavActions.SetSelectedSubgroup(id));

		const subGroups = _.flatMap(this.groups, g => _.flatMap(g.subGroups)) || [];
		const selectedSubGroup = subGroups.find(sg => sg.id === id);
		if (selectedSubGroup)
		{
			this.router.navigate(['favorites', 'my-favorites', this.favoritesId, selectedSubGroup.subGroupCatalogId], { queryParams: { presale: sessionStorage.getItem('presale_token')} });
		}
		else
		{
			this.router.navigate(['favorites', 'my-favorites', this.favoritesId], { queryParams: { presale: sessionStorage.getItem('presale_token')} });
		}
	}

	/**
	 * Used to add additional padding to the header when scrolling so the first group header doesn't get hidden
	 * @param isSticky
	 */
	onIsStickyChanged(isSticky: boolean)
	{
		this.isSticky = isSticky;

		this.cd.detectChanges();
	}

	onContractedOptionsToggled()
	{
		this.store.dispatch(new FavoriteActions.ToggleContractedOptions());

		setTimeout(() => {
            this.cd.detectChanges();
        }, 50);
	}

	onViewFavorites(point: DecisionPoint)
	{
		const subGroup = _.flatMap(this.groups, g => g.subGroups).find(sg => sg.id === point.subGroupId);

		if (subGroup)
		{
			this.store.dispatch(new NavActions.SetSelectedSubgroup(point.subGroupId, point.id));
			this.router.navigate(['favorites', 'my-favorites', this.favoritesId, subGroup.subGroupCatalogId], { queryParams: { presale: sessionStorage.getItem('presale_token')} });
		}
	}

	onRemoveFavorites(choice: Choice)
	{
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: true,
			keyboard: false,
		};

		this.confirmModal = this.modalService.open(ConfirmModalComponent, ngbModalOptions, true);

		this.confirmModal.componentInstance.title = 'Are You Sure?';
		this.confirmModal.componentInstance.body = 'This will delete this item from your list';
		this.confirmModal.componentInstance.defaultOption = 'Continue';

		this.adobeService.setAlertEvent(this.confirmModal.componentInstance.title + " " + this.confirmModal.componentInstance.body, 'Remove Favorite Alert');

		this.confirmModal.result.then((result) =>
		{

			if (result == 'Continue')
			{

				let removedChoices = [];

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

				if (this.isPresale && this.isEmptyFavorites) {
					this.displayEmptyFavoritesModal();
				}

				setTimeout(() => {
					this.cd.detectChanges();
				}, 50);
			}

		}, (reason) =>
			{

			});
	}

	onPrint()
	{
		const summaryData = this.compileSummaryData();
		this.reportsService.getFavoritesSummary(summaryData).subscribe(pdfData =>
		{
			let pdfViewer = this.modalService.open(PDFViewerComponent, { backdrop: 'static', windowClass: 'phd-pdf-modal', size: 'lg' });
			this.adobeService.setAlertEvent('Favorites Summary - PDF', 'PDF Summary Report Alert');

			pdfViewer.componentInstance.pdfModalTitle = this.summaryHeader.favoritesListName;
			pdfViewer.componentInstance.pdfData = pdfData;
			pdfViewer.componentInstance.pdfBaseUrl = `${environment.pdfViewerBaseUrl}`;
		},
		error =>
		{
			const msg = `There was an issue generating the favorites summary report.`;
			this.toastr.error(msg, 'Error - Print');
			this.adobeService.setErrorEvent(msg);
		});
	}

	compileSummaryData(): SummaryData
	{
		let summaryData = {} as SummaryData;
		let buyerInfo = {} as BuyerInfo;
		let summaryHeader = this.summaryHeaderComponent;

		summaryData.title = summaryHeader.headerTitle;
		summaryData.images = [{ imageUrl: this.summaryHeader.elevationImageUrl }];
		summaryData.hasHomesite = false;
		summaryData.allowEstimates = false;
		summaryData.priceBreakdown = this.priceBreakdown;
		summaryData.priceBreakdownTypes = this.compilePriceBreakdownTypes();
		summaryData.includeImages = false;

		buyerInfo.communityName = this.summaryHeader.communityName;
		buyerInfo.homesite = `LOT ${this.summaryHeader.lot?.lotBlock || ''}`;
		buyerInfo.planName = this.summaryHeader.planName;
		buyerInfo.address = summaryHeader.address;

		summaryData.buyerInfo = buyerInfo;

		summaryData.groups = this.tree?.treeVersion?.groups?.map(g =>
		{
			let group = new SDGroup(g);

			group.subGroups = g.subGroups.map(sg =>
			{
				let subGroup = new SDSubGroup(sg);

				subGroup.points = sg.points.filter(p => {
					return !p.isHiddenFromBuyerView;
				}).map(p =>
				{
					let point = new SDPoint(p);

					point.choices = p.choices.filter(ch => {
						const isContracted = !!this.salesChoices?.find(x => x.divChoiceCatalogId === ch.divChoiceCatalogId);
						return ch.quantity > 0 && (!isContracted || this.includeContractedOptions) && !ch.isHiddenFromBuyerView;
					}).map(c => new SDChoice(c));

					return point;
				}).filter(dp => !!dp.choices.length);

				return subGroup;
			}).filter(sg => !!sg.points.length);

			return group;
		}).filter(g => !!g.subGroups.length);

		let subGroups = _.flatMap(summaryData.groups, g => g.subGroups);
		let points = _.flatMap(subGroups, sg => sg.points);
		let choices = _.flatMap(points, p => p.choices);

		// filter down to just choices with reassignments
		let choicesWithReassignments = choices.filter(c => c.selectedAttributes && c.selectedAttributes.length > 0 && c.selectedAttributes.some(sa => sa.attributeReassignmentFromChoiceId != null));

		choicesWithReassignments.forEach(choice =>
		{
			// return only those selected attributes that are reassignments
			let selectedAttributes = choice.selectedAttributes.filter(sa => sa.attributeReassignmentFromChoiceId != null);

			selectedAttributes.forEach(sa =>
			{
				// find the parent the attribute originally came from
				let parentChoice = choices.find(c => c.id === sa.attributeReassignmentFromChoiceId);

				// Add where the reassignment landed
				parentChoice.attributeReassignments.push({ id: choice.id, label: choice.label } as SDAttributeReassignment);
			});
		});

		return summaryData;
	}

	compilePriceBreakdownTypes(): string[]
	{
		let types = [];

		if (!this.isPreview)
		{
			types.push(PriceBreakdownType.SELECTIONS.toString());
		}

		if (this.priceBreakdown?.salesProgram)
		{
			types.push(PriceBreakdownType.DISCOUNT.toString());
		}

		if (this.priceBreakdown?.nonStandardSelections)
		{
			types.push(PriceBreakdownType.NONSTANDARD.toString());
		}

		if (this.priceBreakdown?.closingIncentive)
		{
			types.push(PriceBreakdownType.CLOSING.toString());
		}

		return types;
	}

	getGroupExts(groups: Group[]) : GroupExt[]
	{
		return groups.map(g => {
			return new GroupExt(g);
		})
	}

	checkForEmptyFavorites() {
		let favorites = _.flatMap(this.myFavorites, fav => fav.myFavoritesChoice);
		this.isEmptyFavorites = favorites.length === 0;
	}

	displayEmptyFavoritesModal() {
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: true,
			beforeDismiss: () => false
		};


		this.emptyFavoritesModal = this.modalService.open(InfoModalComponent, ngbModalOptions, true);

		this.emptyFavoritesModal.componentInstance.title = 'Ooops. No options have been selected';
		this.emptyFavoritesModal.componentInstance.body = `
			<p>Select the <i class="fa fa-heart-o"></i> to add options to your favorites.</p>
		`;
		this.emptyFavoritesModal.componentInstance.buttonText = 'Back';
		this.emptyFavoritesModal.componentInstance.defaultOption = 'Back';


		this.adobeService.setAlertEvent(this.emptyFavoritesModal.componentInstance.title + " " + this.emptyFavoritesModal.componentInstance.body, 'Empty Favorites Alert');

		this.emptyFavoritesModal.result.then((result) =>
		{

			if (result === 'Back')
			{
				this.location.back();

				setTimeout(() => {
					this.cd.detectChanges();
				}, 50);
			}

		}, (reason) =>
			{

			});

	}

	loadFloorPlan(fp) {
		// load floors
		this.floors = fp.floors;

		//Decide the first floor to display
		let floorIndex = this.floors.findIndex(floor => floor.name === 'Basement');
		if (floorIndex > -1) {
			this.firstDisplayedFloor = this.floors[floorIndex];
			this.floors.splice(floorIndex , 1);
		}
		else {
			floorIndex = this.floors.findIndex(floor => floor.name === 'Floor 1');
			if (floorIndex > -1) {
				this.firstDisplayedFloor = this.floors[floorIndex];
				this.floors.splice(floorIndex , 1);
			}
			else {
				this.firstDisplayedFloor = this.floors[0];
				this.floors.splice(0,1);
			}
		}

		//There needs to be a short delay between displaying floorplans, or the floorplan.component gets confused
		setTimeout(() => {
			this.showNextIFP++;
		}, 200);
	}

	delayBetweenFloorPlans() {
		setTimeout(() => {
			this.showNextIFP++;
		}, 200);
	}

	getIfpId(image: FloorPlanImage) {
		return `phd-ifp-${image.floorIndex}`;
	}

	toggleCollapsed()
	{
		this.showFloorplan = !this.showFloorplan;
		this.cd.detectChanges();
	}
}
