import { Component, OnInit, ViewChild, Renderer2, ElementRef } from '@angular/core';
import { Router } from "@angular/router";
import { Store, select } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { combineLatest, switchMap, withLatestFrom, take, finalize, takeUntil } from 'rxjs/operators';
import { Observable } from 'rxjs/Observable';

import * as fromRoot from '../../ngrx-store/reducers';
import * as JobActions from '../../ngrx-store/job/actions';
import * as ChangeOrderActions from '../../ngrx-store/change-order/actions';
import * as CommonActions from '../../ngrx-store/actions';
import * as ContractActions from '../../ngrx-store/contract/actions';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import * as fromUser from '../../ngrx-store/user/reducer';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';
import * as fromJob from '../../ngrx-store/job/reducer';

import { ChangeOrderGroup, ChangeTypeEnum, ChangeInput } from '../../shared/models/job-change-order.model';
import { ChangeOrderService } from '../../core/services/change-order.service';
import { UnsubscribeOnDestroy } from '../../shared/classes/unsubscribe-on-destroy';
import { ESignStatusEnum, ESignTypeEnum } from '../../shared/models/esign-envelope.model';
import { PDFViewerComponent } from '../../shared/components/pdf-viewer/pdf-viewer.component';
import { ContractService } from '../../core/services/contract.service';

import * as _ from 'lodash';
import { LotsLoaded, LotActionTypes } from '../../ngrx-store/lot/actions';
import { ModalService } from '../../core/services/modal.service';
import { ModalRef } from '../../shared/classes/modal.class';
import { convertDateToUtcString } from "../../shared/classes/date-utils.class";

@Component({
	selector: 'change-order-summary',
	templateUrl: './change-order-summary.component.html',
	styleUrls: ['./change-order-summary.component.scss']
})
export class ChangeOrderSummaryComponent extends UnsubscribeOnDestroy implements OnInit
{
	changeOrders: Array<any> = [];
	activeChangeOrders: Array<any> = [];
	pastChangeOrders: Array<any> = [];
	jobChangeOrders: Array<ChangeOrderGroup> = [];
	updateChangeOrderForm: FormGroup;
	rejectedChangeOrderForm: FormGroup;
	currentChangeOrderId: number;
	isDownloadingEnvelope: boolean = false;
	isModalOpen: boolean = false;
	rejectedChangeOrder: ChangeOrderGroup = null;
	buildMode: string;
	constructionStageName: string;
	canApprove$: Observable<boolean>;
	canSell$: Observable<boolean>;
	canDesign$: Observable<boolean>;
	canAddIncentive$: Observable<boolean>;
	contactId$: Observable<number>;
	modalReference: ModalRef;
	envelopeID: any;
	cancelOrVoid: boolean;
	currentChangeOrderGroupSequence: number;
	salesAgreementId: number;
	jobId: number;
	approvedDate: Date;
	specCancelled$: Observable<boolean>;
	signedDate: Date;
	isSaving: boolean = false;

	JOB_CHANGEORDER_TYPES = [
		{ value: 'SalesJIO', id: 0 },
		{ value: 'Plan', id: 1 },
		{ value: 'Elevation', id: 2 },
		{ value: 'Handing', id: 3 },
		{ value: 'ChoiceAttribute', id: 4 },
		{ value: 'HomesiteTransfer', id: 5 },
		{ value: 'NonStandard', id: 6 },
		{ value: 'Cancellation', id: 7 },
		{ value: 'SpecJIO', id: 8 },
		{ value: 'BuyerChangeOrder', id: 9 },
		{ value: 'PriceAdjustment', id: 10 }
	];

	ACTION_TYPES = {
		ACTION: 'Action',
		SIGN: 'Sign',
		E_SIGN: 'E-Sign',
		CANCEL_E_SIGN: 'Cancel E-Sign',
		PRINT_FOR_SIGNATURE: 'Print for Signature',
		CANCEL_SIGNATURE: 'Cancel Signature',
		WITHDRAW: 'Withdraw',
		APPROVE: 'Approve',
		REJECT: 'Reject',
		RESUBMIT: 'Resubmit'
	}

	actionTypesForPending = [
		{ value: this.ACTION_TYPES.ACTION, id: 0 },
		{ value: this.ACTION_TYPES.E_SIGN, id: 1 },
		{ value: this.ACTION_TYPES.PRINT_FOR_SIGNATURE, id: 2 },
		{ value: this.ACTION_TYPES.WITHDRAW, id: 3 }
	];

	actionTypesForPendingCOSpec = [
		{ value: this.ACTION_TYPES.ACTION, id: 0 },
		{ value: this.ACTION_TYPES.APPROVE, id: 1 },
		{ value: this.ACTION_TYPES.WITHDRAW, id: 2 }
	];

	actionTypesForOutForSignatureJIOs = [
		{ value: this.ACTION_TYPES.ACTION, id: 0 },
		{ value: this.ACTION_TYPES.CANCEL_SIGNATURE, id: 1 }
	];

	actionTypesForPendingResubmittedCO = [
		{ value: this.ACTION_TYPES.ACTION, id: 0 },
		{ value: this.ACTION_TYPES.E_SIGN, id: 1 },
		{ value: this.ACTION_TYPES.PRINT_FOR_SIGNATURE, id: 2 },
		{ value: this.ACTION_TYPES.WITHDRAW, id: 3 }
	];

