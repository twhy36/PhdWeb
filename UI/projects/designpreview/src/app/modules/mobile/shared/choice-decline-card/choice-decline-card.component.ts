import { Component, Input, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';

import { DecisionPoint, MyFavoritesPointDeclined, PlanOption, Tree, TreeVersionRules, UnsubscribeOnDestroy, getDependentChoices } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

@Component({
	selector: 'choice-decline-card-mobile',
	templateUrl: './choice-decline-card.component.html',
	styleUrls: ['./choice-decline-card.component.scss']
// eslint-disable-next-line indent
})
export class ChoiceDeclineCardComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() decisionPoint: DecisionPoint;

	defaultImage: string = 'assets/nographicgrey-removebg-preview.png';
	isDesignComplete: boolean;
	myFavoriteId: number;
	myFavoritesPointsDeclined: MyFavoritesPointDeclined[];
	options: PlanOption[];
	tree: Tree;
	treeVersionRules: TreeVersionRules;

	get isDeclined(): boolean
	{
		return !!this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === this.decisionPoint.divPointCatalogId) && this.decisionPoint.enabled;
	}

	constructor(private store: Store<fromRoot.State>) 
	{
		super();
	}

	ngOnInit(): void
	{
		this.store.pipe(
			this.takeUntilDestroyed(), 
			select(state => state.scenario)
		).subscribe(scenario =>
		{
			this.tree = scenario.tree;
			this.treeVersionRules = structuredClone(scenario.rules);
			this.options = structuredClone(scenario.options);
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavorite)
		).subscribe(favorite =>
		{
			this.myFavoriteId = favorite && favorite.id;
			this.myFavoritesPointsDeclined = favorite && favorite.myFavoritesPointDeclined;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement)
		).subscribe(sag =>
		{
			this.isDesignComplete = sag?.isDesignComplete ?? false;
		})
	}

	declineDecisionPoint(): void
	{
		if (!this.decisionPoint.enabled)
		{
			this.displayBlockedPointModal();
		}
		else
		{
			const declPoint = this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === this.decisionPoint.divPointCatalogId);

			if (!declPoint)
			{
				this.store.dispatch(new FavoriteActions.AddMyFavoritesPointDeclined(this.myFavoriteId, this.decisionPoint.id, this.decisionPoint.divPointCatalogId));
				this.deselectPointChoices(this.decisionPoint.divPointCatalogId);
			}
			else
			{
				this.store.dispatch(new FavoriteActions.DeleteMyFavoritesPointDeclined(this.myFavoriteId, declPoint.id));
			}

			const declPointIds = [this.decisionPoint.divPointCatalogId];

			this.store.dispatch(new ScenarioActions.SetStatusForPointsDeclined(declPointIds, !!declPoint));
		}
	}

	deselectPointChoices(declinedPointCatalogId: number)
	{
		const deselectedChoices = [];

		const points = this.tree?.treeVersion?.groups.flatMap(g => g.subGroups).flatMap(sg => sg.points) ?? [];
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

	displayBlockedPointModal(): void
	{
		// TODO: WI: 403714 - Add Rules/Blocked Modal
	}
}
