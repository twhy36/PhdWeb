import {Component} from '@angular/core'

@Component({
	selector: 'colors-page',
	templateUrl: './colors-page.component.html',
	styleUrls: ['./colors-page.component.scss']
})
export class ColorsPageComponent
{
	sidePanelOpen: boolean = false;

	toggleSidePanel(isOpen: boolean) {
		console.log(`Event was received in ColorsPage - ${isOpen}`);
		this.sidePanelOpen = isOpen;
	}
}
