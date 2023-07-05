import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store, select } from '@ngrx/store';

import { combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, withLatestFrom } from 'rxjs/operators';
import * as _ from 'lodash';
import
{
	UnsubscribeOnDestroy, flipOver, DecisionPoint, SubGroup, Choice, TreeVersion, 
	MyFavoritesChoice, getDependentChoices, Tree, TreeVersionRules, PlanOption, 
	MyFavoritesPointDeclined, ModalRef, ModalService, JobChoice, PickType, PriceBreakdown
} from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromApp from '../../../ngrx-store/app/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as AppActions from '../../../ngrx-store/app/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { ChoiceExt } from '../../../shared/models/choice-ext.model';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { WelcomeModalComponent } from '../../../core/components/welcome-modal/welcome-modal.component';
import { BrandService } from '../../../core/services/brand.service';

@Component({
	selector: 'included-options',
	templateUrl: './included-options.component.html',
	styleUrls: ['./included-options.component.scss'],
	animations: [flipOver]
	})
export class IncludedOptionsComponent extends UnsubscribeOnDestroy implements OnInit
{
	brandTheme: string;
	communityName: string = '';
	planName: string = '';
	isPointPanelCollapsed: boolean = false;
	subGroups: SubGroup[];
	points: DecisionPoint[];
	currentPointId: number;
	currentSubGroupId: number;
	choiceToggled: boolean = false;
	includedTree: TreeVersion;
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	options: PlanOption[];
	isReadonly: boolean = false;
	isPresale: boolean = false;
	buildMode: BuildMode;
	noVisibleGroups: boolean = false;
	myFavoriteId: number;
	myFavoritesChoices: MyFavoritesChoice[];
	myFavoritesPointsDeclined: MyFavoritesPointDeclined[];
	welcomeModal: ModalRef;
	showWelcomeModal: boolean = true;
	viewCreated: boolean = false;
	isPresalePricingEnabled: boolean = false;
	salesChoices: JobChoice[];
	unfilteredPoints: DecisionPoint[] = [];
	priceBreakdown: PriceBreakdown;

	constructor(private store: Store<fromRoot.State>,
		private brandService: BrandService,
		private modalService: ModalService,
		private router: Router)
	{
		super();

		this.brandTheme = this.brandService.getBrandTheme();
	}

