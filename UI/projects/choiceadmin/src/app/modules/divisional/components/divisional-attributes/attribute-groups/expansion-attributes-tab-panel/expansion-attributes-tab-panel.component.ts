import { Component, Input, Output, EventEmitter } from '@angular/core';

import { of } from 'rxjs';

import { MessageService } from 'primeng/api';

import { AttributeService } from '../../../../../core/services/attribute.service';
import { Attribute } from '../../../../../shared/models/attribute.model';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';

@Component({
	selector: 'expansion-attributes-tab-panel',
	templateUrl: './expansion-attributes-tab-panel.component.html',
	styleUrls: ['./expansion-attributes-tab-panel.component.scss']
})
export class ExpansionAttributesTabPanelComponent
{
	@Input() group: AttributeGroupMarket;
	@Input() attributes: Array<Attribute>;
	@Input() isReadOnly: boolean;
	@Output() onAssociateAttributes = new EventEmitter<{ group: AttributeGroupMarket, attributes: Array<Attribute>, callback: (attr: Array<Attribute>) => void }>();

	selectedAttributes: Array<Attribute> = [];
	isSaving: boolean = false;

	get saveDisabled(): boolean
	{
		return this.selectedAttributes.length === 0 || this.isSaving;
	}

	constructor(private _msgService: MessageService, private _attrService: AttributeService) { }

	onAssociate()
	{
		this._msgService.clear();

		let cb = (attr: Array<Attribute>) =>
		{
			this.group.attributeMarkets$ = of(attr);
		};

		this.onAssociateAttributes.emit({ group: this.group, attributes: this.attributes, callback: cb });
	}

	onRemoveAttributes()
	{
		this.isSaving = true;
		let attributeIds = this.selectedAttributes.map(x => x.id);
		this._attrService.updateAttributeAssociations(this.group.id, attributeIds, true).subscribe(grp =>
		{
			let attributeIds = this.selectedAttributes.map(x => x.id);
			let attr = this.attributes.filter(att => !attributeIds.some(att2 => att2 === att.id));
			this.group.attributeMarkets$ = of(attr);
			this.selectedAttributes = [];
			this.isSaving = false;
		},
		error =>
		{
			this.isSaving = false;

			this._msgService.clear();

			this._msgService.add({ severity: 'error', summary: 'Remove Attribute', detail: `Failed to remove attribute(s).` });
		});
	}

	isAttributeSelected(attr: Attribute): boolean
	{
		return this.selectedAttributes.some(s => s.id === attr.id);
	}

	areAllAttributesSelected(): boolean
	{
		return this.attributes.length > 0 && this.selectedAttributes.length === this.attributes.length;
	}

	setAttributeSelected(attr: Attribute, isSelected: boolean): void
	{
		let index = this.selectedAttributes.findIndex(s => s.id === attr.id);

		if (isSelected && index < 0)
		{
			this.selectedAttributes.push(attr);
		}
		else if (!isSelected && index >= 0)
		{
			this.selectedAttributes.splice(index, 1);
			this.selectedAttributes = [...this.selectedAttributes];
		}
	}

	toggleAllAttributes(isSelected: boolean): void
	{
		if (isSelected)
		{
			this.selectedAttributes = this.attributes.slice();
		}
		else
		{
			this.selectedAttributes = [];
		}
	}

	getRowClass(rowData: any): string
	{
		return rowData['active'] ? null : 'phd-inactive';
	}
}
