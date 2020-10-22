import { Component, Input, OnInit, ContentChild, TemplateRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import { PointStatus } from '../../../shared/models/point.model';
import { flipOver2 } from '../../../shared/classes/animations.class';

@Component({
	selector: 'phd-nav-menu-item',
	templateUrl: 'nav-menu-item.component.html',
	styleUrls: ['nav-menu-item.component.scss'],
	animations: [
		flipOver2
	]
})
export class NavMenuItemComponent implements OnInit {
	@Input() isActive = null;
	@Input() label: string;
	@Input() status: PointStatus;
	@Input() disabled = false;
	@Input() showStatusIndicator: boolean;

	@ContentChild(TemplateRef) template: TemplateRef<any>;

	PointStatus = PointStatus;

	constructor(private router: Router) { }

	ngOnInit() {
	}
}
