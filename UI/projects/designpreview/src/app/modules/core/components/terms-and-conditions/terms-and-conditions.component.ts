import { Component, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';

import { ModalContent } from 'phd-common';

import * as fromRoot from '../../../../modules/ngrx-store/reducers';
import * as AppActions from '../../../ngrx-store/app/actions';
import { BuildMode } from '../../../shared/models/build-mode.model';

@Component({
	selector: 'lib-terms-and-conditions',
	templateUrl: './terms-and-conditions.component.html',
	styleUrls: ['./terms-and-conditions.component.scss']
})
export class TermsAndConditionsComponent extends ModalContent implements OnInit 
{
	isPresale: boolean = false;

	constructor(private store: Store<fromRoot.State>)
	{
		super();
	}

	get headerText(): string 
	{
		return this.isPresale ? 'Welcome and we hope you enjoy personalizing your future home!' : 'Welcome!'  
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario),
		).subscribe((state) => 
		{
			if (state.buildMode === BuildMode.Presale) 
			{
				this.isPresale = true;
			}
			else 
			{
				this.isPresale = false;
			}
		});
	}

	close(result?: any)
	{
		if (result === 'Got It') 
		{
			this.store.dispatch(new AppActions.AcknowledgeTermsAndConditions(true));
		}
		this.store.dispatch(new AppActions.ShowTermsAndConditionsModal(false));
		this.modalRef.close(result);
	}
}
