import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver2 } from 'phd-common';

@Component({
	selector: 'option-summary',
	templateUrl: './option-summary.component.html',
	styleUrls: ['./option-summary.component.scss'],
	animations: [
		flipOver2
	],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptionSummaryComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() option: any;

	constructor(private cd: ChangeDetectorRef)
	{
		super();

	}

	ngOnInit() { }

	toggleCollapsed()
	{
		this.option.showColors = !this.option.showColors;
	}

	toggleColors(toggleColor: boolean)
	{
		this.option.showColors = toggleColor;
		this.cd.detectChanges();
	}
}
