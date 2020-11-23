import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';

import { map, switchMap, take, combineLatest, debounceTime } from 'rxjs/operators';
import { SalesInfoService } from '../../../core/services/sales-info.service';
import { ConfirmNavigationComponent } from '../../../core/guards/confirm-navigation.guard';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';
import { SalesAgreementProgram, SalesAgreementDeposit, SalesAgreementContingency, SalesAgreement, ISalesProgram, SalesAgreementInfo } from '../../../shared/models/sales-agreement.model';
import { SalesProgram, SalesProgramTypeEnum } from '../../../shared/models/sales-program.model';
import { Note } from '../../../shared/models/note.model';
import { SalesChangeOrderPriceAdjustment, SalesChangeOrderSalesProgram } from '../../../shared/models/sales-change-order.model';
import { ChangeOrder, ChangeOrderGroup } from '../../../shared/models/job-change-order.model';

import * as SalesAgreementActions from '../../../ngrx-store/sales-agreement/actions';
import * as ChangeOrderActions from '../../../ngrx-store/change-order/actions';
import * as CommonActions from '../../../ngrx-store/actions';
import { NEVER as never, of, Observable, Subject } from 'rxjs';

import * as _ from 'lodash';
import { selectSelectedLot } from '../../../ngrx-store/lot/reducer';

@Component({
	selector: 'app-sales-info',
	templateUrl: './sales-info.component.html',
	styleUrls: ['./sales-info.component.scss'],
	encapsulation: ViewEncapsulation.None
})

export class SalesInfoComponent extends UnsubscribeOnDestroy implements OnInit, ConfirmNavigationComponent
{
	programs: Array<SalesAgreementProgram> = [];
	salesPrograms: Array<SalesProgram>;
	deposits: Array<object> = [];
	contingencies: Array<object> = [];
	notes: Array<Note> = [];
	priceAdjustments: Array<SalesChangeOrderPriceAdjustment> = [];
	isChangingOrder: boolean = false;
	salesChangeOrderSalesPrograms: Array<SalesAgreementProgram> = [];
	currentDiscount$: Observable<number>;
	currentClosingCostIncentive$: Observable<number>;
	totalCurrentClosingCostAmount$: Observable<number>;

	agreement: SalesAgreement;
	hasChanges: boolean = false;

	// Determine if the Add Program bar shows up or not
	canAddProgram: boolean = true;
	editing: SalesAgreementDeposit | SalesAgreementContingency | SalesAgreementProgram | SalesAgreement | SalesChangeOrderPriceAdjustment | null;

	isProgramNa: boolean = false;
	isContingenciesNa: boolean = false;
	isNoteNa: boolean = false;

	loading: boolean = true;
	canEditAgreement: boolean = true;
	canSell: boolean;
	canDesign: boolean;
	cancelOrVoid: boolean;
	canAddIncentive: boolean;
	jobsProjectedFinalDate$: Observable<Date>;
	hasPriceAdjustments: boolean = false;

	private cdSubject = new Subject<void>();

	constructor(
		private store: Store<fromRoot.State>,
		private _salesInfoService: SalesInfoService,
		private activatedRoute: ActivatedRoute,
		private cd: ChangeDetectorRef
	)
	{
		super();

		this.cdSubject.pipe(
			debounceTime(100),
			this.takeUntilDestroyed()
		).subscribe(() =>
		{
			this.cd.detectChanges();
		})
	}

