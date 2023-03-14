import { Component, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';

import { ModalContent } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as AppActions from '../../../ngrx-store/app/actions';
import { BuildMode } from '../../../shared/models/build-mode.model';

@Component({
	selector: 'welcome-modal',
	templateUrl: './welcome-modal.component.html',
	styleUrls: ['./welcome-modal.component.scss']
})
export class WelcomeModalComponent extends ModalContent implements OnInit 
{
	isPresale: boolean = false;

	constructor(private store: Store<fromRoot.State>)
	{
		super();
	}

	get headerText(): string 
	{
		return this.isPresale ? 'Welcome and we hope you enjoy personalizing your future home!'
			: 'Welcome and we hope you enjoy personalizing your home!'
	}

	get subTextOne(): string
	{
		return this.isPresale ? 'Explore our collection of included features and upgrade options available for this home and collect your Favorites.'
			: 'Explore our collection of included features and upgrade options available for your home and collect your Favorites.';
	}

	get subTextTwo(): string
	{
		return 'Reach out to your Sales Consultant to discuss your options and learn more.';
	}

	get messageDisclaimer(): string
	{
		return this.isPresale ? 'Options are subject to change until purchased via a signed agreement.'
			: 'Options are subject to change until purchased. You may change your Favorites at any time prior to purchasing them via a signed agreement.'
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

	close(result?: string)
	{
		if (result === 'Got It') 
		{
			this.store.dispatch(new AppActions.AcknowledgeWelcome(true));
		}
		this.store.dispatch(new AppActions.ShowWelcomeModal(false));
		this.modalRef.close(result);
	}
}
