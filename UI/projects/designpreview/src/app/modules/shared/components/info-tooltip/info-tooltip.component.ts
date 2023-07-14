import { Component, Input, ViewEncapsulation, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { NgbTooltip, NgbTooltipConfig } from '@ng-bootstrap/ng-bootstrap';

@Component({
	selector: 'info-tooltip-component',
	templateUrl: './info-tooltip.component.html',
	styleUrls: ['./info-tooltip.component.scss'],
	encapsulation: ViewEncapsulation.None
	})

export class InfoTooltipComponent implements OnInit, OnDestroy
{
	@Input() template = 'Test';

	@ViewChild('infoTooltip', { static: false }) infoTooltip: NgbTooltip;

	constructor(config: NgbTooltipConfig) 
	{
		// customize default values of tooltips used by this component tree
		config.openDelay = 600;
		config.triggers = 'click hover';
	}

	ngOnInit(): void
	{
		window.addEventListener('scroll', this.onScroll.bind(this));
	}

	onScroll()
	{
		if (this.infoTooltip.isOpen())
		{
			this.infoTooltip.close();
		}
	}

	ngOnDestroy()
	{
		window.removeEventListener('scroll', this.onScroll.bind(this));
	}
}
