import { Component, OnInit, ViewChild, Renderer2, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { Store, select } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

import { ToastrService } from 'ngx-toastr';

import { combineLatest, switchMap, take, finalize, catchError, shareReplay, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { environment } from '../../../../environments/environment';

import * as fromRoot from '../../ngrx-store/reducers';
import * as JobActions from '../../ngrx-store/job/actions';
import * as SalesAgreementActions from '../../ngrx-store/sales-agreement/actions';
import * as ChangeOrderActions from '../../ngrx-store/change-order/actions';
import * as CommonActions from '../../ngrx-store/actions';
import * as ContractActions from '../../ngrx-store/contract/actions';
import * as FavoriteActions from '../../ngrx-store/favorite/actions';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import * as fromUser from '../../ngrx-store/user/reducer';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';
import * as fromJob from '../../ngrx-store/job/reducer';

import
{
	UnsubscribeOnDestroy, ModalRef, ESignStatusEnum, ESignTypeEnum, ChangeOrderGroup, ChangeTypeEnum,
	ChangeInput, SalesStatusEnum, Job, PDFViewerComponent, ModalService, convertDateToUtcString
} from 'phd-common';

import { ChangeOrderService } from '../../core/services/change-order.service';
import { ContractService } from '../../core/services/contract.service';

import * as _ from 'lodash';
import { LotsLoaded, LotActionTypes } from '../../ngrx-store/lot/actions';
import { JobService } from '../../core/services/job.service';

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
	canEdit$: Observable<boolean>;
	canApprove$: Observable<boolean>;
	canSell$: Observable<boolean>;
	canDesign$: Observable<boolean>;
	canApproveChangeOrder$: Observable<boolean>;
	canAddIncentive$: Observable<boolean>;
	contactId$: Observable<number>;
	modalReference: ModalRef;
	envelopeID: any;
	cancelOrVoid: boolean;
	currentChangeOrderGroupSequence: number;
	salesAgreementId: number;
	job: Job;
	jobId: number;
	approvedDate: Date;
	specCancelled$: Observable<boolean>;
	signedDate: Date;
	isSaving: boolean = false;
	loaded = false;
	isLockedIn: boolean = false;
	isDesignComplete: boolean = false;
	isDesignPreviewEnabled: boolean;
	isChangingOrder: boolean;
	isChangeDirty: boolean;
	changeInput: ChangeInput;

	// PHD Lite
	isPhdLite: boolean;

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
		{ value: 'PriceAdjustment', id: 10 },
		{ value: 'SalesNotes', id: 11 }
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

	actionTypesForESignEdit = [
		{ value: this.ACTION_TYPES.ACTION, id: 0 },
		{ value: this.ACTION_TYPES.CANCEL_E_SIGN, id: 1 },
		{ value: this.ACTION_TYPES.SIGN, id: 2 },
		{ value: this.ACTION_TYPES.WITHDRAW, id: 3 }
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
		private activatedRoute: ActivatedRoute,
		private router: Router,
		private store: Store<fromRoot.State>,
		private _changeOrderService: ChangeOrderService,
		private _contractService: ContractService,
		private _actions$: Actions,
		private renderer: Renderer2,
		private modalService: ModalService,
		private toastr: ToastrService
	) { super(); }

	ngOnInit()
	{
		this.activatedRoute.paramMap
			.pipe(
				combineLatest(this.store.pipe(select(state => state.salesAgreement)),
					this.store.pipe(select(jobState => jobState.job))),
			).subscribe(([params, salesAgreementState, jobState]) =>
			{
				if (!this.jobId)
				{
					const id = +params.get('id');
					const isSpec = params.get('spec');

					if (!this.loaded && isSpec === 'spec')
					{
						if (jobState.jobLoading && jobState.id === id)
						{
							return new Observable<never>();
						}
						else
						{
							this.loaded = true;

							this.store.dispatch(new JobActions.LoadJobForJob(id));
						}
					}

					if (!this.loaded && isSpec === 'salesagreement')
					{
						if (salesAgreementState.salesAgreementLoading || salesAgreementState.savingSalesAgreement || salesAgreementState.loadError)
						{
							return new Observable<never>();
						}

						if (id > 0 && salesAgreementState.id !== id)
						{
							this.loaded = true;

							this.store.dispatch(new CommonActions.LoadSalesAgreement(id));
						}
					}
				}
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.job),
			combineLatest(
				this.store.pipe(select(fromScenario.buildMode)),
				this.store.pipe(select(fromSalesAgreement.salesAgreementState))
			)
		).subscribe(([job, buildMode, salesAgreement]) =>
		{
			this.salesAgreementId = salesAgreement.id;
			this.constructionStageName = job.constructionStageName;
			this.buildMode = buildMode;
			this.jobChangeOrders = job.changeOrderGroups;
			this.job = job;
			this.jobId = job.id;
			this.approvedDate = salesAgreement.approvedDate;
			this.signedDate = salesAgreement.signedDate;
			this.isLockedIn = salesAgreement.isLockedIn;
			this.isDesignComplete = salesAgreement.isDesignComplete;

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
				let signedStatusHistory = o.jobChangeOrderGroupSalesStatusHistories.find(t => t?.salesStatusId === 2);

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
					else
					{
						const eSignEnvelope = o.eSignEnvelopes?.find(env => env.eSignStatusId === 1 || env.eSignStatusId === 2);
						if (eSignEnvelope)
						{
							actionTypes = eSignEnvelope.eSignStatusId === 1 ? this.actionTypesForESignEdit : this.actionTypesForESign;
						}
						else
						{
							actionTypes = this.actionTypesForPrintforSignature;
						}
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
					createdUtcDate: o.createdUtcDate || '',
					signedDate: signedStatusHistory && signedStatusHistory.salesStatusUtcDate ? convertDateToUtcString(signedStatusHistory.salesStatusUtcDate) : '',
					changeOrderTypeDescription: this._changeOrderService.getTypeFromChangeOrderGroup(o),
					jobChangeOrderGroupDescription: o.jobChangeOrderGroupDescription,
					jobChangeOrderChoices: _.flatten(o.jobChangeOrders.map(t => t.jobChangeOrderChoices)),
					jobChangeOrderPlanOptions: _.flatten(o.jobChangeOrders.map(t => t.jobChangeOrderPlanOptions)),
					jobChangeOrderPlans: _.flatten(o.jobChangeOrders.map(t => t.jobChangeOrderPlans)),
					jobChangeOrderNonStandardOptions: _.flatten(o.jobChangeOrders.map(t => t.jobChangeOrderNonStandardOptions)),
					jobChangeOrderLots: _.flatten(o.jobChangeOrders.map(t => t.jobChangeOrderLots)),
					jobChangeOrderGroupSalesStatusHistories: o.jobChangeOrderGroupSalesStatusHistories,
					changeOrderNotes: o.note ? o.note.noteContent : '',
					eSignEnvelopes: o.eSignEnvelopes,
					salesStatus: o.salesStatusDescription === 'OutforSignature' ? 'Out For Signature' : o.salesStatusDescription,
					constructionStatusDescription: o.constructionStatusDescription,
					createdBy: o.contact ? o.contact.displayName : o.createdBy,
					createdByContactId: o.createdByContactId,
					actionTypes: actionTypes,
					amount: o.amount,
					envelopeId: o.envelopeId,
					salesChangeOrderBuyers: _.flatten(o.jobChangeOrders.map(t => t.jobSalesChangeOrderBuyers)),
					salesChangeOrderPriceAdjustments: _.flatten(o.jobChangeOrders.map(t => t.jobSalesChangeOrderPriceAdjustments)),
					salesChangeOrderSalesPrograms: _.flatten(o.jobChangeOrders.map(t => t.jobSalesChangeOrderSalesPrograms)),
					salesChangeOrderTrusts: _.flatten(o.jobChangeOrders.map(t => t.jobSalesChangeOrderTrusts)),
					salesNotesChangeOrders: _.flatten(o.jobChangeOrders.map(t => t.salesNotesChangeOrders)),
					isResubmittedChangeOrder: false,
					isActiveChangeOrder: false,
					eSignStatus: this.getESignStatus(o),
					eSignStatusDate: this.getESignStatusDate(o),
					eSignExpirationDate: this.getESignExpirationDate(o),
					changeOrderGroupSequence: o.changeOrderGroupSequence ? o.changeOrderGroupSequence : 0,
					changeOrderGroupSequenceSuffix: o.changeOrderGroupSequenceSuffix,
					index: o.changeOrderGroupSequence ? (o.changeOrderGroupSequence + o.changeOrderGroupSequenceSuffix) : 0
				};
			});

			this.changeOrders.sort((a: any, b: any) =>
			{
				return new Date(a.createdUtcDate).getTime() - new Date(b.createdUtcDate).getTime();
			});

			if (this.buildMode === 'spec' || this.buildMode === 'model')
			{
				this.setGroupSequenceForSpec();
			}

			this.setSpecChangeAmount(salesAgreement.salePrice);

			this.currentChangeOrderGroupSequence = this.changeOrders && this.changeOrders.length
				? this.changeOrders[this.changeOrders.length - 1].changeOrderGroupSequence
				: 0;

			this.activeChangeOrders = this.changeOrders.filter(t => ['Pending', 'Out For Signature', 'Signed', 'Rejected'].indexOf(t.salesStatus) !== -1).concat(this.changeOrders.filter(t => t.salesStatus === 'Approved' && t.constructionStatusDescription !== 'Approved'));
			this.activeChangeOrders.forEach(co => co.isActiveChangeOrder = true);

			this.pastChangeOrders = this.changeOrders.filter(t => t.salesStatus === 'Withdrawn' || t.salesStatus === 'Resolved' || (t.salesStatus === 'Approved' && t.constructionStatusDescription === 'Approved'));

			if (this.activeChangeOrders.length > 1)
			{
				let resubmittedChangeOrder = this.activeChangeOrders.find(t => !t.jobChangeOrderGroupSalesStatusHistories.find(c => c.salesStatusId === 4) && t.constructionStatusDescription !== 'Rejected');

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

		this.canEdit$ = this.store.pipe(select(fromRoot.canCreateChangeOrder));
		this.canApprove$ = this.store.pipe(select(fromRoot.canApprove));
		this.canSell$ = this.store.pipe(select(fromRoot.canSell));
		this.contactId$ = this.store.pipe(select(fromUser.contactId));
		this.specCancelled$ = this.store.pipe(select(fromJob.isCancelled));
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canEditCancelOrVoidAgreement)
		).subscribe(cancelOrVoid => this.cancelOrVoid = cancelOrVoid);
		this.canDesign$ = this.store.pipe(select(fromRoot.canDesign));
		this.canApproveChangeOrder$ = this.store.pipe(select(fromRoot.canApproveChangeOrder));
		this.canAddIncentive$ = this.store.pipe(select(fromRoot.canAddIncentive));

		this._actions$.pipe(
			ofType<JobActions.EnvelopeError>(JobActions.JobActionTypes.EnvelopeError),
			this.takeUntilDestroyed()
		).subscribe(() => this.isSaving = false);

		this.store.pipe(
			select(fromRoot.isDesignPreviewEnabled)
		).subscribe(enabled => this.isDesignPreviewEnabled = enabled);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lite)
		).subscribe(lite => this.isPhdLite = lite.isPhdLite);
		
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder)
		).subscribe( changeOrder => {
			this.changeInput = changeOrder.changeInput;
			this.isChangeDirty = changeOrder.changeInput ? changeOrder.changeInput.isDirty : false;
			this.isChangingOrder = (changeOrder.changeInput
				&& (changeOrder.changeInput.type === ChangeTypeEnum.CONSTRUCTION
					|| changeOrder.changeInput.type === ChangeTypeEnum.PLAN))
				? changeOrder.isChangingOrder
				: false;
	});

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

	getESignExpirationDate(changeOrder: any): Date
	{
		const envelopeId = changeOrder.envelopeId;
		const draft = changeOrder?.eSignEnvelopes?.find(e => e.envelopeGuid === envelopeId && e.eSignStatusId === ESignStatusEnum.Created);
		if (draft)
		{
			// Set draft envelope to expire in 3 days
			let expiredDate = new Date(draft.createdUtcDate);
			expiredDate.setDate(expiredDate.getDate() + 3);
			return expiredDate;
		}

		return null;
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
				this.onGenerateDocument(changeOrder , false)
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
								this.setOutForSignature(changeOrder, false, true);
							});

						this.store.dispatch(new JobActions.CreateChangeOrderEnvelope(currentSnapshot));
					}
					else
					{
						this.setOutForSignature(changeOrder, false, true);
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

				this._contractService.createSnapShot(changeOrder).subscribe(snapshot =>
				{
					this.isSaving = true;

					this._actions$.pipe(
						ofType<CommonActions.ChangeOrderEnvelopeCreated>(CommonActions.CommonActionTypes.ChangeOrderEnvelopeCreated),
						take(1)).subscribe(() =>
						{
							this.isSaving = false;
							this.modalReference = this.modalService.open(this.content, { size: 'lg', windowClass: 'phd-distribution-list', keyboard: false });
						});

					this.store.dispatch(new JobActions.CreateChangeOrderEnvelope(snapshot));

					if (changeOrder.id !== this.changeOrders[0].id)
					{
						this.store.dispatch(new ContractActions.SetESignType(ESignTypeEnum.ChangeOrder));
					}
				});

				break;
			case this.ACTION_TYPES.CANCEL_E_SIGN:
				changeOrder = { ...changeOrder, salesStatusDescription: "Pending", jobChangeOrderGroupSalesStatusHistories: undefined }
				let envelopeDto = changeOrder.eSignEnvelopes[0]
				envelopeDto = { ...envelopeDto, eSignStatusId: 4 };

				this.isSaving = true;
				this.store.pipe(
					take(1),
					select(state => state.job),
					combineLatest(
						this._changeOrderService.updateESignEnvelope(envelopeDto),
						this._changeOrderService.updateJobChangeOrder([changeOrder]),
						this._contractService.deleteEnvelope(envelopeDto.envelopeGuid)
					),
					finalize(() => this.isSaving = false)
				).subscribe(([job, , changeOrders]) =>
				{
					this.updateChangeOrderPending(job, changeOrders, changeOrder, envelopeDto.eSignEnvelopeId);
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
			take(1),
			select(state => state.job.financialCommunityId),
			switchMap(financialCommunityId =>
			{
				return this._changeOrderService.getChangeOrderTypeAutoApproval(financialCommunityId);
			}),
			switchMap(communityAutoApprovals =>
			{
				//checking for Sales Change Order Type
				if (jobChangeOrderTypeId !== 9 && jobChangeOrderTypeId !== 10 && jobChangeOrderTypeId !== 11)
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
			// #353697 Once the CO is saved, we need to clear out any related option prices that have been restored, in both the database and the job state
			this.store.dispatch(new JobActions.DeleteReplaceOptionPrice(false));

			if (changeOrders.some(co => co.constructionStatusDescription === 'Approved'))
			{
				if (this.salesAgreementId)
				{
					//if the CO was auto-approved, reload the sales agreement
					this.store.dispatch(new CommonActions.LoadSalesAgreement(this.salesAgreementId, false));
				}
				else
				{
					this.store.dispatch(new JobActions.LoadJobForJob(this.jobId, false));
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

	envelopeSent(sent: boolean)
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

		this.setOutForSignature(changeOrder, sent);

		if (sent)
		{
			this.closeModal();
		}
	}

	envelopeCancelled(envelopeId: string)
	{
		const cancelledChangeOrder = this.changeOrders.find(x => x.eSignEnvelopes?.some(e => e.envelopeGuid === envelopeId));

		if (cancelledChangeOrder)
		{
			let changeOrder = { ...cancelledChangeOrder, salesStatusDescription: "Pending", jobChangeOrderGroupSalesStatusHistories: undefined }
			const eSignEnvelopeId = cancelledChangeOrder.eSignEnvelopes?.find(e => e.envelopeGuid === envelopeId)?.eSignEnvelopeId;

			this.isSaving = true;
			this.store.pipe(
				take(1),
				select(state => state.job),
				combineLatest(
					this._changeOrderService.deleteESignEnvelope(eSignEnvelopeId),
					this._changeOrderService.updateJobChangeOrder([changeOrder])
				),
				finalize(() => this.isSaving = false)
			).subscribe(([job, , changeOrders]) =>
			{
				this.updateChangeOrderPending(job, changeOrders, cancelledChangeOrder, eSignEnvelopeId);
			});
		}
	}

	private setOutForSignature(changeOrder: any, sent: boolean, isWetSign: boolean = false)
	{
		this.store.dispatch(new ChangeOrderActions.ChangeOrderOutForSignature(changeOrder, sent, isWetSign, changeOrder.id === this.currentChangeOrderId));
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
						// #353697 Once the CO is withdrawn, we need to clear out any new option prices in both the database and the job state
						this.store.dispatch(new JobActions.DeleteReplaceOptionPrice(true));

						if (this.salesAgreementId != 0) 
						{
							this.store.dispatch(new CommonActions.LoadSalesAgreement(this.salesAgreementId, false));
						}
						else
						{
							this.store.dispatch(new CommonActions.LoadSpec(this.job));
						}
					}
				}

				this.onCancel();
			});
	}

	onGenerateDocument(changeOrder: any, showPDF: boolean = true)
	{
		let activeChangeOrder = this.activeChangeOrders.find(co => co.id === changeOrder.id);
		if (this.isChangingOrder && this.isChangeDirty && activeChangeOrder)
		{
			if (this.changeInput.type === ChangeTypeEnum.CONSTRUCTION)
			{
				this.store.dispatch(new ChangeOrderActions.CreateJobChangeOrders());
			}
			else if (this.changeInput.type === ChangeTypeEnum.PLAN)
			{
				this.store.dispatch(new ChangeOrderActions.CreatePlanChangeOrder());
			}
			else if (this.changeInput.type  === ChangeTypeEnum.SALES)
			{
				this.store.dispatch(new ChangeOrderActions.CreateSalesChangeOrder());
			}
			else if (this.changeInput.type  === ChangeTypeEnum.LOT_TRANSFER)
			{
				this.store.dispatch(new ChangeOrderActions.CreateLotTransferChangeOrder());
			}
			else if (this.changeInput.type  === ChangeTypeEnum.NON_STANDARD)
			{
				this.store.dispatch(new ChangeOrderActions.CreateNonStandardChangeOrder(activeChangeOrder.jobChangeOrderNonStandardOptions));
			}
			else
			{
				this.store.dispatch(new ChangeOrderActions.SetChangingOrder(false, null));
			}

			this._actions$.pipe(
				ofType<ContractActions.SetChangeOrderTemplates>(ContractActions.ContractActionTypes.SetChangeOrderTemplates),
				take(1)
				).subscribe(() => {
						let changeOrder = this.changeOrders.find(co => co.id === activeChangeOrder.id);
						this.generateDocument(changeOrder, showPDF);
				});
		}
		else
		{
			this.generateDocument(changeOrder, showPDF)
		}
	}

	generateDocument(changeOrder: any, showPDF: boolean = true)
	{

		this.isDownloadingEnvelope = false;

		if ((changeOrder.salesStatus === 'Pending'))
		{
			this._contractService.compareSnapshots(this.jobId, changeOrder).pipe(
				switchMap(currentSnapshot =>
				{
					if (currentSnapshot)
					{
						return this._contractService.saveSnapshot(currentSnapshot, this.jobId, changeOrder.id).pipe(
							switchMap(() =>
								this._contractService.getPreviewDocument(currentSnapshot, true, false, this.isPhdLite)
							),
							map(pdfObject =>
							{
								return pdfObject;
							}
						));
					}
					else
					{
						return of(null);
					}
				}),
				take(1)
			).subscribe(pdfObject =>
			{
				if(showPDF)
				{
					this.openPdfViewer(changeOrder.id);
				}
			});
		}
		else if ((changeOrder.changeOrderTypeDescription === 'SalesJIO' && changeOrder.salesStatus === 'Approved') || (changeOrder.changeOrderTypeDescription === 'SpecJIO' && changeOrder.salesStatus === 'Approved') || (changeOrder.id === this.changeOrders[0].id && changeOrder.salesStatus === 'Approved'))
		{
			this._contractService.getEnvelope(this.jobId, changeOrder.id, this.approvedDate, this.signedDate, this.isPhdLite).subscribe(() =>
			{
				if(showPDF)
				{
					this.openPdfViewer(changeOrder.id);
				}
			});
		}
		else
		{
			if(showPDF)
			{
				this.openPdfViewer(changeOrder.id);
			}
		}
	}

	openPdfViewer(changeOrderId: string)
	{
		// attempt to get the pdf if in storage
		this._contractService.getPDFFromStorageByteArray(changeOrderId, this.jobId).pipe(
			catchError(() =>
			{
				// if unable to get the pdf, the files might be missing so lets try to recreate them.
				let changeOrder = this.changeOrders.find(x => x.id === changeOrderId);

				// create a new snapshot
				let retObs = this._contractService.createSnapShot(changeOrder).pipe(
					switchMap(currentSnapshot =>
					{
						let obs = this._actions$.pipe(
							ofType<CommonActions.ChangeOrderEnvelopeCreated>(CommonActions.CommonActionTypes.ChangeOrderEnvelopeCreated),
							take(1),
							shareReplay()); // so that we don't miss the ChangeOrderEnvelopeCreated action because we're subscribing after the dispatch

						obs.subscribe();

						// create enveope / pdf
						this.store.dispatch(new JobActions.CreateChangeOrderEnvelope(currentSnapshot));

						// lets try to open the pdf again
						return obs.pipe(switchMap(() => this._contractService.getPDFFromStorageByteArray(changeOrderId, this.jobId)));
					}));

				return retObs;
			})
		)
		.subscribe(pdfObjectUrl =>
		{
			let pdfViewer = this.modalService.open(PDFViewerComponent, { backdrop: 'static', windowClass: 'phd-pdf-modal', size: 'lg' });

			pdfViewer.componentInstance.pdfModalTitle = 'Change Order PDF';
			pdfViewer.componentInstance.pdfData = pdfObjectUrl;
			pdfViewer.componentInstance.pdfBaseUrl = `${environment.pdfViewerBaseUrl}`;
		},
		error =>
		{
			this.toastr.error('Unable to open PDF', 'Error');
		});
	}

	withdrawChangeOrder()
	{
		this.onActionSelected(this.ACTION_TYPES.WITHDRAW);
	}

	resubmitChangeOrder(changeOrder?: any)
	{
		const sequence = changeOrder.changeOrderGroupSequence;
		const sequenceSuffix = this.getNextSequenceSuffix(changeOrder.changeOrderGroupSequenceSuffix);

		switch (changeOrder.changeOrderTypeDescription)
		{
			case 'NonStandard':
				var changeInput = new ChangeInput(ChangeTypeEnum.NON_STANDARD);
				changeInput.isDirty = true; // Enables Save button on resubmitting a NSO
				this.store.dispatch(new ChangeOrderActions.ResubmitChangeOrder(changeInput, sequence, sequenceSuffix));

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

				this.router.navigateByUrl(this.isPhdLite ? '/lite-summary' : '/scenario-summary');

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

	updateChangeOrderPending(job: Job, changeOrders: ChangeOrderGroup[], cancelledChangeOrder: ChangeOrderGroup, eSignEnvelopeId: number)
	{
		let updatedJob = _.cloneDeep(job);
		let updatedChangeOrders = _.cloneDeep(changeOrders);

		let updatedChangeOrder = updatedChangeOrders?.find(co => co.id === cancelledChangeOrder.id);
		if (updatedChangeOrder)
		{
			let envelopes = _.cloneDeep(cancelledChangeOrder.eSignEnvelopes) as Array<any>;
			const envelopeIndex = envelopes?.findIndex(e => e.eSignEnvelopeId === eSignEnvelopeId);
			if (envelopeIndex > -1)
			{
				envelopes.splice(envelopeIndex, 1);
			}
			updatedChangeOrder.eSignEnvelopes = envelopes;

			let jobChangeOrderGroup = updatedJob.changeOrderGroups.find(co => co.id === cancelledChangeOrder.id);
			if (jobChangeOrderGroup)
			{
				jobChangeOrderGroup.salesStatusDescription = updatedChangeOrder.salesStatusDescription;
				jobChangeOrderGroup.salesStatusUTCDate = updatedChangeOrder.salesStatusUTCDate;
				jobChangeOrderGroup.jobChangeOrderGroupSalesStatusHistories.push({
					jobChangeOrderGroupId: jobChangeOrderGroup.id,
					salesStatusId: SalesStatusEnum.Pending,
					createdUtcDate: updatedChangeOrder.salesStatusUTCDate,
					salesStatusUtcDate: updatedChangeOrder.salesStatusUTCDate
				});
				jobChangeOrderGroup.eSignEnvelopes = envelopes;
			}
		}

		this.store.dispatch(new CommonActions.ChangeOrdersUpdated(updatedChangeOrders));
		this.store.dispatch(new JobActions.JobUpdated(updatedJob));

		if (updatedChangeOrders[0].id === this.currentChangeOrderId)
		{
			this.store.dispatch(new ChangeOrderActions.SetChangingOrder(true, null, false));
		}

		// Reload sales agreement and update price on change order
		this.store.dispatch(new CommonActions.LoadSalesAgreement(this.salesAgreementId, false));
		this._actions$.pipe(
			ofType<LotsLoaded>(LotActionTypes.LotsLoaded),
			take(1)).subscribe(() =>
			{
				this.store.dispatch(new ChangeOrderActions.CreateJobChangeOrders());
			});
	}

	toggleDesignComplete()
	{
		this.store.dispatch(new SalesAgreementActions.SetIsDesignComplete(!this.isDesignComplete));
	}
}
