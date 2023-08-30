import { Component, Input } from '@angular/core';

@Component({
	selector: 'view-options-link',
	templateUrl: './view-options-link.component.html',
	styleUrls: ['./view-options-link.component.scss'],
	})
export class ViewOptionsLinkComponent 
{
	@Input() isPresale: boolean;
}
