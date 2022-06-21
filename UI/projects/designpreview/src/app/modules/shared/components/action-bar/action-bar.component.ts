import { Component, Input, Output, OnInit, ChangeDetectorRef, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { UnsubscribeOnDestroy } from 'phd-common';
import { BrandService } from '../../../core/services/brand.service';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import { ActionBarCallType } from '../../classes/constants.class';

@Component({
	selector: 'action-bar',
	templateUrl: 'action-bar.component.html',
	styleUrls: ['action-bar.component.scss']
})

export class ActionBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() scrollListener: any = window;
	@Input() primaryAction: string;
	@Input() price: number = 0;
	@Input() favoritesPrice: number = 0;
	@Input() showPrint = false;
	@Input() showFavorites = true;
	@Input() includeContractedOptions: boolean = false;
	@Input() isDesignComplete: boolean = false;
	@Input() isPreview: boolean = false;

	@Output() callToAction = new EventEmitter<{ actionBarCallType: ActionBarCallType }>();
	@Output() onPrintAction = new EventEmitter();
	@Output() onToggleContractedOptions = new EventEmitter();

	autoHideTimer: any;
	isActionBarHidden = false;
	listener: () => void;
	scrollDelta = 5;
	scrolling = false;
	currentTopPosition = 0;
	previousTopPosition = 0;
	favoritesListIcon = '';

	get isContractedOptionsDisabled() : boolean
	{
		return this.isPreview || this.isDesignComplete;
	}

	constructor(
		private cd: ChangeDetectorRef,
		private router: Router,
		private store: Store<fromRoot.State>,
		private brandService: BrandService
	) { super(); }

	ngOnInit(){ 
		this.favoritesListIcon = this.brandService.getBrandImage('favorites_list');
	}

	animateHeaderTransition(pageY) {
		this.currentTopPosition = pageY;

		if (this.previousTopPosition - this.currentTopPosition > this.scrollDelta) {
			this.isActionBarHidden = false;

			this.cd.detectChanges();
		}
		else if (this.currentTopPosition - this.previousTopPosition > this.scrollDelta) {
			this.isActionBarHidden = true;

			this.cd.detectChanges();

			clearTimeout(this.autoHideTimer);

			this.autoHideTimer = setTimeout(() => {
				this.isActionBarHidden = false;

				this.cd.detectChanges();
			}, 1000);
		}

		this.previousTopPosition = this.currentTopPosition;
		this.scrolling = false;
	}

	toggleContractedOptions() {
		if (!this.isContractedOptionsDisabled) {
			this.onToggleContractedOptions.emit();
		}
	}

	onPrimaryCallToActionClick() {
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.PRIMARY_CALL_TO_ACTION });
	}

	onHomePage() {
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));
		this.router.navigateByUrl('/home');
	}

	onPrint() 
	{
		this.onPrintAction?.emit();
	}

	onViewFavorites() {
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));
		this.router.navigateByUrl('/favorites/summary');
	}
}