	ngOnInit()
	{
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
			this.store.pipe(select(state => state.scenario), this.takeUntilDestroyed()),
			this.store.pipe(select(fromApp.welcomeAcknowledged), this.takeUntilDestroyed()),
		]).subscribe(([scenarioState, taca]) =>
		{
			this.tree = scenarioState.tree;
			this.unfilteredPoints = _.flatMap(scenarioState.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || [];
			this.treeVersionRules = _.cloneDeep(scenarioState.rules);
			this.options = _.cloneDeep(scenarioState.options);
			this.isReadonly = scenarioState.buildMode === BuildMode.BuyerPreview;
			this.isPresale = scenarioState.buildMode === BuildMode.Presale;
			this.isPresalePricingEnabled = scenarioState.presalePricingEnabled;

			if (!taca && scenarioState.buildMode == BuildMode.Presale)
			{
				this.store.dispatch(new AppActions.ShowWelcomeModal(true));
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.includedTree)
		).subscribe(tree =>
		{
			if (tree)
			{
				this.includedTree = tree;
				this.noVisibleGroups = !this.includedTree.groups.length;

				this.subGroups = _.flatMap(this.includedTree.groups, g => g.subGroups) || [];
				this.points = _.flatMap(this.includedTree.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || [];
			}
		});


		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state?.scenario)
		).subscribe(scenario =>
		{
			this.buildMode = scenario.buildMode;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			distinctUntilChanged(),
			select(fromApp.showWelcomeModal),
		).subscribe(showWelcomeModal => 
		{
			this.showWelcomeModal = showWelcomeModal;
		});

		if (this.showWelcomeModal) 
		{
			const ngbModalOptions: NgbModalOptions =
			{
				centered: true,
				backdrop: 'static',
				keyboard: false,
				windowClass: this.brandTheme,
			};

			this.welcomeModal = this.modalService.open(WelcomeModalComponent, ngbModalOptions, true);
		}

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.favoriteState)
		).subscribe(favorite =>
		{
			this.salesChoices = favorite && favorite.salesChoices;
			if (!!!favorite)
			{
				this.store.dispatch(new FavoriteActions.LoadDefaultFavorite());
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavorite)
		).subscribe(favorite =>
		{
			this.myFavoritesChoices = favorite?.myFavoritesChoice;
			this.myFavoriteId = favorite?.id || -1;
			this.myFavoritesPointsDeclined = favorite?.myFavoritesPointDeclined;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);

		//subscribe to changes in subgroup selection
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.nav),
			withLatestFrom(this.store.pipe(select(fromRoot.includedTree), map(tree => tree && tree.groups), filter(groups => !!groups))),
			debounceTime(100)
		).subscribe(([nav, groups]) =>
		{
			this.currentSubGroupId = nav && nav.includedSubGroup;
			this.currentPointId = nav && nav.includedPoint;

			// If an included subgroup but no included point
			if (!this.currentPointId && this.currentSubGroupId)
			{
				//scroll subgroup into view
				this.selectSubGroup(this.currentSubGroupId);
			}
			// If an included point but no included subgroup
			else if (this.currentPointId && !this.currentSubGroupId)
			{
				//scroll point into view
				this.selectDecisionPoint(this.currentPointId);
			}
		});
	}

	togglePointPanel()
	{
		this.isPointPanelCollapsed = !this.isPointPanelCollapsed;
	}

	selectDecisionPoint(pointId: number, interval?: number)
	{
		if (pointId)
		{
			const firstPointId = this.points && this.points.length ? this.points[0].id : 0;

			this.scrollPointIntoView(pointId, pointId === firstPointId);
		}
		if (this.currentPointId !== pointId)
		{
			this.store.dispatch(new NavActions.SetIncludedSubgroup(null, pointId));
		}
	}

	selectSubGroup(subGroupId: number, interval?: number)
	{
		if (subGroupId)
		{
			setTimeout(() =>
			{
				const firstSubGroupId = this.subGroups && this.subGroups.length ? this.subGroups[0].id : 0;

				this.scrollSubGroupIntoView(subGroupId, subGroupId === firstSubGroupId);
			}, interval || 500);
		}

		if (this.currentSubGroupId !== subGroupId)
		{
			this.store.dispatch(new NavActions.SetIncludedSubgroup(subGroupId, null));
		}
	}

	choiceToggleHandler(choice: ChoiceExt)
	{
		const point = this.points.find(p => p.choices.some(c => c.id === choice.id));

		if (point && this.currentPointId != point.id)
		{
			this.currentPointId = point.id;
		}

		this.choiceToggled = true;

		this.toggleChoice(choice);
	}

	toggleChoice(choice: ChoiceExt)
	{
		const selectedChoices = [{ choiceId: choice.id, divChoiceCatalogId: choice.divChoiceCatalogId, quantity: !choice.quantity ? 1 : 0, attributes: choice.selectedAttributes }];
		const impactedChoices = getDependentChoices(this.tree, this.treeVersionRules, this.options, choice);

		impactedChoices.forEach(c =>
		{
			selectedChoices.push({ choiceId: c.id, divChoiceCatalogId: c.divChoiceCatalogId, quantity: 0, attributes: c.selectedAttributes });
		});

		if (choice.quantity === 0)
		{
			this.deselectDeclinedPoints(choice);
		}

		this.store.dispatch(new ScenarioActions.SelectChoices(false, ...selectedChoices));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
	}

	deselectDeclinedPoints(choice: ChoiceExt)
	{
		// Check for favorites and deselect declined points in favorites
		const points = _.flatMap(this.includedTree.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || [];
		const pointDeclined = points.find(p => p.choices.some(c => c.divChoiceCatalogId === choice.divChoiceCatalogId));
		const fdp = this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === pointDeclined.divPointCatalogId);

		if (fdp)
		{
			this.store.dispatch(new FavoriteActions.DeleteMyFavoritesPointDeclined(this.myFavoriteId, fdp.id));
		}
	}

	getChoiceExt(choice: Choice, point: DecisionPoint): ChoiceExt
	{
		const unfilteredPoint = this.unfilteredPoints.find(up => up.divPointCatalogId === point.divPointCatalogId);
		let choiceStatus = 'Available';
		if (!this.isPresale) 
		{
			if (point.isPastCutOff || this.salesChoices?.findIndex(c => c.divChoiceCatalogId === choice.divChoiceCatalogId) > -1)
			{
				choiceStatus = 'Contracted';
			}
			else
			{
				const contractedChoices = unfilteredPoint.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);
				if (contractedChoices && contractedChoices.length &&
					(point.pointPickTypeId === PickType.Pick1 || point.pointPickTypeId === PickType.Pick0or1))
				{
					choiceStatus = 'ViewOnly';
				}
			}
		}

		const myFavoritesChoice = this.myFavoritesChoices ? this.myFavoritesChoices.find(x => x.divChoiceCatalogId === choice.divChoiceCatalogId) : null;

		return new ChoiceExt(choice, choiceStatus, myFavoritesChoice, point.isStructuralItem);
	}

	scrollPointIntoView(pointId: number, isFirstPoint: boolean)
	{
		const pointCardElement = <HTMLElement>document?.getElementById(`included-point-${pointId?.toString()}`);

		if (pointCardElement)
		{
			if (isFirstPoint)
			{
				setTimeout(() =>
				{
					pointCardElement.scrollIntoView({ behavior: (this.viewCreated ? 'smooth' : 'auto'), block: 'center', inline: 'nearest' });
					this.viewCreated = true;
				}, 200);
			}
			else
			{
				// Workaround to display the element moved under the nav bar
				setTimeout(() =>
				{
					const pos = pointCardElement.style.position;
					const top = pointCardElement.style.top;

					pointCardElement.style.position = 'relative';
					pointCardElement.style.top = '-10px';

					pointCardElement.scrollIntoView({ behavior: (this.viewCreated ? 'smooth' : 'auto'), block: 'start' });

					this.viewCreated = true;

					pointCardElement.style.top = top;
					pointCardElement.style.position = pos;
				}, 200);
			}
		}

		const decisionBarElement = document.getElementById('included-decision-bar-' + pointId?.toString());

		if (decisionBarElement)
		{
			setTimeout(() => 
			{
				decisionBarElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
			}, 1000);
		}
	}

	scrollSubGroupIntoView(subGroupId: number, isFirstSubGroup: boolean)
	{
		const subGroupElement = <HTMLElement>document?.getElementById(`included-subgroup-${subGroupId?.toString()}`);

		if (subGroupElement)
		{
			if (isFirstSubGroup)
			{
				setTimeout(() =>
				{
					subGroupElement.scrollIntoView({ behavior: (this.viewCreated ? 'smooth' : 'auto'), block: 'center', inline: 'nearest' });

					this.viewCreated = true;
				}, 200);
			}
			else
			{
				// Workaround to display the element moved under the nav bar
				setTimeout(() =>
				{
					const pos = subGroupElement.style.position;
					const top = subGroupElement.style.top;

					subGroupElement.style.position = 'relative';
					subGroupElement.style.top = '-10px';

					subGroupElement.scrollIntoView({ behavior: (this.viewCreated ? 'smooth' : 'auto'), block: 'start' });

					this.viewCreated = true;

					subGroupElement.style.top = top;
					subGroupElement.style.position = pos;
				}, 200);
			}
		}

		const decisionBarSgElement = document.getElementById('included-decision-bar-sg-' + subGroupId?.toString());

		if (decisionBarSgElement)
		{
			setTimeout(() => 
			{
				decisionBarSgElement.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
			}, 1000);
		}
	}

	viewChoiceDetail(choice: ChoiceExt)
	{
		const pointId = this.points?.length ? this.points.find(p => p.choices.find(c => c.id === choice.id))?.id || this.points[0].id : 0;
		const selectedSubGroup = this.subGroups.find(sg => !!sg.points.find(p => p.id === pointId));

		this.selectDecisionPoint(pointId);

		this.router.navigate(['favorites', 'my-favorites', this.myFavoriteId, selectedSubGroup.subGroupCatalogId, choice.divChoiceCatalogId], { queryParamsHandling: 'merge' });
	}

	defaultChoicePresent(subGroup: SubGroup)
	{
		const choices = _.flatMap(subGroup.points, p => p.choices).filter(c => c.isDecisionDefault);

		return choices.length > 0;
	}

	displayedChoices(choices: ChoiceExt[])
	{
		return choices.filter(c => c.isDecisionDefault);
	}

	displayDecisionPoint(point: DecisionPoint)
	{
		if (point.isHiddenFromBuyerView)
		{
			return false;
		}
		else
		{
			const choices = _.flatMap(point.choices).filter(c => c.isDecisionDefault);
			let displayChoice = false;

			choices.forEach(c =>
			{
				if (!c.isHiddenFromBuyerView)
				{
					displayChoice = true;
				}
			});

			return displayChoice;
		}
	}

	onNextClicked()
	{
		this.router.navigate(['favorites', 'my-favorites', this.myFavoriteId], { queryParamsHandling: 'merge' });
	}

	onViewDecisionPoint(point: DecisionPoint)
	{
		const sg = this.subGroups.find(sg => !!sg.points.find(p => p.divPointCatalogId === point.divPointCatalogId));

		this.selectDecisionPoint(point.id);

		this.store.dispatch(new NavActions.SetSelectedSubgroup(sg.id, point.id));

		this.router.navigate(['favorites', 'my-favorites', this.myFavoriteId, sg.subGroupCatalogId], { queryParamsHandling: 'merge' });
	}
}
