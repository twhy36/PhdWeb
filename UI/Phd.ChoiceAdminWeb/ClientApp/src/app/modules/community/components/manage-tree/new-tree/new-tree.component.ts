import { Component, OnInit, EventEmitter, Input, Output } from '@angular/core';
import { DTreeVersionDropDown } from '../../../../shared/models/tree.model';

@Component({
	selector: 'new-tree',
	templateUrl: './new-tree.component.html',
	styleUrls: ['./new-tree.component.scss']
})
export class NewTreeComponent implements OnInit
{
	@Input() treeVersions: DTreeVersionDropDown[];
	@Input() canEdit: boolean;

	@Output() close = new EventEmitter<void>();
	@Output() createNewTree = new EventEmitter<{treeVersionId: number}>();

	selectedTreeVersion: DTreeVersionDropDown = null;
	selectedNewTreeType: any;

	get disableContinue(): boolean
	{
		return !((this.selectedNewTreeType === 1 && this.selectedTreeVersion !== null) || this.selectedNewTreeType === 0);
	}

	get hasTreeVersions(): boolean
	{
		return this.treeVersions.length > 0;
	}

	constructor()
	{

	}

	ngOnInit()
	{
		if (!this.hasTreeVersions)
		{
			this.selectedNewTreeType = 0;
		}
	}

	continue()
	{
		let treeVersionId = this.selectedNewTreeType === 1 ? this.selectedTreeVersion.id : 0;

		this.createNewTree.emit({ treeVersionId: treeVersionId });

		this.closeModal();
	}

	onNewTreeTypeChange()
	{
		if (this.selectedNewTreeType === 0)
		{
			this.selectedTreeVersion = null;
		}
	}

	cancel()
	{
		this.closeModal();
	}

	closeModal()
	{
		this.close.emit();
	}
}
