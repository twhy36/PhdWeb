import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators, AbstractControl } from '@angular/forms';

import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';

import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { DGroup } from '../../../shared/models/group.model';
import { DPoint } from '../../../shared/models/point.model';
import { CatalogItem } from '../../../shared/models/catalog-item.model';

import { NationalService } from '../../../core/services/national.service';

@Component({
	selector: 'national-catalog-side-panel-component',
	templateUrl: './national-catalog-side-panel.component.html',
	styleUrls: ['./national-catalog-side-panel.component.scss']
})
export class NationalCatalogSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;

	@Input() catalogItem: CatalogItem;

	@Output() onSaveCatalogItem = new EventEmitter<CatalogItem>();

	isOpen: boolean = true;
	isSaving: boolean = false;

	catalogForm: UntypedFormGroup;

	get sidePanelHeader(): string
	{
		let action = this.catalogItem.item.id == (null || 0) ? 'Add' : 'Edit';
		let thing = this.catalogItem.itemType.toString();

		thing = thing == 'Point' ? 'Decision Point' : thing;

		return `${action} ${thing}`;
	}

	get canSave(): boolean
	{
		let canSave = this.catalogForm.pristine || !this.catalogForm.valid || this.isSaving;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !canSave;
		}

		return canSave;
	}

	get showDescription(): boolean
	{
		return this.catalogItem.showDescription;
	}

	saving: boolean = false;

	constructor(private _natService: NationalService) { }

	ngOnInit()
	{
		this.createForm();
	}

	createForm()
	{
		const catItem = this.catalogItem;

		let label: string;
		let description: string = '';

		if (catItem != null)
		{
			label = catItem.item.label;

			if (catItem.item instanceof DPoint)
			{
				description = catItem.item.description;
			}
		}

		this.catalogForm = new UntypedFormGroup({
			'itemLabel': new UntypedFormControl(label, Validators.required, this.labelValidator.bind(this)),
			'itemDescription': new UntypedFormControl(description)
		});
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	toggleSidePanel()
	{
		this.sidePanel.toggleSidePanel();
	}

	labelValidator(control: AbstractControl): Promise<{ [key: string]: any; }> | Observable<{ [key: string]: any; }>
	{
		const itemType = this.catalogItem.itemType;
		const label = control.value;

		if (label.length > 0 && label !== this.catalogItem.item.label)
		{
			let parentId: number = this.catalogItem.item instanceof DGroup ? 0 : this.catalogItem.item.parent.id;

			let obs = this._natService.doesLabelExist(itemType, label, parentId).pipe(map((data) =>
			{
				return data ? { 'alreadyExist': true } : null;
			}));

			return obs;
		}

		return of(null);
	}

	save()
	{
		this.isSaving = true;

		try
		{
			let catItem = this.catalogItem;
			const form = this.catalogForm;

			let label = form.get('itemLabel').value;
			let description = form.get('itemDescription').value;

			catItem.item.label = label;

			if (catItem.item instanceof DPoint)
			{
				catItem.item.description = description;
			}

			this.onSaveCatalogItem.emit(catItem);
		}
		finally
		{
			this.saving = false;
		}
	}
}
