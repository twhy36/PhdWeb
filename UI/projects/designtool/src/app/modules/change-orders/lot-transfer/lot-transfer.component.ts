import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { combineLatest, withLatestFrom } from 'rxjs/operators';

import {
	UnsubscribeOnDestroy, ChangeOrderHanding, Job, Lot, LotExt, Plan, TreeVersion, DecisionPoint,
	ModalService
} from 'phd-common';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import * as ChangeOrderActions from '../../ngrx-store/change-order/actions';
import * as LotActions from '../../ngrx-store/lot/actions';

import { ConfirmModalComponent } from '../../core/components/confirm-modal/confirm-modal.component';
import { ModalOverrideSaveComponent } from '../../core/components/modal-override-save/modal-override-save.component';
import { LotService } from '../../core/services/lot.service';

import * as _ from 'lodash';

@Component({
	selector: 'lot-transfer',
	templateUrl: './lot-transfer.component.html',
	styleUrls: ['./lot-transfer.component.scss']
})
export class LotTransferComponent extends UnsubscribeOnDestroy implements OnInit
{
	lots: Array<Lot>;
	plans: Array<Plan>;
	selectedPlanId: number;
	job: Job;
	treeVersion: TreeVersion;
	selectedLot: LotExt;
	selectedHanding: string;
	currencyFormatter: Intl.NumberFormat;
	revertToDirt: boolean = null;
	canEdit: boolean;
	elevationDp: DecisionPoint;
	colorSchemeDp: DecisionPoint;
	canOverride: boolean;

