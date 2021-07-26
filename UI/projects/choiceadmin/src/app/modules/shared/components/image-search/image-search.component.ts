import { Component, Input, Output, EventEmitter, HostListener, Inject } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';

import { throwError as _throw } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';

import { SettingsService } from '../../../core/services/settings.service';
import { ImageService } from '../../../core/services/image.service';

import { MessageService } from 'primeng/api';

import { IPictureParkAsset } from '../../models/image.model';
import { Settings } from '../../models/settings.model';

const settings: Settings = new SettingsService().getSettings();

@Component({
	selector: 'image-search',
	templateUrl: './image-search.component.html',
	styleUrls: ['./image-search.component.scss']
})
export class ImageSearchComponent
{
	@Input() isSaving: boolean;
	@Input() buttonText: string = 'Search';
	@Input() buttonClass: string = 'btn btn-secondary btn-sm';

	@Output() getImages = new EventEmitter<IPictureParkAsset[]>();

	@HostListener('window:message', ['$event'])
	onAssetsSelected(event: any)
	{
		if (event.data && event.data.assets)
		{
			let assets = event.data ? JSON.parse(event.data.assets) : null;

			this.ppWin.close();

			this.getAssetData(assets);
		}
	}

	private ppWin: any;
	disableSearchBtn: boolean = false;

	constructor(private _imageService: ImageService, private _msgService: MessageService, @Inject(APP_BASE_HREF) private baseHref: string) { }

	getAssetData(assets: any)
	{
		if (assets != null)
		{
			this.disableSearchBtn = true;
			this.loadingDataMessage({ severity: 'info', message: 'Getting image data from Picture Park.' });

			let ppAssets = assets.map(asset =>
			{
				return {
					assetId: asset.AssetId,
					derivativeDefinitionId: asset.DerivativeDefinitionId
				} as IPictureParkAsset;
			});

			this._imageService.getAssets(ppAssets).pipe(
				finalize(() => { this.disableSearchBtn = false; }),
				catchError(error =>
				{
					this.loadingDataMessage({ severity: 'error', message: 'There was an issue returning data from Picture Park.' });

					return _throw(error);
				})
			).subscribe(assets =>
			{
				if (assets)
				{
					this.loadingDataMessage({ severity: 'info', message: 'Picture Park data loaded.' });

					this.getImages.emit(assets);
				}
				else
				{
					this.loadingDataMessage({ severity: 'error', message: 'Unable to get images from Picture Park.' });
				}
			});
		}
	}

	loadingDataMessage(params: { severity: string, message: string })
	{
		this._msgService.add({
			severity: params.severity,
			summary: params.message
		});
	}

	onSearchClick()
	{
		this.disableSearchBtn = true;
		const redirectUrl = `${window.location.origin}${this.baseHref}picturepark-response.html`;

		this._imageService.getPictureParkToken()
			.pipe(finalize(() => this.disableSearchBtn = false))
			.subscribe(token =>
			{
				this.ppWin = window.open(`${settings.pictureParkAssetUrl}&SecToken=${token}&redirect=${redirectUrl}`, 'ppWin', 'toolbar=0, location=0, menubar=0, height=600, width=800');
			}, error =>
			{
				this.loadingDataMessage({ severity: 'error', message: 'Could not authenticate you with Picture Park.' });

				return _throw(error);
			});
	}
}
