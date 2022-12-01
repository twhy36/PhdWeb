import { Component, Input, Output, OnInit, ContentChild, TemplateRef, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'phd-action-buttons-item',
    templateUrl: 'action-buttons-item.component.html',
    styleUrls: ['action-buttons-item.component.scss']
})
export class ActionButtonsItemComponent implements OnInit {
    @Input() isActive? = null;
    @Input() routerLink: string;
    routerLinkActive = false;
	@Input() label: string;
	@Input() buttonDisabled = false;

    @ContentChild(TemplateRef) template: TemplateRef<any>;

    @Output() onButtonClicked = new EventEmitter();

    constructor(private router: Router) { }

    ngOnInit() { }

    buttonClick()
	{
		if (!this.buttonDisabled)
		{
			this.onButtonClicked.emit();
		}        
    }
}
