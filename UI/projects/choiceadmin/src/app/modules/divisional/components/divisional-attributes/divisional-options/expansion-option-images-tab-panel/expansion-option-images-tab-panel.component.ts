import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { orderBy } from 'lodash';
import { MessageService } from 'primeng/api';
import { finalize, startWith } from 'rxjs/operators';

import { Permission } from 'phd-common';

import { bind } from '../../../../../shared/classes/decorators.class';
import { ImageUrlToAssetIdPipe } from '../../shared/pipes/image-url-to-asset-id/image-url-to-asset-id.pipe';
import { Option, OptionMarketImage } from '../../../../../shared/models/option.model';
import { IPictureParkAsset } from '../../../../../shared/models/image.model';
import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';

import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';

import { DivisionalOptionService } from '../../../../../core/services/divisional-option.service';
import { ModalService } from '../../../../../core/services/modal.service';
import { OrganizationService } from '../../../../../core/services/organization.service';

@Component({
	selector: 'expansion-option-images-tab-panel',
	templateUrl: './expansion-option-images-tab-panel.component.html',
	styleUrls: ['./expansion-option-images-tab-panel.component.scss']
})
export class ExpansionOptionImagesTabPanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() option: Option;
	@Input() images: Array<OptionMarketImage>;
	@Input() isReadOnly: boolean;

	@Output() save = new EventEmitter<{ option: Option, imgCount: number }>();
	@Output() onDataChange = new EventEmitter();
	@Output() onAssociateToCommunities = new EventEmitter<{ option: Option, images: Array<OptionMarketImage>, callback: () => void }>();

	Permission = Permission;

	selectedImages: Array<OptionMarketImage> = [];
	isSaving: boolean = false;
	originalImages: Array<OptionMarketImage>;
	marketKey: string = '';

	defaultSrc: string = 'assets/pultegroup_logo.jpg';

	get saveDisabled(): boolean
	{
		return !this.selectedImages.length || this.isSaving;
	}

	/**
	 * Whether a specific image is selected.
	 * @param image The image to check.
	 */
	isImageSelected(image: OptionMarketImage): boolean
	{
		return this.selectedImages.some(s => s.id === image.id);
	}

	/**
	 * Handles a selection event on an image.
	 * @param image The OptionMarketImage being clicked.
	 * @param isSelected Whether the image is being selected.
	 */
	setImageSelected(image: OptionMarketImage, isSelected: boolean): void
	{
		const index = this.selectedImages.findIndex(s => s.id === image.id);

		if (isSelected && index < 0)
		{
			this.selectedImages.push(image);

			this.selectedImages = orderBy(this.selectedImages, [img => img.sortKey])
		}
		else if (!isSelected && index >= 0)
		{
			this.selectedImages.splice(index, 1);

			this.selectedImages = [...this.selectedImages];
		}
	}

	constructor(private _divOptService: DivisionalOptionService,
		private _imageUrlToAssetIdPipe: ImageUrlToAssetIdPipe,
		private _modalService: ModalService,
		private _msgService: MessageService,
		private _orgService: OrganizationService)
	{
		super();
	}

	ngOnInit(): void
	{
		this._orgService.currentFinancialMarket$.pipe(
			this.takeUntilDestroyed(),
			startWith(this._orgService.currentFinancialMarket)
		).subscribe(mkt => this.marketKey = mkt);
	}

	onLoadImageError(event: any)
	{
		if (!(event.srcElement.src as string).includes(this.defaultSrc))
		{
			event.srcElement.src = this.defaultSrc;
		}
	}

	/**
	 * Handles the callback from the Picture Park picker after an asset is selected.
	 * @param assets The assets to add to the list.
	 */
	onGetImages(assets: IPictureParkAsset[])
	{
		if (assets)
		{
			let imageUrls = [];

			assets.forEach(asset =>
			{
				// looking to see if the assetId in the url is the same as any of the images already saved. Example: picturepark.com/176000/15 - 176000
				let matchingAssetIdImgs = this.images.filter(x => x.imageUrl.indexOf(asset.assetId.toString()) != -1);

				if (matchingAssetIdImgs.length > 0)
				{
					// looking for the derivativeDefinitionId in the Url, should be the last number of the url.  Example: picturepark.com/176000/15 - 15. 
					if (matchingAssetIdImgs.findIndex(x => x.imageUrl.substr(x.imageUrl.lastIndexOf('/') + 1) == asset.derivativeDefinitionId.toString()) === -1)
					{
						// if no match was found we can add the url.
						imageUrls.push(asset.url);
					}
				}
				else
				{
					imageUrls.push(asset.url);
				}
			});

			if (imageUrls.length > 0)
			{
				this.onSaveImage(imageUrls);
			}
			else
			{
				this._msgService.add({ severity: 'error', summary: 'Unable to add images.  Duplicate image(s) found.' });
			}
		}
		else
		{
			this._msgService.add({ severity: 'error', summary: 'Unable to get images from Picture Park.' });
		}
	}

	/**
	 * Handles a collection of images being saved to an Option.
	 * @param imageUrls The Picture Park URLs of the images.
	 */
	onSaveImage(imageUrls: string[])
	{
		this.isSaving = true;

		let optionImages = [];

		let sort = 1;

		if (this.images.length > 0)
		{
			sort = Math.max.apply(Math, this.images.map(s => s.sortKey)) + 1;
		}

		imageUrls.forEach(imageUrl =>
		{
			const optionImage = {
				optionMarketId: this.option.id,
				imageUrl: imageUrl,
				sortKey: sort
			} as OptionMarketImage;

			optionImages.push(optionImage);

			sort++;
		});

		this._divOptService.saveDivisionalOptionImages(optionImages)
			.pipe(finalize(() =>
			{
				this.isSaving = false;

				this.onSaveCallback(true);
			}))
			.subscribe(newImages =>
			{
				newImages.map(newImage =>
				{
					let image = new OptionMarketImage(newImage);

					this.images.push(image);

					// update the flag and count for the image indicator
					this.setImageInfo();

					// Force change detection to refresh images
					this.onDataChange.emit();
				});
			});
	}

	/**
	 * Handles the click event on the Remove Image(s) button.
	 * Displays a confirmation modal, and carries out the delete operation if confirmed.
	 */
	onRemoveImages(): void
	{
		let singlePlural = this.selectedImages.length > 1 ? `these Option Images` : `this Option Image`;
		let msgBody = `Are you sure you want to <span class="font-weight-bold text-danger">remove</span> ${singlePlural}?<br><br> `;

		msgBody += `<div class="phd-modal-item-list">`;

		this.selectedImages.forEach(image =>
		{
			msgBody += `<span class="font-weight-bold">${this._imageUrlToAssetIdPipe.transform(image.imageUrl)}</span>`;
		});

		msgBody += `</div>`;
		msgBody += `<br>Do you wish to continue?`;

		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Continue';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this.removeImages();
			}
		});
	}

	/**
	 * Deletes selected Option Market Images from the Division Option.
	 */
	removeImages(): void
	{
		this.isSaving = true;

		this._divOptService.deleteDivisionalOptionImages(this.selectedImages).pipe(
			finalize(() =>
			{
				this.isSaving = false;
			}))
			.subscribe(() =>
			{
				this.selectedImages.forEach(image =>
				{
					const index = this.images.indexOf(image);

					this.images.splice(index, 1);
				});

				this.selectedImages = [];

				this.setImageInfo();
				this.onDataChange.emit();

				this._msgService.add({ severity: 'success', summary: 'Option Images', detail: `Option Image(s) removed successfully!` });
			}, error =>
			{
				this._msgService.clear();
				this._msgService.add({ severity: 'error', summary: 'Option Images', detail: `An error has occured!` });
			});
	}

	/**
	 * Toggles all images' selection status.
	 * @param isSelected Whether to select the image.
	 */
	toggleAllImages(isSelected: boolean): void
	{
		this.selectedImages = isSelected ? this.images.slice() : [];
	}

	/**
	 * Handles the click event on the Associate Communties button.
	 */
	onAssociateCommunities(): void
	{
		// Deselect all images on callback
		let cb = () =>
		{
			this.toggleAllImages(false);
		};

		this.onAssociateToCommunities.emit({ option: this.option, images: this.selectedImages, callback: cb });
	}

	/**
	 * Updates the data for the option's image count.
	 */
	setImageInfo(): void
	{
		const imgCount = this.images.length;

		this.option.hasImages = imgCount > 0;
		this.option.imageCount = imgCount;
	}

	@bind
	private onSaveCallback(success: boolean)
	{
		if (success)
		{
			this._msgService.add({ severity: 'success', summary: 'Image(s) Saved' });
		}
		else
		{
			this._msgService.add({ severity: 'danger', summary: 'Unable to Add Image(s)' });
		}
	}
}
