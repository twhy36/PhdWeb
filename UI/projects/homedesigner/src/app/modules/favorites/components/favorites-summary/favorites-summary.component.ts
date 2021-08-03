import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { Location } from '@angular/common';

import { combineLatest as combineLatestOperator, take, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { combineLatest }from 'rxjs';
import { Observable, of } from 'rxjs';
import * as _ from 'lodash';

import 
{ 
	UnsubscribeOnDestroy, PriceBreakdown, Group, SDGroup, DecisionPoint, JobChoice, Tree, TreeVersionRules, 
	SalesAgreement, getDependentChoices 
} from 'phd-common';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as CommonActions from '../../../ngrx-store/actions';

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
	includeContractedOptions: boolean = false;
	favoritesId: number;
	salesChoices: JobChoice[];
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	buildMode: string;
	isPreview: boolean = false;

	constructor(private store: Store<fromRoot.State>,
		private activatedRoute: ActivatedRoute, 
		private router: Router,
		private cd: ChangeDetectorRef,
		private location: Location)
	{
		super();
	}

	ngOnInit()
	{
		this.activatedRoute.paramMap
			.pipe(
				combineLatestOperator(this.store.pipe(select(state => state.salesAgreement))),
				switchMap(([params, salesAgreementState]) =>
				{
					if (salesAgreementState.salesAgreementLoading || salesAgreementState.loadError)
					{
						return new Observable<never>();
					}

					// if sales agreement is not in the store and the id has been passed in to the url
					// or the passed in sales agreement id is different than that of the id in the store...
					const salesAgreementId = +params.get('salesAgreementId');

					if (salesAgreementId > 0 && salesAgreementState.id !== salesAgreementId)
					{
						this.store.dispatch(new CommonActions.LoadSalesAgreement(salesAgreementId, true, true));

						return new Observable<never>();
					}

					return of(_.pick(salesAgreementState, _.keys(new SalesAgreement())));
				}),
				switchMap(() => combineLatest([
					this.store.pipe(select(state => state.scenario)),
					this.store.pipe(select(state => state.favorite))
				]).pipe(take(1))),
				this.takeUntilDestroyed(),
				distinctUntilChanged()
			)
			.subscribe(([scenario, fav]) =>
			{
				this.tree = scenario.tree;
				this.isPreview = scenario.buildMode === 'preview';
				this.treeVersionRules = scenario.rules;
				this.buildMode = scenario.buildMode;

				if (this.isPreview)
				{
					this.store.dispatch(new FavoriteActions.LoadDefaultFavorite());
				}
				else if (!fav.selectedFavoritesId)
				{
					this.store.dispatch(new FavoriteActions.LoadMyFavorite());
				}
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavorite)
		).subscribe(favorites => {
			this.favoritesId = favorites && favorites.id;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromSalesAgreement.favoriteTitle)
		).subscribe(title => {
			this.summaryHeader.favoritesListName = title;
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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.favoriteState)
		).subscribe(fav => {
			this.salesChoices = fav && fav.salesChoices;
			this.includeContractedOptions = fav && fav.includeContractedOptions;
		});	
	}

	onBack()
	{
		this.location.back();
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
	
	displayPoint(dp: DecisionPoint)
	{
		const choices = dp && dp.choices ? dp.choices.filter(c => c.quantity > 0) : [];
		const favoriteChoices = choices.filter(c => !this.salesChoices || this.salesChoices.findIndex(sc => sc.divChoiceCatalogId === c.divChoiceCatalogId) === -1);

		return this.includeContractedOptions
					? choices && !!choices.length
					: favoriteChoices && !!favoriteChoices.length;
	}

	onSubgroupSelected(id: number) {
		this.store.dispatch(new NavActions.SetSelectedSubgroup(id));

		const subGroups = _.flatMap(this.groups, g => _.flatMap(g.subGroups)) || [];
		const selectedSubGroup = subGroups.find(sg => sg.id === id);
		if (selectedSubGroup)
		{
			this.router.navigateByUrl(`/favorites/my-favorites/${this.favoritesId}/${selectedSubGroup.subGroupCatalogId}`);
		}
		else
		{
			this.router.navigateByUrl(`/favorites/my-favorites/${this.favoritesId}`);
		}
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

	onContractedOptionsToggled()
	{
		this.store.dispatch(new FavoriteActions.ToggleContractedOptions());
	}

	onViewFavorites(point: DecisionPoint)
	{
		const subGroup = _.flatMap(this.groups, g => g.subGroups).find(sg => sg.id === point.subGroupId);
	
		if (subGroup)
		{
			this.store.dispatch(new NavActions.SetSelectedSubgroup(point.subGroupId, point.id));
			this.router.navigateByUrl(`/favorites/my-favorites/${this.favoritesId}/${subGroup.subGroupCatalogId}`);		
		}
	}

	onRemoveFavorites(point: DecisionPoint)
	{
		let removedChoices = [];
		const choices = point && point.choices ? point.choices.filter(c => c.quantity > 0) : [];
		const favoriteChoices = choices.filter(c => !this.salesChoices || this.salesChoices.findIndex(sc => sc.divChoiceCatalogId === c.divChoiceCatalogId) === -1);

		if (favoriteChoices && favoriteChoices.length)
		{
			favoriteChoices.forEach(choice => {
				removedChoices.push({ choiceId: choice.id, quantity: 0, attributes: choice.selectedAttributes });

				const impactedChoices = getDependentChoices(this.tree, this.treeVersionRules, choice);

				impactedChoices.forEach(c =>
				{
					removedChoices.push({ choiceId: c.id, quantity: 0, attributes: c.selectedAttributes });
				});				
			});
		}

		this.store.dispatch(new ScenarioActions.SelectChoices(...removedChoices));
		this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
	}
}
