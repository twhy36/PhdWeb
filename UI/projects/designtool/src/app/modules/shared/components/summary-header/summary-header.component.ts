import { Component, OnInit, Input, NgZone, Renderer2, ChangeDetectorRef, OnDestroy, ElementRef, Output, EventEmitter, ViewChild } from '@angular/core';

import { LotExt, Plan, PointStatus, PriceBreakdown } from 'phd-common';

import { ScenarioService } from '../../../core/services/scenario.service';

import { PointStatusFilter } from '../../../shared/models/decisionPointFilter';

import { PricingBreakdownComponent } from '../pricing-breakdown/pricing-breakdown.component';

@Component({
	selector: 'summary-header',
	templateUrl: './summary-header.component.html',
	styleUrls: ['./summary-header.component.scss']
})
export class SummaryHeaderComponent implements OnInit, OnDestroy
{
	@ViewChild(PricingBreakdownComponent) priceBreakdownComponent: PricingBreakdownComponent;

	PointStatus = PointStatus;
	scrolling = false;
	isSticky = false;
	listener: () => void;
	showAllAttributes: boolean = false;
	showImages: boolean = false;

	@Input() pointStatusFilter: PointStatusFilter;
	@Input() summaryHeader: SummaryHeader;
	@Input() priceBreakdown: PriceBreakdown;
	@Input() allowEstimates: boolean;
	@Input() canEditHanding: boolean;
	@Input() canConfigure: boolean;
	@Input() disableHanding: boolean;
	@Input() canOverride: boolean;
	@Input() isPhdLite: boolean;

	@Output() pointStatusFilterChanged = new EventEmitter<PointStatusFilter>();
	@Output() toggleAllAttributesChanged = new EventEmitter<boolean>();
	@Output() isStickyChanged = new EventEmitter<boolean>();
	@Output() toggleImagesChanged = new EventEmitter<boolean>();
	@Output() handingChanged = new EventEmitter<string>();

	get communityName(): string
	{
		return this.summaryHeader.communitySalesName || 'N/A';
	}

	get planName(): string
	{
		return this.summaryHeader.plan ? `${this.summaryHeader.plan.salesName}, ${this.summaryHeader.plan.integrationKey}` : 'N/A';
	}

	get homesite(): string
	{
		let homesite : string = 'No Lot Selected';

		if (this.summaryHeader.lot)
		{
			homesite = this.summaryHeader.lot.lotBlock;

			if (!this.canEditHanding && this.summaryHeader.handing && this.summaryHeader.handing != 'NA')
			{
				homesite += `, ${this.summaryHeader.handing} Garage`;
			}
		}

		return homesite;
	}

	get hasHomesite(): boolean
	{
		return this.summaryHeader.lot != null;
	}

	get isPreview(): boolean
	{
		return this.summaryHeader.isPreview;
	}

	get address(): string
	{
		let address = 'N/A';

		if (this.summaryHeader.lot)
		{
			let lot = this.summaryHeader.lot;

			if ((lot.streetAddress1 && lot.streetAddress1.length) && (lot.city && lot.city.length) && (lot.stateProvince && lot.stateProvince.length) && (lot.postalCode && lot.postalCode.length))
			{
				let address2 = lot.streetAddress2 ? ' ' + lot.streetAddress2 : '';

				address = `${lot.streetAddress1}${address2}, ${lot.city}, ${lot.stateProvince} ${lot.postalCode}`;
			}
		}

		return address;
	}

	get handing(): string
	{
		return this.summaryHeader.handing || 'Select ...';
	}

	constructor(
		public scenarioService: ScenarioService,
		private ngZone: NgZone,
		private renderer: Renderer2,
		private cd: ChangeDetectorRef,
		private summaryHeaderElement: ElementRef) { }

	ngOnInit()
	{
		this.ngZone.runOutsideAngular(() =>
		{
			this.listener = this.renderer.listen('window', 'scroll', () => { this.scrollHandler.bind(this)(); });
		});
	}

	filtersUpdated(filter: PointStatusFilter)
	{
		this.pointStatusFilterChanged.emit(filter);
	}

	ngOnDestroy()
	{
		this.listener();
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

	// Should be removed and replaced with css 'position:sticky' once edge fixes existing bugs.
	checkIfHeaderSticky()
	{
		if (this.summaryHeaderElement.nativeElement.getBoundingClientRect().top <= 0)
		{
			this.isSticky = true;
			this.cd.detectChanges();
		}
		else
		{
			this.isSticky = false;
			this.cd.detectChanges();
		}

		this.isStickyChanged.emit(this.isSticky);

		this.scrolling = false;
	}

	toggleAllAttributes()
	{
		this.showAllAttributes = !this.showAllAttributes;

		this.toggleAllAttributesChanged.emit(this.showAllAttributes);
	}

	toggleImages()
	{
		this.showImages = !this.showImages;

		this.toggleImagesChanged.emit(this.showImages);
	}

	onChangeHanding(handing: string)
	{
		this.summaryHeader.handing = handing;
		this.handingChanged.emit(handing);
	}
}

export class SummaryHeader
{
	plan: Plan;
	lot: LotExt;
	communitySalesName: string;
	handing: string;
	isPreview: boolean;
}
