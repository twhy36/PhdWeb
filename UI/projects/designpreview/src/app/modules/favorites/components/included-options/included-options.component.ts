import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as _ from 'lodash';

import
{
	UnsubscribeOnDestroy, flipOver, DecisionPoint, SubGroup, Choice, ChoiceImageAssoc, TreeVersion, MyFavoritesChoice, getDependentChoices, Tree, TreeVersionRules, PlanOption, MyFavoritesPointDeclined
} from 'phd-common';

import { ChoiceExt } from '../../../shared/models/choice-ext.model';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { TreeService } from '../../../core/services/tree.service';
import { Router } from '@angular/router';
import { debounceTime, filter, map, withLatestFrom } from 'rxjs/operators';

@Component({
	selector: 'included-options',
	templateUrl: './included-options.component.html',
	styleUrls: ['./included-options.component.scss'],
	animations: [flipOver]
})
export class IncludedOptionsComponent extends UnsubscribeOnDestroy implements OnInit
{
	communityName: string = '';
	planName: string = '';
	choiceImages: ChoiceImageAssoc[];
	isPointPanelCollapsed: boolean = false;
	subGroups: SubGroup[];
	points: DecisionPoint[];
	currentPointId: number;
	currentSubGroupId: number;
	choiceToggled: boolean = false;
	filteredTree: TreeVersion;
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	options: PlanOption[];
	isReadonly: boolean = false;
	buildMode: BuildMode;
	noVisibleGroups: boolean = false;
	myFavoriteId: number;
	myFavoritesChoices: MyFavoritesChoice[];
	myFavoritesPointsDeclined: MyFavoritesPointDeclined[];

	constructor(private store: Store<fromRoot.State>,
		private treeService: TreeService,
		private router: Router) { super(); }

