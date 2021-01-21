import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from "@angular/router";

import { UnsubscribeOnDestroy, PriceBreakdown, Group, SDGroup, DecisionPoint } from 'phd-common';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as NavActions from '../../../ngrx-store/nav/actions';
import { selectSelectedLot } from '../../../ngrx-store/lot/reducer';

import { SummaryHeader } from './summary-header/summary-header.component';

@Component({
	selector: 'favorites-summary',
	templateUrl: './favorites-summary.component.html',
	styleUrls: ['./favorites-summary.component.scss']
})
export class FavoritesSummaryComponent extends UnsubscribeOnDestroy implements OnInit
{
	communityName: string = '';
	planName: string = '';
	groups: Group[];
	priceBreakdown: PriceBreakdown;
	summaryHeader: SummaryHeader = new SummaryHeader();
	isSticky: boolean = false;
	includeContractedOptions: boolean = true;
	favoritesId: number;

	constructor(private store: Store<fromRoot.State>, 
		private router: Router,
		private cd: ChangeDetectorRef)
	{
		super();
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavorite)
		).subscribe(favorites => {
			this.summaryHeader.favoritesListName = favorites && favorites.name;
			this.favoritesId = favorites && favorites.id;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData => {
			this.planName = planData && planData.salesName;
			this.summaryHeader.planName = this.planName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName => {
			this.communityName = communityName;
			this.summaryHeader.communityName = communityName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.elevationImageUrl)
		).subscribe(imageUrl => {
			this.summaryHeader.elevationImageUrl = imageUrl;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(selectSelectedLot)
		).subscribe(lot => {
			this.summaryHeader.lot = lot
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree => {
			if (tree) {
				this.groups = tree.groups;
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);
	}

	onBack()
	{
		this.router.navigateByUrl(`/favorites/my-favorites/${this.favoritesId}`);
	}

	getGroupSubTotals(group: SDGroup)
	{
		var groupSubtotal = 0;

		group.subGroups.map(sg =>
		{
			groupSubtotal += sg.points.reduce((sum, point) => sum += (point.price || 0), 0);
		});

		return groupSubtotal;
	}
	
	displayPoint(dp: DecisionPoint) {
		const selectedChoices = dp && dp.choices ? dp.choices.filter(c => c.quantity > 0) : null;
		return selectedChoices && !!selectedChoices.length && (this.includeContractedOptions || !dp.isStructuralItem);
	}

	onSubgroupSelected(id: number) {
		this.store.dispatch(new NavActions.SetSelectedSubgroup(id));
		this.onBack();
	}
	
	/**
	 * Used to add additional padding to the header when scrolling so the first group header doesn't get hidden
	 * @param isSticky
	 */
	onIsStickyChanged(isSticky: boolean)
	{
		this.isSticky = isSticky;

		this.cd.detectChanges();
	}	

	onContractedOptionsChanged(includeContractedOptions: boolean)
	{
		this.includeContractedOptions = includeContractedOptions;
		this.cd.detectChanges();
	}		
}
