import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { select, Store } from '@ngrx/store';
import { withLatestFrom } from 'rxjs/operators';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromFavorite from '../../ngrx-store/favorite/reducer';
import * as NavActions from '../../ngrx-store/nav/actions';

import { BrandService } from '../../core/services/brand.service';
import { BuildMode } from '../../shared/models/build-mode.model';
import { Constants } from '../../shared/classes/constants.class';
import { DialogService } from '../../core/services/dialog.service';
import { Group, TreeVersion, UnsubscribeOnDestroy } from 'phd-common';

@Component({
	selector: 'global-footer',
	templateUrl: './global-footer.component.html',
	styleUrls: ['./global-footer.component.scss'],
	})
export class GlobalFooterComponent
	extends UnsubscribeOnDestroy
	implements OnInit
{
	currentYear: number = new Date().getFullYear();
	accessibilityImgSrc: string = 'assets/icon_accessibility.png';
	equalHousingImgSrc: string = 'assets/icon_equalHousing.png';

	groups: Group[];
	isDesignComplete: boolean;
	includedTree: TreeVersion;
	showContractedOptionsLink: boolean = false;
	showFloorplanLink: boolean = false;
	showIncludedOptionsLink: boolean = true;
	myFavoriteId: number;

	termsUrl: string;
	policyUrl: string;

	constructor(
		private store: Store<fromRoot.State>,
		private brandService: BrandService,
		private router: Router,
		private dialogService: DialogService
	) 
	{
		super();
	}

	ngOnInit() 
	{
		this.store
			.pipe(this.takeUntilDestroyed(), select(fromRoot.filteredTree))
			.subscribe((tree) => 
			{
				if (tree) 
				{
					this.groups = tree.groups;
				}
			});

		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select((state) => state.scenario)
			)
			.subscribe((state) => 
			{
				switch (state.buildMode) 
				{
					case BuildMode.Preview:
						this.showContractedOptionsLink = false;
						this.showFloorplanLink = true;
						break;
					case BuildMode.Presale:
						this.showContractedOptionsLink = false;
						this.showFloorplanLink = false;
						break;
					default:
						this.showContractedOptionsLink = true;
						this.showFloorplanLink = true;
						break;
				}
			});

		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select((state) => state.salesAgreement),
				withLatestFrom(
					this.store.pipe(select(fromRoot.includedDecisionPoints))
				)
			)
			.subscribe(([salesAgreement, includedDecisionPoints]) => 
			{
				this.isDesignComplete = salesAgreement.isDesignComplete;
				this.showIncludedOptionsLink =
					!this.isDesignComplete ||
					(!this.isDesignComplete &&
						!!includedDecisionPoints?.find(
							(dp) => !dp.isPastCutOff
						));
			});

		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select(fromFavorite.currentMyFavorite)
			)
			.subscribe((favorite) => 
			{
				this.myFavoriteId = favorite && favorite.id;
			});

		this.policyUrl = this.brandService.getBrandPrivacyPolicyUrl();
		this.termsUrl = this.brandService.getBrandTermsOfUseUrl();
	}

	getImageSrc(): string 
	{
		return this.brandService.getBrandImage('white_logo');
	}

	goToGroup(group: Group) 
	{
		const newSubgroup = this.groups.find((g) => g.id === group.id)
			.subGroups[0];
		const firstPoint = newSubgroup?.points[0] || null;
		this.router.navigate(
			[
				'favorites',
				'my-favorites',
				this.myFavoriteId,
				newSubgroup.subGroupCatalogId,
			],
			{ queryParamsHandling: 'merge' }
		);
		this.store.dispatch(
			new NavActions.SetSelectedSubgroup(
				newSubgroup.subGroupCatalogId,
				firstPoint.id,
				null
			)
		);
	}

	disclaimerClicked(): void 
	{
		const options = {
			confirmText: Constants.DIALOG_DISCLAIMER_CONFIRM,
			displayClose: true,
			message: Constants.DISCLAIMER_MESSAGE,
			title: Constants.DIALOG_DISCLAIMER_TITLE,
		};
		this.dialogService.open(options);
	}
}
