import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { combineLatest, map, filter, distinctUntilChanged, withLatestFrom, debounceTime } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';

import
	{
		UnsubscribeOnDestroy,
		PriceBreakdown,
		Group,
		SubGroup,
		Tree,
		TreeVersionRules,
		PlanOption,
		JobChoice,
		getDependentChoices,
		DecisionPoint,
		ChoiceImageAssoc,
		MyFavoritesChoice,
		MyFavoritesPointDeclined,
		Choice,
		PickType
	} from 'phd-common';

import { GroupBarComponent } from '../../../shared/components/group-bar/group-bar.component';
import { NormalExperienceComponent } from './normal-experience/normal-experience.component';
import { ChoiceExt } from '../../../shared/models/choice-ext.model';
import { TreeService } from '../../../core/services/tree.service';

@Component({
	selector: 'my-favorites',
	templateUrl: 'my-favorites.component.html',
	styleUrls: ['my-favorites.component.scss']
})
export class MyFavoritesComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(GroupBarComponent) private groupBar: GroupBarComponent;
	@ViewChild(NormalExperienceComponent) private mainPanel: NormalExperienceComponent;

	communityName: string = '';
	planName: string = '';
	groups: Group[];
	params$ = new ReplaySubject<{ favoritesId: number, subGroupCatalogId: number, divChoiceCatalogId: number }>(1);
	groupName: string = '';
	selectedSubGroup: SubGroup;
	selectedSubgroupId: number;
	selectedPointId: number;
	errorMessage: string = '';
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	options: PlanOption[];
	myFavoritesChoices: MyFavoritesChoice[];
	includeContractedOptions: boolean;
	salesChoices: JobChoice[];
	showDetails: boolean = false;
	selectedChoice: ChoiceExt;
	myFavoritesPointsDeclined: MyFavoritesPointDeclined[];
	myFavoriteId: number;
	priceBreakdown: PriceBreakdown;
	marketingPlanId$ = new BehaviorSubject<number>(0);
	isFloorplanFlipped: boolean;
	currentChoiceImages: ChoiceImageAssoc[];
	isPreview: boolean;
	isDesignComplete: boolean;
	isReadonly: boolean = false;
	noVisibleGroups: boolean = false;
	noVisibleFP: boolean = false;
	unfilteredPoints: DecisionPoint[] = [];

	constructor(private store: Store<fromRoot.State>,
		private route: ActivatedRoute,
		private router: Router,
		private cd: ChangeDetectorRef,
		private treeService: TreeService)
	{
		super();
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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree =>
		{
			if (tree)
			{
				this.groups = tree.groups;
				if (!this.groups.length)
				{
					this.noVisibleGroups = true;
				} else
				{
					this.noVisibleGroups = false;
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state?.scenario?.tree?.treeVersion)
		).subscribe(tree =>
		{
			if (tree)
			{
				this.unfilteredPoints = _.flatMap(tree.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || [];
			}
		});

		this.route.paramMap.pipe(
			this.takeUntilDestroyed(),
			map(params => { return { favoritesId: +params.get('favoritesId'), subGroupCatalogId: +params.get('subGroupCatalogId'), divChoiceCatalogId: +params.get('divChoiceCatalogId') }; }),
			distinctUntilChanged()
		).subscribe(params => this.params$.next(params));

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
			combineLatest(this.params$),
			combineLatest(this.store.pipe(select(fromRoot.filteredTree)), this.store.pipe(select(state => state.salesAgreement)), this.store.pipe(select(fromFavorite.favoriteState)))
		).subscribe(([[scenarioState, params], filteredTree, sag, fav]) =>
		{
			this.includeContractedOptions = fav && fav.includeContractedOptions;
			this.salesChoices = fav && fav.salesChoices;

			this.errorMessage = '';

			if (scenarioState.treeLoading)
			{
				return;
			}

			this.isPreview = scenarioState.buildMode === 'preview';
			this.isDesignComplete = sag?.isDesignComplete || false;

			if (filteredTree && params.subGroupCatalogId > 0)
			{
				let groups = filteredTree.groups;
				let sg;

				if (groups.length)
				{
					sg = _.flatMap(groups, g => g.subGroups).find(sg => sg.subGroupCatalogId === params.subGroupCatalogId);

					if (!sg)
					{
						let subGroupCatalogId = groups[0].subGroups[0].subGroupCatalogId;

						//this happens if the subgroup has been filtered out of the tree - find a new subgroup to navigate to
						if (!!this.selectedSubgroupId)
						{
							let origGroup = groups.find(g => g.subGroups.some(sg => sg.id === this.selectedSubgroupId));

							if (origGroup)
							{
								let origSg = origGroup.subGroups.find(sg => sg.id === this.selectedSubgroupId);

								if (origSg)
								{
									subGroupCatalogId = origSg.subGroupCatalogId;
								}
								else
								{
									subGroupCatalogId = origGroup.subGroups[0].subGroupCatalogId;
								}
							}
						}
						this.router.navigate(['..', subGroupCatalogId], { relativeTo: this.route });
					}
					else
					{
						this.setSelectedGroup(groups.find(g => g.subGroups.some(sg1 => sg1.id === sg.id)), sg);

						if (params.divChoiceCatalogId > 0)
						{
							const paramPoint = this.selectedSubGroup.points.find(p => p.choices.find(c => params.divChoiceCatalogId === c.divChoiceCatalogId));
							const paramChoice = paramPoint?.choices.find(c => params.divChoiceCatalogId === c.divChoiceCatalogId);

							if (!!paramChoice)
							{
								this.openChoiceDetailPage(this.getChoiceExt(paramChoice, paramPoint));
							}
						}
					}
				}
				else if (scenarioState.treeFilter)
				{
					// find the last subgroup we were on using the full tree
					groups = scenarioState.tree.treeVersion.groups;
					sg = _.flatMap(groups, g => g.subGroups).find(sg => sg.subGroupCatalogId === params.subGroupCatalogId);

					if (sg)
					{
						this.setSelectedGroup(groups.find(g => g.subGroups.some(sg1 => sg1.id === sg.id)), sg);
					}

					this.errorMessage = 'Seems there are no results that match your search criteria.';
				}
			}
			else if (filteredTree && !this.noVisibleGroups)
			{
				const subGroup = filteredTree.groups[0].subGroups[0];

				this.router.navigate([subGroup.subGroupCatalogId], { relativeTo: this.route });
			}
		});

		//subscribe to changes in subgroup selection
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.nav),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree), map(tree => tree && tree.groups), filter(groups => !!groups))),
			debounceTime(100)
		).subscribe(([nav, groups]) =>
		{
			const sgId = nav && nav.selectedSubGroup;
			const subGroup = _.flatMap(groups, g => g.subGroups).find(s => s.id === sgId) || _.flatMap(groups, g => g.subGroups)[0];

			this.selectedPointId = nav && nav.selectedPoint;
			if (!this.selectedPointId && subGroup && subGroup.points && subGroup.points.length)
			{
				this.selectedPointId = subGroup.points[0].id;
			}

			if ((nav.selectedSubGroup !== this.selectedSubGroup?.id) && subGroup)
			{
				if (!!this.selectedSubGroup) {
					this.router.navigate(['..', this.selectedSubGroup?.subGroupCatalogId], { relativeTo: this.route });
				} else {
					this.router.navigate(['..', subGroup?.subGroupCatalogId], { relativeTo: this.route });
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);

		this.store.pipe(
			select(state => state.scenario),
		).subscribe(scenario =>
		{
			this.tree = scenario.tree;
			this.treeVersionRules = _.cloneDeep(scenario.rules);
			this.options = _.cloneDeep(scenario.options);
			this.isReadonly = scenario.buildMode === 'buyerPreview';
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavorite)
		).subscribe(favorite =>
		{
			this.myFavoritesChoices = favorite && favorite.myFavoritesChoice;
			this.myFavoritesPointsDeclined = favorite && favorite.myFavoritesPointDeclined;
			this.myFavoriteId = favorite && favorite.id;
			this.updateSelectedChoice();
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.favoriteState)
		).subscribe(fav =>
		{
			this.includeContractedOptions = fav && fav.includeContractedOptions;
			this.salesChoices = fav && fav.salesChoices;
		});

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
					if (fpSubGroup)
					{
						this.marketingPlanId$.next(plan.marketingPlanId[0]);
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

	setSelectedGroup(newGroup: Group, newSubGroup: SubGroup)
	{
		if (!!newSubGroup.id)
		{
			this.groupName = newGroup.label;
			this.selectedSubGroup = newSubGroup;
			this.selectedSubgroupId = newSubGroup.id;

			const choiceIds = (_.flatMap(newSubGroup.points, pt => pt.choices) || []).map(c => c.id);

			return this.treeService.getChoiceImageAssoc(choiceIds)
				.subscribe(choiceImages =>
				{
					this.currentChoiceImages = choiceImages;
				});
		}
	}

	onSubgroupSelected(id: number)
	{
		this.hideDetails(id);
	}

	onNextSubGroup()
	{
		const subGroups = _.flatMap(this.groups, g => _.flatMap(g.subGroups)) || [];
		const subGroupIndex = subGroups.findIndex(sg => sg.id === this.selectedSubgroupId);
		if (subGroupIndex > -1)
		{
			const nextSubgroup = subGroupIndex === subGroups.length - 1
				? subGroups[0]
				: subGroups[subGroupIndex + 1];

			this.groupBar.selectSubgroup(nextSubgroup.id);
		}
	}

	toggleChoice(choice: ChoiceExt)
	{
		let selectedChoices = [{ choiceId: choice.id, divChoiceCatalogId: choice.divChoiceCatalogId, quantity: !choice.quantity ? 1 : 0, attributes: choice.selectedAttributes }];
		const impactedChoices = getDependentChoices(this.tree, this.treeVersionRules, this.options, choice);

		impactedChoices.forEach(c =>
		{
			selectedChoices.push({ choiceId: c.id, divChoiceCatalogId: c.divChoiceCatalogId, quantity: 0, attributes: c.selectedAttributes });
		});

		if (choice.quantity === 0)
		{
			this.deselectDeclinedPoints(choice);
		}
		this.store.dispatch(new ScenarioActions.SelectChoices(this.isDesignComplete, ...selectedChoices));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());

	}

	deselectDeclinedPoints(choice: ChoiceExt)
	{
		// Check for favorites and deselect declined points in favorites
		const points = _.flatMap(this.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || [];
		const pointDeclined = points.find(p => p.choices.some(c => c.divChoiceCatalogId === choice.divChoiceCatalogId));
		const fdp = this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === pointDeclined.divPointCatalogId);

		if (fdp)
		{
			this.store.dispatch(new FavoriteActions.DeleteMyFavoritesPointDeclined(this.myFavoriteId, fdp.id));
		}
	}

	deselectPointChoices(declinedPointCatalogId: number)
	{
		let deselectedChoices = [];

		const points = _.flatMap(this.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || [];
		const pointDeclined = points.find(p => p.divPointCatalogId === declinedPointCatalogId);

		pointDeclined?.choices?.forEach(c =>
		{
			deselectedChoices.push({ choiceId: c.id, divChoiceCatalogId: c.divChoiceCatalogId, quantity: 0, attributes: [] });

			const impactedChoices = getDependentChoices(this.tree, this.treeVersionRules, this.options, c);

			impactedChoices.forEach(ch =>
			{
				deselectedChoices.push({ choiceId: ch.id, divChoiceCatalogId: ch.divChoiceCatalogId, quantity: 0, attributes: ch.selectedAttributes });
			});
		});

		this.store.dispatch(new ScenarioActions.SelectChoices(this.isDesignComplete, ...deselectedChoices));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
	}

	toggleContractedOptions()
	{
		this.store.dispatch(new FavoriteActions.ToggleContractedOptions());
	}

	openChoiceDetailPage(choice: ChoiceExt)
	{
		this.selectedChoice = choice;
		this.showDetails = true;
		this.selectedPointId = this.selectedChoice.treePointId;

		this.store.dispatch(new NavActions.SetSelectedSubgroup(this.selectedSubGroup.id, this.selectedChoice.treePointId, choice.id));	 
	}

	viewChoiceDetail(choice: ChoiceExt)
	{
		this.router.navigateByUrl(`/favorites/my-favorites/${this.myFavoriteId}/${this.selectedSubGroup.subGroupCatalogId}/${choice.divChoiceCatalogId}`);
	}

	hideDetails(sgId?: number)
	{
		if (!!sgId && sgId !== this.selectedSubgroupId) {
			const newSubgroup = _.flatMap(this.groups, g => g.subGroups).find(sg => sg.id === sgId);
			const firstPoint = newSubgroup?.points[0] || null;

			this.router.navigateByUrl(`/favorites/my-favorites/${this.myFavoriteId}/${newSubgroup.subGroupCatalogId}`);
			this.showDetails = false;
			this.selectedChoice = null;

			this.store.dispatch(new NavActions.SetSelectedSubgroup(sgId, firstPoint.id, null));
		} else {
			this.router.navigateByUrl(`/favorites/my-favorites/${this.myFavoriteId}/${this.selectedSubGroup.subGroupCatalogId}`);
			this.showDetails = false;
			this.selectedChoice = null;

			this.store.dispatch(new NavActions.SetSelectedSubgroup(this.selectedSubgroupId, this.selectedPointId, null));	 
		}
		

		this.cd.detectChanges();
		setTimeout(() =>
		{
			const firstPointId = this.selectedSubGroup.points && this.selectedSubGroup.points.length ? this.selectedSubGroup.points[0].id : 0;

			this.mainPanel?.scrollPointIntoView(this.selectedPointId, this.selectedPointId === firstPointId);
		}, 350);
	}

	getChoicePath(): string
	{
		let subGroupName = '';
		let pointName = '';

		if (this.selectedSubGroup)
		{
			subGroupName = this.selectedSubGroup.label;
			const selectedPoint = this.selectedSubGroup.points.find(p => p.id === this.selectedPointId);
			if (selectedPoint)
			{
				pointName = selectedPoint.label;
			}
		}

		return `${this.groupName} / ${subGroupName} / ${pointName}`;
	}

	updateSelectedChoice()
	{
		if (this.selectedChoice)
		{
			const choices = _.flatMap(this.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices))) || [];
			const updatedChoice = choices.find(c => c.divChoiceCatalogId === this.selectedChoice.divChoiceCatalogId);

			if (updatedChoice)
			{
				this.selectedChoice.quantity = updatedChoice.quantity;
				this.selectedChoice.myFavoritesChoice = this.myFavoritesChoices
					? this.myFavoritesChoices.find(x => x.divChoiceCatalogId === this.selectedChoice.divChoiceCatalogId)
					: null;
			}
		}
	}

	selectDecisionPoint(pointId: number)
	{
		this.selectedPointId = pointId;

		// if point is in a different subGroup, we need to select the subGroup as well
		if (this.selectedSubGroup && !this.selectedSubGroup.points.find(p => p.id === pointId))
		{
			const allSubGroups = _.flatMap(this.groups, g => g.subGroups)
			const newSubGroup = allSubGroups.find(sg => sg.points.find(p => p.id === pointId));

			this.store.dispatch(new NavActions.SetSelectedSubgroup(newSubGroup?.id, this.selectedPointId));
		}
		else {
			this.store.dispatch(new NavActions.SetSelectedSubgroup(this.selectedSubGroup?.id, this.selectedPointId));
		}
	}

	declineDecisionPoint(point: DecisionPoint)
	{
		const declPoint = this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === point.divPointCatalogId);

		if (!declPoint)
		{
			this.store.dispatch(new FavoriteActions.AddMyFavoritesPointDeclined(this.myFavoriteId, point.id, point.divPointCatalogId));
			this.deselectPointChoices(point.divPointCatalogId);
		}
		else
		{
			this.store.dispatch(new FavoriteActions.DeleteMyFavoritesPointDeclined(this.myFavoriteId, declPoint.id));
		}

		const declPointIds = [point.divPointCatalogId];

		this.store.dispatch(new ScenarioActions.SetStatusForPointsDeclined(declPointIds, !!declPoint));
	}

	treeFilterChanged()
	{
		this.showDetails = false;
		this.selectedChoice = null;
	}

	getChoiceExt(choice: Choice, point: DecisionPoint): ChoiceExt
	{
		let unfilteredPoint = this.unfilteredPoints.find(up => up.divPointCatalogId === point.divPointCatalogId);
		let choiceStatus = 'Available';

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

		const myFavoritesChoice = this.myFavoritesChoices ? this.myFavoritesChoices.find(x => x.divChoiceCatalogId === choice.divChoiceCatalogId) : null;
		const images = this.currentChoiceImages?.filter(x => x.dpChoiceId === choice.id);

		return new ChoiceExt(choice, choiceStatus, myFavoritesChoice, point.isStructuralItem, images);
	}
}
