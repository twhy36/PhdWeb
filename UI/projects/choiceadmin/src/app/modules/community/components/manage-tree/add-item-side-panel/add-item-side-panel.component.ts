import { Component, Input, ViewChild, Output, EventEmitter } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { SidePanelComponent } from '../../../../shared/components/side-panel/side-panel.component';
import { ConfirmModalComponent } from '../../../../core/components/confirm-modal/confirm-modal.component';

import { DTPoint, IItemAdd, DTSubGroup } from '../../../../shared/models/tree.model';
import { Constants } from 'phd-common';

@Component({
	selector: 'add-item-side-panel',
	templateUrl: './add-item-side-panel.component.html',
	styleUrls: ['./add-item-side-panel.component.scss']
})
export class AddItemSidePanelComponent
{
	constructor(private _modalService: NgbModal) { }

	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Input() itemParent: DTPoint | DTSubGroup;
	@Input() unusedItems: Array<IItemAdd> = [];
	@Input() sidePanelOpen = false;
	@Input() isSaving = false;
	@Input() isLoading = true;

	@Output() hasChanges = new EventEmitter<boolean>();
	@Output() sidePanelClose = new EventEmitter();
	@Output() save = new EventEmitter<{ parent: DTPoint | DTSubGroup, items: Array<IItemAdd> }>();

	selectedItems: Array<IItemAdd> = [];

	get showIndicatorText(): boolean
	{
		if (this.itemParent instanceof DTPoint)
		{
			return true;
		}
		else
		{
			return false;
		}
	}

	get title(): string
	{
		if (this.itemParent instanceof DTPoint)
		{
			return 'Add Choices';
		}
		else
		{
			return 'Add Decision Points';
		}
	}

	get subtitle(): string
	{
		if (this.itemParent instanceof DTPoint)
		{
			return 'Select Choices';
		}
		else
		{
			return 'Select Decision Points';
		}
	}

	get canSave()
	{
		this.hasChanges.emit(this.selectedItems.length > 0);

		return this.selectedItems.length > 0;
	}

	toggleSelectedItem(item: IItemAdd)
	{
		item.isSelected = !item.isSelected;

		if (item.isSelected)
		{
			this.selectedItems.push(item);
		}
		else
		{
			const idx = this.selectedItems.indexOf(item);

			this.selectedItems.splice(idx, 1);
		}
	}

	onSaveClick()
	{
		this.save.emit({ parent: this.itemParent, items: this.selectedItems });
	}

	async onCloseClick()
	{
		if (this.selectedItems.length > 0)
		{
			if (!await this.confirmNavAway())
			{
				// cancel close.
				return;
			}
		}

		this.sidePanelClose.emit();
	}

	private confirmNavAway(): Promise<boolean>
	{
		const confirmMessage = Constants.LOSE_CHANGES;
		const confirmTitle = Constants.WARNING;
		const confirmDefaultOption = Constants.CANCEL;

		return this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption);
	}

	private showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		return confirm.result.then((result) =>
		{
			return result === Constants.CONTINUE;
		});
	}
}
