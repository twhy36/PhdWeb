import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
	selector: 'option-packages-header',
	templateUrl: 'option-packages-header.component.html',
	styleUrls: ['option-packages-header.component.scss']
})

export class OptionPackagesHeaderComponent {
	@Output() addOptionPackage = new EventEmitter();
	@Input() disableAddButton: boolean;
}