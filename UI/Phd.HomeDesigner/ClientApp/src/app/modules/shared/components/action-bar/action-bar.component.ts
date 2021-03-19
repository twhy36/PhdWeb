import { Component, Input, Output, NgZone, Renderer2, OnInit, ChangeDetectorRef, EventEmitter } from '@angular/core';
import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';

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

	@Output() callToAction = new EventEmitter<{ actionBarCallType: ActionBarCallType }>();

	autoHideTimer: any;
	isActionBarHidden = false;
	listener: () => void;
	scrollDelta = 5;
	scrolling = false;
	currentTopPosition = 0;
	previousTopPosition = 0;

	constructor(
		private ngZone: NgZone,
		private renderer: Renderer2,
		private cd: ChangeDetectorRef
	) { super(); }

	ngOnInit()
	{
		this.ngZone.runOutsideAngular(() => {
			/*prevents browser from firing scroll on page load*/
			setTimeout(() => {
				this.listener = this.renderer.listen(this.scrollListener, 'scroll', ($event) => { this.scrollHandler.bind(this)($event); });
			}, 200);
		});
	}

	ngOnDestroy() {
		if (this.listener) {
			this.listener();
		}

		super.ngOnDestroy();
	}

	scrollHandler($event: any) {
		if (!this.scrolling) {
			this.scrolling = true;

			requestAnimationFrame(() => {
				this.animateHeaderTransition(this.scrollListener.scrollY || this.scrollListener.scrollTop);
			});
		}
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

	onPrimaryCallToActionClick() {
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.PRIMARY_CALL_TO_ACTION });
	}
}
