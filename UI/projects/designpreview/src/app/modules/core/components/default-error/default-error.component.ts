import { Component, OnInit } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Router } from '@angular/router';

import { UnsubscribeOnDestroy } from 'phd-common';
import { BrandService } from '../../../core/services/brand.service';

import * as fromApp from '../../../ngrx-store/app/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';
import { ErrorFrom, PageNotFound } from '../../../ngrx-store/error.action';
import { DesignPreviewError } from '../../../shared/models/error.model';

@Component({
	selector: 'default-error',
	templateUrl: './default-error.component.html',
	styleUrls: ['./default-error.component.scss']
})
export class DefaultErrorComponent extends UnsubscribeOnDestroy implements OnInit
{

	internalMessage = '';
	showInternalMessage = true;
	errMessage = 'We had an issue attempting to load the page. Please try again later.';
	isLoadPresaleInactiveNoPublish = false;
	defaultUrl = 'https://www.pulte.com';

	constructor(
		private store: Store<fromRoot.State>,
		private brandService: BrandService,
		private router: Router)
	{
		super();
	}

	ngOnInit(): void
	{
		//check error source, default to page not found when no error saved to store
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromApp.getAppLatestError)
		).subscribe(latestError =>
		{
			if (!latestError) 
			{
				this.store.dispatch(new PageNotFound(new Error('page not found for: ' + this.router.url), 'Page not found, please try again.', ErrorFrom.PageNotFound));
			}
			else 
			{
				//display different error for presale inactive or no published tree 
				this.isLoadPresaleInactiveNoPublish = (<DesignPreviewError>latestError).occuredFrom === ErrorFrom.LoadPresaleInactive || (<DesignPreviewError>latestError).occuredFrom === ErrorFrom.LoadPresaleNoPubleshed;

				if (this.isLoadPresaleInactiveNoPublish)
				{
					this.errMessage = latestError.friendlyMessage;
					this.defaultUrl = this.brandService.getBrandHomeUrl();
				}

				this.internalMessage = JSON.stringify(latestError);
			}
		});
	}

	getImageSrc()
	{
		return this.brandService.getBrandImage('logo');
	}

	hideInternalMessage()
	{
		this.showInternalMessage = false;
	}
}
