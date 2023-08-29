import { Component, Input } from '@angular/core';

@Component({
	selector: 'action-bar-mobile',
	templateUrl: './action-bar.component.html',
	styleUrls: ['./action-bar.component.scss'],
	})
export class ActionBarComponent
{
	@Input() showBack: boolean = false;
	@Input() actionLabel: string;
	@Input() actionLink: (string | number)[];
}