	constructor(private store: Store<fromRoot.State>,
		private modalService: ModalService,
		private lotService: LotService
	)
	{
		super();
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lot),
			combineLatest(this.store.pipe(select(state => state.job)),
				this.store.pipe(select(state => state.plan)))
		).subscribe(([lot, job, plan]) =>
		{
			this.selectedPlanId = plan.selectedPlan;
			this.job = job;
			this.plans = plan.plans.filter(x => x.id === plan.selectedPlan);
			this.lots = this.getAvailableLots(lot.lots);

			if (lot.selectedLot && lot.selectedLot.id !== job.lotId)
			{
				if (!this.selectedLot || lot.selectedLot.id !== this.selectedLot.id)
				{
					this.selectedLot = lot.selectedLot;
					this.onLotSelected();
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder)
		).subscribe(changeOrder =>
		{
			if (this.selectedLot)
			{
				if (changeOrder.changeInput)
				{
					this.selectedHanding = changeOrder.changeInput.handing.handing;
				}
				else if (this.selectedLot.lotBuildTypeDesc !== 'Spec' && this.selectedLot.handings && this.selectedLot.handings.length > 1)
				{
					this.selectedHanding = null;
				}

				if (changeOrder.currentChangeOrder &&
					changeOrder.currentChangeOrder.jobChangeOrders &&
					changeOrder.currentChangeOrder.jobChangeOrders.length)
				{
					const lotTransferChangeOrder = changeOrder.currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'HomesiteTransfer');

					if (lotTransferChangeOrder && lotTransferChangeOrder.jobChangeOrderLots && lotTransferChangeOrder.jobChangeOrderLots.length)
					{
						const changeOrderLot = lotTransferChangeOrder.jobChangeOrderLots.find(x => x.action === 'Add');

						if (changeOrderLot)
						{
							this.revertToDirt = changeOrderLot.revertToDirt;
						}
					}
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.tree),
			withLatestFrom(
				this.store.pipe(select(fromScenario.elevationDP)),
				this.store.pipe(select(fromScenario.colorSchemeDP)),
				this.store.pipe(select(fromRoot.canOverride))
			)
		).subscribe(([tree, elevationDp, colorSchemeDp, canOverride]) =>
		{
			if (tree)
			{
				this.treeVersion = tree.treeVersion;
			}

			this.elevationDp = elevationDp;
			this.colorSchemeDp = colorSchemeDp;
			this.canOverride = canOverride;
		});

		this.currencyFormatter = new Intl.NumberFormat('en-US',
			{
				style: 'currency',
				currency: 'USD',
				minimumFractionDigits: 0,
				maximumFractionDigits: 0
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canSell)
		).subscribe(canSell => this.canEdit = canSell);
	}

	get selectedLotDisplay(): string
	{
		if (this.selectedLot)
		{
			const space = '\xa0\xa0\xa0\xa0';
			const specDisplay = this.selectedLot.lotBuildTypeDesc === 'Spec' ? 'Spec' : '';
			const premium = this.currencyFormatter.format(this.selectedLot.premium);

			return `${this.selectedLot.lotBlock}${space}${this.selectedLot.streetAddress1}${space}${premium}${space}${specDisplay}`;
		}

		return 'Select lot';
	}

	get displayRevertQuestion(): boolean
	{
		return this.job.constructionStageName === 'Configured';
	}

	get selectionComplete(): boolean
	{
		if (this.selectedLot)
		{
			// Spec lot is selected
			if (this.selectedLot.lotBuildTypeDesc === 'Spec')
			{
				return true;
			}

			// Dirt lot and current job plan selected
			if (this.displayRevertQuestion)
			{
				return this.revertToDirt !== null && this.revertToDirt !== undefined;
			}
		}

		return false;
	}

	get lotsDisabled(): boolean
	{
		return !this.lots || this.lots.length < 1;
	}

	onChangeLot(lot: Lot)
	{
		if (!this.selectedLot || this.selectedLot.id !== lot.id)
		{
			const conflict = this.lotService.checkMonotonyConflict(lot, this.selectedPlanId, this.elevationDp, this.colorSchemeDp);

			if (conflict && conflict.monotonyConflict)
			{
				this.onOverride(lot);
			}
			else
			{
				this.handleLotChange(lot);
			}
		}
	}

	handleLotChange(lot: Lot)
	{
		// Reset
		this.store.dispatch(new ChangeOrderActions.SetChangeOrderHanding(null));

		this.resetRadioInputs();

		this.store.dispatch(new LotActions.SelectLot(lot.id));
		this.store.dispatch(new ChangeOrderActions.SetChangeOrderLot(lot.id));
	}

	onChangeHanding(handing: string)
	{
		const coHanding = new ChangeOrderHanding();

		coHanding.handing = handing;

		this.store.dispatch(new ChangeOrderActions.SetChangeOrderHanding(coHanding));
	}

	onLotSelected()
	{
		let handing = this.selectedLot && this.selectedLot.handings && this.selectedLot.handings.length === 1 ? this.selectedLot.handings[0].name : null;

		if (this.selectedLot.lotBuildTypeDesc === 'Spec')
		{
			const job = this.selectedLot.jobs ? this.selectedLot.jobs.find(x => x.lotId === this.selectedLot.id) : null;

			if (job)
			{
				if (job.handing)
				{
					handing = job.handing.charAt(0).toUpperCase() + job.handing.slice(1);
				}
			}
		}

		if (handing)
		{
			const coHanding = new ChangeOrderHanding();

			coHanding.handing = handing;

			this.store.dispatch(new ChangeOrderActions.SetChangeOrderHanding(coHanding, false));
		}
	}

	getAvailableLots(lots: Array<Lot>): Array<Lot>
	{
		const lotsWithActivePlans = lots
			? lots.filter(x => x.id !== this.job.lotId &&
				x.planAssociations &&
				x.planAssociations.some(a => this.plans && this.plans.findIndex(p => p.id === a.planId) > -1))
			: [];

		const availableLots = lotsWithActivePlans.filter(x => x.lotBuildTypeDesc !== 'Spec' ||
			x.jobs && x.jobs.some(j => this.plans && this.plans.findIndex(p => p.id === j.planId) > -1));

		return availableLots.sort((a, b) => a.lotBlock < b.lotBlock ? -1 : a.lotBlock > b.lotBlock ? 1 : 0);
	}

	resetRadioInputs()
	{
		this.revertToDirt = null;
		this.onRevertTo();
	}

	onRevertTo()
	{
		this.store.dispatch(new ChangeOrderActions.SetChangeOrderRevertToDirt(this.revertToDirt));
	}

	onOverride(lot: Lot)
	{
		const component = this.canOverride ? ModalOverrideSaveComponent : ConfirmModalComponent;

		const body = this.canOverride ? 'This will override the Monotony Conflict' : 'There is a Monotony Conflict with the selected lot';
		const confirm = this.modalService.open(component);

		confirm.componentInstance.title = 'Warning';
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.componentInstance.primaryButton = { hide: !this.canOverride, text: 'Save' };
		confirm.componentInstance.secondaryButton = { hide: false, text: 'Cancel' };

		return confirm.result.then((result) =>
		{
			if (result !== 'Close' && result !== 'Continue')
			{
				this.store.dispatch(new ChangeOrderActions.SetChangeOrderOverrideNote(result));

				this.handleLotChange(lot);
			}
		});
	}
}
