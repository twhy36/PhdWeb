import { Component, Input } from '@angular/core';

@Component({
	selector: 'page-header',
	templateUrl: './page-header.component.html',
	styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent
{
	@Input() mainTitle: string;
	@Input() subTitle: string;

	constructor() { }
}
