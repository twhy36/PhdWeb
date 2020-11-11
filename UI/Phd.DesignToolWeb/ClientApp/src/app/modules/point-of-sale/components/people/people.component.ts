import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable ,  of ,  NEVER as never } from 'rxjs';
import { distinctUntilChanged, combineLatest, switchMap, map, take } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';

import { Buyer } from '../../../shared/models/buyer.model';
import { SalesAgreement, Realtor, SalesAgreementInfo } from '../../../shared/models/sales-agreement.model';
import { ChangeOrderBuyer } from '../../../shared/models/sales-change-order.model';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromChangeOrder from '../../../ngrx-store/change-order/reducer';
import * as SalesAgreementActions from '../../../ngrx-store/sales-agreement/actions';
import * as ChangeOrderActions from '../../../ngrx-store/change-order/actions';
import * as CommonActions from '../../../ngrx-store/actions';

import { BuyerInfoDetailComponent } from '../buyer-info-detail/buyer-info-detail.component';
import { ConfirmNavigationComponent, ConfirmWithCallback } from '../../../core/guards/confirm-navigation.guard';
import { createSelector } from '@ngrx/store';
import { ofType, Actions } from '@ngrx/effects';

@Component({
	selector: 'app-people',
	templateUrl: './people.component.html',
	styleUrls: ['./people.component.scss']
})
export class PeopleComponent extends UnsubscribeOnDestroy implements OnInit, ConfirmNavigationComponent
{
	salesAgreement: SalesAgreement;
	savedTrustName: string;
	selectedBuyer: Buyer | Realtor | string = null;
	salesAgreementNumber$: Observable<string>;
	primaryBuyer$: Observable<Buyer>;
	coBuyers$: Observable<Array<Buyer>>;
	coBuyerNA$: Observable<boolean>;
	realtor$: Observable<Realtor>;
	realtorNA$: Observable<boolean>;
	trust$: Observable<string>;
	trustNA$: Observable<boolean>;
	isChangingOrder: boolean;
	canEditAgreement: boolean = true;
	originalSignersCount: number;
	canSell: boolean;
	canDesign: boolean;
	canAddIncentive: boolean;
	primaryBuyer: Buyer;
	isSpecSalePending: boolean;

	@ViewChild(BuyerInfoDetailComponent) buyerInfoDetail: BuyerInfoDetailComponent;

	private draggedItemSortKey: number;

	constructor(private activatedRoute: ActivatedRoute,
		private store: Store<fromRoot.State>,
		private _actions$: Actions
	)
	{
		super();
	}

