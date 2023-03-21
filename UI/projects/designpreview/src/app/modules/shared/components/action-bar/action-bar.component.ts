import { Component, Input, Output, OnInit, ChangeDetectorRef, EventEmitter, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { UnsubscribeOnDestroy } from 'phd-common';
import { BrandService } from '../../../core/services/brand.service';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import { ActionBarCallType } from '../../classes/constants.class';

@Component({
	selector: 'action-bar',
	templateUrl: 'action-bar.component.html',
	styleUrls: ['action-bar.component.scss']
})

export class ActionBarComponent extends UnsubscribeOnDestroy implements OnInit 
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

	@Output() callToAction = new EventEmitter<{ actionBarCallType: ActionBarCallType }>();
	@Output() toggleContractedOptions = new EventEmitter();

	@ViewChild('btnActionBar') button: ElementRef;

	autoHideTimer;
	isActionBarHidden = false;
	listener: () => void;
	scrollDelta = 5;
	scrolling = false;
	currentTopPosition = 0;
	previousTopPosition = 0;
	favoritesListIcon = '';
	communityName: string;
	planName: string;

	get isContractedOptionsDisabled(): boolean
	{
		return this.isPreview || this.isDesignComplete;
	}

	constructor(
		private cd: ChangeDetectorRef,
		private router: Router,
		private store: Store<fromRoot.State>,
		private brandService: BrandService,
		private titleService: Title
	) { super(); }

	ngOnInit()
	{
		this.favoritesListIcon = this.brandService.getBrandImage('favorites_list');

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
			this.planName = planData && planData.salesName;
		});
	}

	animateHeaderTransition(pageY)
	{
		this.currentTopPosition = pageY;

		if (this.previousTopPosition - this.currentTopPosition > this.scrollDelta)
		{
			this.isActionBarHidden = false;

			this.cd.detectChanges();
		}
		else if (this.currentTopPosition - this.previousTopPosition > this.scrollDelta)
		{
			this.isActionBarHidden = true;

			this.cd.detectChanges();

			clearTimeout(this.autoHideTimer);

			this.autoHideTimer = setTimeout(() =>
			{
				this.isActionBarHidden = false;

				this.cd.detectChanges();
			}, 1000);
		}

		this.previousTopPosition = this.currentTopPosition;
		this.scrolling = false;
	}

	clickToggleContractedOptions()
	{
		if (!this.isContractedOptionsDisabled)
		{
			this.toggleContractedOptions.emit();
		}
	}

	displayTooltipText()
	{
		return `
			<p>Estimated Favorites Total: Estimated total price of all options selected in this application.</p>

			<p>Estimated Total Purchase Price: Total price of all options under contract plus your Estimated Favorites Total.</p>

			<p>(Option pricing is subject to change until placed under contract with a Sales Representative.)</p>
		`
	}

	onPrimaryCallToActionClick()
	{
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.PRIMARY_CALL_TO_ACTION });
	}

	onHomePage()
	{
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));

		if (this.isPresale)
		{
			this.router.navigate(['presale'], { queryParamsHandling: 'merge' })
		}
		else if (this.isPreview)
		{
			this.router.navigate(['/preview'], { queryParamsHandling: 'merge' });
		}
		else
		{
			this.router.navigate(['/home'], { queryParamsHandling: 'merge' });
		}
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

	onViewFavorites()
	{
		this.store.dispatch(new ScenarioActions.SetTreeFilter(null));
		this.router.navigate(['favorites', 'summary'], { queryParamsHandling: 'merge' })
	}

	isEllipsisActive()
	{
		if (this.button && this.button.nativeElement)
		{
			return (this.button.nativeElement.offsetWidth <= this.button.nativeElement.scrollWidth);
		}

		return false;
	}
}
