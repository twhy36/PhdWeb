import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, filter, distinctUntilChanged, withLatestFrom, debounceTime, take } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs/ReplaySubject';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';

import { UnsubscribeOnDestroy, PriceBreakdown, Group, SubGroup, Choice, Tree, TreeVersionRules, JobChoice, 
	getDependentChoices 
} from 'phd-common';

import { GroupBarComponent } from '../../../shared/components/group-bar/group-bar.component';
import { MyFavoritesChoice } from '../../../shared/models/my-favorite.model';
import { ChoiceExt } from '../../../shared/models/choice-ext.model';

@Component({
	selector: 'my-favorites',
	templateUrl: 'my-favorites.component.html',
	styleUrls: ['my-favorites.component.scss']
})
export class MyFavoritesComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(GroupBarComponent)
	private groupBar: GroupBarComponent;

	communityName: string = '';
	planName: string = '';
	groups: Group[];
	params$ = new ReplaySubject<{ favoritesId: number, subGroupCatalogId: number }>(1);
	groupName: string = '';
	selectedSubGroup : SubGroup;
	selectedSubgroupId: number;
	selectedPointId: number;
	errorMessage: string = '';
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	myFavoritesChoices: MyFavoritesChoice[];
	includeContractedOptions: boolean;
	salesChoices: JobChoice[];
	showDetails: boolean = false;
	selectedChoice: ChoiceExt;

	priceBreakdown: PriceBreakdown;

	constructor(private store: Store<fromRoot.State>,
		private route: ActivatedRoute,
		private router: Router)
    {
		super();
	}

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
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree => {
			if (tree) {
				this.groups = tree.groups;
			}
		});

		this.route.paramMap.pipe(
			this.takeUntilDestroyed(),
			map(params => { return { favoritesId: +params.get('favoritesId'), subGroupCatalogId: +params.get('subGroupCatalogId') }; }),
			distinctUntilChanged()
		).subscribe(params => this.params$.next(params));

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
			combineLatest(this.params$),
			combineLatest(this.store.pipe(select(fromRoot.filteredTree)))
		).subscribe(([[scenarioState, params], filteredTree]) =>
		{
			this.errorMessage = '';

			if (scenarioState.treeLoading) {
				return;
			}

			if (filteredTree && params.subGroupCatalogId > 0) {
				let groups = filteredTree.groups;
				let sg;

				if (groups.length) {
					sg = _.flatMap(groups, g => g.subGroups).find(sg => sg.subGroupCatalogId === params.subGroupCatalogId);

					if (!sg) {
						let subGroupCatalogId = groups[0].subGroups[0].subGroupCatalogId;

						//this happens if the subgroup has been filtered out of the tree - find a new subgroup to navigate to
						if (!!this.selectedSubgroupId) {
							let origGroup = groups.find(g => g.subGroups.some(sg => sg.id === this.selectedSubgroupId));

							if (origGroup) {
								let origSg = origGroup.subGroups.find(sg => sg.id === this.selectedSubgroupId);

								if (origSg) {
									subGroupCatalogId = origSg.subGroupCatalogId;
								}
								else {
									subGroupCatalogId = origGroup.subGroups[0].subGroupCatalogId;
								}
							}
						}

						this.router.navigate(['..', subGroupCatalogId], { relativeTo: this.route });
					}
					else {
						this.setSelectedGroup(groups.find(g => g.subGroups.some(sg1 => sg1.id === sg.id)), sg);
					}
				}
				else if (scenarioState.treeFilter) {
					// find the last subgroup we were on using the full tree
					groups = scenarioState.tree.treeVersion.groups;
					sg = _.flatMap(groups, g => g.subGroups).find(sg => sg.subGroupCatalogId === params.subGroupCatalogId);

					if (sg) {
						this.setSelectedGroup(groups.find(g => g.subGroups.some(sg1 => sg1.id === sg.id)), sg);
					}

					this.errorMessage = 'Seems there are no results that match your search criteria.';
				}
			}
			else if (filteredTree) {
				this.router.navigate([filteredTree.groups[0].subGroups[0].subGroupCatalogId], { relativeTo: this.route });
			}
		});

		//subscribe to changes in subgroup selection
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.nav),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree), map(tree => tree && tree.groups), filter(groups => !!groups))),
			debounceTime(100)
		).subscribe(([nav, groups]) => {
			const sgId = nav && nav.selectedSubGroup;
			const subGroup = _.flatMap(groups, g => g.subGroups).find(s => s.id === sgId);

			this.selectedPointId = nav && nav.selectedPoint;
			if (!this.selectedPointId && subGroup && subGroup.points && subGroup.points.length)
			{
				this.selectedPointId = subGroup.points[0].id;
			}

			if (sgId && sgId !== this.selectedSubgroupId && subGroup) {
				this.router.navigate(['..', subGroup.subGroupCatalogId], { relativeTo: this.route });
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);

		this.store.pipe(
			take(1),
			select(state => state.scenario),
		).subscribe(scenario =>
		{
			this.tree = scenario.tree;
			this.treeVersionRules = scenario.rules;
		});		

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavorite)
		).subscribe(favorite => {
			this.myFavoritesChoices = favorite && favorite.myFavoritesChoice;
			this.updateSelectedChoice();	
		});	

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.favoriteState)
		).subscribe(fav => {
			this.includeContractedOptions = fav && fav.includeContractedOptions;
			this.salesChoices = fav && fav.salesChoices;
		});		
	}

	setSelectedGroup(newGroup: Group, newSubGroup: SubGroup) {
		this.groupName = newGroup.label;
		this.selectedSubGroup = newSubGroup;
		this.selectedSubgroupId = newSubGroup.id;
	}

	onSubgroupSelected(id: number) {
		this.hideDetails();
		this.store.dispatch(new NavActions.SetSelectedSubgroup(id));
	}

	onNextSubGroup() {
		const subGroups = _.flatMap(this.groups, g => _.flatMap(g.subGroups)) || [];
		const subGroupIndex = subGroups.findIndex(sg => sg.id === this.selectedSubgroupId);
		if (subGroupIndex > -1) {
			const nextSubgroup = subGroupIndex === subGroups.length - 1
				? subGroups[0]
				: subGroups[subGroupIndex + 1];

				this.groupBar.selectSubgroup(nextSubgroup.id);
		}
	}

	toggleChoice(choice: ChoiceExt)
	{
		let selectedChoices = [{ choiceId: choice.id, quantity: !choice.quantity ? 1 : 0, attributes: choice.selectedAttributes }];
		const impactedChoices = getDependentChoices(this.tree, this.treeVersionRules, choice);

		impactedChoices.forEach(c =>
		{
			selectedChoices.push({ choiceId: c.id, quantity: 0, attributes: c.selectedAttributes });
		});

		this.store.dispatch(new ScenarioActions.SelectChoices(...selectedChoices));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
	}	

	toggleContractedOptions()
	{
		this.store.dispatch(new FavoriteActions.ToggleContractedOptions());
	}

	viewChoiceDetail(choice: ChoiceExt)
	{
		this.selectedChoice = choice;
		this.showDetails = true;
	}

	hideDetails()
	{
		this.showDetails = false;
		this.selectedChoice = null;
	}

	getChoicePath() : string
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
				this.selectedChoice.isFavorite = this.myFavoritesChoices 
					? this.myFavoritesChoices.findIndex(x => x.divChoiceCatalogId === this.selectedChoice.divChoiceCatalogId) > -1
					: false;	
			}
		}
	}
	
	selectDecisionPoint(pointId: number)
	{
		this.selectedPointId = pointId;
	}
}
