import { Component, OnInit } from '@angular/core';
import * as fromRoot from '../../../ngrx-store/reducers';
import { Store, select } from '@ngrx/store';
import { map } from 'rxjs/operators';

@Component({
	selector: 'site-menu',
	templateUrl: 'site-menu.component.html',
	styleUrls: ['site-menu.component.scss']
})

export class SiteMenuComponent implements OnInit
{
	siteMenuIsOpen = false;
	salesAgreementId: number;

	constructor(private store: Store<fromRoot.State>) { }

	ngOnInit()
	{
		this.store.pipe(
			select(state => state.salesAgreement),
			map(salesAgreement => salesAgreement ? salesAgreement.id : null)
		).subscribe(data =>
		{
			this.salesAgreementId = data;
		});
	}

	toggleSiteMenuState()
	{
		this.siteMenuIsOpen = !this.siteMenuIsOpen;
	}
}
