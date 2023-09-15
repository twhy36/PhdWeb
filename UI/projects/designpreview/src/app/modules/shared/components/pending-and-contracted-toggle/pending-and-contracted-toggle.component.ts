import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';

import { UnsubscribeOnDestroy } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as FavoriteActions from '../../../ngrx-store/favorite/actions';

import { BuildMode } from '../../../shared/models/build-mode.model';
import { combineLatest } from 'rxjs';
import { Constants } from '../../../shared/classes/constants.class';

@Component({
	selector: 'pending-and-contracted-toggle',
	templateUrl: './pending-and-contracted-toggle.component.html',
	styleUrls: ['./pending-and-contracted-toggle.component.scss']
// eslint-disable-next-line indent
})
export class PendingAndContractedToggleComponent extends UnsubscribeOnDestroy implements OnInit
{
	buildMode: BuildMode;
	includeContractedOptions: boolean;
	isDesignComplete: boolean;
	label: string = Constants.SHOW_OPTIONS_TEXT;

	get isContractedOptionsDisabled(): boolean
	{
		return this.buildMode === BuildMode.Preview || this.isDesignComplete;
	}

	constructor(private store: Store<fromRoot.State>)
	{
		super();
	}

	ngOnInit(): void
	{
		combineLatest([
			this.store.pipe(select(state => state.salesAgreement), this.takeUntilDestroyed()),
			this.store.pipe(select(state => state.scenario), this.takeUntilDestroyed()),
			this.store.pipe(select(fromFavorite.favoriteState))
		]).subscribe(([sag, scenario, fav]) =>
		{
			this.isDesignComplete = sag?.isDesignComplete || false;
			this.buildMode = scenario.buildMode;
			this.includeContractedOptions = fav && fav.includeContractedOptions;
		});
	}

	toggleContractedOptions(): void
	{
		this.store.dispatch(new FavoriteActions.ToggleContractedOptions());
	}
}
