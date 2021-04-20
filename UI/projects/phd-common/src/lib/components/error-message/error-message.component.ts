import { Component, OnInit, Input, ContentChild, TemplateRef } from '@angular/core';

@Component({
	selector: 'error-message',
	templateUrl: './error-message.component.html',
	styleUrls: ['./error-message.component.scss']
})

export class ErrorMessageComponent implements OnInit
{
	@Input() title: string;
	@Input() customClasses: string = '';

	@ContentChild("body") bodyTemplate: TemplateRef<any>;

	ngOnInit()
	{
		if (!this.title)
		{
			this.title = 'Oh no!';
		}
	}
}
