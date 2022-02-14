import { Component, Input, Output, EventEmitter } from '@angular/core';

import { MonotonyConflict } from '../../../shared/models/monotony-conflict.model';

@Component({
	selector: 'monotony-conflict-modal',
	templateUrl: './monotony-conflict-modal.component.html',
	styleUrls: ['./monotony-conflict-modal.component.scss']
})
export class MonotonyConflictModalComponent
{
	@Input() monotonyConflict: MonotonyConflict;

	@Output() onNavigateToElevation = new EventEmitter();
	@Output() onNavigateToColorScheme = new EventEmitter();
	@Output() onNavigateToLot = new EventEmitter();

	acknowledgedMonotonyConflict: boolean;

	constructor() {	}

	acknowledgeMonotonyConflict()
	{
		this.acknowledgedMonotonyConflict = !this.acknowledgedMonotonyConflict;
	}

	navigateToElevation()
	{
		this.onNavigateToElevation.emit();
	}

	navigateToColorScheme()
	{
		this.onNavigateToColorScheme.emit();
	}

	navigateToLot()
	{
		this.onNavigateToLot.emit();
	}	
}
