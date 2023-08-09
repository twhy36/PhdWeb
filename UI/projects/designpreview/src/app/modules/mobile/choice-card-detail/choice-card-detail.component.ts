import { ActivatedRoute, Router } from '@angular/router';
import
{
	AfterViewInit,
	ChangeDetectorRef,
	Component,
	ElementRef,
	OnInit,
	ViewChild,
} from '@angular/core';
import { combineLatest } from 'rxjs';
import { NgbCarousel } from '@ng-bootstrap/ng-bootstrap';
import { select, Store } from '@ngrx/store';

import
{
	Choice,
	DecisionPoint,
	getChoiceImageList,
	getDependentChoices,
	Group,
	JobChoice,
	MyFavoritesChoice,
	MyFavoritesPointDeclined,
	OptionImage,
	PickType,
	PlanOption,
	SubGroup,
	Tree,
	TreeVersionRules,
	UnsubscribeOnDestroy,
} from 'phd-common';

import * as fromFavorite from '../../ngrx-store/favorite/reducer';
import * as fromRoot from '../../ngrx-store/reducers';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import * as FavoriteActions from '../../ngrx-store/favorite/actions';
import * as ScenarioActions from '../../ngrx-store/scenario/actions';

import { BuildMode } from '../../shared/models/build-mode.model';
import { ChoiceExt } from '../../shared/models/choice-ext.model';

@Component({
	selector: 'choice-card-detail',
	templateUrl: './choice-card-detail.component.html',
	styleUrls: ['./choice-card-detail.component.scss'],
})
export class ChoiceCardDetailComponent extends UnsubscribeOnDestroy implements OnInit, AfterViewInit
{
	@ViewChild('imageCarousel') imageCarousel: NgbCarousel;
	@ViewChild('estimatedTotals') estimatedTotals: ElementRef;

	choice: ChoiceExt;

	subGroupCatalogId: number;
	decisionPointCatalogId: number;
	choiceCatalogId: number;
	isPreview: boolean;
	isPresale: boolean;
	isDesignComplete: boolean;
	isPresalePricingEnabled: boolean;

	tree: Tree;
	treeVersionRules: TreeVersionRules;
	options: PlanOption[];
	groups: Group[];
	myFavoritesPointsDeclined: MyFavoritesPointDeclined[];
	myFavoriteId: number;
	unfilteredPoints: DecisionPoint[];
	salesChoices: JobChoice[];
	choiceDescriptions: string[];
	myFavoritesChoices: MyFavoritesChoice[];
	choiceImages: OptionImage[];
	selectedImageUrl: string;
	activeIndex = { current: 0, direction: '', prev: 0 };

	expandDescription: boolean = false;
	descOverflowedOnLoad: boolean = false;
	estimatedTotalsOffsetHeight: number;

	defaultImage: string = 'assets/NoImageAvailable.png';

	constructor(
		private activatedRoute: ActivatedRoute,
		private router: Router,
		private store: Store<fromRoot.State>,
		private cd: ChangeDetectorRef
	) 
	{
		super();
	}

	ngOnInit() 
	{
		this.activatedRoute.paramMap.subscribe(
			(paramMap) =>
			{
				this.subGroupCatalogId = +paramMap.get('subGroupCatalogId');
				this.decisionPointCatalogId = +paramMap.get('decisionPointCatalogId');
				this.choiceCatalogId = +paramMap.get('choiceCatalogId');
			}
		);

		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select(fromFavorite.currentMyFavorite)
			)
			.subscribe((favorite) => 
			{
				this.myFavoritesChoices = favorite && favorite.myFavoritesChoice;
				this.myFavoritesPointsDeclined = favorite && favorite.myFavoritesPointDeclined;
				this.myFavoriteId = favorite && favorite.id;
			});

