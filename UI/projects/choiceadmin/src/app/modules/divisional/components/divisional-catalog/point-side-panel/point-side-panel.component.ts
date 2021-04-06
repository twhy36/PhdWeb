import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';

import { SidePanelComponent } from '../../../../shared/components/side-panel/side-panel.component';

import { DivDPoint, IDPointPickType } from '../../../../shared/models/point.model';
import { PointTypeComponent } from '../point-type/point-type.component';

@Component({
	selector: 'point-side-panel',
	templateUrl: './point-side-panel.component.html',
	styleUrls: ['./point-side-panel.component.scss']
})
export class PointSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;
	
	@ViewChild(PointTypeComponent)
	private pointType: PointTypeComponent;

	@Input() sidePanelOpen: boolean = false;
	@Input() catalogItem: DivDPoint;
	@Input() isSaving: boolean;

	@Output() onSaveCatalogItem = new EventEmitter<{ item: DivDPoint, addAnother: boolean }>();
	@Output() onSidePanelClose = new EventEmitter<boolean>();

	isOpen: boolean = true;
	addAnotherClicked: boolean = false;

	pickTypes: Array<IDPointPickType> = [];

	get sidePanelHeader(): string
	{
		let action = this.catalogItem.id == 0 && this.catalogItem.isFlooring ? 'Add' : 'Edit';

		return `${action} Decision Point`;
	}

	get sidePanelSubheader(): string
	{
		const item = this.catalogItem;

		let subheader = `${item.parent.parent.label} >> ${item.parent.label}`;
		
		if (item.id != null)
		{
			subheader = `${subheader} >> ${item.label}`;
		}

		return `${subheader}`;
	}

	get canSave(): boolean
	{
		let canSave = true;

		const pointType = this.pointType;

		if (pointType && pointType.catalogForm)
		{
			canSave = pointType.catalogForm.pristine || !pointType.catalogForm.valid || this.isSaving;
		}

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !canSave;
		}

		return canSave;
	}

	constructor() { }

	ngOnInit()
	{

	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);

		const pointType = this.pointType;

		if (pointType && pointType.catalogForm)
		{
			pointType.catalogForm.reset();
		}
	}

	toggleSidePanel(status: boolean)
	{
		const pointType = this.pointType;

		if (pointType && pointType.catalogForm)
		{
			if (!pointType.catalogForm.pristine)
			{
				this.sidePanel.setIsDirty();
			}
		}
		
		this.sidePanel.toggleSidePanel(status);
	}

	save(addAnother: boolean = false)
	{
		this.addAnotherClicked = addAnother;

		let point: DivDPoint = this.pointType.save();

		this.onSaveCatalogItem.emit({ item: point, addAnother: addAnother });
	}
	
	newForm(item: DivDPoint)
	{
		this.addAnotherClicked = false;
		this.pointType.resetForm();
		this.pointType.catalogItem = item;
		this.pointType.createForm();
	}
}
