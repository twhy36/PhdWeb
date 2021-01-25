import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

import { UnsubscribeOnDestroy, BrowserService, Group } from 'phd-common';

@Component({
	selector: 'group-bar',
	templateUrl: 'group-bar.component.html',
	styleUrls: ['group-bar.component.scss']
})
export class GroupBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() communityName: string;
	@Input() planName: string;
	@Input() groups: Group[];
	@Input() selectedSubGroupId: number;

	@Output() onSubgroupSelected = new EventEmitter<number>();

	highlightedStyle: any = { 'font-weight': 'bold' };
	isTablet$: Observable<boolean>;

	constructor(private browser: BrowserService)
    {
		super();
	}

	ngOnInit() {
		this.isTablet$ = this.browser.isTablet();
	}

	selectSubgroup(gId: number, sgId: number) {
		this.onSubgroupSelected.emit(sgId);
	}

	isGroupSelected(groupId: number) : boolean {
		return this.groups.some(g => g.id === groupId && g.subGroups.some(sg => sg.id === this.selectedSubGroupId));
	}
}