	ngOnInit() { 
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
			select(state => state.scenario),
		).subscribe(scenario =>
		{
			this.tree = scenario.tree;
			this.treeVersionRules = _.cloneDeep(scenario.rules);
			this.options = _.cloneDeep(scenario.options);
			this.isReadonly = scenario.buildMode === BuildMode.BuyerPreview;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree =>
		{
			if (tree)
			{
				this.filteredTree = tree;
				this.noVisibleGroups = !this.filteredTree.groups.length ? true : false;

				this.subGroups = _.flatMap(this.filteredTree.groups, g => g.subGroups) || [];
				this.points = _.flatMap(this.filteredTree.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || [];	

				const choiceIds = (_.flatMap(this.points, pt => pt.choices) || []).filter(c => c.isDecisionDefault).map(c => c.id);

				return this.treeService.getChoiceImageAssoc(choiceIds)
					.subscribe(choiceImages =>
					{
						this.choiceImages = choiceImages;
					});
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
			select(fromFavorite.currentMyFavorite)
		).subscribe(favorite =>
		{
			if (!!!favorite) {
				this.store.dispatch(new FavoriteActions.LoadDefaultFavorite());
			}
			this.myFavoritesChoices = favorite && favorite.myFavoritesChoice;
			this.myFavoriteId = favorite && favorite.id || -1;
			this.myFavoritesPointsDeclined = favorite && favorite.myFavoritesPointDeclined;
		});

		//subscribe to changes in subgroup selection
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.nav),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree), map(tree => tree && tree.groups), filter(groups => !!groups))),
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
			else if (this.currentPointId && !this.currentSubGroupId) {
				//scroll point into view
				this.selectDecisionPoint(this.currentPointId);
			}
		});
	}

	togglePointPanel() {
		this.isPointPanelCollapsed = !this.isPointPanelCollapsed;
	}

	selectDecisionPoint(pointId: number, interval?: number) {
		if (pointId)
		{
			setTimeout(() =>
			{
				const firstPointId = this.points && this.points.length ? this.points[0].id : 0;
				this.scrollPointIntoView(pointId, pointId === firstPointId);
			}, interval || 500);
		}
		if (this.currentPointId !== pointId) {
			this.store.dispatch(new NavActions.SetIncludedSubgroup(null, pointId));
		}
	}

	selectSubGroup(subGroupId: number, interval?: number) {
		if (subGroupId)
		{
			setTimeout(() =>
			{
				const firstSubGroupId = this.subGroups && this.subGroups.length ? this.subGroups[0].id : 0;
				this.scrollSubGroupIntoView(subGroupId, subGroupId === firstSubGroupId);
			}, interval || 500);
		}

		if (this.currentSubGroupId !== subGroupId) {
			this.store.dispatch(new NavActions.SetIncludedSubgroup(subGroupId, null));	
		}
	}

	choiceToggleHandler(choice: ChoiceExt) {
		const point = this.points.find(p => p.choices.some(c => c.id === choice.id));
		if (point && this.currentPointId != point.id) {
			this.currentPointId = point.id;
		}
		this.choiceToggled = true;
		this.toggleChoice(choice);
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
		this.store.dispatch(new ScenarioActions.SelectChoices(false, ...selectedChoices));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());

	}

	deselectDeclinedPoints(choice: ChoiceExt)
	{
		// Check for favorites and deselect declined points in favorites
		const points = _.flatMap(this.filteredTree.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || [];
		const pointDeclined = points.find(p => p.choices.some(c => c.divChoiceCatalogId === choice.divChoiceCatalogId));
		const fdp = this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === pointDeclined.divPointCatalogId);

		if (fdp)
		{
			this.store.dispatch(new FavoriteActions.DeleteMyFavoritesPointDeclined(this.myFavoriteId, fdp.id));
		}
	}

	getChoiceExt(choice: Choice, point: DecisionPoint) : ChoiceExt
	{
		let choiceStatus = 'Available';

		const myFavoritesChoice = this.myFavoritesChoices ? this.myFavoritesChoices.find(x => x.divChoiceCatalogId === choice.divChoiceCatalogId) : null;
		const images = this.choiceImages?.filter(x => x.dpChoiceId === choice.id);

		return new ChoiceExt(choice, choiceStatus, myFavoritesChoice, point.isStructuralItem, images);
	}

	scrollPointIntoView(pointId: number, isFirstPoint: boolean)
	{
		const pointCardElement = <HTMLElement><any>document?.getElementById(`included-point-${pointId?.toString()}`);
		if (pointCardElement)
		{
			if (isFirstPoint)
			{
				setTimeout(() => {
					pointCardElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
				}, 250);
			}
			else
			{
				// Workaround to display the element moved under the nav bar
				setTimeout(() => {
					const pos = pointCardElement.style.position;
					const top = pointCardElement.style.top;
					pointCardElement.style.position = 'relative';
					pointCardElement.style.top = '-10px';
					pointCardElement.scrollIntoView({behavior: 'smooth', block: 'start'});
					pointCardElement.style.top = top;
					pointCardElement.style.position = pos;
				}, 250);
			}
		}

		const decisionBarElement = document.getElementById('decision-bar-' + pointId?.toString());
		if (decisionBarElement) {
			decisionBarElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
		}
	}

	scrollSubGroupIntoView(subGroupId: number, isFirstSubGroup: boolean)
	{
		const subGroupElement = <HTMLElement><any>document?.getElementById(`included-subgroup-${subGroupId?.toString()}`);
		if (subGroupElement)
		{
			if (isFirstSubGroup)
			{
				setTimeout(() => {
					subGroupElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
				}, 250);
			}
			else
			{
				// Workaround to display the element moved under the nav bar
				setTimeout(() => {
					const pos = subGroupElement.style.position;
					const top = subGroupElement.style.top;
					subGroupElement.style.position = 'relative';
					subGroupElement.style.top = '0px';
					subGroupElement.scrollIntoView({behavior: 'smooth', block: 'start'});
					subGroupElement.style.top = top;
					subGroupElement.style.position = pos;
				}, 250);
			}
		}

		const decisionBarSgElement = document.getElementById('decision-bar-sg-' + subGroupId?.toString());
		if (decisionBarSgElement) {
			decisionBarSgElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
		}
	}

	viewChoiceDetail(choice: ChoiceExt)
	{
		const pointId = this.points?.length ? this.points.find(p => p.choices.find(c => c.id === choice.id))?.id || this.points[0].id : 0;
		const selectedSubGroup = this.subGroups.find(sg => !!sg.points.find(p => p.id === pointId));
		this.selectDecisionPoint(pointId);
		this.router.navigateByUrl(`/favorites/my-favorites/${this.myFavoriteId}/${selectedSubGroup.subGroupCatalogId}/${choice.divChoiceCatalogId}`);
	}

	defaultChoicePresent(subGroup: SubGroup) {
		const choices = _.flatMap(subGroup.points, p => p.choices).filter(c => c.isDecisionDefault);
		return choices.length > 0;
	}

	displayedChoices(choices: ChoiceExt[]) {
		return choices.filter(c => c.isDecisionDefault);
	}

	displayDecisionPoint(point: DecisionPoint) {
		if (point.isHiddenFromBuyerView) {
			return false;
		} else {
			const choices = _.flatMap(point.choices).filter(c => c.isDecisionDefault);
			let displayChoice = false;
			choices.forEach(c => {
				if (!c.isHiddenFromBuyerView) {
					displayChoice = true;
				}
			})
			return displayChoice;
		}
	}

	onNextClicked() {
		this.router.navigateByUrl(`/favorites/my-favorites/${this.myFavoriteId}`);
	}

	onViewDecisionPoint(point: DecisionPoint) {
		const sg = this.subGroups.find(sg => !!sg.points.find(p => p.divPointCatalogId === point.divPointCatalogId))
		this.selectDecisionPoint(point.id);

		this.store.dispatch(new NavActions.SetSelectedSubgroup(sg.id, point.id));
		this.router.navigateByUrl(`/favorites/my-favorites/${this.myFavoriteId}/${sg.subGroupCatalogId}`);

	}
}
