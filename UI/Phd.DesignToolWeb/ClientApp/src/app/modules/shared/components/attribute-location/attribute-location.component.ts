import { Component, OnInit, Input, EventEmitter, Output, ViewChildren, QueryList } from '@angular/core';
import { Location, AttributeGroup, DesignToolAttribute, LocationGroup } from '../../models/attribute.model';
import { AttributeGroupComponent } from '../attribute-group/attribute-group.component';
import { Choice } from '../../models/tree.model.new';
import { MonotonyConflict } from '../../models/monotony-conflict.model';

@Component({
	selector: 'attribute-location',
	templateUrl: 'attribute-location.component.html',
	styleUrls: ['attribute-location.component.scss']
})

export class AttributeLocationComponent implements OnInit
{
	@Input() choice: Choice;
	
	@Input() attributeLocation: Location;
	@Input() attributeLocationGroup: LocationGroup;
	@Input() attributeGroups: AttributeGroup[];
	@Input() maxQuantity: number;
	@Input() totalSelectedQuantity: number;
	@Input() canEditAgreement: boolean;
	@Input() isPastCutOff: boolean;
	@Input() canOverride: boolean;
	@Input() overrideReason: string;
	@Input() monotonyConflict: MonotonyConflict;

	@Output() onAttributeLocationChanged: EventEmitter<{ overrideNote: string, isOverride: boolean }> = new EventEmitter();

	@ViewChildren(AttributeGroupComponent) attributeGroupComponents: QueryList<AttributeGroupComponent>;

	isActive = false;
	locationQuantityTotal = 0;
	isCollapsed = true;

	selectedAttributes: Array<{
		attributeGroupId: number,
		attributeGroupName: string,
		attributeId: number,
		attributeName: string,
		attributeGroupLabel: string,
		sku: string;
		manufacturer: string;
	}>;

	constructor() { }

	get selectedLocationAttributes(): DesignToolAttribute[]
	{
		const attributes = this.choice.selectedAttributes.filter(a => a.locationId === this.attributeLocation.id);

		return attributes.length ? attributes : [];
	}

	ngOnInit()
	{
		if (this.selectedLocationAttributes.length)
		{
			this.selectedAttributes = this.selectedLocationAttributes.filter(a => a.attributeGroupId).map(a =>
			{
				const attributeGroup = this.attributeGroups.find(g => g.id === a.attributeGroupId);
				const attributeName = this.attributeGroups.find(g => g.id === a.attributeGroupId).attributes.find(attr => attr.id === a.attributeId).name;

				return {
					attributeGroupId: a.attributeGroupId,
					attributeGroupName: attributeGroup.name,
					attributeId: a.attributeId,
					attributeName: attributeName,
					attributeGroupLabel: a.attributeGroupLabel,
					sku: a.sku,
					manufacturer: a.manufacturer
				};
			});

			this.locationQuantityTotal = this.selectedLocationAttributes[0].locationQuantity;
			this.isActive = this.locationQuantityTotal > 0;
		}
	}

	clearSelectedAttributes()
	{
		this.locationQuantityTotal = 0;
		this.isActive = false;
		this.selectedAttributes = [];

		this.attributeGroupComponents.forEach(agc =>
		{
			agc.clearSelectedAttributes();
		});
	}

	quantityChangeHandler($event)
	{
		const quantity = Number($event);

		if (quantity > 0)
		{
			this.isActive = true;
		}
		else
		{
			// clear out selected attributes
			this.clearSelectedAttributes();
		}

		this.locationQuantityTotal = quantity;

		this.onAttributeLocationChanged.emit({ overrideNote: null, isOverride: false });
	}

	attributeGroupRemoved($event: { attributeGroupId: number, attributeGroupName: string, attributeId: number, attributeName: string, attributeGroupLabel: string, sku: string, manufacturer: string })
	{
		const selectedAttributeGroup = {
			attributeGroupId: $event.attributeGroupId,
			attributeGroupName: $event.attributeGroupName,
			attributeId: $event.attributeId,
			attributeName: $event.attributeName,
			attributeGroupLabel: $event.attributeGroupLabel,
			sku: $event.sku,
			manufacturer: $event.manufacturer
		};

		let index = this.selectedAttributes.findIndex(x => x.attributeGroupId == selectedAttributeGroup.attributeGroupId && x.attributeId == selectedAttributeGroup.attributeId);

		// remove attribute
		this.selectedAttributes.splice(index, 1);
	}

	attributeGroupSelected($event: { attributeGroupId: number, attributeGroupName: string, attributeId: number, attributeName: string, attributeGroupLabel: string, sku: string, manufacturer: string, selected: boolean, overrideNote: string, isOverride: boolean })
	{
		const selectedAttributeGroup = {
			attributeGroupId: $event.attributeGroupId,
			attributeGroupName: $event.attributeGroupName,
			attributeId: $event.attributeId,
			attributeName: $event.attributeName,
			attributeGroupLabel: $event.attributeGroupLabel,
			sku: $event.sku,
			manufacturer: $event.manufacturer
		};

		if (this.selectedAttributes)
		{
			const selectedAttributeIndex = this.selectedAttributes.findIndex(attributeGroup => attributeGroup.attributeGroupId === selectedAttributeGroup.attributeGroupId);

			if (selectedAttributeIndex !== -1)
			{
				const selectedAttribute = this.selectedAttributes[selectedAttributeIndex];

				if (selectedAttribute.attributeId !== selectedAttributeGroup.attributeId)
				{
					// add group attribute selection
					this.selectedAttributes.push(selectedAttributeGroup);
				}
				
				// remove old attribute
				this.selectedAttributes.splice(selectedAttributeIndex, 1);
			}
			else
			{
				// add group attribute selection
				this.selectedAttributes.push(selectedAttributeGroup);
			}
		}
		else
		{
			this.selectedAttributes = [selectedAttributeGroup];
		}

		this.onAttributeLocationChanged.emit({ overrideNote: $event.overrideNote, isOverride: $event.isOverride });
	}
}
