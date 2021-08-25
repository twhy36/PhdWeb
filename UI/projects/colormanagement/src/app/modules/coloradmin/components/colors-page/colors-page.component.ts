import {Component, ViewChild} from '@angular/core';

@Component({
	selector: 'colors-page',
	templateUrl: './colors-page.component.html',
	styleUrls: ['./colors-page.component.scss']
})
export class ColorsPageComponent
{
	sidePanelOpen: boolean = false;
	@ViewChild('addColorModal') addColorModal: any;
}
