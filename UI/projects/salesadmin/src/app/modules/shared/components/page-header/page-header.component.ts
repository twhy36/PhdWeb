import { Component, Input, TemplateRef, ContentChild } from '@angular/core';

@Component({
	selector: 'page-header',
	templateUrl: './page-header.component.html',
	styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent
{
	@Input() mainTitle: string;
	@ContentChild(TemplateRef) headerTemplate: TemplateRef<any>;

	constructor() { }
}
