import { Component, Input, Output, EventEmitter } from '@angular/core';

import { flipOver2, PointStatus, BrowserService } from 'phd-common';
import { Observable } from 'rxjs';

@Component({
	selector: 'phase-progress-bar',
	templateUrl: 'phase-progress-bar.component.html',
	styleUrls: ['phase-progress-bar.component.scss'],
	animations: [flipOver2]
})
export class PhaseProgressBarComponent {
	PointStatus = PointStatus;
	isTablet$: Observable<boolean>;
	browserSubscription$: Observable<boolean>;

	@Input() items: { label: string, status: any, id: number }[];
	@Input() selectedItem: number;
	@Input() showStatusIndicator: boolean;
	@Input() showItems: boolean = true;
	@Input() disabled: boolean = false;

	@Output() onItemSelected = new EventEmitter<number>();

	constructor(private browser: BrowserService) {}

	ngOnInit() {
		this.isTablet$ = this.browser.isTablet();
	}

	onSubGroupClick(navItem: any) {
		this.onItemSelected.emit(navItem.id);
	}
}
