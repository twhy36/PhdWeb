import { Component, Input } from '@angular/core';

@Component({ selector: 'action-bar', template: '' })
export class MockActionBarComponent 
{
	@Input() scrollListener = window;
	@Input() primaryAction: string;
	@Input() price: number = 0;
	@Input() favoritesPrice: number = 0;
	@Input() showPrint = false;
	@Input() showFavorites = true;
	@Input() includeContractedOptions: boolean = false;
	@Input() isDesignComplete: boolean = false;
	@Input() isPreview: boolean = false;
	@Input() isPresale: boolean = false;
	@Input() hideContractedToggle: boolean = false;
	@Input() isFixedWidth: boolean = false;
	@Input() isContractedPage: boolean = false;
}
