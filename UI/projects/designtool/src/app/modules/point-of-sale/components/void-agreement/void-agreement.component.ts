import { Component, EventEmitter, Output } from '@angular/core';
import { Store } from '@ngrx/store';

import { UnsubscribeOnDestroy, SalesAgreementVoidReason } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as SalesAgreementActions from '../../../ngrx-store/sales-agreement/actions';

@Component({
	selector: 'void-agreement',
	templateUrl: './void-agreement.component.html',
	styleUrls: ['./void-agreement.component.scss']
})
export class VoidAgreementComponent extends UnsubscribeOnDestroy
{
	@Output() close = new EventEmitter<void>();

	salesAgreementVoidReason = SalesAgreementVoidReason;
	voidReason: string = null;

	constructor(private store: Store<fromRoot.State>)
	{
		super();
	}

	voidAgreement()
	{
		let reasonKey = Object.keys(SalesAgreementVoidReason).find(key => this.salesAgreementVoidReason[key] == this.voidReason);
		this.store.dispatch(new SalesAgreementActions.VoidSalesAgreement(reasonKey));

		this.closeClicked();
	}

	closeClicked()
	{
		this.close.emit();
	}

	cancel()
	{
		this.closeClicked();
	}
}
