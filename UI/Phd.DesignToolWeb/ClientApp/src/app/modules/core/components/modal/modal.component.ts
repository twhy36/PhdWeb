import { Subscription } from 'rxjs/Subscription';
import { Component, OnInit, ViewChild, ElementRef, TemplateRef } from '@angular/core';

import { ModalButton, ModalContent } from '../../../shared/classes/modal.class';

@Component({
	'selector': 'modal',
	'templateUrl': './modal.component.html'
})
export class ModalComponent extends ModalContent implements OnInit
{
	content: string | TemplateRef<any>;
	modalType: string;
	showModal = true;
	buttons?: ModalButton<any>[];
	header: string;
	autodismissTimer?: Subscription;
	needsInput = false;

	get hasTemplate(): boolean
	{
		return typeof this.content !== 'string';
	}

	@ViewChild('textInput') textInput: ElementRef;

	constructor()
	{
		super();
	}

	ngOnInit(): void { }

	buttonClick(result: any): void
	{
		if (this.needsInput && result === 'textInput')
		{
			this.close(this.textInput.nativeElement.value);
		}
		else
		{
			this.close(result);
		}
	}
}