		combineLatest([
			this.store.pipe(select((state) => state.scenario)),
			this.store.pipe(select(fromRoot.filteredTree)),
			this.store.pipe(select((state) => state.salesAgreement)),
			this.store.pipe(select(fromFavorite.favoriteState)),
		]).subscribe(([scenarioState, filteredTree, sag, fav]) => 
		{
			if (scenarioState.tree.treeVersion) 
			{
				const tree = scenarioState.tree.treeVersion;

				this.unfilteredPoints = tree.groups.flatMap(g => g.subGroups.flatMap(sg => sg.points)) || [];
			}

			this.tree = scenarioState.tree;
			this.treeVersionRules = structuredClone(scenarioState.rules);
			this.options = structuredClone(scenarioState.options);

			if (filteredTree) 
			{
				this.groups = filteredTree.groups;
			}

			this.salesChoices = fav && fav.salesChoices;

			if (scenarioState.treeLoading) 
			{
				return;
			}

			this.isPreview = scenarioState.buildMode === BuildMode.Preview;
			this.isPresale = scenarioState.buildMode === BuildMode.Presale;
			this.isDesignComplete = sag?.isDesignComplete || false;

			if (filteredTree && this.subGroupCatalogId > 0) 
			{
				const groups = scenarioState.tree.treeVersion.groups;
				let sg: SubGroup;

				if (groups.length) 
				{
					sg = groups.flatMap(g => g.subGroups).find(sg => sg.subGroupCatalogId === this.subGroupCatalogId);

					//when choice is requested for detail and subgroup not in filtered tree, find subgroup in original tree
					if (!sg) 
					{
						this.rerouteHome();
					}

					if (this.choiceCatalogId > 0) 
					{
						const paramPoint = sg.points.find(p => p.divPointCatalogId === this.decisionPointCatalogId);

						if (!paramPoint)
						{
							this.rerouteHome();
						}

						const paramChoice = paramPoint?.choices.find((c) => this.choiceCatalogId === c.divChoiceCatalogId);

						if (!paramChoice) 
						{
							this.rerouteHome();
						}

						this.getChoiceExt(paramChoice, paramPoint);
					}
				}
			}
		});

		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select(fromScenario.presalePricingEnabled)
			)
			.subscribe((isPricingEnabled) => 
			{
				this.isPresalePricingEnabled = isPricingEnabled;
			});

		const desc = this.choice.description ? [this.choice.description] : [];

		this.choiceDescriptions =
			this.choice.options && this.choice.options.length > 0
				? this.choice.options
					.filter((o) => o.description != null)
					.map((o) => o.description)
				: desc;
	}

	ngAfterViewInit() 
	{
		this.descOverflowedOnLoad = this.isTextOverflow('descriptionText');
		this.estimatedTotalsOffsetHeight = this.estimatedTotals.nativeElement.offsetHeight;

		this.cd.detectChanges();
	}

	get optionDisabled(): boolean 
	{
		return this.choice.quantity <= 0 && this.choice.options ? this.choice.options.some((option) => !option.isActive) : false;
	}

	getChoiceExt(choice: Choice, point: DecisionPoint): void 
	{
		const unfilteredPoint = this.unfilteredPoints.find((up) => up.divPointCatalogId === point.divPointCatalogId);
		let choiceStatus = 'Available';

		if (point.isPastCutOff || this.salesChoices?.findIndex((c) => c.divChoiceCatalogId === choice.divChoiceCatalogId) > -1) 
		{
			choiceStatus = 'Contracted';
		}
		else 
		{
			const contractedChoices = unfilteredPoint.choices.filter((c) => this.salesChoices?.findIndex((x) => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);

			if (contractedChoices && contractedChoices.length && (point.pointPickTypeId === PickType.Pick1 || point.pointPickTypeId === PickType.Pick0or1)) 
			{
				choiceStatus = 'ViewOnly';
			}
		}

		const myFavoritesChoice = this.myFavoritesChoices ? this.myFavoritesChoices.find((x) => x.divChoiceCatalogId === choice.divChoiceCatalogId) : null;

		this.choice = new ChoiceExt(
			choice,
			choiceStatus,
			myFavoritesChoice,
			point.isStructuralItem
		);

		this.getImages();
	}

	/**
	 * Runs when the carousel moves to a new image
	 * @param event
	 */
	onSlide(event): void 
	{
		this.activeIndex = event;

		if (this.activeIndex) 
		{
			this.selectedImageUrl =	this.choiceImages[this.activeIndex.current].imageURL;
		}
	}

	getImages(): void 
	{
		this.choiceImages = getChoiceImageList(this.choice);

		if (!this.choiceImages.length) 
		{
			this.choiceImages.push({ imageURL: '' });
		}
		else
		{
			this.selectedImageUrl = this.choiceImages[0].imageURL;
		}
	}

	imageClick(image: OptionImage): void 
	{
		this.selectedImageUrl = image.imageURL;

		const imageIndex = this.choiceImages.findIndex((x) => x.imageURL === image.imageURL);

		if (imageIndex > -1) 
		{
			this.cd.detectChanges();

			this.imageCarousel.select(imageIndex.toString());
		}
	}

	toggleChoice(choice: ChoiceExt): void 
	{
		const selectedChoices = [
			{
				choiceId: choice.id,
				divChoiceCatalogId: choice.divChoiceCatalogId,
				quantity: !choice.quantity ? 1 : 0,
				attributes: choice.selectedAttributes,
			},
		];
		const impactedChoices = getDependentChoices(this.tree, this.treeVersionRules, this.options, choice);

		impactedChoices.forEach((c) => 
		{
			selectedChoices.push({
				choiceId: c.id,
				divChoiceCatalogId: c.divChoiceCatalogId,
				quantity: 0,
				attributes: c.selectedAttributes,
			});
		});

		if (choice.quantity === 0) 
		{
			this.deselectDeclinedPoints(choice);
		}

		this.store.dispatch(new ScenarioActions.SelectChoices(this.isDesignComplete, ...selectedChoices));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
	}

	deselectDeclinedPoints(choice: ChoiceExt): void 
	{
		// Check for favorites and deselect declined points in favorites
		const points = this.groups.flatMap(g => g.subGroups.flatMap(sg => sg.points)) || [];
		const pointDeclined = points.find((p) => p.choices.some((c) => c.divChoiceCatalogId === choice.divChoiceCatalogId));
		const fdp = this.myFavoritesPointsDeclined?.find((p) => p.divPointCatalogId === pointDeclined.divPointCatalogId);

		if (fdp) 
		{
			this.store.dispatch(new FavoriteActions.DeleteMyFavoritesPointDeclined(this.myFavoriteId, fdp.id));
		}
	}

	isTextOverflow(id: string): boolean 
	{
		const elem = document.getElementById(id);

		if (elem) 
		{
			return elem.offsetHeight < elem.scrollHeight;
		}

		return false;
	}

	private rerouteHome()
	{
		this.router.navigate(['/']);
	}
}
