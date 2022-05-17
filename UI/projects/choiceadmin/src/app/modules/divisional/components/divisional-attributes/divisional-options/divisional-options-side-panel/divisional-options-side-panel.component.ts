import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';

import { finalize } from 'rxjs/operators';

import { MessageService } from 'primeng/api';

import { NgbNavChangeEvent, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { SidePanelComponent } from '../../../../../shared/components/side-panel/side-panel.component';
import { DivisionalAttributesComponent } from '../../divisional-attributes/divisional-attributes.component';
import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';

import { Option, IOptionMarketImageDto, OptionMarketImage } from '../../../../../shared/models/option.model';

import { DivisionalOptionService } from '../../../../../core/services/divisional-option.service';

@Component({
	selector: 'divisional-options-side-panel',
	templateUrl: './divisional-options-side-panel.component.html',
	styleUrls: ['./divisional-options-side-panel.component.scss']
})
export class DivisionalOptionsSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Output() onOptionUpdate = new EventEmitter();

	@Input() sidePanelOpen: boolean = false;
	@Input() currentTab: string;
	@Input() isSaving = false;
	@Input() isDeleting = false;
	@Input() isReadOnly = false;
	@Input() option: Option;

	optionsImageList: Array<OptionMarketImage> = [];
	optionImagesLoaded = false;

	dragHasChanged = false;
	dragEnable = false;

	get sidePanelHeader(): string
	{
		return this.option ? `${this.option.financialOptionIntegrationKey} >> ${this.option.optionSalesName}` : '';
	}

	get sidePanelSubHeader(): string
	{
		return this.option ? `${this.option.category} > ${this.option.subCategory} > ${this.option.optionSalesName}` : '';
	}

	get canSave(): boolean
	{
		return true;
	}

	constructor(private _divAttrComp: DivisionalAttributesComponent, private _divOptService: DivisionalOptionService, private _msgService: MessageService, private _modalService: NgbModal) { }

	ngOnInit()
	{
		this.currentTab = this.currentTab || 'images';

		this.getImages();
	}

	getImages()
	{
		this.optionImagesLoaded = false;
		this.optionsImageList = [];

		if (this.option)
		{
			this._divOptService.getDivisionalOptionImages(this.option.id)
				.pipe(finalize(() => this.optionImagesLoaded = true))
				.subscribe(optionImages =>
				{
					if (optionImages != null)
					{
						optionImages.forEach(image =>
						{
							const optionImage = new OptionMarketImage(image);

							this.optionsImageList.push(optionImage);
						});

						// update the flag and count for the image indicator
						this.setImageInfo();
					}
				});
		}

		this.optionImagesLoaded = true;
	}

	private setImageInfo()
	{
		const imgCount = this.optionsImageList.length;

		// update the flag and count for the image indicator
		this.option.hasImages = imgCount > 0;
		this.option.imageCount = imgCount;

		this.onOptionUpdate.emit();
	}

	async beforeNavChange($event: NgbNavChangeEvent)
	{
		$event.preventDefault();

		this.currentTab = $event.nextId;
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
		this._divAttrComp.sidePanelOpen = status;
	}

	toggleSidePanel()
	{
		this.sidePanel.toggleSidePanel();
	}

	onSaveImage(params: { imageUrls: string[], callback: Function })
	{
		this.isSaving = true;
		this.optionImagesLoaded = false;

		let imageUrls = params.imageUrls;
		let optionImages = [];

		let sort = 1;

		if (this.optionsImageList.length > 0)
		{
			sort = Math.max.apply(Math, this.optionsImageList.map(s => s.sortKey)) + 1;
		}

		imageUrls.forEach(imageUrl =>
		{
			const optionImage = {
				optionMarketId: this.option.id,
				imageUrl: imageUrl,
				sortKey: sort
			} as IOptionMarketImageDto;

			optionImages.push(optionImage);

			sort++;
		});

		this._divOptService.saveDivisionalOptionImages(optionImages)
			.pipe(finalize(() =>
			{
				this.isSaving = false;

				params.callback(true);
			}))
			.subscribe(newImages =>
			{
				this.optionImagesLoaded = true;

				newImages.map(newImage =>
				{
					let image = new OptionMarketImage(newImage);

					this.optionsImageList.push(image);

					// update the flag and count for the image indicator
					this.setImageInfo();
				});
			});
	}

	onDeleteImage(image: OptionMarketImage)
	{
		if (!this.isDeleting)
		{
			this.createDeleteMsgModal(image);
		}
	}

	deleteImage(image: OptionMarketImage)
	{
		this.isDeleting = true;
		this.displayMessage('info', 'Deleting Image.');

		this._divOptService.deleteDivisionalOptionImage(image.id)
			.pipe(finalize(() => this.isDeleting = false))
			.subscribe(response =>
			{
				const index = this.optionsImageList.indexOf(image);

				this.optionsImageList.splice(index, 1);

				// update the flag and count for the image indicator
				this.setImageInfo();

				this.displayMessage('success', 'Image Deleted!');
			},
			(error) =>
			{
				this.displayMessage('error', 'Error Deleting Image.');
			});
	}

	editImageSort()
	{
		this.dragEnable = true;
	}

	cancelImageSort()
	{
		this.dragEnable = false;

		if (this.dragHasChanged)
		{
			this.getImages();
		}
	}

	onDragHasChanged()
	{
		this.dragHasChanged = true;
	}

	saveImageSort()
	{
		this.dragEnable = false;

		if (this.dragHasChanged)
		{
			this.dragHasChanged = false;
			this.isSaving = true;

			const images = this.optionsImageList.map(g =>
			{
				return {
					id: g.id,
					sortKey: g.sortKey
				} as IOptionMarketImageDto;
			});

			this._divOptService.saveDivisionalOptionImageSortOrder(images)
				.pipe(finalize(() => this.isSaving = false))
				.subscribe(response =>
				{
					this.displayMessage('success', 'Sort Saved!');
				},
				(error) =>
				{
					this.displayMessage('error', 'Error Saving Sort.');
				});
		}
		else
		{
			this.displayMessage('info', 'Sort was not saved. No changes were made.');
		}
	}

	async createDeleteMsgModal(image: OptionMarketImage)
	{
		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		let msgBody = `You are about to <span class="font-weight-bold text-danger">delete</span> this image.<br><br> `;
		msgBody += `Do you wish to continue?`;

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Continue';

		confirm.result.then((result) =>
		{
			if (result === 'Continue')
			{
				this.deleteImage(image);
			}
		},
		(reason) =>
		{

		});
	}

	displayMessage(severity: string, summary: string)
	{
		this._msgService.add({ severity: severity, summary: summary });
	}
}
