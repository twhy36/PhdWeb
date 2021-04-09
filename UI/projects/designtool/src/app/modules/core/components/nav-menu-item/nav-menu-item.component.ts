import { Component, Input, OnInit, ContentChild, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';

import { flipOver2, PointStatus } from 'phd-common';

@Component({
	selector: 'phd-nav-menu-item',
	templateUrl: 'nav-menu-item.component.html',
	styleUrls: ['nav-menu-item.component.scss'],
	animations: [
		flipOver2
	]
})
export class NavMenuItemComponent implements OnInit
{
	@Input() isActive = null;
	@Input() label: string;
	@Input() status: PointStatus;
	@Input() disabled = false;
	@Input() showStatusIndicator: boolean;
	@Input() isLockedIn: boolean = false;

	@ContentChild(TemplateRef) template: TemplateRef<any>;

	PointStatus = PointStatus;

	constructor(private router: Router) { }

	ngOnInit()
	{
		
	}
}
