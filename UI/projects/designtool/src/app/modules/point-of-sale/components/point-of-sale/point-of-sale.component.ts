import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, TemplateRef, ElementRef, Renderer2 } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, combineLatest, filter, switchMap, distinctUntilChanged, take } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';

import * as _ from 'lodash';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as ContractActions from '../../../ngrx-store/contract/actions';
import * as SalesAgreementActions from '../../../ngrx-store/sales-agreement/actions';
import * as ChangeOrderActions from '../../../ngrx-store/change-order/actions';

import {
	UnsubscribeOnDestroy, ConfirmModalComponent, ModalRef, ESignTypeEnum, PointStatus, SalesAgreement, Consultant,
	PriceBreakdown
} from 'phd-common';

import { ActionBarCallType } from '../../../shared/classes/constants.class';

import { ContractService } from '../../../core/services/contract.service';

import { PDFViewerComponent } from '../../../shared/components/pdf-viewer/pdf-viewer.component';
import { SignAgreementComponent } from '../sign-agreement/sign-agreement.component';
import { ModalService } from '../../../core/services/modal.service';

type ActionBarStatusType = 'INCOMPLETE' | 'COMPLETE' | 'DISABLED';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'app-point-of-sale',
	templateUrl: './point-of-sale.component.html',
	styleUrls: ['./point-of-sale.component.scss']
})
export class PointOfSaleComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild('content') content: any;
	@ViewChild('cancelAgreement') cancelAgreementTemplate: any;
	@ViewChild('terminateAgreement') terminateAgreementTemplate: any;
	@ViewChild('salesConsultant') salesConsultant: any;
	@ViewChild('voidAgreement') voidAgreementTemplate: any;

	displaySaveAndView: boolean = false;
	isChangingOrder: boolean;
	waitingForPdf = false;
	salesAgreementActionBarStatus$: Observable<ActionBarStatusType>;
	// Since we're adding this here, we can really take if off on the children that have it
	// Just about all children use it, so might as well and pass as input
	salesAgreement: SalesAgreement;
	salesAgreement$: Observable<SalesAgreement>;
	priceBreakdown$: Observable<PriceBreakdown>;
	isElevationColorSchemeComplete$: Observable<PointStatus>;
	isPeopleComplete$: Observable<boolean>;
	isSalesInfoComplete$: Observable<boolean>;
	salesChangeOrderActionBarStatus$: Observable<ActionBarStatusType>;
	salesAgreementConsultants$: Observable<Array<Consultant>>;
	envelopeId: any;
	isAgreementInfoViewed$: Observable<boolean>;

	pdfViewer: ModalRef;
	@ViewChild('pdfViewerFooterTemplate') pdfViewerFooterTemplate: TemplateRef<any>;
	modalReference: ModalRef;
	showPDFViewerFooter: boolean = true;
	showPricingLockText: boolean = true;
	selectedAgreementType: ESignTypeEnum;
	canSell$: Observable<boolean>;
	canDesign$: Observable<boolean>;
	canAddIncentive$: Observable<boolean>;
	canLockSalesAgreement$: Observable<boolean>;
	canCancelSalesAgreement$: Observable<boolean>;

	constructor(
		private store: Store<fromRoot.State>,
		private modalService: ModalService,
		private contractService: ContractService,
		private cdr: ChangeDetectorRef,
		private _router: Router,
		private _activatedRoute: ActivatedRoute,
		private _location: Location,
		private elRef: ElementRef,
		private renderer: Renderer2,
		private _actions$: Actions
	)
	{
		super();
	}

	get subTitle(): string
	{
		return this.isChangingOrder ? '' : `Congratulations! The process is almost complete. With just a little more information we'll have an Agreement ready for you to sign soon.`;
	}

	public onToggleCollapse(event): void
	{
		let startClass = '';
		let endClass = '';

		if (event.override && !event.isCollapsed)
		{
			return;
		}
		else if (event.isCollapsed)
		{
			startClass = 'phd-collapsed';
			endClass = 'phd-expanded';
		}
		else
		{
			startClass = 'phd-expanded';
			endClass = 'phd-collapsed';
		}

		const contents: any[] = this.elRef.nativeElement.querySelectorAll('.' + startClass);

		Array.from(contents).forEach(content =>
		{
			this.renderer.removeClass(content, startClass);
			this.renderer.addClass(content, endClass);
		});
	}

	ngOnInit()
	{
		this.salesAgreement$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement),
			map((sa: SalesAgreement) =>
			{
				this.salesAgreement = sa;

				return this.salesAgreement;
			})
		);

		this._activatedRoute.queryParamMap.pipe(
			this.takeUntilDestroyed(),
			distinctUntilChanged(),
			map(params =>
			{
				return { envelopeId: params.get('envelopeId'), event: params.get('event') };
			})
		).subscribe(params =>
		{
			// returning from DocuSign check for parameters
			if (params.envelopeId && params.envelopeId.length > 0)
			{
				if (params.event && params.event == 'Send')
				{
					// document was sent update sales agreement
					this.setOutForSignature();
				}
				else if (params.event && params.event.length > 0)
				{
					// remove parameters from url
					this._location.replaceState(this._location.path().split('?')[0], '');
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder)
		).subscribe(changeOrder =>
		{
			this.isChangingOrder = changeOrder.isChangingOrder;
		});

		// set envelopeID
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.contract)
		).subscribe(contract =>
		{
			this.selectedAgreementType = contract.selectedAgreementType;

			this.envelopeId = this.selectedAgreementType === ESignTypeEnum.TerminationAgreement ? contract.terminationEnvelopeId : contract.envelopeId;
		});

		this.priceBreakdown$ = this.store.pipe(
			select(fromRoot.priceBreakdown)
		);

		this.isSalesInfoComplete$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement),
			map(sa =>
			{
				let isSalesInfoComplete = true;

				if (sa.status == 'Pending')
				{
					isSalesInfoComplete = this.isComplete(sa.notes, sa.isNoteNa) && this.isComplete(sa.programs, sa.isProgramNa) && this.isComplete(sa.contingencies, sa.isContingenciesNa) && this.isComplete(sa.lenderType) && this.isComplete(sa.propertyType) && this.isComplete(sa.deposits);
				}

				return isSalesInfoComplete;
			})
		);

		this.isElevationColorSchemeComplete$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.isComplete),
			map(isComplete =>
			{
				return isComplete ? PointStatus.COMPLETED : PointStatus.REQUIRED;
			})
		);

		this.isPeopleComplete$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement),
			combineLatest(this.store.select(fromRoot.isActivePrimaryBuyerComplete), this.store.select(fromRoot.activeCoBuyers)),
			map(([sa, buyerComplete, coBuyers]) =>
			{
				let isPeopleComplete = true;

				if (sa.status === 'Pending')
				{
					isPeopleComplete = buyerComplete && this.isComplete(sa.realtors, sa.isRealtorNa) && this.isComplete(sa.trustName, sa.isTrustNa) && this.isComplete(coBuyers, sa.isCoBuyerNa);
				}

				return isPeopleComplete;
			}));

		this.isAgreementInfoViewed$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement),
			map(sa =>
			{
				let isInfoViewed = true;

				if (sa.status == 'Pending')
				{
					isInfoViewed = sa.isAgreementInfoViewed;
				}

				return isInfoViewed;
			})
		);

		this.salesAgreementActionBarStatus$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.contract),
			combineLatest(this.isSalesInfoComplete$, this.isPeopleComplete$, this.isAgreementInfoViewed$, this.isElevationColorSchemeComplete$),
			map(([contract, isSalesInfoComplete, isPeopleComplete, isAgreementInfoViewed, isElevationColorSchemeComplete]) =>
			{
				let status: ActionBarStatusType = 'INCOMPLETE';
				const selectedTemplates = contract.selectedTemplates;

				if ((selectedTemplates && selectedTemplates.length) && contract.selectedAgreementType !== ESignTypeEnum.TerminationAgreement && isPeopleComplete && isSalesInfoComplete && isAgreementInfoViewed && isElevationColorSchemeComplete)
				{
					status = 'COMPLETE';
				}

				return status;
			})
		);

		this.salesChangeOrderActionBarStatus$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder),
			map(changeOrder =>
			{
				return changeOrder.changeInput && changeOrder.changeInput.isDirty ? "COMPLETE" : "INCOMPLETE";
			})
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.contract.envelopeId),
			filter(envelopeId => !!envelopeId),
			switchMap(envelopeId => this.waitingForPdf ? this.contractService.downloadEnvelope(envelopeId) : of(null))
		).subscribe(pdfObjectUrl =>
		{
			if (!!pdfObjectUrl && this.waitingForPdf)
			{
				this.waitingForPdf = false;

				this.openPdfViewer(pdfObjectUrl);
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.contract.terminationEnvelopeId),
			filter(envelopeId => !!envelopeId),
			switchMap(envelopeId => this.waitingForPdf ? this.contractService.downloadEnvelope(envelopeId) : of(null))
		).subscribe(pdfObjectUrl =>
		{
			if (!!pdfObjectUrl && this.waitingForPdf)
			{
				this.waitingForPdf = false;
				this.showPricingLockText = false;

				this.openPdfViewer(pdfObjectUrl);
			}
		});

		this.salesAgreementConsultants$ = this.store.pipe(
			select(state => state.salesAgreement.consultants),
			select(consultants => consultants)
		);

		this.canSell$ = this.store.pipe(select(fromRoot.canSell));
		this.canDesign$ = this.store.pipe(select(fromRoot.canDesign));
		this.canAddIncentive$ = this.store.pipe(select(fromRoot.canAddIncentive));
		this.canLockSalesAgreement$ = this.store.pipe(select(fromRoot.canLockSalesAgreement));
		this.canCancelSalesAgreement$ = this.store.pipe(select(fromRoot.canCancelSalesAgreement));
	}

	isComplete(list: any, isNa: boolean = false)
	{
		isNa = isNa === null ? false : isNa;

		return list && list.length > 0 || isNa;
	}

	ngAfterViewInit()
	{
		// this is used to renderer the carousel changes
		this.cdr.detectChanges();
	}

	onCallToAction($event: { actionBarCallType: ActionBarCallType })
	{
		switch ($event.actionBarCallType)
		{
			case (ActionBarCallType.PRIMARY_CALL_TO_ACTION):
				this.generateHPA();

				break;
			case (ActionBarCallType.SIGN_AGREEMENT):
				this.signAgreement();

				break;
			case (ActionBarCallType.APPROVE_AGREEMENT):
				this.approveAgreement();

				break;
			case (ActionBarCallType.PREVIEW_AGREEMENT):
				this.generateHPA(undefined, true);

				this.showPDFViewerFooter = this.salesAgreement.status !== 'Pending';
				this.showPricingLockText = false;

				break;
			case (ActionBarCallType.CANCEL_AGREEMENT):
				this.cancelAgreement();

				break;
			case (ActionBarCallType.TERMINATION_AGREEMENT):
				this.terminateAgreement();

				this._actions$.pipe(
					ofType<SalesAgreementActions.SalesAgreementTerminated>(SalesAgreementActions.SalesAgreementActionTypes.SalesAgreementTerminated),
					take(1)).subscribe(() =>
					{
						this.generateHPA(ESignTypeEnum.TerminationAgreement);
					});

				break;

			case (ActionBarCallType.VOID_AGREEMENT):
				this.voidAgreement();

				break;
			case (ActionBarCallType.TOGGLE_AGREEMENT_LOCK):
				this.toggleAgreementLock();

				break;
		}
	}

	closeModal()
	{
		this.modalReference.close();
	}

	envelopeSent()
	{
		this.setOutForSignature();
		this.closeModal();
	}

	eSign()
	{
		// close PDF before opening a new modal
		this.cancel();

		this.modalReference = this.modalService.open(this.content, { size: 'lg', windowClass: 'phd-distribution-list', keyboard: false });
	}

	print()
	{
		this.pdfViewer.componentInstance.printPdf();
	}

	cancel()
	{
		this.pdfViewer.dismiss();
		this.showPDFViewerFooter = true;
		this.showPricingLockText = true;
	}

	private openPdfViewer(pdfObjectUrl)
	{
		this.pdfViewer = this.modalService.open(PDFViewerComponent, { backdrop: 'static', windowClass: 'phd-pdf-modal', size: 'lg' });

		this.pdfViewer.componentInstance.pdfModalTitle = 'Home Purchase Agreement';
		this.pdfViewer.componentInstance.pdfData = pdfObjectUrl;
		this.pdfViewer.componentInstance.footerTemplate = this.pdfViewerFooterTemplate;

		this.pdfViewer.componentInstance.onAfterClose.subscribe(() =>
		{
			this.showPDFViewerFooter = true;
			this.showPricingLockText = true;
		});

		this.pdfViewer.componentInstance.onAfterPrint.subscribe(() =>
		{
			this.pdfViewer.close();

			setTimeout(() => this.setOutForSignature(true), 100); // pass in true to distinguish this as a wet signature instead of docusign
		});
	}

	private async generateHPA(eSignTypeId: ESignTypeEnum = ESignTypeEnum.SalesAgreement, isPreview: boolean = false)
	{
		this.waitingForPdf = true;

		if (eSignTypeId === ESignTypeEnum.TerminationAgreement)
		{
			this.store.dispatch(new ContractActions.CreateTerminationEnvelope());
		}
		else
		{
			this.store.dispatch(new ContractActions.CreateEnvelope(isPreview));
		}
	}

	private async signAgreement()
	{
		const signedDate = await this.showSignAgreementModal();

		if (signedDate)
		{
			// dispatch action to set agreement to signed
			this.store.dispatch(new SalesAgreementActions.SignSalesAgreement(signedDate));
		}
	}

	async approveAgreement()
	{
		const confirmMessage: string = 'Design Tool will now approve this Home Purchase Agreement.  Do you wish to  continue?';
		const confirmTitle: string = 'Approve Home Purchase Agreement';
		const confirmDefaultOption: string = 'Cancel';

		if (await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption))
		{
			this.store.dispatch(new SalesAgreementActions.ApproveSalesAgreement());
		}
	}

	private setOutForSignature(isWetSign = false)
	{
		if (this.selectedAgreementType !== ESignTypeEnum.TerminationAgreement && this.salesAgreement.status === 'Pending')
		{
			// dispatch action to:
			// - set Agreement Status to Out for Signature
			// - set JIO Sales Status to Out for Signature
			this.store.dispatch(new SalesAgreementActions.SalesAgreementOutForSignature(isWetSign));
		}
	}

	private async showSignAgreementModal(): Promise<Date>
	{
		const modal = this.modalService.open(SignAgreementComponent, { size: "sm", windowClass: "phd-modal-window" });

		// modal promise will return signed date
		// modal promise will return undefined if cancel button is clicked
		// modal promise will reject when escape key is pressed or X is clicked and return undefined
		return modal.result.then(signedDate => signedDate, rejectedReason => undefined);
	}

	async cancelAgreement()
	{
		this.displaySaveAndView = false;

		const confirmMessage: string = 'You have opted to cancel this Home Purchase Agreement. Confirming to do so will result in the loss of this agreement and corresponding home configuration, and the Homesite will become available for others to select.<br><br>Do you wish to proceed with the cancellation?';
		const confirmTitle: string = 'Cancel Agreement';
		const confirmDefaultOption: string = 'Cancel';
		const primaryButton = { hide: false, text: 'Yes' };
		const secondaryButton = { hide: false, text: 'No' };

		if (await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption, primaryButton, secondaryButton))
		{
			this.modalReference = this.modalService.open(this.cancelAgreementTemplate, { windowClass: 'phd-cancel-agreement', keyboard: false });
		}
	}

	async terminateAgreement()
	{
		this.displaySaveAndView = true;

		const confirmMessage: string = 'You have opted to terminate this Home Purchase Agreement. <br><br>Do you wish to proceed with the termination?';
		const confirmTitle: string = 'Termination Agreement';
		const confirmDefaultOption: string = 'Cancel';
		const primaryButton = { hide: false, text: 'Yes' };
		const secondaryButton = { hide: false, text: 'No' };

		if (await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption, primaryButton, secondaryButton))
		{
			this.modalReference = this.modalService.open(this.cancelAgreementTemplate, { windowClass: 'phd-cancel-agreement', keyboard: false });
		}
	}

	async voidAgreement() 
	{
		const confirmMessage: string = 'You are about to Void an agreement. Do you wish to continue?';
		const confirmTitle: string = 'Void Home Purchase Agreement';
		const confirmDefaultOption: string = 'Cancel';
		const primaryButton = { hide: false, text: 'Continue' };
		const secondaryButton = { hide: false, text: 'Cancel' };

		if (await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption, primaryButton, secondaryButton)) 
		{
			this.modalReference = this.modalService.open(this.voidAgreementTemplate, { windowClass: 'phd-cancel-agreement', keyboard: false });
		}
	}

	async toggleAgreementLock()
	{
		const isLockedIn = this.salesAgreement.isLockedIn;
		let lockText = isLockedIn ? 'Unlock' : 'Lock';

		const confirmMessage: string = `Are you sure you want to ${lockText} Sales Agreement?`;
		const confirmTitle: string = 'Home Purchase Agreement';
		const confirmDefaultOption: string = 'Cancel';

		if (await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption))
		{
			const agreement: SalesAgreement = new SalesAgreement(
				{
					id: this.salesAgreement.id,
					isLockedIn: !this.salesAgreement.isLockedIn
				}
			);

			this.store.dispatch(new SalesAgreementActions.UpdateSalesAgreement(agreement));
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

	onShowSalesConsultants()
	{
		this.modalReference = this.modalService.open(this.salesConsultant, { size: 'lg', windowClass: 'phd-sales-consultants', keyboard: false });
	}

	onViewAgreementInfo(event: any)
	{
		this.store.dispatch(new SalesAgreementActions.SalesAgreementInfoViewed());
	}

	saveChangeNote(event)
	{
		let options = [];
		let saving = false;

		this.store.pipe(select(state => state.changeOrder.currentChangeOrder))
			.subscribe(changeOrder =>
			{
				if (!saving)
				{
					saving = true;
					options = changeOrder.jobChangeOrders.find(t => t.jobChangeOrderTypeDescription === 'NonStandard').jobChangeOrderNonStandardOptions;

					this.store.dispatch(new ChangeOrderActions.CreateNonStandardChangeOrder(options));

					this._router.navigateByUrl('/change-orders');
				}
			});
	}
}
