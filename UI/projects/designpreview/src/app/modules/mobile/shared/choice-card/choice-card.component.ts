import { Component, Input, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';

import { Choice, DecisionPoint, JobChoice, MyFavoritesPointDeclined, PickType, PlanOption, Tree, TreeVersionRules, UnsubscribeOnDestroy, getChoiceImage, getDependentChoices } from 'phd-common';
import { combineLatest } from 'rxjs';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import { BuildMode } from '../../../shared/models/build-mode.model';
import { ChoiceStatus, Constants } from '../../../shared/classes/constants.class';

@Component({
	selector: 'choice-card-mobile',
	templateUrl: './choice-card.component.html',
	styleUrls: ['./choice-card.component.scss']
	})
export class ChoiceCardComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() choice: Choice;
	@Input() point: DecisionPoint;

	defaultImage: string = Constants.NO_IMAGE_AVAILABLE_PATH;
	imageUrl: string;
	isDesignComplete: boolean;
	isFavorite: boolean = false;;
	isPresale: boolean;
	isPresalePricingEnabled: boolean;
	myFavoriteId: number;
	myFavoritesPointsDeclined: MyFavoritesPointDeclined[];
	options: PlanOption[];
	salesChoices: JobChoice[];
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	unfilteredPoint: DecisionPoint;

	get choiceStatus(): string
	{
		if (this.point.isPastCutOff || this.salesChoices?.findIndex(c => c.divChoiceCatalogId === this.choice.divChoiceCatalogId) > -1)
		{
			return ChoiceStatus.Contracted;
		}
		const contractedChoices = this.unfilteredPoint.choices.filter(c => this.salesChoices?.flatMap(sc => sc.divChoiceCatalogId).includes(c.divChoiceCatalogId));

		if (contractedChoices?.length > 0 &&
			(this.point.pointPickTypeId === PickType.Pick1 || this.point.pointPickTypeId === PickType.Pick0or1))
		{
			return ChoiceStatus.ViewOnly;
		}
		return ChoiceStatus.Available;
	}

	constructor(private store: Store<fromRoot.State>)
	{
		super();
	}

	ngOnInit(): void
	{
		this.imageUrl = getChoiceImage(this.choice);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
		).subscribe((state) => 
		{
			this.isPresalePricingEnabled = state.presalePricingEnabled;
			if (state.buildMode === BuildMode.Presale) 
			{
				this.isPresale = true;
			}
			else 
			{
				this.isPresale = false;
			}
			this.tree = state.tree;

			// Must be cloned to get bypass readonly properties when passed into applyRules
			this.options = structuredClone(state.options);
			this.treeVersionRules = structuredClone(state.rules);
		});

		combineLatest([
			this.store.pipe(select(fromFavorite.favoriteState), this.takeUntilDestroyed()),
			this.store.pipe(select(fromScenario.selectUnfilteredPoint(this.point.divPointCatalogId)), this.takeUntilDestroyed()),
			this.store.pipe(select(state => state.salesAgreement), this.takeUntilDestroyed()),
		]).subscribe(([fav, up, sag]) =>
		{
			const currentMyFavorite = fav.myFavorites?.find(x => x.id === fav.selectedFavoritesId);
			this.isFavorite = currentMyFavorite?.myFavoritesChoice.find(c => c.divChoiceCatalogId === this.choice.divChoiceCatalogId) ? true : false;
			this.myFavoriteId = currentMyFavorite.id;
			this.myFavoritesPointsDeclined = currentMyFavorite && currentMyFavorite.myFavoritesPointDeclined;
			this.salesChoices = fav && fav.salesChoices;
			this.unfilteredPoint = up;
			this.isDesignComplete = sag?.isDesignComplete || false;
		});

	}

	toggleChoice(): void
	{
		if (!this.choice.enabled)
		{
			this.displayBlockedChoiceModal();
		}
		else
		{
			const selectedChoices = [{ choiceId: this.choice.id, divChoiceCatalogId: this.choice.divChoiceCatalogId, quantity: !this.choice.quantity ? 1 : 0, attributes: this.choice.selectedAttributes }];
			const impactedChoices = getDependentChoices(this.tree, this.treeVersionRules, this.options, this.choice);

			impactedChoices.forEach(c =>
			{
				selectedChoices.push({ choiceId: c.id, divChoiceCatalogId: c.divChoiceCatalogId, quantity: 0, attributes: c.selectedAttributes });
			});

			if (this.choice.quantity === 0)
			{
				this.deselectDeclinedPoints(this.choice);
			}

			this.store.dispatch(new ScenarioActions.SelectChoices(this.isDesignComplete, ...selectedChoices));
			this.store.dispatch(new FavoriteActions.SaveMyFavoritesChoices());
		}
	}

	deselectDeclinedPoints(choice: Choice)
	{
		// Check for favorites and deselect declined points in favorites
		const points = this.tree.treeVersion.groups.flatMap(g => g.subGroups).flatMap(sg => sg.points) || [];
		const pointDeclined = points.find(p => p.choices.some(c => c.divChoiceCatalogId === choice.divChoiceCatalogId));
		const fdp = this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === pointDeclined.divPointCatalogId);

		if (fdp)
		{
			this.store.dispatch(new FavoriteActions.DeleteMyFavoritesPointDeclined(this.myFavoriteId, fdp.id));
		}
	}

	displayBlockedChoiceModal(): void
	{
		// TODO: WI: 403714 - Add Rules/Blocked Modal
	}
}
