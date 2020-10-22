import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component( {
	selector: 'add-card',
	templateUrl: './add-card.component.html',
	styleUrls: ['./add-card.component.scss']
} )
export class AddCardComponent
{
	@Input() action: string = 'Add';
	@Input() label: string = 'Program';
	@Input() labels: string = 'Programs';
	@Input() btnLabel: string = 'N/A';
	@Input() hasNA: boolean = false;
	@Input() hasPlus: boolean = true;
	@Input() isNA: boolean = false;

	@Output() onAdd = new EventEmitter();
	@Output() onNA = new EventEmitter();

	constructor() { }

	add()
	{
		this.onAdd.emit();
	}

	setNA( $event )
	{
		this.onNA.emit();
		$event.stopPropagation();
	}
}
