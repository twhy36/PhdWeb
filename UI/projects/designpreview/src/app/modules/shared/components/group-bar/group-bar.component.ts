import { Component, OnInit, Input, Output, EventEmitter, HostListener, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

import { UnsubscribeOnDestroy, Group, PointStatus } from 'phd-common';

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
	@Output() onSetTreeFilter = new EventEmitter();

	highlightedStyle: any = { 'font-weight': 'bold' };
	completedStatuses = [PointStatus.COMPLETED, PointStatus.PARTIALLY_COMPLETED];
	widthLimit: number = 1025;
	currInnerWidth: number = this.widthLimit;
	prevInnerWidth: number = this.widthLimit;
	
	
	@ViewChild('hamburgerMenuTrigger') hamburgerTrigger; 
	@ViewChildren(MatMenuTrigger) trigger: QueryList<MatMenuTrigger>;
	
	@HostListener("window:resize", ["$event"])

	onResize(event) {
		this.currInnerWidth = event.target.innerWidth;
		
		//Catch the resize event of when the standard group-bar links disappear and the hamburger menu appears
		if ((this.prevInnerWidth >= this.widthLimit) && (this.currInnerWidth < this.widthLimit)) {
			for (let item of this.trigger.toArray()) {	//Close any open sub-menu's from the standard group-bar links
				item.closeMenu();
			}
		}
		
		//Catch the resize event of when the hamburger menu disappears and the standard group-bar links appear
		if ((this.prevInnerWidth < this.widthLimit) && (this.currInnerWidth >= this.widthLimit)) {
			this.hamburgerTrigger.closeMenu();	//When the hamburger menu disappears, make its sub-menus also disappear
		}
		
		this.prevInnerWidth = this.currInnerWidth;
	}
	
	constructor()
    {
		super();
	}

	ngOnInit() {
	}

	selectSubgroup(sgId: number) {
		this.onSubgroupSelected.emit(sgId);
	}

	isGroupSelected(groupId: number) : boolean {
		return this.groups.some(g => g.id === groupId && g.subGroups.some(sg => sg.id === this.selectedSubGroupId));
	}

	setTreeFilter()
	{
		this.onSetTreeFilter.emit();
	}
}
