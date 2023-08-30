import { Component, Input } from '@angular/core';

@Component({ selector: 'estimated-totals', template: '' })
export class MockEstimatedTotalsComponent
{
	@Input() isPresale = false;
	@Input() isPresalePricingEnabled = false;
	@Input() isDesignComplete = false;
}