import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

import { TreeService } from '../../../../core/services/tree.service';

import { MessageService } from 'primeng/api';

import { bind } from '../../../../shared/classes/decorators.class';

import { IChoiceImageAssoc } from '../../../../shared/models/choice.model';

import { Permission } from 'phd-common';
import { IPictureParkAsset } from '../../../../shared/models/image.model';

@Component({
    selector: 'choice-images-panel',
    templateUrl: './choice-images-panel.component.html',
    styleUrls: ['./choice-images-panel.component.scss']
})
/** choice-images-panel component*/
export class ChoiceImagesPanelComponent implements OnInit
{
	Permission = Permission;

	@Input() isSaving: boolean;
	@Input() choiceImageList: Array<IChoiceImageAssoc>;
	@Input() imagesLoaded: boolean;
	@Input() dragEnable: boolean;
	@Input() isReadOnly: boolean;

	@Output() delete = new EventEmitter<IChoiceImageAssoc>();
	@Output() edit = new EventEmitter<IChoiceImageAssoc>();
	@Output() save = new EventEmitter<{ imageUrls: string[], callback: Function }>();
	@Output() dragHasChanged = new EventEmitter();

	draggedItem: IChoiceImageAssoc;

	constructor(
		private _treeService: TreeService,
		private _msgService: MessageService
	) { }

	ngOnInit(): void { }

	toggleChoiceImage(image: IChoiceImageAssoc)
	{
		this.edit.emit(image);
	}

	deleteImage(image: IChoiceImageAssoc)
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
				let matchingAssetIdImgs = this.choiceImageList.filter(x => x.imageUrl.indexOf(asset.assetId.toString()) != -1);

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
				this._msgService.add({ severity: 'error', summary: 'Unable to add images.  Duplicate image(s) found.' });
			}
		}
		else
		{
			this._msgService.add({ severity: 'error', summary: 'Unable to get images from Picture Park.' });
		}
	}

	handleDrop(event: any, item: IChoiceImageAssoc)
	{
		if (event)
		{
			this.dragHasChanged.emit();

			const oldIndex = this.choiceImageList.findIndex(i => i.imageUrl === this.draggedItem.imageUrl);
			const newIndex = this.choiceImageList.findIndex(i => i.imageUrl === item.imageUrl);

			this.reSort(oldIndex, newIndex);
		}
	}

	private reSort(oldIndex: number, newIndex: number)
	{
		if (newIndex >= this.choiceImageList.length)
		{
			let k = newIndex - this.choiceImageList.length;

			while ((k--) + 1) {
				this.choiceImageList.push(undefined);
			}
		}

		// reorder items in array
		this.choiceImageList.splice(newIndex, 0, this.choiceImageList.splice(oldIndex, 1)[0]);

		let counter = 1;

		this.choiceImageList.forEach(item =>
		{
			// update sortOrder
			item.sortKey = counter++;
		});

		// resort using new sortOrders
		this.choiceImageList.sort((left: IChoiceImageAssoc, right: IChoiceImageAssoc) =>
		{
			return left.sortKey === right.sortKey ? 0 : (left.sortKey < right.sortKey ? -1 : 1);
		});
	}

	handleDragStart(event: any, item: IChoiceImageAssoc)
	{
		if (event)
		{
			this.draggedItem = item;
		}
	}

	handleDragEnter(event: any, item: IChoiceImageAssoc)
	{
		if (event)
		{
			if (!this.canDrop())
			{
				event[0].nativeElement.classList.remove('over');
			}
		}
	}

	getDragItem(item: IChoiceImageAssoc)
	{
		return item.dpChoiceImageAssocId;
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
			this._msgService.add({ severity: 'success', summary: 'Image(s) Saved' });
		}
		else
		{
			this._msgService.add({ severity: 'danger', summary: 'Unable to Add Image(s)' });
		}
	}
}
