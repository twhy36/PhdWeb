import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Store, select } from '@ngrx/store';

import { Group, UnsubscribeOnDestroy } from 'phd-common';
import { withLatestFrom } from 'rxjs/operators';

import * as fromRoot from '../../../ngrx-store/reducers';

import { BrandService } from '../../../core/services/brand.service';
import { DialogService } from '../../../core/services/dialog.service';
import { Constants } from '../../../shared/classes/constants.class';
import { BuildMode } from '../../../shared/models/build-mode.model';

@Component({
	selector: 'hamburger-menu-mobile',
	templateUrl: './hamburger-menu.component.html',
	styleUrls: ['./hamburger-menu.component.scss']
	})
export class HamburgerMenuComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Output() closeClicked = new EventEmitter();

	isDesignComplete: boolean;
	groups: Group[];
	policyUrl: string;
	termsUrl: string;

	showFloorplanLink: boolean = false;
	showIncludedOptionsLink: boolean = true;
	showPendingAndContractedOptionsLink: boolean = false;

	constructor(
		private brandService: BrandService,
		private dialogService: DialogService,
		private router: Router,
		private store: Store<fromRoot.State>,
	)
	{
		super();
	}

	ngOnInit(): void
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario)
		).subscribe((scenario) =>
		{
			switch (scenario.buildMode)
			{
				case (BuildMode.Preview):
					this.showPendingAndContractedOptionsLink = false;
					this.showFloorplanLink = true;
					break;
				case (BuildMode.Presale):
					this.showPendingAndContractedOptionsLink = false;
					this.showFloorplanLink = false;
					break;
				default:
					this.showPendingAndContractedOptionsLink = true;
					this.showFloorplanLink = true;
					break;
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree),
		).subscribe((tree) =>
		{
			this.groups = tree?.groups;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement),
			withLatestFrom(this.store.pipe(select(fromRoot.includedDecisionPoints))),
		).subscribe(([salesAgreement, includedDecisionPoints]) =>
		{
			this.isDesignComplete = salesAgreement.isDesignComplete;
			this.showIncludedOptionsLink = !this.isDesignComplete || (!this.isDesignComplete && !!includedDecisionPoints?.find(dp => !dp.isPastCutOff));
		});

		this.policyUrl = this.brandService.getBrandPrivacyPolicyUrl();
		this.termsUrl = this.brandService.getBrandTermsOfUseUrl();
	}

	disclaimerClicked(): void
	{
		const options =
		{
			confirmText: Constants.DIALOG_DISCLAIMER_CONFIRM,
			displayClose: true,
			message: Constants.DISCLAIMER_MESSAGE,
			title: Constants.DIALOG_DISCLAIMER_TITLE
		}
		this.dialogService.open(options);
	}
}
