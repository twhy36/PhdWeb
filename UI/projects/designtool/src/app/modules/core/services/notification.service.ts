import { Injectable } from '@angular/core';

import { from, timer, of, Subscription } from 'rxjs';
import { tap, retryWhen, delayWhen, take, switchMap } from 'rxjs/operators';
import * as signalR from '@aspnet/signalr';

import { environment } from '../../../../environments/environment';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';
import * as fromOpportunity from '../../ngrx-store/opportunity/reducer';
import * as fromLot from '../../ngrx-store/lot/reducer';
import * as CommonActionTypes from '../../ngrx-store/actions';
import * as LotActionTypes from '../../ngrx-store/lot/actions';
import { Store } from '@ngrx/store';
import { LotExt } from 'phd-common';

@Injectable()
export class NotificationService {
	private connection: signalR.HubConnection;
	private salesAgreementID: number;
	private salesAgreementSub: Subscription;
	private salesCommunityId: number;
	private salesCommunitySub: Subscription;
	private selectedLotId: number;
	private selectedLotSub: Subscription;

	constructor(private store: Store<fromRoot.State>) {	}

	public init(): void {
		this.connection = new signalR.HubConnectionBuilder()
			.withUrl(environment.hubUrl)
			.build();

		let connectObs = of(null).pipe(
			switchMap(() => from(this.connection.start())),
			retryWhen(errors => errors.pipe(
				take(5),
				tap(err => console.error(err)),
				delayWhen((_err, count) => timer(1000 * (2**count))) //exponential retry time
			))
		);

		const initializeSubscriptions = () => {
			this.salesAgreementSub = this.store.select(fromSalesAgreement.salesAgreementState).subscribe(sag => {
				if (sag && sag.id && this.salesAgreementID !== sag.id) {
					this.salesAgreementID = sag.id;
					this.connection.send("TrackSalesAgreement", sag.id);
				}
			});

			this.salesCommunitySub = this.store.select(fromOpportunity.salesCommunityId).subscribe((scid: number) => {
				if (scid && this.salesCommunityId !== scid) {
					this.salesCommunityId = scid;
					this.connection.send("TrackLotsMonotony", scid);
				}
			});

			this.selectedLotSub = this.store.select(fromLot.selectSelectedLot).subscribe((lot: LotExt) => {
				if (lot && this.selectedLotId !== lot.id) {
					this.selectedLotId = lot.id;
				}
			});
		};

		connectObs.subscribe(initializeSubscriptions);

		this.connection.onclose(err => {
			this.salesAgreementSub.unsubscribe();
			this.salesAgreementID = null;

			this.salesCommunitySub.unsubscribe();
			this.salesCommunityId = null;

			this.selectedLotSub.unsubscribe();
			this.selectedLotId = null;

			console.error(err);

			connectObs.subscribe(initializeSubscriptions);
		});
	}

	public registerHandlers(): void {
		this.connection.on("SalesAgreementUpdated", () => {
			if (this.salesAgreementID) {
				this.store.dispatch(new CommonActionTypes.LoadSalesAgreement(this.salesAgreementID));
			}
		});

		this.connection.on("LotsMonotonyUpdated", (lotId: number) => {
			if (this.salesCommunityId && this.selectedLotId !== lotId) {
				this.store.dispatch(new LotActionTypes.LoadMonotonyRules(this.salesCommunityId));
			}
		});
	}
}

