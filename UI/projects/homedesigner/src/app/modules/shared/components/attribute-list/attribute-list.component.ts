import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy, Attribute } from 'phd-common';
import { AttributeExt } from '../../models/attribute-ext.model';

@Component({
	selector: 'attribute-list',
	templateUrl: 'attribute-list.component.html',
	styleUrls: ['attribute-list.component.scss']
})

export class AttributeListComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() attributes: AttributeExt[];
	@Input() highlightedAttributeId: number;
	@Input() isBlocked: boolean;
	@Input() isLocationAttribute: boolean;

	@Output() onAttributeClick = new EventEmitter<Attribute>();
	@Output() onToggleAttribute = new EventEmitter<Attribute>();

	constructor() { super() }

	ngOnInit()
	{

	}

	attributeClick(attribute: Attribute)
	{
		this.onAttributeClick.emit(attribute);
	}

	getImageSrc(attribute: Attribute): string
	{
		return attribute.imageUrl || 'assets/attribute-image-not-available.png';
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		event.srcElement.src = 'assets/attribute-image-not-available.png';
	}	

	toggleAttribute(attribute: Attribute) 
	{
		this.onToggleAttribute.emit(attribute);
	}
}
