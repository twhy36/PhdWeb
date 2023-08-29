import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MatAccordion } from '@angular/material/expansion';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Store, select } from '@ngrx/store';

import { DecisionPoint, Group, JobChoice, MyFavorite, PlanOption, PriceBreakdown, Tree, TreeVersionRules, UnsubscribeOnDestroy } from 'phd-common';
import { Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, take } from 'rxjs/operators';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromPlan from '../../ngrx-store/plan/reducer';
import * as fromFavorite from '../../ngrx-store/favorite/reducer';
import * as FavoriteActions from '../../ngrx-store/favorite/actions';
import { BrandService } from '../../core/services/brand.service';

import { GroupExt } from '../../shared/models/group-ext.model';
import { BuildMode } from '../../shared/models/build-mode.model';
import { Constants } from '../../shared/classes/constants.class';

@Component({
	selector: 'summary',
	templateUrl: './summary.component.html',
	styleUrls: ['./summary.component.scss']
	})
export class SummaryComponent extends UnsubscribeOnDestroy implements OnInit, AfterViewInit
{
	@ViewChild('stickyHeader') stickyHeader: ElementRef

	summaryTitle: string = '';
	buildMode: string;
	communityName: string = '';
	planName: string = '';
	brandTheme: string;
	showOptionText: string = Constants.SHOW_OPTIONS_TEXT;
	favoritesId: number;

	isDesignComplete: boolean = false;
	isPresalePricingEnabled: boolean = false;
	hasAgreement: boolean = false;
	groupExpanded = false;
	showDetailPrice = true;
	isPresale: boolean;
	isEmptyFavorites: boolean;
	includeContractedOptions: boolean = false;
	isSticky: boolean = false;
	stickyHeaderOffset: number = 0;

	groups: GroupExt[];
	priceBreakdown: PriceBreakdown;
	salesChoices: JobChoice[];
	myFavorites: MyFavorite[];
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	options: PlanOption[];

	@ViewChild(MatAccordion) accordion: MatAccordion;

	get showPendingAndContractedToggle(): boolean
	{
		return (this.buildMode === BuildMode.Buyer || this.buildMode === BuildMode.BuyerPreview) && !this.isDesignComplete;
	}

	constructor(private store: Store<fromRoot.State>,
		private activatedRoute: ActivatedRoute,
		private cd: ChangeDetectorRef,
		private brandService: BrandService,
		private titleService: Title
	)
	{
		super();

		this.brandTheme = this.brandService.getBrandTheme();
	}

	ngOnInit()
	{
		//get community name
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName =>
		{
			this.communityName = communityName;
		});

		//get plan name
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData =>
		{
			this.planName = planData?.salesName;
		});

		//get prices
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);

		//get filtered tree
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

		//get favorites
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.favoriteState)
		).subscribe(fav =>
		{
			this.salesChoices = fav && fav.salesChoices;
			this.includeContractedOptions = fav && fav.includeContractedOptions;
			
			this.myFavorites = fav && fav.myFavorites;
			if (this.myFavorites?.length)
			{
				const favorites = this.myFavorites.flatMap(fav => fav.myFavoritesChoice);
				this.isEmptyFavorites = favorites.length === 0;
			}
			else
			{
				this.isEmptyFavorites = true;
			} 
		});

		//get sales agreement, build mode, and title
		combineLatest([
			this.activatedRoute.paramMap,
			this.store.pipe(select(state => state.salesAgreement)),
			this.store.pipe(select(state => state.scenario)),
			this.store.pipe(select(fromRoot.favoriteTitle))
		]).pipe(
			take(1),
			this.takeUntilDestroyed(),
			distinctUntilChanged()
		).subscribe(([params, salesAgreementState, scenarioState, title]) =>
		{
			if (salesAgreementState.salesAgreementLoading || salesAgreementState.loadError)
			{
				return new Observable<never>();
			}

			// read variables
			this.isPresalePricingEnabled = scenarioState.presalePricingEnabled;
			this.buildMode = scenarioState.buildMode;
			this.isPresale = this.buildMode === BuildMode.Presale;
			this.isDesignComplete = salesAgreementState?.isDesignComplete || false;
			// RULE: preview='Preview Favorites'	presale='My Favoirtes'	buyer/buyerPreview(from state title)=LastName?'LastName Favorites':'Favorites'
			this.summaryTitle = this.buildMode === BuildMode.Preview ? 'Preview Favorites' : (this.isPresale ? 'My Favorites' : title);
		});

	}

	ngAfterViewInit(): void
	{
		// Calculate the sticky header size to offset the sticky content
		this.stickyHeaderOffset = this.stickyHeader.nativeElement.offsetHeight;
		this.cd.detectChanges();
	}

	onPrint() 
	{
		if (this.isEmptyFavorites && !this.includeContractedOptions)
		{
			return;
		}
		this.titleService.setTitle(`${this.communityName} ${this.planName}`);
		window.print();
	}

	onContractedOptionsToggled(e)
	{
		this.store.dispatch(new FavoriteActions.ToggleContractedOptions());
		this.cd.detectChanges();
	}


	getGroupExts(groups: Group[]): GroupExt[]
	{
		return groups.map(g =>
		{
			return new GroupExt(g);
		})
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

	get optionDisclaimerText()
	{
		return Constants.DISCLAIMER_OPTION_SELECTIONS;
	}

	get disclaimerText()
	{
		return Constants.DISCLAIMER_MESSAGE;
	}

	//get total price label
	getTotalPriceLabel()
	{
		if (this.isDesignComplete)
		{
			return 'Total Purchase Price:';
		}
		else if (this.isPresale && this.isPresalePricingEnabled)
		{
			return 'Estimated Total Price:';
		}
		else
		{
			return 'Estimated Total Purchase Price:';
		}
	}

	togglePriceDisplay()
	{
		this.showDetailPrice = !this.showDetailPrice;
	}
}