	ngOnInit()
	{
		this.activatedRoute.paramMap
			.pipe(
				combineLatest(this.store.pipe(select(state => state.salesAgreement))),
				switchMap(([params, salesAgreementState]) =>
				{
					if (salesAgreementState.salesAgreementLoading || salesAgreementState.savingSalesAgreement || salesAgreementState.loadError)
					{
						return new Observable<never>();
					}

					// if sales agreement is not in the store and the id has been passed in to the url
					// or the passed in sales agreement id is different than that of the id in the store...
					const salesAgreementId = +params.get('salesAgreementId');
					if (salesAgreementId > 0 && salesAgreementState.id !== salesAgreementId)
					{
						this.store.dispatch(new CommonActions.LoadSalesAgreement(salesAgreementId));
						return new Observable<never>();
					}

					return of(_.pick(salesAgreementState, _.keys(new SalesAgreement())));
				}),
				this.takeUntilDestroyed(),
				distinctUntilChanged()
			)
			.subscribe((salesAgreement: SalesAgreement) =>
			{
				this.salesAgreement = salesAgreement;
			});

		this.salesAgreementNumber$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.salesAgreementNumber)
		);

		const selectPrimaryBuyer = createSelector(
			fromChangeOrder.changeOrderState,
			fromRoot.activePrimaryBuyer,
			fromChangeOrder.changeOrderPrimaryBuyer,
			fromRoot.isSpecSalePending,
			(state, sag, co, isSpecSalePending) => {
				this.primaryBuyer = state.isChangingOrder || isSpecSalePending ? co : sag;
				return this.primaryBuyer;
			}
		);

		this.primaryBuyer$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(selectPrimaryBuyer)
		);

		const selectCoBuyer = createSelector(
			fromChangeOrder.changeOrderState,
			fromRoot.activeCoBuyers,
			fromChangeOrder.changeOrderCoBuyers,
			fromRoot.isSpecSalePending,
			(state, sag, co, isSpecSalePending ) =>
			{
				return state.isChangingOrder || isSpecSalePending ? co : sag;
			}
		);

		this.coBuyers$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(selectCoBuyer),
			map(coBuyers => coBuyers.sort((a, b) => { return a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0; }))
		);

		const selectTrust = createSelector(
			fromChangeOrder.changeOrderState,
			fromSalesAgreement.salesAgreementState,
			fromRoot.isSpecSalePending,
			(co, sag, isSpecSalePending) => {
				return co.isChangingOrder || isSpecSalePending ? co.changeInput.trustName : sag.trustName;
			}
		);

		this.trust$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(selectTrust)
		);

		this.realtor$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.realtors && state.salesAgreement.realtors.length ? state.salesAgreement.realtors[0] : null)
		);

		const selectTrustNA = createSelector(
			fromChangeOrder.changeOrderState,
			fromSalesAgreement.salesAgreementState,
			fromRoot.isSpecSalePending,
			(co, sag, isSpecSalePending) => {
				return co.isChangingOrder || isSpecSalePending ? co.changeInput.isTrustNa : sag.isTrustNa;
			}
		);

		this.trustNA$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(selectTrustNA)
		);

		this.realtorNA$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.isRealtorNa)
		);

		this.coBuyerNA$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.isCoBuyerNa)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder),
			combineLatest(this.store.pipe(select(fromSalesAgreement.originalSignersCount)))
		).subscribe(([changeOrder, originalSignersCount]) =>
		{
			this.isChangingOrder = changeOrder.isChangingOrder;
			this.originalSignersCount = originalSignersCount;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canEditAgreementOrSpec)
		).subscribe(canEditAgreement =>
		{
			this.canEditAgreement = canEditAgreement;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canSell)
		).subscribe(canSell => this.canSell = canSell);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canDesign),
			combineLatest(this.store.pipe(select(state => state.changeOrder)))
		).subscribe(([canDesign, changeOrder]) => {
			this.canDesign = canDesign && changeOrder && changeOrder.isChangingOrder;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.isSpecSalePending)
		).subscribe(isSpecSalePending => this.isSpecSalePending = isSpecSalePending);
	}

	addCoBuyer()
	{
		this.selectedBuyer = new Buyer();
	}

	addTrust()
	{
		this.selectedBuyer = this.savedTrustName ? this.savedTrustName : "";
	}

	addRealtor()
	{
		this.selectedBuyer = new Realtor();
	}

	editBuyer(buyer: Buyer)
	{
		this.selectedBuyer = buyer;
	}

	editTrust(trust: string)
	{
		this.selectedBuyer = trust;
	}

	editRealtor(realtor: Realtor)
	{
		this.selectedBuyer = realtor;
	}

	setPrimaryBuyer(coBuyer: Buyer)
	{
		if (this.isChangingOrder)
		{
			this.store.dispatch(new ChangeOrderActions.SwapChangeOrderPrimaryBuyer(new ChangeOrderBuyer(coBuyer)));
		}
		else if (this.isSpecSalePending)
		{
			this.store.dispatch(new ChangeOrderActions.SwapChangeOrderPrimaryBuyer(new ChangeOrderBuyer(coBuyer)));
			this.store.dispatch(new ChangeOrderActions.SavePendingJio());
		}
		else
		{
			this.store.dispatch(new SalesAgreementActions.SwapPrimaryBuyer(coBuyer));
		}
	}

	setTrustNA($event: Event)
	{
		if (this.isChangingOrder)
		{
			this.store.dispatch(new ChangeOrderActions.SetChangeOrderTrustName(null));
		}
		else if (this.isSpecSalePending)
		{
			this.store.dispatch(new ChangeOrderActions.SetChangeOrderTrustName(null));
			this.store.dispatch(new SalesAgreementActions.SaveSalesAgreementInfoNA({ isTrustNa: true } as SalesAgreementInfo, 'trust'));

			this._actions$.pipe(
				ofType<SalesAgreementActions.SalesAgreementInfoNASaved>(SalesAgreementActions.SalesAgreementActionTypes.SalesAgreementInfoNASaved),
				take(1)).subscribe(() => {
					this.store.dispatch(new ChangeOrderActions.SavePendingJio());
			});
		}
		else
		{
			this.store.dispatch(new SalesAgreementActions.SaveSalesAgreementInfoNA({ isTrustNa: true } as SalesAgreementInfo, 'trust'));
		}

		if ($event)
		{
			$event.stopPropagation();
		}
	}

	setRealtorNA($event: Event)
	{
		this.store.dispatch(new SalesAgreementActions.SaveSalesAgreementInfoNA({ isRealtorNa: true } as SalesAgreementInfo, 'realtor'));

		if ($event)
		{
			$event.stopPropagation();
		}
	}

	setCoBuyerNA()
	{
		this.store.dispatch(new SalesAgreementActions.SaveSalesAgreementInfoNA({ isCoBuyerNa: true } as SalesAgreementInfo, 'cobuyer'));
	}

	deleteCoBuyer(coBuyer: Buyer)
	{
		if (this.isChangingOrder)
		{
			this.store.dispatch(new ChangeOrderActions.DeleteChangeOrderCoBuyer(new ChangeOrderBuyer(coBuyer)));
		}
		else if (this.isSpecSalePending)
		{
			this.store.dispatch(new ChangeOrderActions.DeleteChangeOrderCoBuyer(new ChangeOrderBuyer(coBuyer)));
			this.store.dispatch(new ChangeOrderActions.SavePendingJio());
		}
		else
		{
			this.store.dispatch(new SalesAgreementActions.DeleteCoBuyer(coBuyer));
		}
	}

	saveBuyer(buyer: Buyer | Realtor | string)
	{
		// save trust
		if (typeof buyer === "string")
		{
			if (this.isChangingOrder)
			{
				this.store.dispatch(new ChangeOrderActions.SetChangeOrderTrustName(buyer));
			}
			else if (this.isSpecSalePending)
			{
				this.store.dispatch(new ChangeOrderActions.SetChangeOrderTrustName(buyer));
				this.store.dispatch(new ChangeOrderActions.SavePendingJio());
			}
			else
			{
				this.store.dispatch(new SalesAgreementActions.SetTrustName(buyer));
			}
		}
		else
		{
			// save buyer
			if (buyer.hasOwnProperty("isPrimaryBuyer"))
			{
				let b = buyer as Buyer;

				//not sure if there's a better way to guarantee the opportunity is set
				if (!b.opportunityContactAssoc.opportunity)
				{
					b.opportunityContactAssoc.opportunity = this.primaryBuyer.opportunityContactAssoc.opportunity;
				}

				if (b.isPrimaryBuyer)
				{
					// update primary buyer
					if (this.isChangingOrder)
					{
						this.store.dispatch(new ChangeOrderActions.UpdateChangeOrderBuyer(new ChangeOrderBuyer(b)));
					}
					else if (this.isSpecSalePending)
					{
						this.store.dispatch(new ChangeOrderActions.UpdateChangeOrderBuyer(new ChangeOrderBuyer(b)));
						this.store.dispatch(new ChangeOrderActions.SavePendingJio());
					}
					else
					{
						this.store.dispatch(new SalesAgreementActions.UpdatePrimaryBuyer(b));
					}
				}
				else
				{
					// if co-buyer is new then add it to the list of co-buyers, if not then update the co-buyer
					if (!(b).id)
					{
						// add co-buyer
						if (this.isChangingOrder)
						{
							this.store.dispatch(new ChangeOrderActions.AddChangeOrderCoBuyer(new ChangeOrderBuyer(b)));
						}
						else if (this.isSpecSalePending)
						{
							this.store.dispatch(new ChangeOrderActions.AddChangeOrderCoBuyer(new ChangeOrderBuyer(b)));
							this.store.dispatch(new ChangeOrderActions.SavePendingJio());
						}
						else
						{
							this.store.dispatch(new SalesAgreementActions.AddCoBuyer(b));
						}
					}
					else
					{
						// update co-buyer
						if (this.isChangingOrder)
						{
							this.store.dispatch(new ChangeOrderActions.UpdateChangeOrderBuyer(new ChangeOrderBuyer(b)));
						}
						else if (this.isSpecSalePending)
						{
							this.store.dispatch(new ChangeOrderActions.UpdateChangeOrderBuyer(new ChangeOrderBuyer(b)));
							this.store.dispatch(new ChangeOrderActions.SavePendingJio());
						}
						else
						{
							this.store.dispatch(new SalesAgreementActions.UpdateCoBuyer(b));
						}
					}
				}
			}
			// save realtor
			else
			{
				this.store.dispatch(new SalesAgreementActions.AddUpdateRealtor(buyer as Realtor));
			}
		}
		this.selectedBuyer = null;
	}

	handleDrop(event: any, sortKey: number)
	{
		if (event)
		{
			if (sortKey !== this.draggedItemSortKey)
			{
				if (this.isChangingOrder)
				{
					this.store.dispatch(new ChangeOrderActions.ReSortChangeOrderBuyers(this.draggedItemSortKey, sortKey));
				}
				else if (this.isSpecSalePending)
				{
					this.store.dispatch(new ChangeOrderActions.ReSortChangeOrderBuyers(this.draggedItemSortKey, sortKey));
					this.store.dispatch(new ChangeOrderActions.SavePendingJio());
				}
				else
				{
					this.store.dispatch(new SalesAgreementActions.ReSortCoBuyers(this.draggedItemSortKey, sortKey));
				}
			}
		}
	}

	handleDragEnter(event: any, sortKey: number)
	{
		if (event)
		{
			if (sortKey === this.draggedItemSortKey)
			{
				event[0].nativeElement.classList.remove('over');
			}
		}
	}

	handleDragStart(event: any, sortKey: number)
	{
		if (event)
		{
			this.draggedItemSortKey = sortKey;
		}
	}

	allowNavigation(): ConfirmWithCallback {
		return {
			confirmCallback: (result: boolean) => {
				if (result) {
					this.selectedBuyer = null;
				}
			},

			canNavigate: this.selectedBuyer ? !this.buyerInfoDetail || this.buyerInfoDetail.canNavAway() : true
		};
	}
}
