import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

import { startWith } from 'rxjs/operators';

import { TreeService } from '../../../../../core/services/tree.service';

import { MessageService } from 'primeng/api';

import { bind } from '../../../../../shared/classes/decorators.class';

import { OptionMarketImage } from '../../../../../shared/models/option.model';
import { IPictureParkAsset } from '../../../../../shared/models/image.model';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { Permission } from 'phd-common';

@Component({
	selector: 'divisional-options-image-side-panel',
	templateUrl: './divisional-options-image-side-panel.component.html',
	styleUrls: ['./divisional-options-image-side-panel.component.scss']
})
export class DivisionalOptionsImageSidePanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	Permission = Permission;

	@Input() isReadOnly: boolean;
	@Input() isSaving: boolean;
	@Input() isDeleting: boolean;
	@Input() optionsImageList: Array<OptionMarketImage>;
	@Input() imagesLoaded: boolean;
	@Input() dragEnable: boolean;

	@Output() delete = new EventEmitter<OptionMarketImage>();
	@Output() save = new EventEmitter<{ imageUrls: string[], callback: Function }>();
	@Output() dragHasChanged = new EventEmitter();

	draggedItem: OptionMarketImage;
	marketKey: string = "";

	constructor(
		private _treeService: TreeService,
		private _msgService: MessageService,
		private _orgService: OrganizationService
	)
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

	deleteImage(image: OptionMarketImage)
	{
		this.delete.emit(image);
	}

	onGetImages(assets: IPictureParkAsset[])
	{
		if (assets)
		{
			let imageUrls = [];

			assets.forEach(asset =>
			{
				// looking to see if the assetId in the url is the same as any of the images already saved. Example: picturepark.com/176000/15 - 176000
				let matchingAssetIdImgs = this.optionsImageList.filter(x => x.imageUrl.indexOf(asset.assetId.toString()) != -1);

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
				this.save.emit({ imageUrls: imageUrls, callback: this.onSaveCallback });
			}
			else
			{
				this._msgService.add({ severity: 'error', summary: 'Unable to add images.  Duplicate images found.' });
			}
		}
		else
		{
			this._msgService.add({ severity: 'error', summary: 'Unable to get images from Picture Park.' });
		}
	}

	handleDrop(event: any, item: OptionMarketImage)
	{
		if (event)
		{
			this.dragHasChanged.emit();

			const oldIndex = this.optionsImageList.findIndex(i => i.imageUrl === this.draggedItem.imageUrl);
			const newIndex = this.optionsImageList.findIndex(i => i.imageUrl === item.imageUrl);

			this.reSort(oldIndex, newIndex);
		}
	}

	private reSort(oldIndex: number, newIndex: number)
	{
		if (newIndex >= this.optionsImageList.length)
		{
			let k = newIndex - this.optionsImageList.length;

			while ((k--) + 1)
			{
				this.optionsImageList.push(undefined);
			}
		}

		// reorder items in array
		this.optionsImageList.splice(newIndex, 0, this.optionsImageList.splice(oldIndex, 1)[0]);

		let counter = 1;

		this.optionsImageList.forEach(item =>
		{
			// update sortOrder
			item.sortKey = counter++;
		});

		// resort using new sortOrders
		this.optionsImageList.sort((left: OptionMarketImage, right: OptionMarketImage) =>
		{
			return left.sortKey === right.sortKey ? 0 : (left.sortKey < right.sortKey ? -1 : 1);
		});
	}

	handleDragStart(event: any, item: OptionMarketImage)
	{
		if (event)
		{
			this.draggedItem = item;
		}
	}

	handleDragEnter(event: any, item: OptionMarketImage)
	{
		if (event)
		{
			if (!this.canDrop())
			{
				event[0].nativeElement.classList.remove('over');
			}
		}
	}

	getDragItem(item: OptionMarketImage)
	{
		return item.id;
	}

	private canDrop(): boolean
	{

		let canDrop = false;

		if (this.dragEnable)
		{
			canDrop = true;
		}

		return canDrop;
	}

	@bind
	private onSaveCallback(success: boolean)
	{
		if (success)
		{
			this._msgService.add({ severity: 'success', summary: 'Image Saved' });
		}
		else
		{
			this._msgService.add({ severity: 'danger', summary: 'Unable to Add Image' });
		}
	}

}
