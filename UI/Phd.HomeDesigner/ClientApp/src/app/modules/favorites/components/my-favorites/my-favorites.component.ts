import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, filter, distinctUntilChanged, withLatestFrom, debounceTime } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs/ReplaySubject';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromOrg from '../../../ngrx-store/org/reducer';
import * as fromJob from '../../../ngrx-store/job/reducer';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';
import { GroupBarComponent } from '../../../shared/components/group-bar/group-bar.component';
import { Group, SubGroup } from '../../../shared/models/tree.model';
import { PriceBreakdown } from '../../../shared/models/scenario.model';

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
	groups$ = new ReplaySubject<Group[]>(1);
	params$ = new ReplaySubject<{ favoritesId: number, divDPointCatalogId: number }>(1);
	groupName$ = new ReplaySubject<string>(1);
	selectedSubGroup$ = new ReplaySubject<SubGroup>(1);
	selectedSubgroupId: number;
	errorMessage: string = '';

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
			select(fromOrg.selectOrg),
			combineLatest(this.store.pipe(select(fromJob.jobState)))
		).subscribe(([org, job]) => {
			if (org && org.salesCommunity && org.salesCommunity.financialCommunities && org.salesCommunity.financialCommunities.length) {
				const financialCommunity = org.salesCommunity.financialCommunities.find(x => x.id === job.financialCommunityId);
				if (financialCommunity) {
					this.communityName = financialCommunity.name;
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree => {
			if (tree) {
				this.groups = tree.groups;
				this.groups$.next(tree.groups);
			}
		});

		this.route.paramMap.pipe(
			this.takeUntilDestroyed(),
			map(params => { return { favoritesId: +params.get('favoritesId'), divDPointCatalogId: +params.get('divDPointCatalogId') }; }),
			distinctUntilChanged()
		).subscribe(params => this.params$.next(params));

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
			combineLatest(this.params$),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree)))
		).subscribe(([[scenarioState, params], filteredTree]) =>
		{
			this.errorMessage = '';

			if (scenarioState.treeLoading) {
				return;
			}

			if (filteredTree && params.divDPointCatalogId > 0) {
				let groups = filteredTree.groups;
				let sg;
				let dp;

				if (groups.length) {
					sg = _.flatMap(groups, g => g.subGroups).find(sg => sg.points.some(p => p.divPointCatalogId === params.divDPointCatalogId));
					dp = !!sg ? sg.points.find(p => p.divPointCatalogId === params.divDPointCatalogId) : null;

					if (!dp) {
						let divPointCatalogId = groups[0].subGroups[0].points[0].divPointCatalogId;

						//this happens if the decision point has been filtered out of the tree - find a new decision point to navigate to
						if (!!this.selectedSubgroupId) {
							let origGroup = groups.find(g => g.subGroups.some(sg => sg.id === this.selectedSubgroupId));

							if (origGroup) {
								let origSg = origGroup.subGroups.find(sg => sg.id === this.selectedSubgroupId);

								if (origSg) {
									divPointCatalogId = origSg.points[0].divPointCatalogId;
								}
								else {
									divPointCatalogId = origGroup.subGroups[0].points[0].divPointCatalogId;
								}
							}
						}

						this.router.navigate(['..', divPointCatalogId], { relativeTo: this.route });
					}
					else {
						this.setSelectedGroup(groups.find(g => g.subGroups.some(sg1 => sg1.id === sg.id)), sg);
					}
				}
				else if (scenarioState.treeFilter) {
					// find the last point we were on using the full tree
					groups = scenarioState.tree.treeVersion.groups;
					sg = _.flatMap(groups, g => g.subGroups).find(sg => sg.points.some(p => p.divPointCatalogId === params.divDPointCatalogId));
					dp = !!sg ? sg.points.find(p => p.divPointCatalogId === params.divDPointCatalogId) : null;

					if (dp) {
						this.setSelectedGroup(groups.find(g => g.subGroups.some(sg1 => sg1.id === sg.id)), sg);
					}

					this.errorMessage = 'Seems there are no results that match your search criteria.';
				}
			}
			else if (filteredTree) {
				this.router.navigate([filteredTree.groups[0].subGroups[0].points[0].divPointCatalogId], { relativeTo: this.route });
			}
		});

		//subscribe to changes in subgroup selection
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.nav.selectedSubGroup),
			withLatestFrom(this.store.pipe(select(fromRoot.filteredTree), map(tree => tree && tree.groups), filter(groups => !!groups))),
			debounceTime(100)
		).subscribe(([sg, groups]) => {
			if (sg && sg !== this.selectedSubgroupId) {
				let subGroup = _.flatMap(groups, g => g.subGroups).find(s => s.id === sg);

				if (subGroup) {
					this.router.navigate(['..', subGroup.points[0].divPointCatalogId], { relativeTo: this.route });
				}
			}
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);
	}

	setSelectedGroup(newGroup: Group, newSubGroup: SubGroup) {
		this.groupName$.next(newGroup.label);
		this.selectedSubGroup$.next(newSubGroup);
		this.selectedSubgroupId = newSubGroup.id;
	}

	onSubgroupSelected(id: number) {
		this.store.dispatch(new ScenarioActions.SetSelectedSubgroup(id));
	}

	onNextSubGroup() {
		const subGroups = _.flatMap(this.groups, g => _.flatMap(g.subGroups)) || [];
		const subGroupIndex = subGroups.findIndex(sg => sg.id === this.selectedSubgroupId);
		if (subGroupIndex > -1) {
			const nextSubgroup = subGroupIndex === subGroups.length - 1
				? subGroups[0]
				: subGroups[subGroupIndex + 1];
			const nextGroup = this.groups.find(g => g.subGroups.some(sg => sg.id === nextSubgroup.id));

			this.groupBar.selectSubgroup(nextGroup.id, nextSubgroup.id);
		}
	}
}
