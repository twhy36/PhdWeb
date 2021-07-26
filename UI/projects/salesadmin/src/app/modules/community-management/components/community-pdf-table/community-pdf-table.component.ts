import { Component, EventEmitter, Input, OnChanges, Output } from "@angular/core";
import { NgbModal, NgbModalOptions } from "@ng-bootstrap/ng-bootstrap";
import { cloneDeep } from "lodash";
import { MessageService } from "primeng/api";
import { CommunityService } from "../../../core/services/community.service";
import { OrganizationService } from "../../../core/services/organization.service";
import { CommunityPdf } from "../../../shared/models/communityPdf.model";
import { UnsubscribeOnDestroy } from "../../../shared/utils/unsubscribe-on-destroy";
import { ConfirmModalComponent, PhdTableComponent } from "phd-common";

@Component({
	selector: 'community-pdf-table',
	templateUrl: './community-pdf-table.component.html',
	styleUrls: ['./community-pdf-table.component.scss']
})
export class CommunityPdfTableComponent extends UnsubscribeOnDestroy implements OnChanges
{
	@Output() editClicked = new EventEmitter<CommunityPdf>();
	@Output() deleteComplete = new EventEmitter<CommunityPdf>();
	@Output() saveComplete = new EventEmitter<boolean>();
	@Input() filteredCommunityPdfs: Array<CommunityPdf>;
	@Input() isCanceling: boolean;
	@Input() isSorting: boolean;
	@Input() isSaving: boolean;
	@Input() canEdit: boolean = false;

	updatedCommunityPdfs: Array<CommunityPdf> = [];

	constructor(public _orgService: OrganizationService,
		private _communityService: CommunityService,
		private _modalService: NgbModal,
		private _msgService: MessageService) { super(); }

	ngOnChanges()
	{
		// When save is clicked and there are pdfs to be updated
		if (this.isSaving && this.updatedCommunityPdfs.length > 0)
		{
			this._communityService.updateCommunityPdf(this.updatedCommunityPdfs)
				.subscribe(() => 
				{
					this.saveComplete.emit(true);
					this.updatedCommunityPdfs = [];
					this._msgService.add({ severity: 'success', summary: 'Sort Order', detail: `has been updated!` });
				});
		}
		// Cancel clicked wipe the updatedCommunity list
		if (this.isCanceling)
		{
			this.updatedCommunityPdfs = [];
		}
	}

	editPdf(dto: CommunityPdf)
	{
		this.editClicked.emit(dto);
	}

	deletePdf(dto: CommunityPdf)
	{
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};

		let msgBody = `Are you sure you want to delete this Contract Document?`;
		let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this._communityService.deleteCommunityPdf(dto)
					.subscribe(() =>
					{
						this.filteredCommunityPdfs = this.filteredCommunityPdfs.filter(t => t.fileName !== dto.fileName);
						this.deleteComplete.emit(dto);

						this._msgService.add({ severity: 'success', summary: 'Community Pdf', detail: `has been deleted!` });
					});
			}
		});
	}

	previewFile(url: string)
	{
		window.open(url, '_blank');

		this._msgService.add({ severity: 'success', summary: 'Community Pdf', detail: `has been found` });
	}

	showTooltip(event: any, tooltipText: string, tableComponent: PhdTableComponent): void
	{
		tableComponent.showTooltip(event, tooltipText);
	}

	hideTooltip(tableComponent: PhdTableComponent): void
	{
		tableComponent.hideTooltip();
	}

	onRowReorder(event:any)
	{
		if (event.dragIndex !== event.dropIndex)
		{
			let parent = this.filteredCommunityPdfs;

			this.updateSort(parent, event.dragIndex, event.dropIndex);

			this.filteredCommunityPdfs = cloneDeep(parent);
		}
	}

	private trackUpdatedPdfs(pdf: CommunityPdf)
	{
		this.updatedCommunityPdfs = this.updatedCommunityPdfs.filter(t => t.fileName !== pdf.fileName);
		this.updatedCommunityPdfs.push(pdf);
	}

	private updateSort(itemList: Array<CommunityPdf>, oldIndex: number, newIndex: number)
	{
		// Make sure list is sorted by sortOrder
		itemList.sort((left: CommunityPdf, right: CommunityPdf) =>
		{
			return left.sortOrder === right.sortOrder ? 0 : (left.sortOrder < right.sortOrder ? -1 : 1);
		});

		// Move the dragged element
		itemList.splice(newIndex, 0, itemList.splice(oldIndex, 1)[0]);

		// Update sortOrder
		let counter = -1;
		itemList.forEach(item =>
		{
			counter++;
			// If the sort order is changed add it to list to be updated
			if (item.sortOrder != counter)
			{
				item.sortOrder = counter
				this.trackUpdatedPdfs(item);
			}
		});
	}
}