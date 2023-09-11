import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, PriceBreakdown, Group, DecisionPoint, JobChoice } from 'phd-common';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';

import { GroupExt } from '../../../shared/models/group-ext.model';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { ScrollTop } from '../../../shared/classes/utils.class';

@Component({
	selector: 'contracted-summary',
	templateUrl: './contracted-summary.component.html',
	styleUrls: ['./contracted-summary.component.scss']
	})
export class ContractedSummaryComponent extends UnsubscribeOnDestroy implements OnInit
{
	groups: GroupExt[];
	priceBreakdown: PriceBreakdown;
	salesChoices: JobChoice[];
	buildMode: BuildMode;
	isPreview: boolean = false;
	isPresale: boolean = false;
	isDesignComplete: boolean = false;

	constructor(private store: Store<fromRoot.State>, 
		private location: Location) 
	{
		super();
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.contractedTree)
		).subscribe(tree => 
		{
			if (tree) 
			{
				this.groups = this.getGroupExts(tree.groups);
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.favoriteState)
		).subscribe(fav => 
		{
			this.salesChoices = fav && fav.salesChoices;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
		).subscribe((scenario) => 
		{
			this.isPreview = scenario.buildMode === BuildMode.Preview;
			this.isPresale = scenario.buildMode === BuildMode.Presale;
		});

		ScrollTop();
	}

	onBack()
	{
		this.location.back();
	}

	displayPoint(dp: DecisionPoint)
	{
		if (dp.isHiddenFromBuyerView) 
		{
			return false;
		}
		
		return dp?.choices?.some(c => c.quantity > 0 && !c.isHiddenFromBuyerView) ?? false;
	}

	getGroupExts(groups: Group[]) : GroupExt[]
	{
		return groups.map(g => 
		{
			return new GroupExt(g);
		})
	}
}
