import { Component, Input, Output, EventEmitter } from '@angular/core';

import { UnsubscribeOnDestroy } from 'phd-common';

@Component({
	selector: 'header-bar',
	templateUrl: 'header-bar.component.html',
	styleUrls: ['header-bar.component.scss']
})
export class HeaderBarComponent extends UnsubscribeOnDestroy
{
	@Input() communityName: string;
	@Input() planName: string;

	@Output() onSetTreeFilter = new EventEmitter();
	
	constructor()
	{
		super();
	}

	setTreeFilter()
	{
		this.onSetTreeFilter.emit();
	}
}
