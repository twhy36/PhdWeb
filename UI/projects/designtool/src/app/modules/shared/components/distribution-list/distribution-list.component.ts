import { Component, OnInit, EventEmitter, Output, Inject, Input, HostListener } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';

import { combineLatest, take, switchMap, finalize } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';

import { UnsubscribeOnDestroy, flipOver, Contact } from 'phd-common';
import * as fromRoot from '../../../ngrx-store/reducers';

import { ContractService } from '../../../core/services/contract.service';

import { ESignRecipient, ESignRecipientRoles, IESignRecipient } from '../../models/contract.model';
import { ToastrService } from 'ngx-toastr';

@Component({
	selector: 'distribution-list',
	templateUrl: './distribution-list.component.html',
	styleUrls: ['./distribution-list.component.scss'],
	animations: [flipOver]
})
export class DistributionListComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Output() close = new EventEmitter<void>();
	@Output() onEnvelopeSent = new EventEmitter<boolean>();
	@Output() onEnvelopeCancel = new EventEmitter<string>();
	@Input() currentEnvelopeID: any;

	distributionList: DistributionListItem[] = [];
	recipients: IESignRecipient[] = [];

	distributionForm: FormGroup;
	salesAgreementId: number;
	financialCommunityId: number;

	isLoading: boolean = false;
	isSending: boolean = false;
	isEditBefore: boolean = false;
	docusignWindow: Window = null;

	constructor(private store: Store<fromRoot.State>, private _contractService: ContractService, private _router: Router, @Inject(APP_BASE_HREF) private _baseHref: string, private _toastrService: ToastrService)
	{
		super();
	}

	get canContinue(): boolean
	{
		return !this.distributionForm.valid;
	}

	get disableButtons()
	{
		return this.canContinue || this.disableCancel || this.isLoading
			|| (this.docusignWindow && !this.docusignWindow.closed);
	}

	get disableCancel()
	{
		return this.isSending || this.isEditBefore;
	}

	ngOnInit()
	{
		this.distributionForm = new FormGroup({});

		this.store.pipe(
			select(store => store.job.financialCommunityId),
			switchMap(financialCommunityId =>
			{
				this.isLoading = true;

				return this._contractService.getFinancialCommunityESign(financialCommunityId);
			}),
			combineLatest(
				this.store.pipe(select(fromRoot.activePrimaryBuyer)),
				this.store.pipe(select(fromRoot.activeCoBuyers)),
				this.store.pipe(select(store => store.salesAgreement)),
				this.store.pipe(select(store => store.job.financialCommunityId))
			),
			take(1)
		).subscribe(([eSign, primaryBuyer, coBuyers, sa, financialCommunityId]) =>
		{
			this.isLoading = false;
			this.salesAgreementId = sa.id;
			this.financialCommunityId = financialCommunityId;

			if (sa.isTrustNa)
			{
				if (primaryBuyer)
				{
					this.addToList(primaryBuyer.opportunityContactAssoc.contact, ESignRecipientRoles.buyer, 'Buyer');
				}
			}
			else
			{
				const dListItem = new DistributionListItem(this.distributionList.length);
				const contact = primaryBuyer ? primaryBuyer.opportunityContactAssoc.contact : null;
				const emailAssoc = contact ? contact.emailAssocs.find(e => e.isPrimary == true) : null;

				dListItem.id = sa.id;
				dListItem.email = emailAssoc ? emailAssoc.email.emailAddress : '';
				dListItem.name = sa.trustName ? sa.trustName : `${contact.firstName}${contact.middleName ? ' ' + contact.middleName : ''}${contact.lastName ? ' ' + contact.lastName : ''}`;
				dListItem.role = ESignRecipientRoles.buyer;
				dListItem.label = 'Buyer';

				this.addControl(dListItem);

				this.distributionList.push(dListItem);
			}

			if (coBuyers && coBuyers.length)
			{
				coBuyers.forEach(cb => this.addToList(cb.opportunityContactAssoc.contact, ESignRecipientRoles.cobuyer, 'Cobuyer'));
			}

			if (sa.realtors && sa.realtors.length)
			{
				this.addToList(sa.realtors[0].contact, ESignRecipientRoles.realEstateAgent, 'Real Estate Agent');
			}

			if (sa.consultants)
			{
				sa.consultants.forEach(c => this.addToList(c.contact, ESignRecipientRoles.salesConsultant, 'Sales Consultant'));
			}

			if (eSign)
			{
				const dListItem = new DistributionListItem(this.distributionList.length);

				dListItem.id = eSign.id;
				dListItem.email = eSign.agentEmail;
				dListItem.name = eSign.agentFullName;
				dListItem.role = ESignRecipientRoles.authorizedAgent;
				dListItem.label = 'Authorized Agent';

				this.addControl(dListItem);

				this.distributionList.push(dListItem);

				// Add carbon copy recipients
				var splitRecipients = eSign.defaultEmailForSignedCopies.split(';');

				let carbonCopyRecipientID = 11;

				splitRecipients.forEach(splitRecipient =>
				{
					if (splitRecipient)
					{
						let recipientObj = {} as IESignRecipient;

						recipientObj.id = carbonCopyRecipientID++;
						recipientObj.email = splitRecipient;
						recipientObj.name = "Default Copy";
						recipientObj.role = ESignRecipientRoles.carbonCopyRecipient.toString();

						this.recipients.push(recipientObj);
					}
				});
			}
		});
	}

	addToList(contact: Contact, role: ESignRecipientRoles, label: string)
	{
		const dListItem = new DistributionListItem(this.distributionList.length);

		const emailAssoc = contact.emailAssocs ? contact.emailAssocs.find(e => e.isPrimary == true) : null;

		dListItem.id = contact.id;
		dListItem.role = role;
		dListItem.name = `${contact.firstName}${contact.middleName ? ' ' + contact.middleName : ''}${contact.lastName ? ' ' + contact.lastName : ''}`;
		dListItem.email = emailAssoc ? emailAssoc.email.emailAddress : '';
		dListItem.label = label;

		this.addControl(dListItem);

		this.distributionList.push(dListItem);
	}

	addControl(item: DistributionListItem)
	{
		const pattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{1,61}$/;

		this.distributionForm.addControl(item.emailFormKey, new FormControl(item.email, [Validators.required, Validators.email, Validators.pattern(pattern), Validators.maxLength(250)]));
		this.distributionForm.addControl(item.nameFormKey, new FormControl(item.name, [Validators.required]));
	}

	closeClicked()
	{
		this.close.emit();
	}

	cancel()
	{
		this.closeClicked();
	}

	edit()
	{
		this.isEditBefore = true;

		let recipients = this.getRecipients();

		let returnUrl = `${window.location.origin}${this._baseHref}docusign_response.html`;

		this.store.pipe(
			select(state => state.contract.selectedAgreementType),
			take(1),
			switchMap(eSignType => this._contractService.sendEnvelope(this.salesAgreementId, this.currentEnvelopeID, returnUrl, recipients, this.financialCommunityId, eSignType, true)),
			finalize(() => this.isEditBefore = false)
		)
			.subscribe(url =>
			{
				// This will set the agreement and/or change order to Out For Signature
				this.onEnvelopeSent.emit(false);

				if (typeof window !== 'undefined') {
					this.docusignWindow = window.open(url, '_blank');
				} else {
					//this would only happen if this code isn't running in a browser
					this.closeClicked();
				}
			},
			error =>
			{
				this._toastrService.error("Error sending envelope!");
			});
	}

	@HostListener('window:message', ['$event'])
	onDocusignResponse(event: any) {
		if (event.data && event.data.sent) {
			this.onEnvelopeSent.emit(true);
			this.docusignWindow.close();
		} else if (event.data && event.data.closed) {
			if (event.data.cancel && event.data.queryString)
			{
				const urlParams = new URLSearchParams(event.data.queryString);
				const envelopeId = urlParams.get('envelopeId');
				this.onEnvelopeCancel.emit(envelopeId);
			}
			this.closeClicked();
			this.docusignWindow.close();
		}
	}

	sendNow()
	{
		this.isSending = true;

		let recipients = this.getRecipients();

		this.store.pipe(
			select(state => state.contract.selectedAgreementType),
			take(1),
			switchMap(eSignType => this._contractService.sendEnvelope(this.salesAgreementId, this.currentEnvelopeID, null, recipients, this.financialCommunityId, eSignType)),
			finalize(() => this.isSending = false)
		)
			.subscribe(() =>
			{
				this.onEnvelopeSent.emit(true);
			},
			error =>
			{
				this._toastrService.error("Error sending envelope!");
			});
	}

	getRecipients(): IESignRecipient[]
	{
		this.distributionList.map(item =>
		{
			item.email = this.distributionForm.controls[item.emailFormKey].value;
		});

		this.distributionList.forEach(item =>
		{
			let recipient = {
				id: item.id,
				email: item.email,
				name: item.name,
				role: item.role.toString()
			} as IESignRecipient

			this.recipients.push(recipient);
		});

		return this.recipients;
	}

	getPlaceholder(label: string)
	{
		return label == 'Authorized Agent' ? 'Setup required in Sales Admin' : '';
	}
}

class DistributionListItem extends ESignRecipient
{
	nameFormKey: string;
	emailFormKey: string;
	label: string;

	constructor(listLength: number)
	{
		super();

		this.nameFormKey = `name_${listLength + 1}`;
		this.emailFormKey = `email_${listLength + 1}`;
	}
}
