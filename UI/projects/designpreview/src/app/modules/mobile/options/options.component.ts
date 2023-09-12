import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store, select } from '@ngrx/store';

import { DecisionPoint, Group, JobChoice, PickType, SubGroup, UnsubscribeOnDestroy } from 'phd-common';
import { combineLatest } from 'rxjs';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromFavorite from '../../ngrx-store/favorite/reducer';
import * as fromPlan from '../../ngrx-store/plan/reducer';
import * as NavActions from '../../ngrx-store/nav/actions';
import { BuildMode } from '../../shared/models/build-mode.model';
import { Constants } from '../../shared/classes/constants.class';

@Component({
	selector: 'options',
	templateUrl: './options.component.html',
	styleUrls: ['./options.component.scss']
// eslint-disable-next-line indent
})
export class OptionsComponent extends UnsubscribeOnDestroy implements OnInit 
{
	buildMode: BuildMode;
	communityName: string = 'Community';
	isPresalePricingEnabled: boolean;
	actionLabel: string;
	actionLink: (string | number)[];
	planName: string = 'Plan';
	salesChoices: JobChoice[];
	selectedSubGroup: SubGroup;
	selectedSubGroupId: number;
	selectedDecisionPoint: DecisionPoint;
	selectedDecisionPointId: number;
	selectedGroup: Group;
	unfilteredPoints: DecisionPoint[];

	get showDeclineCard(): boolean
	{
		const unfilteredPoint = this.unfilteredPoints.find(up => up.divPointCatalogId === this.selectedDecisionPoint?.divPointCatalogId);

		return (unfilteredPoint?.pointPickTypeId === PickType.Pick0or1 || unfilteredPoint?.pointPickTypeId === PickType.Pick0ormore)
			&& (this.buildMode === BuildMode.Presale || !unfilteredPoint?.isStructuralItem)
			&& !unfilteredPoint?.isPastCutOff
			&& unfilteredPoint?.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1)?.length === 0;
	}

	get showPendingAndContractedToggle(): boolean
	{
		return this.buildMode === BuildMode.Buyer || this.buildMode === BuildMode.BuyerPreview;
	}

	get subTitle(): string
	{
		const contractedChoices = this.selectedDecisionPoint?.choices.filter(c => this.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);

		if (contractedChoices?.length > 0)
		{
			return Constants.PENDING_AND_CONTRACTED;
		}

		return this.selectedDecisionPoint.pointPickTypeId === PickType.Pick0ormore
			|| this.selectedDecisionPoint.pointPickTypeId === PickType.Pick1ormore
			? Constants.SELECT_MANY : Constants.SELECT_ONE;
	}

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private store: Store<fromRoot.State>) 
	{
		super();
	}

	ngOnInit(): void
	{
		this.route.params.subscribe((params) =>
		{
			this.selectedSubGroupId = +params['subGroupId'];
			this.selectedDecisionPointId = +params['decisionPointId'];
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree),
		).subscribe((tree) =>
		{
			// Handles rerouting if someone just goes to the options component with no route params
			const subGroups = tree?.groups.flatMap(g => g.subGroups);
			const firstSubGroup = subGroups[0];
			const firstDecisionPoint = firstSubGroup.points[0];

			if (!this.selectedSubGroupId && !this.selectedDecisionPointId && firstSubGroup && firstDecisionPoint)
			{
				this.router.navigate(['/options', firstSubGroup.id, firstDecisionPoint.id], { queryParamsHandling: 'merge' });
			}

			this.selectedSubGroup = subGroups.find(sg => sg.id === this.selectedSubGroupId);
			this.selectedDecisionPoint = subGroups.flatMap(sg => sg.points).find(dp => dp.id === this.selectedDecisionPointId);
			this.selectedGroup = tree?.groups.find(g => g.subGroups.flatMap(sg => sg.id).includes(this.selectedSubGroupId));

			if (this.selectedSubGroup)
			{
				// If selected dp does not exist, go to first dp in selected subGroup
				if (!this.selectedDecisionPoint)
				{
					this.router.navigate(['/options', this.selectedSubGroup.id, this.selectedSubGroup.points[0]?.id], { queryParamsHandling: 'merge' })
				}
				else
				{
					this.store.dispatch(new NavActions.SetSelectedSubgroup(
						this.selectedSubGroup.id,
						this.selectedDecisionPoint.id,
						null
					));
	
					// Provide routerLink to the action bar
					const selectedSubGroupIndex = subGroups.findIndex(sg => sg.id === this.selectedSubGroupId);
					const lastSubGroup = subGroups[subGroups.length - 1];
					const lastDecisionPoint = this.selectedSubGroup.points[this.selectedSubGroup.points.length - 1];
					const nextSubGroup = subGroups[selectedSubGroupIndex + 1] ?? null;
					this.actionLabel = 'Next: ';
	
					// last decision point, go to next subgroup
					if (lastDecisionPoint.id === this.selectedDecisionPoint.id)
					{
						// go to my favorites if last subgroup, otherwise nextSubGroup
						this.actionLabel += lastSubGroup.id === this.selectedSubGroup.id ? 'My Favorites' : nextSubGroup.label;
						this.actionLink = lastSubGroup.id === this.selectedSubGroup.id ? ['/favorites/summary'] : ['/options', nextSubGroup.id, nextSubGroup.points[0].id];
					}
					else
					{
						const nextDecisionPointIndex = this.selectedSubGroup.points.findIndex(dp => dp.id === this.selectedDecisionPointId) + 1;
						const nextDecisionPoint = this.selectedSubGroup.points[nextDecisionPointIndex];
						this.actionLabel += nextDecisionPoint.label;
						this.actionLink = ['/options', this.selectedSubGroupId, nextDecisionPoint.id];
					}
				}
			}
			else
			{
				// if selected subGroup does not exist. navigate to first available subGroup/dp
				this.router.navigate(['/options', firstSubGroup.id, firstDecisionPoint.id], { queryParamsHandling: 'merge' });
			}
		});

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
			this.store.pipe(select(fromFavorite.favoriteState), this.takeUntilDestroyed())
		]).subscribe(([scenario, fav]) =>
		{
			this.buildMode = scenario.buildMode;
			this.isPresalePricingEnabled = scenario.presalePricingEnabled;
			this.unfilteredPoints = scenario?.tree?.treeVersion?.groups.flatMap(g => g.subGroups).flatMap(sg => sg.points) ?? [];
			this.salesChoices = fav && fav.salesChoices;
		});
	}
}
