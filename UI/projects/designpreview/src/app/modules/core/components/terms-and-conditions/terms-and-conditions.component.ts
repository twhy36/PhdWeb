import { Component } from '@angular/core';
import { Store } from '@ngrx/store';

import { ModalContent } from 'phd-common';

import * as fromRoot from '../../../../modules/ngrx-store/reducers';
import * as AppActions from '../../../ngrx-store/app/actions';

@Component({
	selector: 'lib-terms-and-conditions',
	templateUrl: './terms-and-conditions.component.html',
	styleUrls: ['./terms-and-conditions.component.scss']
})
export class TermsAndConditionsComponent extends ModalContent {

	constructor(private store: Store<fromRoot.State>)
	{
		super();
	}

	close(result?: any)
	{
		if (result === 'Got It') {
			this.store.dispatch(new AppActions.AcknowledgeTermsAndConditions(true));
		}
		this.store.dispatch(new AppActions.ShowTermsAndConditionsModal(false));
		this.modalRef.close(result);
	}
}