	get hasAvailableSalesPrograms(): boolean
	{
		if (this.isChangingOrder)
		{
			const sumAmounts = (total: number, program: SalesAgreementProgram | SalesChangeOrderSalesProgram) => { return total + program.amount; };

			let programs =  this.salesPrograms.filter(p =>
			{
				let isInUse = this.salesChangeOrderSalesPrograms.findIndex(x => x.salesProgramId === p.id) > -1;

				if (this.isChangingOrder && isInUse)
				{
					return false;
				}
				else
				{					
					const agreementPrograms = this.agreement.programs.filter(x => x.salesProgramId === p.id);
					const agreementAmount = agreementPrograms && agreementPrograms.length > 0 ? agreementPrograms.reduce(sumAmounts, 0) : 0;
					const changeOrderPrograms = this.salesChangeOrderSalesPrograms.filter(x => x.salesProgramId === p.id);
					const changeOrderAmount = changeOrderPrograms && changeOrderPrograms.length > 0 ? changeOrderPrograms.reduce(sumAmounts, 0) : 0;

					return p.maximumAmount > agreementAmount + changeOrderAmount;
				}
			});

			return programs.length > 0;
		}
		else
		{
			return true;
		}
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
				take(1) // We only need this call once since afterwards this.agreement will be defined
			)
			.subscribe((salesAgreement: SalesAgreement) =>
			{
				this.agreement = new SalesAgreement(salesAgreement);

				this.hasPriceAdjustments = this.agreement && this.agreement.priceAdjustments && this.agreement.priceAdjustments.length > 0;

				this.setupPrograms();
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canEditAgreementOrSpec)
		).subscribe(canEditAgreement =>
		{
			this.canEditAgreement = canEditAgreement;
		});

