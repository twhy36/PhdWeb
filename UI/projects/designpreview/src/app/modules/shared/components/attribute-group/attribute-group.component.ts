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
	@Input() isReadonly: boolean;
	@Input() isDesignComplete: boolean;
	
	@Output() attributeClick = new EventEmitter<{attribute: Attribute, attributeGroup: AttributeGroup}>();
	@Output() toggleAttribute = new EventEmitter<{attribute: Attribute, attributeGroup: AttributeGroup, location: Location, locationGroup: LocationGroup, quantity: number}>();

	isCollapsed: boolean;

	constructor() { super(); }

	ngOnInit()
	{
		this.isCollapsed = this.isDesignComplete ? false : this.isLocationAttribute;
	}

	onToggleAttributeGroup()
	{
		this.isCollapsed = !this.isCollapsed;
	}

	handleAttributeClick(attribute: Attribute)
	{
		this.attributeClick.emit({attribute: attribute, attributeGroup: this.attributeGroup});
	}

	handleToggleAttribute(attribute: Attribute) 
	{
		this.toggleAttribute.emit({attribute: attribute, attributeGroup: this.attributeGroup, location: null, locationGroup: null, quantity: null});
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
