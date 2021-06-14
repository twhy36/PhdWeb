import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { UnsubscribeOnDestroy, AttributeGroup, Attribute, Location, LocationGroup } from 'phd-common';
import { AttributeGroupExt } from '../../models/attribute-ext.model';

@Component({
	selector: 'attribute-group',
	templateUrl: 'attribute-group.component.html',
	styleUrls: ['attribute-group.component.scss']
})
export class AttributeGroupComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() attributeGroup: AttributeGroupExt;
	@Input() highlightedAttributeId: number;
	@Input() isLocationAttribute: boolean;
	@Input() isBlocked: boolean;

	@Output() onAttributeClick = new EventEmitter<{attribute: Attribute, attributeGroup: AttributeGroup}>();
	@Output() onToggleAttribute = new EventEmitter<{attribute: Attribute, attributeGroup: AttributeGroup, location: Location, locationGroup: LocationGroup, quantity: number}>();

	isCollapsed: boolean;

	constructor() { super(); }

	ngOnInit()
	{
		this.isCollapsed = this.isLocationAttribute;
	}

	onToggleAttributeGroup()
	{
		this.isCollapsed = !this.isCollapsed;
	}

	attributeClick(attribute: Attribute)
	{
		this.onAttributeClick.emit({attribute: attribute, attributeGroup: this.attributeGroup});
	}

	toggleAttribute(attribute: Attribute) 
	{
		this.onToggleAttribute.emit({attribute: attribute, attributeGroup: this.attributeGroup, location: null, locationGroup: null, quantity: null});
	}

	getSelectedAttributes() : string
	{
		let attributeNames = '';

		const favoriteAttributes = this.attributeGroup.attributes && this.attributeGroup.attributes.length
			? this.attributeGroup.attributes.filter(x => x.isFavorite)
			: [];

		if (favoriteAttributes && favoriteAttributes.length)
		{
			attributeNames = favoriteAttributes.map(a => a.name).reduce((list, name) => list + ', ' + name);

		}
		return attributeNames;
	}
}
