import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { Location } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

import { combineLatest as combineLatestOperator, take, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { combineLatest }from 'rxjs';
import { Observable, of } from 'rxjs';
import * as _ from 'lodash';

import 
{ 
	UnsubscribeOnDestroy, PriceBreakdown, SDGroup, SDSubGroup, SDPoint, SDChoice, SDAttributeReassignment, Group, 
	DecisionPoint, JobChoice, Tree, TreeVersionRules, SalesAgreement, getDependentChoices, ModalService, PDFViewerComponent, 
	SummaryData, BuyerInfo, PriceBreakdownType
} from 'phd-common';

import { environment } from '../../../../../environments/environment';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { selectSelectedLot } from '../../../ngrx-store/lot/reducer';

import * as NavActions from '../../../ngrx-store/nav/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as CommonActions from '../../../ngrx-store/actions';

import { ReportsService } from '../../../core/services/reports.service';

import { SummaryHeader, SummaryHeaderComponent } from './summary-header/summary-header.component';

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
	groups: Group[];
	priceBreakdown: PriceBreakdown;
	summaryHeader: SummaryHeader = new SummaryHeader();
	isSticky: boolean = false;
	includeContractedOptions: boolean = false;
	favoritesId: number;
	salesChoices: JobChoice[];
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	buildMode: string;
	isPreview: boolean = false;
	isDesignComplete: boolean = false;

	constructor(private store: Store<fromRoot.State>,
		private activatedRoute: ActivatedRoute, 
		private router: Router,
		private cd: ChangeDetectorRef,
		private modalService: ModalService,
		private reportsService: ReportsService,
		private location: Location,
		private toastr: ToastrService)
	{
		super();
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
					this.store.pipe(select(fromSalesAgreement.favoriteTitle))
				]).pipe(take(1))),
				this.takeUntilDestroyed(),
				distinctUntilChanged()
			)
			.subscribe(([scenario, fav, sag, title]) =>
			{
				this.isPreview = scenario.buildMode === 'preview';
				this.isDesignComplete = sag?.isDesignComplete || false;
				this.buildMode = scenario.buildMode;
				this.summaryHeader.favoritesListName = this.isPreview ? 'Preview Favorites' : title;

				if (this.isPreview)
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
			select(selectSelectedLot)
		).subscribe(lot => {
			this.summaryHeader.lot = lot
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree => {
			if (tree) {
				this.groups = tree.groups;
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
		});	

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.selectScenario)
		).subscribe(scenario => {
			this.tree = scenario.tree;
			this.treeVersionRules = scenario.rules;
		});	
	}

	onBack()
	{
		this.location.back();
	}

	getGroupSubTotals(group: SDGroup)
	{
		var groupSubtotal = 0;

		group.subGroups.map(sg =>
		{
			groupSubtotal += sg.points.reduce((sum, point) => sum += (point.price || 0), 0);
		});

		return groupSubtotal;
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
			this.router.navigateByUrl(`/favorites/my-favorites/${this.favoritesId}/${selectedSubGroup.subGroupCatalogId}`);
		}
		else
		{
			this.router.navigateByUrl(`/favorites/my-favorites/${this.favoritesId}`);
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
	}

	onViewFavorites(point: DecisionPoint)
	{
		const subGroup = _.flatMap(this.groups, g => g.subGroups).find(sg => sg.id === point.subGroupId);
	
		if (subGroup)
		{
			this.store.dispatch(new NavActions.SetSelectedSubgroup(point.subGroupId, point.id));
			this.router.navigateByUrl(`/favorites/my-favorites/${this.favoritesId}/${subGroup.subGroupCatalogId}`);		
		}
	}

	onRemoveFavorites(point: DecisionPoint)
	{
		let removedChoices = [];
		const choices = point && point.choices ? point.choices.filter(c => c.quantity > 0) : [];
		const favoriteChoices = choices.filter(c => !this.salesChoices || this.salesChoices.findIndex(sc => sc.divChoiceCatalogId === c.divChoiceCatalogId) === -1);

		if (favoriteChoices && favoriteChoices.length)
		{
			favoriteChoices.forEach(choice => {
				removedChoices.push({ choiceId: choice.id, divChoiceCatalogId: choice.divChoiceCatalogId, quantity: 0, attributes: choice.selectedAttributes });

				const impactedChoices = getDependentChoices(this.tree, this.treeVersionRules, choice);

				impactedChoices.forEach(c =>
				{
					removedChoices.push({ choiceId: c.id, divChoiceCatalogId: c.divChoiceCatalogId, quantity: 0, attributes: c.selectedAttributes });
				});				
			});
		}

		this.store.dispatch(new ScenarioActions.SelectChoices(this.isDesignComplete, ...removedChoices));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
	}

	onPrint()
	{
		const summaryData = this.compileSummaryData();
		this.reportsService.getFavoritesSummary(summaryData).subscribe(pdfData =>
		{
			let pdfViewer = this.modalService.open(PDFViewerComponent, { backdrop: 'static', windowClass: 'phd-pdf-modal', size: 'lg' });

			pdfViewer.componentInstance.pdfModalTitle = this.summaryHeader.favoritesListName;
			pdfViewer.componentInstance.pdfData = pdfData;
			pdfViewer.componentInstance.pdfBaseUrl = `${environment.pdfViewerBaseUrl}`;
		},
		error =>
		{
			this.toastr.error(`There was an issue generating the favorites summary report.`, 'Error - Print');
		});
	}

	compileSummaryData(): SummaryData
	{
		let summaryData = {} as SummaryData;
		let buyerInfo = {} as BuyerInfo;
		let summaryHeader = this.summaryHeaderComponent;

		summaryData.title = summaryHeader.title;
		summaryData.images = [{ imageUrl: this.summaryHeader.elevationImageUrl }];
		summaryData.hasHomesite = false;
		summaryData.allowEstimates = false;
		summaryData.priceBreakdown = this.priceBreakdown;
		summaryData.priceBreakdownTypes = this.compilePriceBreakdownTypes();
		summaryData.includeImages = false;

		buyerInfo.communityName = this.summaryHeader.communityName;
		buyerInfo.homesite = `LOT ${this.summaryHeader.lot?.lotBlock}`;
		buyerInfo.planName = this.summaryHeader.planName;
		buyerInfo.address = summaryHeader.address;

		summaryData.buyerInfo = buyerInfo;

		summaryData.groups = this.tree?.treeVersion?.groups?.map(g =>
		{
			let group = new SDGroup(g);

			group.subGroups = g.subGroups.map(sg =>
			{
				let subGroup = new SDSubGroup(sg);

				subGroup.points = sg.points.map(p =>
				{
					let point = new SDPoint(p);

					point.choices = p.choices.filter(ch => {
						const isContracted = this.salesChoices.find(x => x.divChoiceCatalogId === ch.divChoiceCatalogId);
						return ch.quantity > 0 && (!isContracted || this.includeContractedOptions);
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
}
