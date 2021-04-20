import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import * as _ from 'lodash';

import { Location, Attribute, AttributeGroup, LocationGroup, DesignToolAttribute } from 'phd-common';
import { ChoiceExt } from '../../models/choice-ext.model';
import { AttributeGroupExt } from '../../models/attribute-ext.model';

@Component({
	selector: 'attribute-location',
	templateUrl: 'attribute-location.component.html',
	styleUrls: ['attribute-location.component.scss']
})

export class AttributeLocationComponent implements OnInit, OnChanges
{
	@Input() currentChoice: ChoiceExt;
	@Input() attributeLocation: Location;
	@Input() attributeLocationGroup: LocationGroup;	
	@Input() currentAttributeGroups: AttributeGroupExt[];
	@Input() maxQuantity: number;
	@Input() highlightedAttribute: {attributeId: number, attributeGroupId: number};
	
	@Output() onLocationAttributeClick = new EventEmitter<{attribute: Attribute, attributeGroupId: number, locationId: number, locationGroupId: number}>();
	@Output() onToggleAttribute = new EventEmitter<{attribute: Attribute, attributeGroup: AttributeGroup, location: Location, locationGroup: LocationGroup, quantity: number}>();
	@Output() onQuantiyChange = new EventEmitter<{location: Location, locationGroup: LocationGroup, quantity: number, clearAttribute: boolean}>();
	
	@ViewChild('maxQuantityModal') maxQuantityModal: any;

	choice: ChoiceExt;
	locationQuantityTotal = 0;
	locationAttributGroups: AttributeGroupExt[];
	attributeGroups: AttributeGroupExt[] = [];
	maxQuantityModalRef: NgbModalRef;

	constructor(private modalService: NgbModal) { }

	get selectedLocationAttributes(): DesignToolAttribute[]
	{
		const attributes = this.choice.selectedAttributes.filter(a => a.locationId === this.attributeLocation.id);

		return attributes.length ? attributes : [];
	}

	ngOnInit()
	{
		if (this.selectedLocationAttributes.length)
		{
			this.locationQuantityTotal = this.selectedLocationAttributes[0].locationQuantity;
		}
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['currentChoice'] || changes['currentAttributeGroups'])
		{
			this.choice = changes['currentChoice'] ? changes['currentChoice'].currentValue : this.choice;
			this.locationAttributGroups = changes['currentAttributeGroups'] ? changes['currentAttributeGroups'].currentValue : this.locationAttributGroups;
			this.updateAttributeGroups();

			if (this.choice.choiceStatus === 'Available' && !this.choice.isFavorite && this.locationQuantityTotal > 0)
			{
				this.locationQuantityTotal = 0;
			}
		}
	}

	updateAttributeGroups()
	{
		if (this.locationAttributGroups && this.choice)
		{
			this.locationAttributGroups.forEach(ag => {
				let attributeGroup = this.attributeGroups.find(x => x.id === ag.id);
				if (!attributeGroup)
				{
					attributeGroup = _.cloneDeep(ag);
					this.attributeGroups.push(attributeGroup);
				}
				if (ag.attributes && ag.attributes.length)
				{
					ag.attributes.forEach(att => {
						const selAttribute = this.choice.selectedAttributes.find(x =>
							x.attributeId === att.id && x.attributeGroupId === ag.id && 
							x.locationId === this.attributeLocation.id && x.locationGroupId === this.attributeLocationGroup.id);
						
						let attribute = attributeGroup.attributes.find(x => x.id === att.id);
						if (attribute)
						{
							if (att.attributeStatus === 'Contracted' && !selAttribute)
							{
								attribute.attributeStatus = 'ViewOnly';
							}
							
							attribute.isFavorite = att.isFavorite;
							if (att.isFavorite && !selAttribute)
							{
								attribute.isFavorite = false;
							}
						}
					});
				}
			});	
		}
	}

	quantityChangeHandler(value: number)
	{
		if (value !== null)
		{
			const quantity = Number(value);
			this.locationQuantityTotal = quantity;

			this.onQuantiyChange.emit({
				location: this.attributeLocation,
				locationGroup: this.attributeLocationGroup,
				quantity: quantity,
				clearAttribute: quantity <= 0 && !!this.selectedLocationAttributes.length
			});
		}
		else
		{
			this.locationQuantityTotal = null;
			this.maxQuantityModalRef = this.modalService.open(this.maxQuantityModal, { windowClass: 'phd-max-quantity-modal' });
		}
	}	

	attributeClick(data: {attribute: Attribute, attributeGroup: AttributeGroup})
	{
		this.onLocationAttributeClick.emit({
			attribute: data.attribute, 
			attributeGroupId: data.attributeGroup.id,
			locationId: this.attributeLocation.id,
			locationGroupId: this.attributeLocationGroup.id 
		});
	}

	getHighlightedAttributeId(attributeGroup: AttributeGroup) : number
	{
		return this.highlightedAttribute && this.highlightedAttribute.attributeGroupId === attributeGroup.id
			? this.highlightedAttribute.attributeId
			: 0;
	}

	attributeGroupSelected(data: {attribute: Attribute, attributeGroup: AttributeGroup})
	{
		const existingAttribute = this.selectedLocationAttributes.find(a => 
			a.attributeId === data.attribute.id && a.attributeGroupId === data.attributeGroup.id);
		
		if (!this.locationQuantityTotal && !existingAttribute)
		{
			this.locationQuantityTotal = 1;
		}
		
		this.onToggleAttribute.emit({
			attribute: data.attribute, 
			attributeGroup: data.attributeGroup,
			location: this.attributeLocation,
			locationGroup: this.attributeLocationGroup,
			quantity: this.locationQuantityTotal 
		});
	}

	closeClicked()
	{
		if (this.maxQuantityModalRef)
		{
			this.maxQuantityModalRef.close();
		}
	}
}
