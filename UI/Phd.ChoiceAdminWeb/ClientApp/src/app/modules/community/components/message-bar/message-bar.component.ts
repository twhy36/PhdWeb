import { Component, Input, Output, EventEmitter } from '@angular/core';


@Component({
	selector: 'message-bar',
	templateUrl: './message-bar.component.html',
	styleUrls: ['./message-bar.component.scss']
})
export class MessageBarComponent
{
	constructor() { }

	@Input() messages: Array<string>;
	@Input() alertClass: string;
	@Input() textClass: string;
	@Input() messageType: string;

	@Output() messageClick: EventEmitter<string> = new EventEmitter();

	onMessageClick(message: string)
	{
		this.messageClick.emit(message);
	}
}
