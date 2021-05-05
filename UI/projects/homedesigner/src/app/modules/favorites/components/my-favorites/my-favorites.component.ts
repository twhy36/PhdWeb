import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
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

import { UnsubscribeOnDestroy, PriceBreakdown, Group, SubGroup, Tree, TreeVersionRules, JobChoice, 
	getDependentChoices 
} from 'phd-common';

import { GroupBarComponent } from '../../../shared/components/group-bar/group-bar.component';
import { NormalExperienceComponent } from './normal-experience/normal-experience.component';
import { MyFavoritesChoice, MyFavoritesPointDeclined } from '../../../shared/models/my-favorite.model';
import { ChoiceExt } from '../../../shared/models/choice-ext.model';

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
	declinedPoints: Map<string, boolean> = new Map();
	declinedPointIds: Map<string, number> = new Map();
	myFavoritesDeclinedPoints: MyFavoritesPointDeclined[];
	myFavoriteId: number;

	priceBreakdown: PriceBreakdown;

	constructor(private store: Store<fromRoot.State>,
		private route: ActivatedRoute,
		private router: Router,
		private cd: ChangeDetectorRef)
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
			this.myFavoritesDeclinedPoints = favorite && favorite.myFavoritesPointDeclined;
			this.myFavoriteId = favorite && favorite.id;
			this.updateSelectedChoice();	
		});	

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.favoriteState)
		).subscribe(fav => {
			this.includeContractedOptions = fav && fav.includeContractedOptions;
			this.salesChoices = fav && fav.salesChoices;
		});

		// Set up store pipe to set up myFavoritesDeclinedPoints, but for now...
		//this.myFavoritesDeclinedPoints = [];

		this.groups.forEach(group => {
			group.subGroups.forEach(sg => {
				sg.points.forEach(p => {
					if (p.pointPickTypeId % 2 === 0) {
						console.log("Decision Point " + p.label + " has a " + p.pointPickTypeLabel);
						this.declinedPoints.set(p.label, false);
						this.declinedPointIds.set(p.label, p.id);
					}
				})
			})
			console.log(group.subGroups)
			console.log(this.declinedPoints);
			console.log(this.declinedPointIds);
		});
		console.log("Abinay declined points");
		console.log(this.myFavoritesDeclinedPoints);
		// this.myFavoritesDeclinedPoints.forEach(declinedPoint => {
		// 	this.declinedPoints.set(declinedPoint.decisionPointLabel, true);
		// })
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

		selectedChoices.push({choiceId: 0, quantity: 1, attributes: []});
		console.log("MyFavoriteId Is " + this.myFavoriteId);

		this.store.dispatch(new ScenarioActions.SelectChoices(...selectedChoices));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
	}

	deselectPointChoices(pointLabel: string) {
		console.log("Deselecting choices...");
		let selectedChoices = [];
		
		this.myFavoritesChoices.forEach(choice => {
			if (choice.decisionPointLabel === pointLabel) {
				selectedChoices.push({ choiceId: choice.dpChoiceId, quantity: 0, attributes: [] });
			}
		});
		this.store.dispatch(new ScenarioActions.SelectChoices(...selectedChoices));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
		console.log("All choices for " + pointLabel + " should be deselected");
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

		this.cd.detectChanges();
		setTimeout(() => {
			const firstPointId = this.selectedSubGroup.points && this.selectedSubGroup.points.length ? this.selectedSubGroup.points[0].id : 0;
			this.mainPanel.scrollPointIntoView(this.selectedPointId, this.selectedPointId === firstPointId);
		}, 350);
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
		console.log("I am making a choice!");
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
		console.log(this.selectedPointId);
	}

	// addDeclineDecisionPoint(declinedPoint:) {

	// }

	// deleteDeclineDecisionPoint

	declineDecisionPoint(declinedPoint: MyFavoritesPointDeclined) {
		// Local DeclinedPoints
		this.declinedPoints.set(declinedPoint.decisionPointLabel, !this.declinedPoints.get(declinedPoint.decisionPointLabel));
		console.log(this.declinedPoints);
		if (this.declinedPoints.get(declinedPoint.decisionPointLabel) === true) {
			//this.favoriteService.addMyFavoritesPointDeclined(this.myFavoriteId, this.declinedPointIds.get(declinedPoint.decisionPointLabel));
			let myFavoriteId = this.myFavoriteId;
			let pointId = this.declinedPointIds.get(declinedPoint.decisionPointLabel);
			this.store.dispatch(new FavoriteActions.AddMyFavoritesPointDeclined(myFavoriteId, pointId));
			this.deselectPointChoices(declinedPoint.decisionPointLabel);
			console.log("My favorites declines - " + declinedPoint.decisionPointLabel);
		} else {
			let declinedPointId = this.myFavoritesDeclinedPoints.find(decPoint => decPoint.dPointId === declinedPoint.dPointId).id
			this.store.dispatch(new FavoriteActions.DeleteMyFavoritesPointDeclined(declinedPointId));
			console.log("My favorites undeclines - " + declinedPoint.decisionPointLabel);
		}
		// Set up the declined points to save to the API
		// Shouldn't be needed
		// let declinedPoints = [];
		// console.log(this.declinedPoints);
		// this.declinedPoints.forEach((value: boolean, key: string) => {
		// 	if (value === true) {
		// 		declinedPoints.push({dPointId: this.declinedPointIds.get(key), decisionPointLabel: key});
		// 	}			
		// })
		// Only pass in one pointID & myFavoriteID to the API to do add or delete function in favorites.service.ts
		// Need easy way to determine adding/deleting
		// console.log("Select declined points");
		// console.log(declinedPoints);
		// Dispatchh Scenario actionss and favorite actions to call the API
		// this.store.dispatch(new ScenarioActions.SelectDeclinedPoints(...declinedPoints));
		// this.store.dispatch(new FavoriteActions.SaveMyFavoritesDeclinedPoints())
	}	
}
