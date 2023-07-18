import
{
	Component, Input, NgZone,
	Renderer2, OnInit, ChangeDetectorRef,
	OnDestroy, Output, EventEmitter, TemplateRef, ContentChild
} from '@angular/core';
import { Router } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';

import * as _ from 'lodash';

import
{
	UnsubscribeOnDestroy, ModalRef, ESignTypeEnum, ESignStatusEnum, ChangeTypeEnum, ChangeOrderGroup, Job,
	SalesAgreement, DecisionPoint, Permission, ModalService, Constants, Tree, TreeVersionRules
} from 'phd-common';

import { SaveStatusType, ActionBarCallType } from '../../classes/constants.class';

import { NavigationService } from '../../../core/services/navigation.service';
import * as CommonActions from '../../../ngrx-store/actions';

import * as ChangeOrderActions from '../../../ngrx-store/change-order/actions';
import { ChangeOrderService } from './../../../core/services/change-order.service';
import { ConfirmModalComponent } from '../../../core/components/confirm-modal/confirm-modal.component';
import * as JobActions from '../../../ngrx-store/job/actions';

import * as fromScenario from '../../../ngrx-store/scenario/reducer';

// PHD Lite
import { LiteService } from './../../../core/services/lite.service';
import * as LiteActions from '../../../ngrx-store/lite/actions';
import { JobService } from '../../../core/services/job.service';
import { checkElevationAndColorSelectionOptions } from '../../classes/tree.utils';

@Component({
	selector: 'action-bar',
	templateUrl: 'action-bar.component.html',
	styleUrls: ['action-bar.component.scss']
})

export class ActionBarComponent extends UnsubscribeOnDestroy implements OnInit, OnDestroy
{
	Permission = Permission;

	@Input() agreement: SalesAgreement;
	@Input() primaryAction: string;
	@Input() actionBarStatus: 'INCOMPLETE' | 'COMPLETE' | 'DISABLED';
	@Input() saveStatus: SaveStatusType;
	@Input() price: number = 0;
	@Input() changePrice: number = 0;
	@Input() currentDecisionPoint?: DecisionPoint;
	@Input() inChangeOrder: boolean = false;
	@Input() skipSaving: boolean = false;
	@Input() scrollListener: any = window;
	@Input() canChange: boolean;

	@ContentChild('leftCellTemplate') leftCellTemplate: TemplateRef<any>;
	@ContentChild('centerCellTemplate') centerCellTemplate: TemplateRef<any>;
	@ContentChild('rightCellTemplate') rightCellTemplate: TemplateRef<any>;

	@Output() callToAction: EventEmitter<{ actionBarCallType: ActionBarCallType }> = new EventEmitter();
	@Output() onSaveNSO = new EventEmitter();

	currentRoute$: Observable<string>;
	$saveScenario: Observable<any>;
	autoHideTimer: any;
	canEditAgreement$: Observable<boolean>;
	currentTopPosition = 0;
	enableBuildIt = false;
	isActionBarHidden = false;
	isFromSummary: boolean = false;
	listener: () => void;
	previousTopPosition = 0;
	saveStatusType = SaveStatusType;
	savingAgreement: boolean = false;
	scrollDelta = 5;
	scrolling = false;
	summaryText: string;
	isChangeDirty: boolean = false;
	isChangeEmpty: boolean = false;
	changeType: ChangeTypeEnum = null;
	changeOrderId: number;
	modalReference: ModalRef;
	salesStatusDescription: string;
	agreementType: ESignTypeEnum;
	isTemplatesSelected$: Observable<any>;
	errorInSavingChangeOrder: boolean;
	canCancelSpec$: Observable<boolean>;
	job: Job;
	canSell: boolean;
	canCancelSalesAgreement: boolean;
	canLockSalesAgreement: boolean;
	hasOpenChangeOrder: boolean = false;
	canCancelModel$: Observable<boolean>;
	lotStatus: string;
	isEditingEnvelopeDraft: boolean;
	isOutForESign: boolean;
	canApprove: boolean;
	salesAgreementId: number;
	tree: Tree;
	treeVersionRules: TreeVersionRules;
	elevationDP: DecisionPoint;
	colorSchemeDP: DecisionPoint;
	isChangeOrderComplete: boolean = false;

	// PHD Lite
	isPhdLite: boolean;

	setSummaryText()
	{
		this.isFromSummary = this._navService.getPreviousUrl() === '/scenario-summary';

		this.summaryText = this.isFromSummary ? 'Back to Summary' : 'View On Summary';
	}

