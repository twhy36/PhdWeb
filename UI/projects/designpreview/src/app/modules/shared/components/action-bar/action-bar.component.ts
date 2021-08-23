import { Component, Input, Output, NgZone, Renderer2, OnInit, ChangeDetectorRef, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { UnsubscribeOnDestroy } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as CommonActions from '../../../ngrx-store/actions';

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
	@Input() isDesignComplete: boolean = false;

	@Output() callToAction = new EventEmitter<{ actionBarCallType: ActionBarCallType }>();
	@Output() onPrintAction = new EventEmitter();

	autoHideTimer: any;
	isActionBarHidden = false;
	listener: () => void;
	scrollDelta = 5;
	scrolling = false;
	currentTopPosition = 0;
	previousTopPosition = 0;

	constructor(
		private cd: ChangeDetectorRef,
		private router: Router,
		private store: Store<fromRoot.State>
	) { super(); }

	ngOnInit(){ }

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

	onPrimaryCallToActionClick() {
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.PRIMARY_CALL_TO_ACTION });
	}

	onHomePage() {
		this.router.navigateByUrl('/home');
	}

	onPrint() 
	{
		this.onPrintAction?.emit();
	}
}