	actionTypesForPrintforSignature = [
		{ value: this.ACTION_TYPES.ACTION, id: 0 },
		{ value: this.ACTION_TYPES.CANCEL_SIGNATURE, id: 1 },
		{ value: this.ACTION_TYPES.SIGN, id: 2 },
		{ value: this.ACTION_TYPES.WITHDRAW, id: 3 }
	];

	actionTypesForESign = [
		{ value: this.ACTION_TYPES.ACTION, id: 0 },
		{ value: this.ACTION_TYPES.CANCEL_E_SIGN, id: 1 },
		{ value: this.ACTION_TYPES.PRINT_FOR_SIGNATURE, id: 2 },
		{ value: this.ACTION_TYPES.SIGN, id: 3 },
		{ value: this.ACTION_TYPES.WITHDRAW, id: 4 }
	];

	actionTypesForSigned = [
		{ value: this.ACTION_TYPES.ACTION, id: 0 },
		{ value: this.ACTION_TYPES.APPROVE, id: 1 },
		{ value: this.ACTION_TYPES.REJECT, id: 2 }
	];

	actionTypesForRejected = [
		{ value: this.ACTION_TYPES.ACTION, id: 0 },
		{ value: this.ACTION_TYPES.RESUBMIT, id: 1 },
		{ value: this.ACTION_TYPES.WITHDRAW, id: 2 }
	];

	changeOrderTypes = [
		{ value: 'ADD CHANGE ORDER', id: 0 },
		{ value: 'Construction Change', id: 1 },
		{ value: 'Non-Standard Change', id: 2 },
		{ value: 'Plan Change', id: 3 },
		//{ value: 'Lot Transfer', id: 4 },
		{ value: 'Sales Change only', id: 5 }
	];

	@ViewChild('content') content: any;
	@ViewChild('updateChangeOrderModal') updateChangeOrderModal: any;
	@ViewChild('rejectedChangeOrderModal') rejectedChangeOrderModal: any;
	@ViewChild('addChangeOrder') addChangeOrder: ElementRef;

	get saveDisabled(): boolean
	{
		let saveDisabled = !this.updateChangeOrderForm.valid;

		return saveDisabled;
	}

