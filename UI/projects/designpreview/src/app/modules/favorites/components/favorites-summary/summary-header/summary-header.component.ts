import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, ElementRef, Renderer2, NgZone } from '@angular/core';

import { UnsubscribeOnDestroy, LotExt, PriceBreakdown } from 'phd-common';

@Component({
	selector: 'summary-header',
	templateUrl: './summary-header.component.html',
	styleUrls: ['./summary-header.component.scss']
})
export class SummaryHeaderComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() summaryHeader: SummaryHeader;
	@Input() priceBreakdown: PriceBreakdown;
	@Input() includeContractedOptions: boolean;
	@Input() isPreview: boolean = false;
	@Input() isDesignComplete: boolean = false;

	@Output() isStickyChanged = new EventEmitter<boolean>();
	@Output() contractedOptionsToggled = new EventEmitter<boolean>();
	
	scrolling: boolean = false;
	isSticky: boolean = false;
	listener: () => void;

	constructor(
		private ngZone: NgZone,
		private renderer: Renderer2,
		private cd: ChangeDetectorRef, 
		private summaryHeaderElement: ElementRef)
	{
		super();
	}

	ngOnInit()
	{
		this.ngZone.runOutsideAngular(() =>
		{
			this.listener = this.renderer.listen('window', 'scroll', () => { this.scrollHandler.bind(this)(); });
		});
	}

	get address(): string {
		let address = 'N/A';

		if (this.summaryHeader.lot) {
			let lot = this.summaryHeader.lot;

			if ((lot.streetAddress1 && lot.streetAddress1.length) && (lot.city && lot.city.length) && (lot.stateProvince && lot.stateProvince.length) && (lot.postalCode && lot.postalCode.length)) {
				let address2 = lot.streetAddress2 ? ' ' + lot.streetAddress2 : '';

				address = `${lot.streetAddress1}${address2}, ${lot.city}, ${lot.stateProvince} ${lot.postalCode}`;
			}
		}

		return address;
	}

	get title() : string {
		return this.isPreview ? 'Preview Favorites' : this.summaryHeader.favoritesListName;
	}

	get isContractedOptionsDisabled() : boolean
	{
		return this.isPreview || this.isDesignComplete;
	}	

	scrollHandler()
	{
		if (!this.scrolling)
		{
			this.scrolling = true;

			requestAnimationFrame(() =>
			{
				this.checkIfHeaderSticky();
			});
		}
	}

	checkIfHeaderSticky()
	{
		const clientRect = this.summaryHeaderElement.nativeElement.getBoundingClientRect();
		if (clientRect.top < 110)
		{
			if (!this.isSticky && document.body.scrollHeight > 1500) {
				this.isSticky = true;
				this.cd.detectChanges();
				this.isStickyChanged.emit(this.isSticky);
			}
		}
		else
		{
			if (this.isSticky) {
				this.isSticky = false;
				this.cd.detectChanges();
				this.isStickyChanged.emit(this.isSticky);
			}
		}		

		this.scrolling = false;
	}

	toggleContractedOptions(event: any) {
		this.contractedOptionsToggled.emit();
	}
}

export class SummaryHeader {
	favoritesListName: string;
	communityName: string;
	planName: string;
	elevationImageUrl: string;
	lot: LotExt;
}
