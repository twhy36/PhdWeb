import { Component, Input, Output, EventEmitter } from '@angular/core';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy, Attribute } from 'phd-common';
import { AttributeExt } from '../../models/attribute-ext.model';

@Component({
	selector: 'attribute-list',
	templateUrl: 'attribute-list.component.html',
	styleUrls: ['attribute-list.component.scss']
})

export class AttributeListComponent extends UnsubscribeOnDestroy
{
	@Input() attributes: AttributeExt[];
	@Input() highlightedAttributeId: number;
	@Input() isBlocked: boolean;
	@Input() isLocationAttribute: boolean;
	@Input() isReadonly: boolean;

	@Output() attributeClick = new EventEmitter<Attribute>();
	@Output() toggleAttribute = new EventEmitter<Attribute>();

	constructor() { super() }

	clickAttributeClick(attribute: Attribute)
	{
		this.attributeClick.emit(attribute);
	}

	getImageSrc(attribute: Attribute): string
	{
		return attribute.imageUrl || 'assets/attribute-image-not-available.png';
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event)
	{
		event.srcElement.src = 'assets/attribute-image-not-available.png';
	}	

	clickToggleAttribute(attribute: Attribute) 
	{
		if (!this.isReadonly)
		{
			this.toggleAttribute.emit(attribute);
		}
	}
}
