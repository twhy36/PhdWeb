import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, PriceBreakdown, Group, DecisionPoint, JobChoice } from 'phd-common';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';

import { GroupExt } from '../../../shared/models/group-ext.model';
import { AdobeService } from '../../../core/services/adobe.service';

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
	buildMode: string;
	isPreview: boolean = false;
	isDesignComplete: boolean = false;
	adobeLoadInitialized: boolean;

	constructor(private store: Store<fromRoot.State>, 
		private location: Location,
		private adobeService: AdobeService) {
			super();
		}

	ngOnInit()
	{
		this.adobeLoadInitialized = false;
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.contractedTree)
		).subscribe(tree => {
			if (tree) {
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
		).subscribe(fav => {
			this.salesChoices = fav && fav.salesChoices;
		});

		this.initializeAdobePageLoad();
	}

	onBack()
	{
		this.location.back();
	}

	displayPoint(dp: DecisionPoint)
	{
		if (dp.isHiddenFromBuyerView) {
			return false;
		}
		const choices = dp && dp.choices ? dp.choices.filter(c => c.quantity > 0 && !c.isHiddenFromBuyerView) : [];

		return choices && !!choices.length
	}

	getGroupExts(groups: Group[]) : GroupExt[]
	{
		return groups.map(g => {
			return new GroupExt(g);
		})
	}

	initializeAdobePageLoad() {
		let pageType = 'Contracted Options Page';
		let pageName = 'Contracted Options';
		let groupName = '';
		let subGroupName = '';

		this.adobeService.setPageLoadEvent(this.adobeLoadInitialized, pageType, pageName, groupName, subGroupName);
	}
}