	constructor(
		private router: Router,
		private store: Store<fromRoot.State>,
		private _changeOrderService: ChangeOrderService,
		private _contractService: ContractService,
		private _actions$: Actions,
		private renderer: Renderer2,
		private modalService: ModalService
	) { super(); }

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.job),
			withLatestFrom(
				this.store.pipe(select(fromScenario.buildMode)),
				this.store.pipe(select(fromSalesAgreement.salesAgreementState))
			)
		).subscribe(([job, buildMode, salesAgreement]) =>
		{
			this.salesAgreementId = salesAgreement.id;
			this.constructionStageName = job.constructionStageName;
			this.buildMode = buildMode;
			this.jobChangeOrders = job.changeOrderGroups;
			this.jobId = job.id;
			this.approvedDate = salesAgreement.approvedDate;
			this.signedDate = salesAgreement.signedDate;

			let index = job.changeOrderGroups.findIndex(t => (t.jobChangeOrders.find(c => c.jobChangeOrderTypeDescription === "SpecJIO" || c.jobChangeOrderTypeDescription === "SalesJIO")) !== undefined);
			let changeOrders = [];

			if (index > -1)
			{
				changeOrders = job.changeOrderGroups.slice(0, index + 1);
			}
			else
			{
				changeOrders = job.changeOrderGroups;
			}

			this.changeOrders = changeOrders.map(o =>
			{
				let actionTypes = [];
				let signedStatusHistory = o.jobChangeOrderGroupSalesStatusHistories.find(t => t.salesStatusId === 2);

				if (o.salesStatusDescription === 'Pending')
				{
					// changeOrders[changeOrders.length - 1].id  - First CO on the page - Sales JIO/Spec Customer JIO/Spec JIO

					actionTypes = (o.id === changeOrders[changeOrders.length - 1].id) ? [] :
						(this.buildMode === 'spec' || this.buildMode === 'model') ? this.actionTypesForPendingCOSpec : this.actionTypesForPending;
				}
				else if (o.salesStatusDescription === 'OutforSignature')
				{
					// changeOrders[changeOrders.length - 1].id  - First CO on the page - Sales JIO/Spec Customer JIO/Spec JIO

					if (o.id === changeOrders[changeOrders.length - 1].id)
					{
						actionTypes = this.actionTypesForOutForSignatureJIOs;
					}
					else if (o.eSignEnvelopes && o.eSignEnvelopes.find(env => env.eSignStatusId === 1 || env.eSignStatusId === 2))
					{
						actionTypes = this.actionTypesForESign;
					}
					else
					{
						actionTypes = this.actionTypesForPrintforSignature;
					}
				}
				else if (o.salesStatusDescription === 'Signed')
				{
					actionTypes = (o.id === changeOrders[changeOrders.length - 1].id) ? [] : this.actionTypesForSigned;
				}
				else if (o.salesStatusDescription === 'Rejected'
					|| (o.salesStatusDescription === 'Approved' && o.constructionStatusDescription === 'Rejected'))
				{
					actionTypes = this.actionTypesForRejected;
				}

				return {
					id: o.id,
					createdUtcDate: o.createdUtcDate ? convertDateToUtcString(o.createdUtcDate) : '',
					signedDate: signedStatusHistory && signedStatusHistory.salesStatusUtcDate ? convertDateToUtcString(signedStatusHistory.salesStatusUtcDate) : '',
					changeOrderTypeDescription: this._changeOrderService.getTypeFromChangeOrderGroup(o),
					jobChangeOrderGroupDescription: o.jobChangeOrderGroupDescription,
					jobChangeOrderChoices: _.flatten(o.jobChangeOrders.map(t => t.jobChangeOrderChoices)),
					jobChangeOrderPlans: _.flatten(o.jobChangeOrders.map(t => t.jobChangeOrderPlans)),
					jobChangeOrderNonStandardOptions: _.flatten(o.jobChangeOrders.map(t => t.jobChangeOrderNonStandardOptions)),
					jobChangeOrderLots: _.flatten(o.jobChangeOrders.map(t => t.jobChangeOrderLots)),
					jobChangeOrderGroupSalesStatusHistories: o.jobChangeOrderGroupSalesStatusHistories,
					changeOrderNotes: o.note ? o.note.noteContent : '',
					eSignEnvelopes: o.eSignEnvelopes,
					salesStatus: o.salesStatusDescription === 'OutforSignature' ? 'Out For Signature' : o.salesStatusDescription,
					constructionStatus: o.constructionStatusDescription,
					createdBy: o.contact ? o.contact.displayName : o.createdBy,
					createdByContactId: o.createdByContactId,
					actionTypes: actionTypes,
					amount: o.amount,
					envelopeId: o.envelopeId,
					salesChangeOrderBuyers: _.flatten(o.jobChangeOrders.map(t => t.jobSalesChangeOrderBuyers)),
					salesChangeOrderPriceAdjustments: _.flatten(o.jobChangeOrders.map(t => t.jobSalesChangeOrderPriceAdjustments)),
					salesChangeOrderSalesPrograms: _.flatten(o.jobChangeOrders.map(t => t.jobSalesChangeOrderSalesPrograms)),
					salesChangeOrderTrusts: _.flatten(o.jobChangeOrders.map(t => t.jobSalesChangeOrderTrusts)),
					isResubmittedChangeOrder: false,
					isActiveChangeOrder: false,
					eSignStatus: this.getESignStatus(o),
					eSignStatusDate: this.getESignStatusDate(o),
					changeOrderGroupSequence: o.changeOrderGroupSequence ? o.changeOrderGroupSequence : 0,
					changeOrderGroupSequenceSuffix: o.changeOrderGroupSequenceSuffix,
					index: o.changeOrderGroupSequence ? (o.changeOrderGroupSequence + o.changeOrderGroupSequenceSuffix) : 0
				};
			});

			this.changeOrders.sort((a: any, b: any) =>
			{
				return new Date(a.createdUtcDate).getTime() - new Date(b.createdUtcDate).getTime();
			});

			this.setSpecChangeAmount(salesAgreement.salePrice);

			if (this.buildMode === 'spec' || this.buildMode === 'model')
			{
				this.setGroupSequenceForSpec();
			}

			this.currentChangeOrderGroupSequence = this.changeOrders && this.changeOrders.length
				? this.changeOrders[this.changeOrders.length - 1].changeOrderGroupSequence
				: 0;

			this.activeChangeOrders = this.changeOrders.filter(t => ['Pending', 'Out For Signature', 'Signed', 'Rejected'].indexOf(t.salesStatus) !== -1).concat(this.changeOrders.filter(t => t.salesStatus === 'Approved' && t.constructionStatus !== 'Approved'));
			this.activeChangeOrders.forEach(co => co.isActiveChangeOrder = true);

			this.pastChangeOrders = this.changeOrders.filter(t => t.salesStatus === 'Withdrawn' || t.salesStatus === 'Resolved' || (t.salesStatus === 'Approved' && t.constructionStatus === 'Approved'));

			if (this.activeChangeOrders.length > 1)
			{
				let resubmittedChangeOrder = this.activeChangeOrders.find(t => !t.jobChangeOrderGroupSalesStatusHistories.find(c => c.salesStatusId === 4) && t.constructionStatus !== 'Rejected');

				if (resubmittedChangeOrder)
				{
					resubmittedChangeOrder.isResubmittedChangeOrder = true;

					if (resubmittedChangeOrder.salesStatus === 'Pending')
					{
						resubmittedChangeOrder.actionTypes = this.actionTypesForPendingResubmittedCO;
					}
				}
			}

			this.activeChangeOrders = _.orderBy(this.activeChangeOrders, 'createdUtcDate');

			this.pastChangeOrders.sort((a: any, b: any) =>
			{
				const diffSequence = b.changeOrderGroupSequence - a.changeOrderGroupSequence;

				if (diffSequence === 0)
				{
					const suffixA = a.changeOrderGroupSequenceSuffix || '';
					const suffixB = b.changeOrderGroupSequenceSuffix || '';
					if (suffixA < suffixB) { return -1; }
					if (suffixA > suffixB) { return 1; }
					return 0;
				}
				return diffSequence;
			});

		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder.currentChangeOrder)
		).subscribe(changeOrder =>
		{
			this.currentChangeOrderId = changeOrder ? changeOrder.id : 0;
			this.envelopeID = changeOrder ? changeOrder.envelopeId : 0;
		});

		this.canApprove$ = this.store.pipe(select(fromRoot.canApprove));
		this.canSell$ = this.store.pipe(select(fromRoot.canSell));
		this.contactId$ = this.store.pipe(select(fromUser.contactId));
		this.specCancelled$ = this.store.pipe(select(fromJob.isCancelled));
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canEditCancelOrVoidAgreement)
		).subscribe(cancelOrVoid => this.cancelOrVoid = cancelOrVoid);
		this.canDesign$ = this.store.pipe(select(fromRoot.canDesign));
		this.canAddIncentive$ = this.store.pipe(select(fromRoot.canAddIncentive));

		this._actions$.pipe(
			ofType<JobActions.EnvelopeError>(JobActions.JobActionTypes.EnvelopeError),
			this.takeUntilDestroyed()
		).subscribe(() => this.isSaving = false);
	}

	getESignStatus(changeOrder: any): string
	{
		const draft = changeOrder.eSignEnvelopes && changeOrder.eSignEnvelopes.some(e => e.envelopeGuid === changeOrder.envelopeId && e.eSignStatusId === ESignStatusEnum.Created);
		const sent = changeOrder.eSignEnvelopes && changeOrder.eSignEnvelopes.some(e => e.envelopeGuid === changeOrder.envelopeId && e.eSignStatusId === ESignStatusEnum.Sent);
		const completed = changeOrder.eSignEnvelopes && changeOrder.eSignEnvelopes.some(e => e.envelopeGuid === changeOrder.envelopeId && e.eSignStatusId === ESignStatusEnum.Completed);

		if (completed)
		{
			return "completed";
		}

		if (sent)
		{
			return "sent";
		}

		if (draft)
		{
			return "draft";
		}
	}

	getESignStatusDate(changeOrder: any): Date
	{
		const envelopeId = changeOrder.envelopeId;
		const draft = changeOrder.eSignEnvelopes && changeOrder.eSignEnvelopes.some(e => e.envelopeGuid === envelopeId && e.eSignStatusId === ESignStatusEnum.Created);
		const sent = changeOrder.eSignEnvelopes && changeOrder.eSignEnvelopes.some(e => e.envelopeGuid === envelopeId && e.eSignStatusId === ESignStatusEnum.Sent);
		const completed = changeOrder.eSignEnvelopes && changeOrder.eSignEnvelopes.some(e => e.envelopeGuid === envelopeId && e.eSignStatusId === ESignStatusEnum.Completed);

		if (completed)
		{
			const completedEnvelope = changeOrder.eSignEnvelopes.find(e => e.envelopeGuid === envelopeId && e.eSignStatusId === ESignStatusEnum.Completed);

			return new Date(completedEnvelope.completedDate);
		}

		if (sent)
		{
			const sentEnvelope = changeOrder.eSignEnvelopes.find(e => e.envelopeGuid === envelopeId && e.eSignStatusId === ESignStatusEnum.Sent);

			return new Date(sentEnvelope.sentDate);
		}

		if (draft)
		{
			const createdEnvelope = changeOrder.eSignEnvelopes.find(e => e.envelopeGuid === envelopeId && e.eSignStatusId === ESignStatusEnum.Created);

			return new Date(createdEnvelope.createdUtcDate);
		}
	}

	onActionSelected(event)
	{
		let changeOrder;

		if (this.activeChangeOrders.length === 1)
		{
			changeOrder = this.activeChangeOrders[0];
		}
		else if (this.activeChangeOrders.length > 1)
		{
			changeOrder = this.activeChangeOrders.find(t => !!t.isResubmittedChangeOrder);

			if (!changeOrder)
			{
				changeOrder = this.activeChangeOrders[this.activeChangeOrders.length - 1];
			}
		}

		switch (event)
		{
			case this.ACTION_TYPES.WITHDRAW:
				if (this.isModalOpen === true)
				{
					this.modalReference.dismiss();
				}

				this.createForm(changeOrder, this.ACTION_TYPES.WITHDRAW);

				this.openModal(this.updateChangeOrderModal);

				break;
			case this.ACTION_TYPES.REJECT:
				this.createForm(changeOrder, this.ACTION_TYPES.REJECT);

				this.openModal(this.updateChangeOrderModal);

				break;
			case this.ACTION_TYPES.SIGN:
				changeOrder = { ...changeOrder, salesStatusDescription: "Signed", jobChangeOrderGroupSalesStatusHistories: undefined }
				this.isSaving = true;

				this._changeOrderService.updateJobChangeOrder([changeOrder])
					.pipe(finalize(() => this.isSaving = false))
					.subscribe(data =>
					{
						this.store.dispatch(new CommonActions.ChangeOrdersUpdated(data));

						if (changeOrder.id === this.currentChangeOrderId)
						{
							this.store.dispatch(new ChangeOrderActions.SetChangingOrder(false, null, false));
						}
					});

				break;
			case this.ACTION_TYPES.PRINT_FOR_SIGNATURE:

				this._contractService.compareSnapshots(this.jobId, changeOrder).subscribe(currentSnapshot =>
				{
					if (currentSnapshot)
					{
						this._actions$.pipe(
							ofType<CommonActions.ChangeOrderEnvelopeCreated>(CommonActions.CommonActionTypes.ChangeOrderEnvelopeCreated),
							take(1)).subscribe(() =>
							{
								this.setOutForSignature(changeOrder, true);
							});
						this.store.dispatch(new JobActions.CreateChangeOrderEnvelope(currentSnapshot));
					}
					else
					{
						this.setOutForSignature(changeOrder, true);
					}
				});

				break;
			case this.ACTION_TYPES.CANCEL_SIGNATURE:
				// First CO on the table - SalesJIO/ Spec Customer
				this.isSaving = true;
				if (changeOrder.id === this.changeOrders[0].id)
				{
					this._contractService.voidOutForSignatureEnvelope(this.salesAgreementId, changeOrder.envelopeId, changeOrder.eSignStatus, this.jobId, changeOrder.id)
						.pipe(finalize(() => this.isSaving = false))
						.subscribe(() =>
						{
							// this is to reload the agreement, so it fetches new tree information
							this.store.dispatch(new CommonActions.LoadSalesAgreement(this.salesAgreementId, false));

							this._actions$.pipe(
								ofType<LotsLoaded>(LotActionTypes.LotsLoaded),
								take(1)).subscribe(() =>
								{
									this.store.dispatch(new ChangeOrderActions.SavePendingJio());
								});
						});
				}
				else
				{
					changeOrder = { ...changeOrder, salesStatusDescription: "Pending", jobChangeOrderGroupSalesStatusHistories: undefined };

					this._changeOrderService.updateJobChangeOrder([changeOrder])
						.pipe(finalize(() => this.isSaving = false))
						.subscribe(data =>
						{
							this.store.dispatch(new CommonActions.ChangeOrdersUpdated(data));

							if (changeOrder.id === this.currentChangeOrderId)
							{
								this.store.dispatch(new ChangeOrderActions.SetChangingOrder(false, null, true));
							}
						});
				}
				break;
			case this.ACTION_TYPES.E_SIGN:

				this._contractService.createSnapShot(changeOrder).subscribe(snapshot => {
					this.isSaving = true;
					this._actions$.pipe(
						ofType<CommonActions.ChangeOrderEnvelopeCreated>(CommonActions.CommonActionTypes.ChangeOrderEnvelopeCreated),
						take(1)).subscribe(() => {
							this.isSaving = false;
							this.modalReference = this.modalService.open(this.content, { size: 'lg', windowClass: 'phd-distribution-list', keyboard: false });
						});

					this.store.dispatch(new JobActions.CreateChangeOrderEnvelope(snapshot));

					if (changeOrder.id !== this.changeOrders[0].id) {
						this.store.dispatch(new ContractActions.SetESignType(ESignTypeEnum.ChangeOrder));
					}
				});

				break;
			case this.ACTION_TYPES.CANCEL_E_SIGN:
				changeOrder = { ...changeOrder, salesStatusDescription: "Pending", jobChangeOrderGroupSalesStatusHistories: undefined }
				let envelopeDto = changeOrder.eSignEnvelopes[0]
				envelopeDto = { ...envelopeDto, eSignStatusId: 4 };

				this.isSaving = true;
				this._changeOrderService.updateESignEnvelope(envelopeDto).pipe(
					combineLatest(this._changeOrderService.updateJobChangeOrder([changeOrder])),
					finalize(() => this.isSaving = false)
				).subscribe(([eSignEnvelope, changeOrders]) =>
				{
					this.store.dispatch(new CommonActions.ChangeOrdersUpdated(changeOrders));

					if (changeOrders[0].id === this.currentChangeOrderId)
					{
						this.store.dispatch(new ChangeOrderActions.SetChangingOrder(false, null, true));
					}
				});

				break;
			case this.ACTION_TYPES.APPROVE:

				// Compare snapshots for spec approval
				if (this.buildMode === 'spec' || this.buildMode === 'model')
				{
					this._contractService.compareSnapshots(this.jobId, changeOrder).subscribe(currentSnapshot =>
					{
						if (currentSnapshot)
						{
							this._actions$.pipe(
								ofType<CommonActions.ChangeOrderEnvelopeCreated>(CommonActions.CommonActionTypes.ChangeOrderEnvelopeCreated),
								take(1)).subscribe(() =>
								{
									this.approveChangeOrder(changeOrder);
								});
							this.store.dispatch(new JobActions.CreateChangeOrderEnvelope(currentSnapshot));
						}
						else
						{
							this.approveChangeOrder(changeOrder);
						}
					});
				}
				else
				{
					this.approveChangeOrder(changeOrder);
				}

				break;
			case this.ACTION_TYPES.RESUBMIT:
				if (changeOrder)
				{
					this.resubmitChangeOrder(changeOrder);
				}

				break;
		}
	}

	openModal(content: any)
	{
		this.modalReference = this.modalService.open(content);

		this.isModalOpen = true;

		this.modalReference.result.catch(err => console.log(err));
	}

	private approveChangeOrder(changeOrder: any)
	{
		let changeOrdersToBeUpdated: Array<any> = [];

		if (this.activeChangeOrders.length > 1)
		{
			changeOrder = { ...changeOrder, salesStatusDescription: "Approved", jobChangeOrderGroupSalesStatusHistories: undefined };

			let rejectedChangeOrders = this.activeChangeOrders.filter(t => !t.isResubmittedChangeOrder && t.salesStatus === 'Rejected');

			rejectedChangeOrders.forEach(co =>
			{
				co.salesStatusDescription = 'Resolved';
				co.jobChangeOrderGroupSalesStatusHistories = undefined;
			});

			changeOrdersToBeUpdated = [changeOrder, ...rejectedChangeOrders];
		}
		else
		{
			changeOrder = { ...changeOrder, salesStatusDescription: "Approved", jobChangeOrderGroupSalesStatusHistories: undefined };
			changeOrdersToBeUpdated = [changeOrder];
		}

		const changeOrderGroup = this.jobChangeOrders.find(t => t.id === changeOrder.id);
		let jobChangeOrderTypeId = this.JOB_CHANGEORDER_TYPES.find(t => t.value === changeOrderGroup.jobChangeOrders[0].jobChangeOrderTypeDescription).id;

		this.isSaving = true;
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.job.financialCommunityId),
			switchMap(financialCommunityId =>
			{
				return this._changeOrderService.getChangeOrderTypeAutoApproval(financialCommunityId);
			}),
			switchMap(communityAutoApprovals =>
			{
				//checking for Sales Change Order Type
				if (jobChangeOrderTypeId !== 9 && jobChangeOrderTypeId !== 10)
				{
					let isAutoApproval;

					if (jobChangeOrderTypeId === 2 || jobChangeOrderTypeId === 3 || jobChangeOrderTypeId === 4)
					{
						// Construction change order
						const changeOrderTypeIds = this.JOB_CHANGEORDER_TYPES.filter(t => changeOrderGroup.jobChangeOrders.findIndex(co => co.jobChangeOrderTypeDescription === t.value) > -1);
						const autoApprovals = communityAutoApprovals && communityAutoApprovals.length
							? communityAutoApprovals.filter(aa => changeOrderTypeIds.findIndex(x => x.id === aa.edhChangeOrderTypeId) > -1)
							: null;
						isAutoApproval = autoApprovals && autoApprovals.length ? autoApprovals.findIndex(x => !x.isAutoApproval) < 0 : false;
					}
					else
					{
						const autoApproval = communityAutoApprovals && communityAutoApprovals.length
							? communityAutoApprovals.find(aa => aa.edhChangeOrderTypeId === jobChangeOrderTypeId)
							: null;
						isAutoApproval = autoApproval ? autoApproval.isAutoApproval : false;
					}

					if (this.activeChangeOrders.some(co => co.jobChangeOrderChoices.some(choice => choice.overrideNoteId !== null)))
					{
						changeOrdersToBeUpdated.forEach(t =>
						{
							t.constructionStatusDescription = 'Pending';
						});
					}
					else if (isAutoApproval)
					{
						changeOrdersToBeUpdated.forEach(t =>
						{
							t.constructionStatusDescription = 'Approved';
						});
					}
					else
					{
						changeOrdersToBeUpdated.forEach(t =>
						{
							t.constructionStatusDescription = 'Pending';
						});
					}
				}
				else
				{
					changeOrdersToBeUpdated.forEach(t =>
					{
						t.constructionStatusDescription = 'Approved';
					});
				}

				return this._changeOrderService.updateJobChangeOrder(changeOrdersToBeUpdated);
			}),
			finalize(() => this.isSaving = false)
		).subscribe(changeOrders =>
		{
			if (changeOrders.some(co => co.constructionStatusDescription === 'Approved'))
			{
				if (this.salesAgreementId)
				{
					//if the CO was auto-approved, reload the sales agreement
					this.store.dispatch(new CommonActions.LoadSalesAgreement(this.salesAgreementId, false));
				}
				else
				{
					this.store.dispatch(new JobActions.LoadJobForJob(this.jobId));
				}
			}
			else
			{
				changeOrders.forEach(co =>
				{
					let jobChangeOrders = this.jobChangeOrders.find(t => t.id === co.id);

					if (jobChangeOrders)
					{
						co.jobChangeOrders = jobChangeOrders.jobChangeOrders;
					}
				})

				this.store.dispatch(new CommonActions.ChangeOrdersUpdated(changeOrders));

				if (changeOrders && changeOrders.length && changeOrders[0].id === this.currentChangeOrderId)
				{
					this.store.dispatch(new ChangeOrderActions.SetChangingOrder(false, null, false));
					this.store.dispatch(new ChangeOrderActions.CurrentChangeOrderCancelled());
				}
			}
		});
	}

	closeModal()
	{
		this.modalReference.close();
		this.isModalOpen = false;
	}

	onCancel()
	{
		this.modalReference.dismiss();
		this.isModalOpen = false;
	}

	envelopeSent()
	{
		let changeOrder;

		if (this.activeChangeOrders.length === 1)
		{
			changeOrder = this.activeChangeOrders[0];
		}
		else
		{
			changeOrder = this.activeChangeOrders.find(t => t.salesStatus === 'Pending');
		}

		this.setOutForSignature(changeOrder);
		this.closeModal();
	}

	private setOutForSignature(changeOrder: any, isWetSign: boolean = false)
	{
		this.store.dispatch(new ChangeOrderActions.ChangeOrderOutForSignature(changeOrder, isWetSign, changeOrder.id === this.currentChangeOrderId));
	}

	createForm(changeOrder: any, actionSelected: string)
	{
		let changeOrderId = changeOrder.id;
		let salesStatusReason = null;
		let salesStatusDescription = "";

		if (actionSelected === this.ACTION_TYPES.WITHDRAW)
		{
			salesStatusDescription = "Withdrawn";

			let salesStatusHistories = changeOrder.jobChangeOrderGroupSalesStatusHistories.filter(t => t.salesStatusId === 4);

			if (salesStatusHistories.length > 0)
			{
				salesStatusReason = salesStatusHistories[salesStatusHistories.length - 1].salesStatusReason;
			}
		}
		else if (actionSelected === this.ACTION_TYPES.REJECT)
		{
			salesStatusDescription = "Rejected";
		}

		this.updateChangeOrderForm = new FormGroup({
			'changeOrderId': new FormControl(changeOrderId),
			'salesStatusReason': new FormControl(salesStatusReason, [Validators.required, this.whiteSpaceValidator()]),
			'salesStatusDescription': new FormControl(salesStatusDescription),
			'isResubmittedChangeOrder': new FormControl(changeOrder.isResubmittedChangeOrder)
		});
	}

	whiteSpaceValidator(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			let isWhitespace = (control.value || '').trim().length === 0;
			let isValid = !isWhitespace;

			return isValid ? null : { whiteSpaceValidator: true }
		};
	}

	save()
	{
		let changeOrderId = this.updateChangeOrderForm.controls['changeOrderId'].value;
		let changeOrder = this.jobChangeOrders.find(t => t.id === changeOrderId);
		let salesStatusReason = this.updateChangeOrderForm.controls['salesStatusReason'].value;
		let salesStatusDescription = this.updateChangeOrderForm.controls['salesStatusDescription'].value;
		let isResubmittedChangeOrder = this.updateChangeOrderForm.controls['isResubmittedChangeOrder'].value;

		let changeOrdersTobeUpdated: Array<any> = [];

		changeOrder = {
			...changeOrder,
			salesStatusDescription: salesStatusDescription,
			signedDate: undefined,
			jobChangeOrderGroupSalesStatusHistories: undefined,
			salesStatusReason: salesStatusReason
		};

		if (isResubmittedChangeOrder && salesStatusDescription === "Withdrawn")
		{
			let rejectedChangeOrders = this.activeChangeOrders.filter(t => !t.isResubmittedChangeOrder);

			rejectedChangeOrders.forEach(co =>
			{
				co.salesStatusDescription = salesStatusDescription;
				co.signedDate = undefined;
				co.jobChangeOrderGroupSalesStatusHistories = undefined;
				co.salesStatusReason = salesStatusReason;
			});

			changeOrdersTobeUpdated = [changeOrder, ...rejectedChangeOrders];
		}
		else
		{
			changeOrdersTobeUpdated = [changeOrder];
		}

		this.isSaving = true;
		this._changeOrderService.updateJobChangeOrder(changeOrdersTobeUpdated)
			.pipe(finalize(() => this.isSaving = false))
			.subscribe(updatedChangeOrders =>
			{
				this.store.dispatch(new CommonActions.ChangeOrdersUpdated(updatedChangeOrders));

				if (changeOrderId === this.currentChangeOrderId)
				{
					this.store.dispatch(new ChangeOrderActions.SetChangingOrder(false, null));
					if (changeOrder.salesStatusDescription === 'Approved')
					{
						this.store.dispatch(new ChangeOrderActions.CurrentChangeOrderCancelled());
					}
					if (changeOrder.salesStatusDescription === 'Withdrawn')
					{
						this.store.dispatch(new CommonActions.LoadSalesAgreement(this.salesAgreementId, false));
					}
				}

				this.onCancel();
			});
	}

	onGenerateDocument(changeOrder: any)
	{
		this.isDownloadingEnvelope = false;

		if ((changeOrder.salesStatus === "Pending"))
		{
			this._contractService.compareSnapshots(this.jobId, changeOrder).subscribe(currentSnapshot =>
			{

				if (currentSnapshot)
				{
					this._actions$.pipe(
						ofType<CommonActions.ChangeOrderEnvelopeCreated>(CommonActions.CommonActionTypes.ChangeOrderEnvelopeCreated),
						take(1)).subscribe(() =>
						{
							this.isDownloadingEnvelope = true;
							this.openPdfViewer(changeOrder.id);
						});
					this.store.dispatch(new JobActions.CreateChangeOrderEnvelope(currentSnapshot));
				}
				else
				{
					this.openPdfViewer(changeOrder.id);
				}
			});
		}
		else if ((changeOrder.changeOrderTypeDescription === "SalesJIO" && changeOrder.salesStatus === "Approved") || (changeOrder.changeOrderTypeDescription === "SpecJIO" && changeOrder.salesStatus === "Approved") || (changeOrder.id === this.changeOrders[0].id && changeOrder.salesStatus === "Approved"))
		{
			this._contractService.getEnvelope(this.jobId, changeOrder.id, this.approvedDate, this.signedDate).subscribe(() =>
			{
				this.openPdfViewer(changeOrder.id);
			});
		}
		else
		{
			this.openPdfViewer(changeOrder.id);
		}
	}

	openPdfViewer(changeOrderId: string)
	{
		this._contractService.getPDFFromStorageByteArray(changeOrderId, this.jobId)
			.subscribe(pdfObjectUrl =>
			{
				let pdfViewer = this.modalService.open(PDFViewerComponent, { backdrop: 'static', windowClass: 'phd-pdf-modal', size: 'lg' });

				pdfViewer.componentInstance.pdfModalTitle = 'Change Order PDF';
				pdfViewer.componentInstance.pdfData = pdfObjectUrl;
			});
	}

	withdrawChangeOrder()
	{
		this.onActionSelected(this.ACTION_TYPES.WITHDRAW);
	}

	resubmitChangeOrder(changeOrder: any)
	{
		const sequence = changeOrder.changeOrderGroupSequence;
		const sequenceSuffix = this.getNextSequenceSuffix(changeOrder.changeOrderGroupSequenceSuffix);

		switch (changeOrder.changeOrderTypeDescription)
		{
			case 'NonStandard':
				this.store.dispatch(new ChangeOrderActions.ResubmitChangeOrder(new ChangeInput(ChangeTypeEnum.NON_STANDARD), sequence, sequenceSuffix));

				this.router.navigateByUrl('/change-orders/non-standard');

				break;
			case 'Plan':
				this.store.dispatch(new ChangeOrderActions.ResubmitChangeOrder(new ChangeInput(ChangeTypeEnum.PLAN), sequence, sequenceSuffix));

				this.router.navigateByUrl('/change-orders/plan-change');

				break;
			case 'ChoiceAttribute':
			case 'Elevation':
			case 'Handing':
				this.store.dispatch(new ChangeOrderActions.ResubmitChangeOrder(new ChangeInput(ChangeTypeEnum.CONSTRUCTION), sequence, sequenceSuffix));

				this.router.navigateByUrl('/scenario-summary');

				break;
			case 'BuyerChangeOrder':
			case 'PriceAdjustment':
				this.store.dispatch(new ChangeOrderActions.ResubmitChangeOrder(new ChangeInput(ChangeTypeEnum.SALES), sequence, sequenceSuffix));

				this.router.navigateByUrl('/point-of-sale/people');

				break;
			case 'HomesiteTransfer':
				this.store.dispatch(new ChangeOrderActions.ResubmitChangeOrder(new ChangeInput(ChangeTypeEnum.LOT_TRANSFER), sequence, sequenceSuffix));

				this.router.navigateByUrl('/change-orders/lot-transfer');

				break;
		}
	}

	resetAddChangeOrderDropDown()
	{
		this.renderer.setProperty(this.addChangeOrder.nativeElement, 'value', this.changeOrderTypes[0].value);
	}

	onSelectChangeOrderType(event)
	{
		this.resetAddChangeOrderDropDown();

		const nextGroupSequence = this.currentChangeOrderGroupSequence + 1;

		switch (event)
		{
			case 'Non-Standard Change':
				this.store.dispatch(new ChangeOrderActions.SetChangingOrder(true, new ChangeInput(ChangeTypeEnum.NON_STANDARD), null, null, nextGroupSequence));

				this.router.navigateByUrl('/change-orders/non-standard');

				break;
			case 'Plan Change':
				this.store.dispatch(new ChangeOrderActions.SetChangingOrder(true, new ChangeInput(ChangeTypeEnum.PLAN), null, null, nextGroupSequence));

				this.router.navigateByUrl('/change-orders/plan-change');

				break;
			case 'Construction Change':
				this.store.dispatch(new ChangeOrderActions.SetChangingOrder(true, new ChangeInput(ChangeTypeEnum.CONSTRUCTION), null, null, nextGroupSequence));

				this.router.navigateByUrl('/scenario-summary');

				break;
			case 'Sales Change only':
				this.store.dispatch(new ChangeOrderActions.SetChangingOrder(true, new ChangeInput(ChangeTypeEnum.SALES), null, null, nextGroupSequence));

				this.router.navigateByUrl('/point-of-sale/people');

				break;
			case 'Lot Transfer':
				this.store.dispatch(new ChangeOrderActions.SetChangingOrder(true, new ChangeInput(ChangeTypeEnum.LOT_TRANSFER), null, null, nextGroupSequence));

				this.router.navigateByUrl('/change-orders/lot-transfer');

				break;
		}
	}

	getNextSequenceSuffix(suffix: string): string
	{
		if (suffix)
		{
			let code = suffix.charCodeAt(0);

			code++;

			return String.fromCharCode(code);
		}

		return 'a';
	}

	setGroupSequenceForSpec()
	{
		if (this.changeOrders && this.changeOrders.length)
		{
			let lastSequence = -1;

			for (let i = 0; i < this.changeOrders.length; i++)
			{
				if (this.changeOrders[i].changeOrderGroupSequence === 0 && i !== 0)
				{
					this.changeOrders[i].changeOrderGroupSequence = ++lastSequence;
					this.changeOrders[i].index = this.changeOrders[i].changeOrderGroupSequence;
				}
				else
				{
					lastSequence = this.changeOrders[i].changeOrderGroupSequence;
				}
			}
		}
	}

	setSpecChangeAmount(salePrice: number)
	{
		const specChangeOrders = this.changeOrders.filter(o => o.jobChangeOrderGroupDescription === 'Pulte Home Designer Generated Spec Customer Change Order');
		if (specChangeOrders)
		{
			specChangeOrders.forEach(o =>
			{
				o.amount = salePrice;
			});
		}
	}
}
