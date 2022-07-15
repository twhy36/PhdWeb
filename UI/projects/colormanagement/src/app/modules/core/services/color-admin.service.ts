import { Injectable } from '@angular/core';
import {combineLatest, of, ReplaySubject} from 'rxjs';
import {filter, switchMap} from 'rxjs/operators';
import {OrganizationService} from './organization.service';
import {FeatureSwitchService} from 'phd-common';

@Injectable()
export class ColorAdminService {
	constructor(
		private _featureSwitchService: FeatureSwitchService,
		private _orgService: OrganizationService) { }

	private editingColorSource = new ReplaySubject<boolean>(1);
	editingColor$ = this.editingColorSource.asObservable();

	emitEditingColor(isVisible: boolean) {
		this.editingColorSource.next(isVisible);
	}

	optionPackagesEnabled$ = combineLatest([
		this._orgService.currentCommunity$.pipe(
			filter((comm) => !!comm),
		),
		this._orgService.currentMarket$.pipe(
			filter((market) => !!market),
		)]
	)
		.pipe(
			switchMap(([financialCommunity, market]) => {
				if (!financialCommunity)
				{
					return of(true);
				}

				const org = { edhMarketId: market.id, edhFinancialCommunityId: financialCommunity.id };
				return this._featureSwitchService.isFeatureEnabled('Option Packages', org)
			})
		)
}
