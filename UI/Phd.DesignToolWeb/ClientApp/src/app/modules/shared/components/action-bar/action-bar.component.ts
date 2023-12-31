import
{
	Component, Input, NgZone,
	Renderer2, OnInit, ChangeDetectorRef,
	OnDestroy, Output, EventEmitter, TemplateRef, ContentChild
} from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';

import { UnsubscribeOnDestroy } from '../../classes/unsubscribe-on-destroy';
import * as _ from 'lodash';

import { SaveStatusType, ActionBarCallType } from '../../classes/constants.class';

import { DecisionPoint } from '../../models/tree.model.new';

import { NavigationService } from '../../../core/services/navigation.service';
import { ConfirmModalComponent } from '../../../core/components/confirm-modal/confirm-modal.component';
import * as SalesAgreementActions from '../../../ngrx-store/sales-agreement/actions';
import * as CommonActions from '../../../ngrx-store/actions';
import { SalesAgreement } from '../../../shared/models/sales-agreement.model';

import * as ChangeOrderActions from '../../../ngrx-store/change-order/actions';
import { ChangeTypeEnum } from '../../../shared/models/job-change-order.model';
import { ChangeOrderService } from './../../../core/services/change-order.service';
import { ModalService } from '../../../core/services/modal.service';
import { Permission } from 'phd-common/models';
import { Job } from './../../models/job.model';
import { ESignTypeEnum } from '../../../shared/models/esign-envelope.model';
import { ModalRef, ModalOptions } from '../../../shared/classes/modal.class';

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

	setSummaryText()
	{
		let labelVal = 'View On Summary';

		let prevUrl = this._navService.getPreviousUrl();

		if (prevUrl == '/scenario-summary')
		{
			labelVal = 'Back to Summary';

			this.isFromSummary = true;
		}
		else
		{
			this.isFromSummary = false;
		}

		this.summaryText = labelVal;
	}

	constructor(
		private ngZone: NgZone,
		private renderer: Renderer2,
		private cd: ChangeDetectorRef,
		private router: Router,
		private store: Store<fromRoot.State>,
		private _navService: NavigationService,
		private modalService: ModalService,
		private _changeOrderService: ChangeOrderService
	) { super(); }

	ngOnInit()
	{
		this.canEditAgreement$ = this.store.select(fromRoot.canEditAgreementOrSpec);
		this.canCancelSpec$ = this.store.select(fromRoot.canCancelSpec);
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
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			map(state => state.changeOrder.isChangingOrder && !this._changeOrderService.changeOrderHasChanges(state.scenario.tree, state.job, state.changeOrder.currentChangeOrder, state.changeOrder.changeInput, state.salesAgreement))
		).subscribe(changeOrderIsEmpty => this.isChangeEmpty = changeOrderIsEmpty);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.job)
		).subscribe(job =>
		{
			this.job = _.cloneDeep(job);
			// look at the last changeOrderGroup which should be the JIO
			let cog = (job.changeOrderGroups && job.changeOrderGroups.length > 0) ? job.changeOrderGroups.reduce((r, a) => r.createdUtcDate > a.createdUtcDate ? r : a) : null;

			if (cog)
			{
				this.salesStatusDescription = cog.salesStatusDescription;
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
		).subscribe(canSell => this.canSell = canSell);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canCancelSalesAgreement)
		).subscribe(canCancel => this.canCancelSalesAgreement = canCancel);


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
		return this.inPointOfSale && this.agreement.status === "OutforSignature" && !this.inChangeOrder;
	}

	get canApproveAgreement(): boolean
	{
		return this.inPointOfSale && this.agreement.status === "Signed" && !this.inChangeOrder && this.salesStatusDescription != 'Approved';
	}

	get canVoidAgreement(): boolean
	{
		return this.canSell && this.inPointOfSale && (this.agreement.status === 'Pending' || this.agreement.status === 'OutforSignature' || this.agreement.status === 'Signed') && !this.inChangeOrder;
	}

	get canCancelAgreement(): boolean
	{
		return this.canCancelSalesAgreement && this.inPointOfSale && this.agreement.status === "Approved" && !this.inChangeOrder;
	}

	get inAgreement(): boolean
	{
		return this.router.url.includes("point-of-sale/agreement");
	}

	get inPointOfSale(): boolean
	{
		return this.router.url.includes("point-of-sale");
	}

	get inSpec(): boolean
	{
		return this.router.url.includes('spec');
	}

	get primaryActionText(): string
	{
		if (this.inChangeOrder && this.changeType === ChangeTypeEnum.PLAN && this.skipSaving)
		{
			return 'Next';
		}

		return this.inChangeOrder ? 'Save' : this.primaryAction;
	}

	get canTerminateAgreement(): boolean
	{
		return this.agreementType == ESignTypeEnum.TerminationAgreement;
	}

	get canPreviewAgreement(): boolean
	{
		return !this.canTerminateAgreement && this.agreement && this.agreement.status !== 'Void';
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

	onPreviewAgreement()
	{
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.PREVIEW_AGREEMENT });
	}

	onTerminationAgreement()
	{
		this.callToAction.emit({ actionBarCallType: ActionBarCallType.TERMINATION_AGREEMENT });
	}

	async onCancel()
	{
		if (!this.savingAgreement)
		{
			this.callToAction.emit({ actionBarCallType: ActionBarCallType.CANCEL_AGREEMENT });
		}
	}

	onVoid()
	{
		if (this.savingAgreement)
		{
			return;
		}

		const options = new ModalOptions();

		options.content = 'You are about to Void an agreement. Do you wish to continue?';
		options.type = 'normal';
		options.header = 'Void Home Purchase Agreement';
		options.buttons = [
			{ text: 'Continue', cssClass: ['btn-secondary'], result: true },
			{ text: 'Cancel', cssClass: ['btn-primary'], result: false }
		];

		this.modalService.showModal(options)
			.pipe(map((modalResult) =>
			{
				if (modalResult)
				{
					this.store.dispatch(new SalesAgreementActions.VoidSalesAgreement());
				}
			})).subscribe();
	}

	async onCancelSpec()
	{
		const confirmMessage = 'You have opted to return this spec to dirt. Confirming to do so will result in the loss of the corresponding home configuration and the lot will return to dirt.<br/><br/> Do you wish to proceed with the cancellation?';
		const confirmTitle = 'Cancel Spec';
		const confirmDefaultOption = 'Continue';
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
			return result === 'Continue';
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
		else if (this.getActionBarStatus() === 'COMPLETE')
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
		const confirmMessage = `If you continue you will lose your changes.<br><br>Do you wish to continue?`;
		const confirmTitle = `Warning!`;
		const confirmDefaultOption = `Cancel`;

		if (!this.isChangeDirty || await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption))
		{
			if (this.changeType === ChangeTypeEnum.CONSTRUCTION)
			{
				this.store.dispatch(new ChangeOrderActions.CancelJobChangeOrder());
			}
			else if (this.changeType === ChangeTypeEnum.PLAN)
			{
				this.store.dispatch(new ChangeOrderActions.CancelPlanChangeOrder());
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
}
