import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { orderBy } from 'lodash';
import { MessageService } from 'primeng/api';
import { finalize, flatMap, map, startWith } from 'rxjs/operators';

import { Permission } from 'phd-common';

import { bind } from '../../../../../shared/classes/decorators.class';
import { ImageUrlToAssetIdPipe } from '../../shared/pipes/image-url-to-asset-id/image-url-to-asset-id.pipe';
import { IPictureParkAsset } from '../../../../../shared/models/image.model';
import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';

import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';

import { ModalService } from '../../../../../core/services/modal.service';
import { OrganizationService } from '../../../../../core/services/organization.service';

import { DivisionalChoice, DivChoiceCatalogMarketImage, IDivChoiceCatalogMarketImageDto, DivChoiceCatalogCommunityImage } from '../../../../../shared/models/divisional-catalog.model';
import { DivisionalService } from '../../../../../core/services/divisional.service';
import { of } from 'rxjs';
import { DivisionalAttributesComponent } from '../../divisional-attributes/divisional-attributes.component';
import { IFinancialMarket } from '../../../../../shared/models/financial-market.model';

@Component({
	selector: 'expansion-choice-images-tab-panel',
	templateUrl: './expansion-images-tab-panel.component.html',
	styleUrls: ['./expansion-images-tab-panel.component.scss']
})
export class ExpansionChoiceImagesTabPanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() choice: DivisionalChoice;
	@Input() images: DivChoiceCatalogMarketImage[];
	@Input() isReadOnly: boolean;
	@Input() currentMarketId: number;

	@Output() save = new EventEmitter<{ choice: DivisionalChoice, imgCount: number }>();
	@Output() onDataChange = new EventEmitter();
	@Output() onAssociateToCommunities = new EventEmitter<{ choice: DivisionalChoice, marketImages: DivChoiceCatalogMarketImage[], communityImages: DivChoiceCatalogCommunityImage[], marketId: number, callback: () => void }>();

	Permission = Permission;

	selectedImages: DivChoiceCatalogMarketImage[] = [];
	isSaving: boolean = false;
	originalImages: DivChoiceCatalogMarketImage[];
	marketKey: string = '';

	get saveDisabled(): boolean
	{
		return !this.selectedImages.length || this.isSaving;
	}

	get selectedMarket(): IFinancialMarket
	{
		return this._divAttrComp.selectedMarket;
	}

	constructor(private _divService: DivisionalService,
		private _imageUrlToAssetIdPipe: ImageUrlToAssetIdPipe,
		private _modalService: ModalService,
		private _msgService: MessageService,
		private _orgService: OrganizationService,
		private _divAttrComp: DivisionalAttributesComponent)
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

	/**
	 * Whether a specific image is selected.
	 * @param image The image to check.
	 */
	isImageSelected(image: DivChoiceCatalogMarketImage): boolean
	{
		return this.selectedImages.some(s => s.divChoiceCatalogMarketImageId === image.divChoiceCatalogMarketImageId);
	}

	/**
	 * Handles a selection event on an image.
	 * @param image The DivChoiceCatalogMarketImage being clicked.
	 * @param isSelected Whether the image is being selected.
	 */
	setImageSelected(image: DivChoiceCatalogMarketImage, isSelected: boolean): void
	{
		const index = this.selectedImages.findIndex(s => s.divChoiceCatalogMarketImageId === image.divChoiceCatalogMarketImageId);

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

	onLoadImageError(event: any)
	{
		event.srcElement.src = 'assets/pultegroup_logo.jpg';
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
				let matchingAssetIdImgs = this.images.filter(x => x.imageURL.indexOf(asset.assetId.toString()) != -1);

				if (matchingAssetIdImgs.length > 0)
				{
					// looking for the derivativeDefinitionId in the Url, should be the last number of the url.  Example: picturepark.com/176000/15 - 15. 
					if (matchingAssetIdImgs.findIndex(x => x.imageURL.substr(x.imageURL.lastIndexOf('/') + 1) == asset.derivativeDefinitionId.toString()) === -1)
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
	 * Handles a collection of images being saved to an choice.
	 * @param imageUrls The Picture Park URLs of the images.
	 */
	onSaveImage(imageUrls: string[])
	{
		this.isSaving = true;

		let sort = this.images.length > 0 ? Math.max.apply(Math, this.images.map(s => s.sortKey)) + 1 : 1;

		this._orgService.getInternalOrgs().pipe(
			flatMap(internalOrgs =>
			{
				// look for the org
				let org = internalOrgs.find(o => o.edhMarketId === this.selectedMarket.id);

				// if org found, great, else create the org
				return org ? of(org) : this._orgService.createInternalOrg(this.selectedMarket);
			}),
			map(orgDto =>
			{
				let newImages: IDivChoiceCatalogMarketImageDto[] = [];

				imageUrls.forEach(imageUrl =>
				{
					const newImage = {
						divChoiceCatalogId: this.choice.divChoiceCatalogId,
						marketId: orgDto.orgID,
						imageURL: imageUrl,
						sortKey: sort
					} as IDivChoiceCatalogMarketImageDto;

					newImages.push(newImage);

					sort++;
				});

				return newImages;
			}),
			flatMap(newImages => this._divService.saveDivChoiceCatalogMarketImages(newImages)),
			finalize(() =>
			{
				this.isSaving = false;

				this.onSaveCallback(true);
			}))
			.subscribe(newImages =>
			{
				newImages.map(newImage =>
				{
					let image = new DivChoiceCatalogMarketImage(newImage);

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
		let singlePlural = this.selectedImages.length > 1 ? `these Choice Images` : `this Choice Image`;
		let msgBody = `Are you sure you want to <span class="font-weight-bold text-danger">remove</span> ${singlePlural}?<br><br> `;

		msgBody += `<div class="phd-modal-item-list">`;

		this.selectedImages.forEach(image =>
		{
			msgBody += `<span class="font-weight-bold">${this._imageUrlToAssetIdPipe.transform(image.imageURL)}</span>`;
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
	 * Deletes selected Images from the Division Choice.
	 */
	removeImages(): void
	{
		this.isSaving = true;

		this._divService.deleteDivChoiceCatalogMarketImages(this.selectedImages).pipe(
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

				this._msgService.add({ severity: 'success', summary: 'Choice Images', detail: `Choice Image(s) removed successfully!` });
			}, error =>
			{
				this._msgService.clear();
				this._msgService.add({ severity: 'error', summary: 'Choice Images', detail: `An error has occured!` });
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
		// Get community images linked to the market images
		this._divService.getDivChoiceCatalogCommunityImages(this.selectedImages.map(i => i.divChoiceCatalogMarketImageId)).subscribe(communityImages => {
			// Deselect all images on callback
			let cb = () => {
				this.toggleAllImages(false);
			};

			this.onAssociateToCommunities.emit({ choice: this.choice, marketImages: this.selectedImages, communityImages: communityImages, marketId: this.selectedMarket.id, callback: cb });
		}, error => {
			this._msgService.clear();
			this._msgService.add({ severity: 'error', summary: 'Choice Images', detail: `An error has occured!` });
		});
	}

	/**
	 * Updates the data for the choice's image count.
	 */
	setImageInfo(): void
	{
		const imgCount = this.images.length;

		this.choice.imageCount = imgCount;
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