	constructor(
		private ngZone: NgZone,
		private renderer: Renderer2,
		private cd: ChangeDetectorRef,
		private router: Router,
		private store: Store<fromRoot.State>,
		private _navService: NavigationService,
		private modalService: ModalService,
		private _jobService: JobService,
		private _changeOrderService: ChangeOrderService,
		private liteService: LiteService
	) { super(); }

	ngOnInit()
	{
		this.canEditAgreement$ = this.store.select(fromRoot.canEditAgreementOrSpec);
		this.canCancelSpec$ = this.store.select(fromRoot.canCancelSpec);
		this.canCancelModel$ = this.store.select(fromRoot.canCancelModel);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lot)
		).subscribe(lot =>
		{
			this.lotStatus = lot.selectedLot ? lot.selectedLot.lotStatusDescription : ''
		});

		this.isTemplatesSelected$ = this.store.pipe(
			select(state => state.contract),
			map(contract =>
			{
				return contract.selectedTemplates && contract.selectedTemplates.length > 0;
			})
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement)
		).subscribe(agreementState =>
		{
			this.savingAgreement = agreementState.savingSalesAgreement;
			this.salesAgreementId = agreementState.id;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder)
		).subscribe(changeOrder =>
		{
			this.isChangeDirty = changeOrder.changeInput ? changeOrder.changeInput.isDirty : false;
			this.changeType = changeOrder.changeInput ? changeOrder.changeInput.type : null;
			this.changeOrderId = changeOrder.currentChangeOrder ? changeOrder.currentChangeOrder.id : 0;
			this.errorInSavingChangeOrder = changeOrder.saveError;
			this.isChangeOrderComplete = changeOrder.isChangeOrderComplete;
		});

		combineLatest([
			this.store.pipe(select(state => state)),
			this.store.pipe(select(fromRoot.legacyColorScheme))
		])
			.pipe(
				this.takeUntilDestroyed(),
				map(([state, legacyColorScheme]) => state.changeOrder.isChangingOrder
					&& !this._changeOrderService.changeOrderHasChanges(
						state.scenario.tree,
						state.job,
						state.changeOrder.currentChangeOrder,
						state.changeOrder.changeInput,
						state.salesAgreement,
						state.scenario.rules?.optionRules)
					&& !this.liteService.liteChangeOrderHasChanges(
						state.lite,
						state.job,
						state.changeOrder.currentChangeOrder,
						state.changeOrder.changeInput,
						state.salesAgreement,
						state.scenario.overrideReason,
						legacyColorScheme
					))
		).subscribe(changeOrderIsEmpty =>
		{
			this.isChangeEmpty = changeOrderIsEmpty;
		
		});
	

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.job)
		).subscribe(job =>
		{
			this.job = _.cloneDeep(job);

			// look at the last changeOrderGroup which should be the JIO
			let cog: ChangeOrderGroup;

			if (job.changeOrderGroups && job.changeOrderGroups.length > 0)
			{
				cog = job.changeOrderGroups.reduce((r, a) => r.createdUtcDate > a.createdUtcDate ? r : a);

				this.hasOpenChangeOrder = job.changeOrderGroups.findIndex(x => x.salesStatusDescription !== 'Approved' && x.salesStatusDescription !== 'Withdrawn' && x.salesStatusDescription !== 'Resolved') > -1;
			}

			if (cog)
			{
				this.salesStatusDescription = cog.salesStatusDescription;
				this.isEditingEnvelopeDraft = cog.eSignEnvelopes?.some(x => x.eSignStatusId === ESignStatusEnum.Created);
				this.isOutForESign = cog.eSignEnvelopes?.some(x => x.eSignStatusId === ESignStatusEnum.Sent);
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.contract.selectedAgreementType)
		).subscribe(agreementType =>
		{
			this.agreementType = agreementType;
		});

		this.ngZone.runOutsideAngular(() =>
		{
			/*prevents browser from firing scroll on page load*/
			setTimeout(() =>
			{
				this.listener = this.renderer.listen(this.scrollListener, 'scroll', ($event) => { this.scrollHandler.bind(this)($event); });
			}, 200);
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canSell)
		).subscribe(canSell =>
		{
			this.canSell = canSell;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canCancelSalesAgreement)
		).subscribe(canCancel => this.canCancelSalesAgreement = canCancel);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canLockSalesAgreement)
		).subscribe(canLockSalesAgreement => this.canLockSalesAgreement = canLockSalesAgreement);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canApprove)
		).subscribe(canApprove => this.canApprove = canApprove);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lite)
		).subscribe(lite => this.isPhdLite = lite?.isPhdLite);

		combineLatest([
			this.store.pipe(select(fromScenario.selectScenario)),
			this.store.pipe(select(fromScenario.elevationDP)),
			this.store.pipe(select(fromScenario.colorSchemeDP))
		])
			.pipe(this.takeUntilDestroyed())
			.subscribe(([scenario, elevationDP, colorSchemeDP]) =>
			{
				this.tree = scenario.tree;
				this.treeVersionRules = _.cloneDeep(scenario.rules);
				this.elevationDP = elevationDP;
				this.colorSchemeDP = colorSchemeDP;
			});

		this.setSummaryText();
	}

	ngOnDestroy()
	{
		if (this.listener)
		{
			this.listener();
		}

		super.ngOnDestroy();
	}

	get canSignAgreement(): boolean
	{
		return this.inPointOfSale && this.agreement.status === 'OutforSignature' && !this.inChangeOrder && ((!this.isEditingEnvelopeDraft && !this.isOutForESign) || this.canApprove);
	}

	get canApproveAgreement(): boolean
	{
		return this.inPointOfSale && this.agreement.status === 'Signed' && !this.inChangeOrder && this.salesStatusDescription != 'Approved';
	}

	get canVoidAgreement(): boolean
	{
		return this.canSell && this.inPointOfSale && (this.agreement.status === Constants.AGREEMENT_STATUS_PENDING || this.agreement.status === Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE || this.agreement.status === Constants.AGREEMENT_STATUS_SIGNED) && !this.inChangeOrder;
	}

	get canCancelAgreement(): boolean
	{
		return this.canCancelSalesAgreement && this.inPointOfSale && this.agreement.status === 'Approved' && !this.inChangeOrder && !this.agreement.isLockedIn;
	}

	get inAgreement(): boolean
	{
		return this.router.url.includes('point-of-sale/agreement');
	}

	get inPointOfSale(): boolean
	{
		return this.router.url.includes('point-of-sale');
	}

	get inSpec(): boolean
	{
		return this.router.url.includes(Constants.BUILD_MODE_SPEC);
	}

	get primaryActionText(): string
	{
		if (this.inChangeOrder && this.changeType === ChangeTypeEnum.PLAN && this.skipSaving)
		{
			return 'Next';
		}

		return this.inChangeOrder ? Constants.SAVE : this.primaryAction;
	}

	get canTerminateAgreement(): boolean
	{
		return this.agreementType == ESignTypeEnum.TerminationAgreement;
	}

	get canViewAddenda(): boolean
	{
		return !this.canTerminateAgreement && this.agreement && this.agreement.status !== Constants.AGREEMENT_STATUS_VOID;
	}

	get allDepositsReconciled(): boolean
	{
		return this.agreement?.deposits.every(x => x.paidDate !== null);
	}

	get showToggleSalesAgreementLock(): boolean
	{
		return (!this.inChangeOrder || !this.canSell) && this.canLockSalesAgreement && this.agreement?.status === Constants.AGREEMENT_STATUS_APPROVED;
	}

	get toggleAgreementLockLabel(): string
	{
		return this.agreement?.isLockedIn ? 'Unlock Sales Agreement' : 'Ready to Close';
	}

	scrollHandler($event: any)
	{
		if (!this.scrolling)
		{
			this.scrolling = true;

			requestAnimationFrame(() =>
			{
				this.animateHeaderTransition(this.scrollListener.scrollY || this.scrollListener.scrollTop);
			});
		}
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

	onSaveScenario()
	{
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.SAVE_SCENARIO });
	}

	onSignAgreement()
	{
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.SIGN_AGREEMENT });
	}

	onApproveAgreement()
	{
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.APPROVE_AGREEMENT });
	}

	onViewAddenda()
	{
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.PREVIEW_AGREEMENT });
	}

	onTerminationAgreement()
	{
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.TERMINATION_AGREEMENT });
	}

	onToggleAgreementLock()
	{
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.TOGGLE_AGREEMENT_LOCK });
	}

	async onCancel()
	{
		if (!this.savingAgreement)
		{
			this.callToAction.emit({ actionBarCallType: ActionBarCallType.CANCEL_AGREEMENT });
		}
	}

	async onVoid()
	{
		if (!this.savingAgreement)
		{
			this.callToAction.emit({ actionBarCallType: ActionBarCallType.VOID_AGREEMENT });
		}
	}

	async onCancelSpecOrModel(isSpec: boolean)
	{

		this._jobService.checkIfJobHasSalesAgreementAssocs(this.job?.id).subscribe(async allowedToCancelSpec =>
		{

			if (isSpec && !allowedToCancelSpec)
			{
				const modalTitle = 'Cancel Spec';
				const confirmCancelMessage = 'Cannot cancel Spec (internal), there is a current Sales Agreement on this Spec.<br/> You will need to Void or Cancel the Agreement first, then you will be able to cancel the Spec (internal).';
				this.modalService.showOkOnlyModal(confirmCancelMessage, modalTitle, true);
			}

			if (allowedToCancelSpec || !isSpec)
			{
				const confirmMessage = isSpec ? 'You have opted to return this spec to dirt. Confirming to do so will result in the loss of the corresponding home configuration and the lot will return to dirt.<br/><br/> Do you wish to proceed with the cancellation?'
					: 'You have opted to return this model to dirt. Confirming to do so will result in the loss of the corresponding home configuration and the lot will return to dirt.<br/><br/>The lot status will remain ' + this.lotStatus + '. <br/><br/>Do you wish to proceed with the cancellation?';
				const confirmTitle = isSpec ? 'Cancel Spec' : 'Cancel Model';
				const confirmDefaultOption = Constants.CONTINUE;
				const primaryButton = { hide: false, text: 'Yes' };
				const secondaryButton = { hide: false, text: 'No' };

				if (await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption, primaryButton, secondaryButton))
				{
					const currentChangeOrderGroup = this._changeOrderService.getCurrentChangeOrder(this.job.changeOrderGroups);

					if (currentChangeOrderGroup)
					{
						currentChangeOrderGroup.salesStatusDescription = 'Withdrawn';

						this._changeOrderService.updateJobChangeOrder([currentChangeOrderGroup]).subscribe(updatedChangeOrders =>
						{
							this.store.dispatch(new CommonActions.ChangeOrdersUpdated(updatedChangeOrders));
							this.store.dispatch(new ChangeOrderActions.CreateCancellationChangeOrder());

							this.router.navigateByUrl('/change-orders');
						});
					}
					else
					{
						this.store.dispatch(new ChangeOrderActions.CreateCancellationChangeOrder());

						this.router.navigateByUrl('/change-orders');
					}
				}
			}
		});
	}

	private async showConfirmModal(body: string, title: string, defaultButton: string, primaryButton: any = null, secondaryButton: any = null): Promise<boolean>
	{
		const confirm = this.modalService.open(ConfirmModalComponent);

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		if (primaryButton != null)
		{
			confirm.componentInstance.primaryButton = primaryButton;
		}

		if (secondaryButton != null)
		{
			confirm.componentInstance.secondaryButton = secondaryButton;
		}

		return confirm.result.then((result) =>
		{
			return result === Constants.CONTINUE;
		});
	}

	onPrimaryCallToActionClick()
	{
		if (this.actionBarStatus === 'COMPLETE')
		{
			this.callToAction.emit({ actionBarCallType: ActionBarCallType.PRIMARY_CALL_TO_ACTION });
		}
	}

	onChangeIt(modal: any)
	{
		if (this.changeType === ChangeTypeEnum.PLAN && this.skipSaving)
		{
			this.callToAction.emit({ actionBarCallType: ActionBarCallType.PRIMARY_CALL_TO_ACTION });
		}
		else if (this.getActionBarStatus() === 'COMPLETE' && this.validateElevationAndColorOptions())
		{
			this.modalReference = this.modalService.open(modal, { size: 'lg', windowClass: 'phd-change-order-note' });
		}
	}

	saveChangeNote()
	{
		this.modalReference.close();

		if (this.changeType === ChangeTypeEnum.CONSTRUCTION)
		{
			this.store.dispatch(new ChangeOrderActions.CreateJobChangeOrders());
		}
		else if (this.changeType === ChangeTypeEnum.PLAN)
		{
			this.store.dispatch(new ChangeOrderActions.CreatePlanChangeOrder());
		}
		else if (this.changeType === ChangeTypeEnum.SALES)
		{
			this.store.dispatch(new ChangeOrderActions.CreateSalesChangeOrder());
		}
		else if (this.changeType === ChangeTypeEnum.LOT_TRANSFER)
		{
			this.store.dispatch(new ChangeOrderActions.CreateLotTransferChangeOrder());
		}
		else if (this.changeType === ChangeTypeEnum.NON_STANDARD)
		{
			this.onSaveNSO.emit();
		}
		else
		{
			this.store.dispatch(new ChangeOrderActions.SetChangingOrder(false, null));
		}

		this.router.navigateByUrl('/change-orders');
	}

	cancelChangeNote()
	{
		this.modalReference.close();
	}

	async onCancelChange()
	{
		const confirmMessage = Constants.LOSE_CHANGES;
		const confirmTitle = Constants.WARNING;
		const confirmDefaultOption = Constants.CANCEL;

		if (!this.isChangeDirty || await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption))
		{
			if (this.changeType === ChangeTypeEnum.CONSTRUCTION)
			{
				this.isPhdLite
					? this.store.dispatch(new LiteActions.CancelJobChangeOrderLite())
					: this.store.dispatch(new ChangeOrderActions.CancelJobChangeOrder(!!this.isChangeDirty));
			}
			else if (this.changeType === ChangeTypeEnum.PLAN)
			{
				this.isPhdLite
					? this.store.dispatch(new LiteActions.CancelPlanChangeOrderLite())
					: this.store.dispatch(new ChangeOrderActions.CancelPlanChangeOrder());
			}
			else if (this.changeType === ChangeTypeEnum.LOT_TRANSFER)
			{
				this.store.dispatch(new ChangeOrderActions.CancelLotTransferChangeOrder());
			}
			else if (this.changeType === ChangeTypeEnum.SALES)
			{
				this.store.dispatch(new ChangeOrderActions.CancelSalesChangeOrder());
			}
			else if (this.changeType === ChangeTypeEnum.NON_STANDARD)
			{
				this.store.dispatch(new ChangeOrderActions.CancelNonStandardChangeOrder());
			}
			else
			{
				this.store.dispatch(new ChangeOrderActions.SetChangingOrder(false, null));
			}

			// #353697 Revert all new TimeOFSaleOptionPrice records
			this.store.dispatch(new JobActions.DeleteReplaceOptionPrice(true));

			// #395819 only reload if there is a salesAgreementId
			if (this.salesAgreementId !== 0)
			{
				// #392019 Reload the agreement to restore old options 
				this.store.dispatch(new CommonActions.LoadSalesAgreement(this.salesAgreementId, false));
			}

			this.router.navigateByUrl('/change-orders');
		}
	}

	getActionBarStatus(): string
	{
		if (this.inChangeOrder && (!this.isChangeDirty || this.isChangePartiallyComplete() || this.errorInSavingChangeOrder || this.isChangeEmpty))
		{
			return 'INCOMPLETE';
		}
		else
		{			
			return this.actionBarStatus;
		}
	}

	actionNotAllowed(): boolean
	{
		if (this.inChangeOrder && this.isChangePartiallyComplete())
		{
			return false;
		}
		else
		{
			return this.getActionBarStatus() === 'INCOMPLETE';
		}
	}

	isChangePartiallyComplete(): boolean
	{
		return this.changeType === ChangeTypeEnum.PLAN && this.skipSaving && this.actionBarStatus === 'COMPLETE';
	}

	validateElevationAndColorOptions(): boolean
	{
		let isValidElevationAndColorOptions = true;

		if ((this.changeType === ChangeTypeEnum.CONSTRUCTION || this.changeType === ChangeTypeEnum.PLAN) && !this.isPhdLite)
		{
			// find selected elevation and color scheme choices
			const elevationChoice = this.elevationDP?.choices.find(c => c.quantity > 0);
			const colorSchemeChoice = this.colorSchemeDP?.choices.find(c => c.quantity > 0);

			// check elevation and color scheme choices to make sure there is only one option assigned to each.
			const message = checkElevationAndColorSelectionOptions(this.tree, this.treeVersionRules.optionRules, elevationChoice, colorSchemeChoice);

			if (!!message)
			{
				isValidElevationAndColorOptions = false;

				this.modalService.showOkOnlyModal(message, '', true);
			}
		}

		return isValidElevationAndColorOptions;
	}

	isActionComplete()
	{
		const isComplete = (this.getActionBarStatus() === 'COMPLETE' || this.getActionBarStatus() === 'INCOMPLETE') && this.isChangePartiallyComplete();

		if (this.inChangeOrder && this.isChangeOrderComplete !== isComplete)
		{
			this.store.dispatch(new ChangeOrderActions.SetIsChangeOrderComplete(isComplete));
		}
		return isComplete;
	}
}
