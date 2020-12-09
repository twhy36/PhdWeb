import { Component, OnInit, Renderer2, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromLot from '../../../ngrx-store/lot/reducer';
import { environment } from '../../../../../environments/environment';

import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';
import { convertDateToUtcString } from "../../../shared/classes/date-utils.class";
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
	selector: 'pos-header',
	templateUrl: './pos-header.component.html',
	styleUrls: ['./pos-header.component.scss']
})

export class PosHeaderComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild('toggleArrow') toggleArrow: ElementRef;

	@Output() toggleCollapse = new EventEmitter();
	@Output() showSalesConsultants = new EventEmitter();

	salesAgreementNumber$: Observable<string>;
	salesAgreementConsultants$: Observable<any>;

	salesAgreementStatus: string;
	salesAgreementStatusDate: Date;
	salesAgreementSignedDate: Date;
	salesAgreementApprovedDate: Date;
	salesAgreementClosedDate: Date;

	showAgreement: boolean = true;

	isLockedIn: boolean = false;

	get showDate(): boolean
	{
		const statuses = ['Void', 'OutForSignature', 'Cancel', 'Signed', 'Approved', 'Closed'];

		return !!statuses.some(s => s === this.salesAgreementStatus);
	}

	get statusDate(): string
	{
		let date = this.salesAgreementStatusDate;

		switch (this.salesAgreementStatus)
		{
			case 'Signed':
				date = this.salesAgreementSignedDate;
				break;
			case 'Approved':
				date = this.salesAgreementApprovedDate;
				break;
			case 'Closed':
				date = this.salesAgreementClosedDate;
				break;
		}

		return convertDateToUtcString(date);
	}

	get showEBill(): boolean
	{
		return this.router.url === '/point-of-sale/sales-info' && this.salesAgreementStatus !== 'Void';
	}

	get eBillUrl(): string
	{
		return environment.EBillUrl;
	}

	constructor(private store: Store<fromRoot.State>, private router: Router, private renderer: Renderer2)
	{
		super();
	}

	ngOnInit()
	{
		this.salesAgreementNumber$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.salesAgreementNumber)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.isLockedIn)
		).subscribe(isLockedIn => this.isLockedIn = isLockedIn);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.status),
			map(status => status === 'OutforSignature' ? 'OutForSignature' : status)
		).subscribe(status => this.salesAgreementStatus = status);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.statusUtcDate)
		).subscribe(date => this.salesAgreementStatusDate = date);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.signedDate)
		).subscribe(date => this.salesAgreementSignedDate = date);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.approvedDate)
		).subscribe(date => this.salesAgreementApprovedDate = date);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromLot.selectSelectedLot)
		).subscribe(lot => this.salesAgreementClosedDate = lot && lot.closeOfEscrow ? lot.closeOfEscrow : null);

		this.salesAgreementConsultants$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.consultants),
			map(consultants =>
			{
				let consultantName = 'N/A';

				if (consultants && consultants.length)
				{
					let primary = consultants.find(x => x.isPrimary == true);
					let consultant = primary ? primary : consultants[0];

					consultantName = `${consultant.contact.firstName} ${consultant.contact.lastName}`;
				}

				return { name: consultantName, count: (consultants || []).length };
			})
		);
	}

	onShowConsultants()
	{
		this.showSalesConsultants.emit();
	}

	public agreementSelected(): boolean
	{
		const selected = this.router.url === '/point-of-sale/agreement';

		if (!selected)
		{
			if (!this.toggleArrow)
			{
				return false;
			}

			this.toggleCollapse.emit({ isCollapsed: this.showAgreement, override: true });
		}

		return selected;
	}

	public toggle(event): void
	{
		this.showAgreement = !this.showAgreement;

		this.toggleCollapse.emit({ isCollapsed: this.showAgreement, override: false });
	}
}
