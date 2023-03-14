import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, ElementRef, Renderer2, NgZone, HostListener } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { select, Store } from '@ngrx/store';

import * as fromRoot from '../../../../ngrx-store/reducers';
import * as fromPlan from '../../../../ngrx-store/plan/reducer';
import { UnsubscribeOnDestroy, LotExt, PriceBreakdown } from 'phd-common';
import { BrandService } from '../../../../core/services/brand.service';
import { BuildMode } from '../../../../shared/models/build-mode.model';

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
	@Input() isDesignComplete: boolean = false;
	@Input() isPrintHeader: boolean = false;
	
	@Output() isStickyChanged = new EventEmitter<boolean>();
	@Output() contractedOptionsToggled = new EventEmitter<boolean>();
	
	scrolling: boolean = false;
	isSticky: boolean = false;
	isPreview: boolean = false;
	isPresale: boolean = false;
	headerTitle: string;
	communityName: string;
	planName: string;
	listener: () => void;

	constructor(
		private ngZone: NgZone,
		private renderer: Renderer2,
		private store: Store<fromRoot.State>,
		private cd: ChangeDetectorRef,
		private summaryHeaderElement: ElementRef,
		private brandService: BrandService,
		private titleService: Title)
	{
		super();
	}

	get disclaimerText()
	{
		return 'Option selections are not final until purchased via a signed agreement or change order.';
	}

	ngOnInit()
	{
		this.ngZone.runOutsideAngular(() =>
		{
			this.listener = this.renderer.listen('window', 'scroll', () => { this.scrollHandler.bind(this)(); });
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName =>
		{
			this.communityName = communityName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData =>
		{
			this.planName = planData?.salesName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
		).subscribe((state) =>
		{
			switch (state.buildMode)
			{
			case (BuildMode.Preview):
				this.isPreview = true;
				this.headerTitle = 'Preview Favorites';
				break;
			case (BuildMode.Presale):
				this.isPresale = true;
				this.headerTitle = 'My Favorites';
				break;
			default:
				this.isPreview = false;
				this.isPresale = false;
				this.headerTitle = this.summaryHeader.favoritesListName;
				break;
			}
		});
	}

	get address(): string
	{
		let address = 'N/A';

		if (this.summaryHeader.lot)
		{
			const lot = this.summaryHeader.lot;

			if ((lot.streetAddress1 && lot.streetAddress1.length) && (lot.city && lot.city.length) && (lot.stateProvince && lot.stateProvince.length) && (lot.postalCode && lot.postalCode.length))
			{
				const address2 = lot.streetAddress2 ? ' ' + lot.streetAddress2 : '';

				address = `${lot.streetAddress1}${address2}, ${lot.city}, ${lot.stateProvince} ${lot.postalCode}`;
			}
		}

		return address;
	}

	getPlanName() : string
	{
		return this.isPresale ? this.summaryHeader.planName + ' Floorplan' : this.summaryHeader.planName;
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
		if (!this.isPrintHeader)
		{
			const clientRect = this.summaryHeaderElement.nativeElement.getBoundingClientRect();
			if (clientRect.top < 110)
			{
				if (!this.isSticky && document.body.scrollHeight > 1500)
				{
					this.isSticky = true;
					this.cd.detectChanges();
					this.isStickyChanged.emit(this.isSticky);
				}
			}
			else
			{
				if (this.isSticky)
				{
					this.isSticky = false;
					this.cd.detectChanges();
					this.isStickyChanged.emit(this.isSticky);
				}
			}

			this.scrolling = false;
		}
		else
		{
			this.isSticky = false;
		}
	}

	toggleContractedOptions()
	{
		if (!this.isContractedOptionsDisabled)
		{
			this.contractedOptionsToggled.emit();
		}
	}

	getImageSrc()
	{
		return this.brandService.getBrandImage('logo');
	}

	onPrint() 
	{
		this.titleService.setTitle(`${this.communityName} ${this.planName}`);
		window.print();
	}

	@HostListener('window:afterprint', [])
	onWindowAfterPrint()
	{
		this.titleService.setTitle('Design Preview');
	}
}

export class SummaryHeader
{
	favoritesListName: string;
	communityName: string;
	planName: string;
	elevationImageUrl: string;
	lot: LotExt;
}
