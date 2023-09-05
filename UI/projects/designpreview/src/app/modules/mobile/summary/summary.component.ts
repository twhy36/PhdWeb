import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { MatAccordion } from '@angular/material/expansion';

import { DecisionPoint, Group, JobChoice, MyFavorite, PlanOption, PriceBreakdown, SubGroup, Tree, TreeVersionRules, UnsubscribeOnDestroy } from 'phd-common';
import { Observable, combineLatest } from 'rxjs';
import { distinctUntilChanged, take } from 'rxjs/operators';

import * as fromFavorite from '../../ngrx-store/favorite/reducer';
import * as fromPlan from '../../ngrx-store/plan/reducer';
import * as fromRoot from '../../ngrx-store/reducers';
import * as FavoriteActions from '../../ngrx-store/favorite/actions';
import { BrandService } from '../../core/services/brand.service';

import { GroupExt } from '../../shared/models/group-ext.model';
import { BuildMode } from '../../shared/models/build-mode.model';
import { Constants } from '../../shared/classes/constants.class';
import { ChoiceCustom } from '../../shared/components/decision-point-summary/decision-point-summary.component';
import { Store, select } from '@ngrx/store';

@Component({
	selector: 'summary',
	templateUrl: './summary.component.html',
	styleUrls: ['./summary.component.scss'],
// eslint-disable-next-line indent
})
export class SummaryComponent extends UnsubscribeOnDestroy implements OnInit 
{
	@ViewChild('stickyHeader') stickyHeader: ElementRef

	summaryTitle: string = '';
	buildMode: string;
	communityName: string = '';
	planName: string = '';
	lotAddress: string = '';
	lotNumber: string = '';
	brandTheme: string;
	showOptionText: string = Constants.SHOW_OPTIONS_TEXT;
	favoritesId: number;

	isDesignComplete: boolean = false;
	isPresalePricingEnabled: boolean = false;
	hasAgreement: boolean = false;
	groupExpanded = true;
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

	visibleFP: boolean = true;
	floorplanDisclaimerText: string = Constants.FLOORPLAN_DISCLAIMER_MESSAGE;

	@ViewChild(MatAccordion) accordion: MatAccordion;

	get showPendingAndContractedToggle(): boolean
	{
		return (this.buildMode === BuildMode.Buyer || this.buildMode === BuildMode.BuyerPreview) && !this.isDesignComplete;
	}

	constructor(private store: Store<fromRoot.State>,
		private cd: ChangeDetectorRef,
		private brandService: BrandService,
		private titleService: Title,
		public sanitizer: DomSanitizer
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
			this.store.pipe(select((state) => state.salesAgreement)),
			this.store.pipe(select((state) => state.scenario)),
			this.store.pipe(select(fromRoot.favoriteTitle)),
			this.store.pipe(select((state) => state.plan)),
		])
			.pipe(take(1), this.takeUntilDestroyed(), distinctUntilChanged())
			.subscribe(([salesAgreementState, scenarioState, title, plan]) => 
			{
				if (salesAgreementState?.salesAgreementLoading || salesAgreementState?.loadError)
				{
					return new Observable<never>();
				}

				//read variables
				this.isPresalePricingEnabled = scenarioState.presalePricingEnabled;
				this.buildMode = scenarioState.buildMode;
				this.isPresale = this.buildMode === BuildMode.Presale;
				this.isDesignComplete = salesAgreementState?.isDesignComplete || false;
				this.hasAgreement = salesAgreementState && salesAgreementState.id > 0;
				//RULE: preview='Preview Favorites'	presale='My Favorites'	buyer/buyerPreview(from state title)=LastName?'LastName Favorites':'Favorites'
				this.summaryTitle = this.buildMode === BuildMode.Preview ? 'Preview Favorites' : (this.isPresale ? 'My Favorites' : title);

				if (
					plan &&
					plan.marketingPlanId &&
					plan.marketingPlanId.length
				) 
				{
					if (scenarioState.tree && scenarioState.tree.treeVersion) 
					{
						const subGroups =
							scenarioState.tree.treeVersion.groups.flatMap(
								(g) => g.subGroups
							) || [];
						const fpSubGroup = subGroups.find(
							(sg) => sg.useInteractiveFloorplan
						);

						if (!fpSubGroup) 
						{
							this.visibleFP = false;
						}
					}
					else 
					{
						this.visibleFP = false;
					}
				}
				else 
				{
					this.visibleFP = false;
				}
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

	displaySubGroupPoints(sg: SubGroup)
	{
		return sg.points.some(p => this.displayPoint(p));
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

	decisionPointHasSelectedChoices(dp: DecisionPoint): boolean
	{
		const choices =
			this.includeContractedOptions
				? dp.choices
				: dp.choices.filter(
					(c) =>
						!this.salesChoices ||
						this.salesChoices.findIndex(
							(sc) =>
								sc.divChoiceCatalogId ===
								c.divChoiceCatalogId
						) === -1
				);
		const choicesCustom = choices.map((c) => new ChoiceCustom(c));
		return choicesCustom.some(c => c.quantity > 0);
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
