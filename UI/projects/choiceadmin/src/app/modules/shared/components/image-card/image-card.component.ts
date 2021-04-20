import { Component, Input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
	selector: 'image-card',
	templateUrl: './image-card.component.html',
	styleUrls: ['./image-card.component.scss']
})

export class ImageCardComponent
{
	@Input() customClasses = '';
	@Input() showHeader = false;
	@Input() showFooter = false;
	@Input() headerTemplate: TemplateRef<any>;
	@Input() bodyTemplate: TemplateRef<any>;
	@Input() footerTemplate: TemplateRef<any>;

	constructor() { }
}