		this.jobsProjectedFinalDate$ = this.store.pipe(select(state => state.job.projectedFinalDate));

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
			select(fromRoot.canAddIncentive)
		).subscribe(canAddIncentive => this.canAddIncentive = canAddIncentive);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canEditCancelOrVoidAgreement)
		).subscribe(cancelOrVoid => this.cancelOrVoid = cancelOrVoid);

		// Price Adjustment Details
		this.currentDiscount$ = this.store.pipe(
			select(state => state.salesAgreement),
			map(sag =>
			{
				let adjustments = (sag && sag.priceAdjustments && sag.priceAdjustments.filter(p => p.priceAdjustmentType === 'Discount').map(p => p.amount)) || [];

				return adjustments.reduce((a, b) => a + b, 0);
			})
		);

		// Price Adjustment Details
		this.currentClosingCostIncentive$ = this.store.pipe(
			select(state => state.salesAgreement),
			map(sag =>
			{
				let adjustments = (sag && sag.priceAdjustments && sag.priceAdjustments.filter(p => p.priceAdjustmentType === 'ClosingCost').map(p => p.amount)) || [];

				return adjustments.reduce((a, b) => a + b, 0);
			})
		);

		// Total closing cost amount
		this.totalCurrentClosingCostAmount$ = this.store.pipe(
			select(state => state.salesAgreement),
			map(sag =>
			{
				let adjustments = (sag && sag.priceAdjustments && sag.priceAdjustments.filter(p => p.priceAdjustmentType === 'ClosingCost').map(p => p.amount)) || [];
				let programs = (sag && sag.programs && sag.programs.filter(p => p.salesProgram.salesProgramType === 'BuyersClosingCost').map(p => p.amount)) || [];

				return programs.reduce((a, b) => a + b, 0) + adjustments.reduce((a, b) => a + b, 0);
			})
		);
	}

	setupPrograms()
	{
		// To build the salesPrograms menus, we need the Financial Community ID.
		// First check for it in the lot data using the selectedLot in the state.
		this.store.pipe(
			take(1),
			select(state => state.lot.selectedLot),
			switchMap(selectedLotId =>
			{
				// If there is no selectedLot, then we need to get the financialCommunityId from the API
				if (!selectedLotId)
				{
					// Make observable to get financial community id
					return this.store.pipe(
						take(1),
						select(state => state.salesAgreement),
						// to get the financialCommunityID we need the salesAgreeement ID.
						switchMap(agreement => this._salesInfoService.getFinancialCommunityId(agreement.id))
					);
				}
				else
				{
					return this.store.pipe(
						this.takeUntilDestroyed(),
						select(selectSelectedLot),
						map(lot => lot && lot.financialCommunity ? lot.financialCommunity.id : null)
					);
				}
			}),
			switchMap(financialCommId => this._salesInfoService.getSalesPrograms(financialCommId))
		).subscribe(salesPrograms =>
		{
			this.salesPrograms = salesPrograms;

			// Need to only watch salesAgreement for changes from sales-info-misc, and not everything above, so creating a new subscription
			this.store.pipe(
				this.takeUntilDestroyed(),
				select(state => state.salesAgreement)
			).subscribe(agreement =>
			{
				// If we are currently editing the misc info, we need to update the editing object to continue to show it.
				if (this.editing === this.agreement)
				{
					this.editing = agreement;
				}

				this.agreement = new SalesAgreement(agreement);

				// If we are not currently saving the sales agreement and there isn't an error, reset back to the card view.
				if (!agreement.savingSalesAgreement && !agreement.saveError)
				{
					this.reset();
				}
			});

			// Need a watch on programs since they can change without triggering an event above.
			this.store.pipe(
				this.takeUntilDestroyed(),
				select(state => state.salesAgreement.programs),
				combineLatest(this.store.select(state => state.changeOrder))
			).subscribe(([programs, changeOrderState]) =>
			{
				this.isChangingOrder = changeOrderState.isChangingOrder && !!changeOrderState.changeInput;

				let programList: SalesAgreementProgram[] = programs ? [...programs] : [];

				if (this.isChangingOrder)
				{
					const changeOrder = changeOrderState.currentChangeOrder && changeOrderState.currentChangeOrder.jobChangeOrders
						? changeOrderState.currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'PriceAdjustment')
						: null;

					this.mergeSalesChangeOrderSalesPrograms(changeOrder, programList);
					this.salesChangeOrderSalesPrograms = changeOrder && changeOrder.jobSalesChangeOrderSalesPrograms ? [...changeOrder.jobSalesChangeOrderSalesPrograms] : [];

					const salesChangeOrderPriceAdjustments = changeOrder ? changeOrder.jobSalesChangeOrderPriceAdjustments : null;

					this.reset(salesChangeOrderPriceAdjustments, 'priceAdjustments');
				}

				this.reset(programList, 'programs');
			});

			// Need a watch on deposits since they can change without triggering an event above.
			this.store.pipe(this.takeUntilDestroyed(), select(state => state.salesAgreement.deposits)).subscribe(deposits =>
			{
				this.reset(deposits, 'deposits');
			});

			// Need a watch on deposits since they can change without triggering an event above.
			this.store.pipe(this.takeUntilDestroyed(), select(state => state.salesAgreement.contingencies)).subscribe(contingencies =>
			{
				this.reset(contingencies, 'contingencies');
			});

			// Need a watch on notes since they can change without triggering an event above.
			this.store.pipe(this.takeUntilDestroyed(), select(state => state.salesAgreement.notes)).subscribe(notes =>
			{
				this.reset(notes, 'notes');
			});

			this.store.pipe(this.takeUntilDestroyed(), select(state => state.salesAgreement.isProgramNa)).subscribe(isProgramNa =>
			{
				this.isProgramNa = isProgramNa;
			});

			this.store.pipe(this.takeUntilDestroyed(), select(state => state.salesAgreement.isContingenciesNa)).subscribe(isContingenciesNa =>
			{
				this.isContingenciesNa = isContingenciesNa;
			});

			this.store.pipe(this.takeUntilDestroyed(), select(state => state.salesAgreement.isNoteNa)).subscribe(isNoteNa =>
			{
				this.isNoteNa = isNoteNa;
			});

			this.loading = false;

			// If the sales agreement information has not been set yet, start by showing it.
			if (this.agreement && !this.agreement.ecoeDate && !this.isChangingOrder && this.agreement.status === "Pending")
			{
				this.editing = this.agreement;
			}
		});
	}

	setNA(target: string)
	{
		let info = new SalesAgreementInfo();

		switch (target)
		{
			case 'contingency':
				info.isContingenciesNa = true;

				break;
			case 'programs':
				info.isProgramNa = true;

				break;
			case 'notes':
				info.isNoteNa = true;

				break;
		}

		this.store.dispatch(new SalesAgreementActions.SaveSalesAgreementInfoNA(info, target));
	}

	reset(items: Array<SalesAgreementProgram | SalesAgreementDeposit | SalesAgreementContingency | Note> = null, type: string = null)
	{
		if (items && type)
		{
			// Only allow sales agreement array items that have IDs.
			this[type] = _.cloneDeep(items.filter((item: SalesAgreementProgram | SalesAgreementDeposit | SalesAgreementContingency | Note | SalesChangeOrderPriceAdjustment) => item.id !== null || 0));

			if (type === 'programs')
			{
				// If there are less sales agreement programs than sales programs (from Sales Admin) then we can still add more agreements
				this.canAddProgram = this.programs.length < this.salesPrograms.length;
			}
		}

		this.editing = null;
		this.cdSubject.next();
	}

	edit(item: SalesAgreementDeposit | SalesAgreementContingency | SalesAgreementProgram | SalesAgreement | Note | SalesChangeOrderPriceAdjustment | null)
	{
		this.editing = item; // by setting editing to the item being edited, we hide all components except the one being edited.
	}

	add(type: string)
	{
		let newItem: SalesAgreementContingency | SalesAgreementDeposit | SalesAgreementProgram | Note | SalesChangeOrderPriceAdjustment;

		switch (type)
		{
			case "programs":
				newItem = new SalesAgreementProgram();
				break;
			case "deposits":
				newItem = new SalesAgreementDeposit();
				break;
			case "contingencies":
				newItem = new SalesAgreementContingency();
				break;
			case "notes":
				newItem = new Note();
				break;
			case "priceAdjustments":
				newItem = new SalesChangeOrderPriceAdjustment();
				break;
		}

		this[type].push(newItem);
		this.editing = newItem;
	}

	remove(type: string, position: number)
	{
		if (position === -1)
		{
			this[type] = [];
		}
		else
		{
			this[type].splice(position, 1);
		}
	}

	changes(has: boolean)
	{
		this.hasChanges = has;
	}

	allowNavigation(): boolean
	{
		return !this.hasChanges;
	}

	saveSalesChangeOrderPriceAdjustments(data: Array<SalesChangeOrderPriceAdjustment>)
	{
		this.store.dispatch(new ChangeOrderActions.SetSalesChangeOrderPriceAdjustments(data));
	}

	deleteSalesChangeOrderPriceAdjustment()
	{
		this.store.dispatch(new ChangeOrderActions.DeleteSalesChangeOrderPriceAdjustment());
	}

	updateSalesChangeOrderPriceAdjustment(data: { item: SalesChangeOrderPriceAdjustment, position: number })
	{
		this.store.dispatch(new ChangeOrderActions.UpdateSalesChangeOrderPriceAdjustment(data.item, data.position));
	}

	saveSalesChangeOrderSalesPrograms(data: { action: string, programs: Array<SalesChangeOrderSalesProgram>, originalProgramId?: number })
	{
		this.store.dispatch(new ChangeOrderActions.SetSalesChangeOrderSalesPrograms(data.action, data.programs, this.agreement, data.originalProgramId));
	}

	mergeSalesChangeOrderSalesPrograms(changeOrder: ChangeOrder, programList: SalesAgreementProgram[])
	{
		const salesChangeOrderSalesPrograms = changeOrder ? changeOrder.jobSalesChangeOrderSalesPrograms : null;

		if (salesChangeOrderSalesPrograms)
		{
			salesChangeOrderSalesPrograms.forEach(p =>
			{
				const salesProgram = this.salesPrograms.find(x => x.id === p.salesProgramId);

				if (p.action === 'Add')
				{
					programList.push(new SalesAgreementProgram({
						id: p.id,
						salesAgreementId: this.agreement.id,
						salesProgramId: p.salesProgramId,
						salesProgramDescription: p.salesProgramDescription,
						amount: p.amount,
						salesProgram: salesProgram
							? {
								id: salesProgram.id,
								salesProgramType: salesProgram.salesProgramType.toString()
							} as ISalesProgram
							: null
					}));
				}
				else if (p.action === 'Delete')
				{
					const deletedProgram = programList.findIndex(x => x.salesProgram && x.salesProgram.id === p.salesProgramId
						&& x.amount === p.amount && x.salesProgramDescription === p.salesProgramDescription);

					if (deletedProgram > -1)
					{
						programList.splice(deletedProgram, 1);
					}
				}
			});
		}
	}

	canEditProgramIncentive(program: SalesChangeOrderSalesProgram | SalesAgreementProgram)
	{
		// can edit as long as it's not cancel or void, or in a pending status, or was created on the current change order
		return this.canEditAgreement && (this.canSell || this.canDesign || this.canAddIncentive) && !this.cancelOrVoid && (this.isChangingOrder && this.salesChangeOrderSalesPrograms.findIndex(x => x.id === program.id && x.salesProgramId === program.salesProgramId) > -1 || !this.isChangingOrder);
	}
}
