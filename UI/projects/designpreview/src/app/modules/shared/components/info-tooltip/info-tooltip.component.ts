import { Component, Input, ViewEncapsulation } from '@angular/core';
import { NgbTooltipConfig } from '@ng-bootstrap/ng-bootstrap';

@Component({
	selector: 'info-tooltip-component',
	templateUrl: './info-tooltip.component.html',
	styleUrls: ['./info-tooltip.component.scss'],
	encapsulation: ViewEncapsulation.None
})

export class InfoTooltipComponent 
{
    @Input() template = 'Test';
    
    constructor(config: NgbTooltipConfig) 
    {
    	// customize default values of tooltips used by this component tree
    	config.openDelay = 600;
    }
}
