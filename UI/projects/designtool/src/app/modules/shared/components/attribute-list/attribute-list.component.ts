import { Component, OnInit, ViewChild, Input, Output, EventEmitter, HostListener, SimpleChanges, OnChanges } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { Store } from '@ngrx/store';

import { UnsubscribeOnDestroy, Attribute, AttributeGroup, DesignToolAttribute, MyFavoritesChoiceAttribute, ImagePlugins } from 'phd-common';

import { DragScrollComponent } from 'ngx-drag-scroll';
import * as fromRoot from '../../../ngrx-store/reducers';

@Component({
	selector: 'attribute-list',
	templateUrl: 'attribute-list.component.html',
	styleUrls: ['attribute-list.component.scss']
})
export class AttributeListComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() selectedAttributeId: number;
	@Input() selectedAttributes: DesignToolAttribute[];
	@Input() selectedAttributeGroup: AttributeGroup;
	@Input() isActive: boolean;
	@Input() attributeGroupId: number;
	@Input() showCarousel: boolean;
	@Input() isPastCutOff: boolean;
	@Input() canEditAgreement: boolean;
	@Input() canOverride: boolean;
	@Input() monotonyOverride: ReplaySubject<boolean>;
	@Input() isCollapsed: boolean;
	@Input() updateParent: boolean = false;
	@Input() favoriteChoiceAttributes?: MyFavoritesChoiceAttribute[];
	@Input() isDesignComplete: boolean;

	@Output() closeExpandedAttribute: EventEmitter<boolean> = new EventEmitter();
	@Output() onPreview: EventEmitter<Attribute> = new EventEmitter();
	@Output() onAttributeClick: EventEmitter<{ attribute: Attribute, attributeGroupId: number, updateParent: boolean }> = new EventEmitter();

	@ViewChild('attributeValueContainer', { read: DragScrollComponent, static: true }) ds: DragScrollComponent;

	hasImage: boolean = false;
	attributes: Attribute[];

	previewAttribute: Attribute = null;

	leftNavDisabled: boolean = false;
	rightNavDisabled: boolean = false;

	responsiveOptions: any[];

	defaultImage: string = 'assets/attribute-image-not-available.png';
	imagePlugins: ImagePlugins[] = [ImagePlugins.LazyLoad];

	moveLeft()
	{
		this.ds.moveLeft();
	}

	moveRight()
	{
		this.ds.moveRight();
	}

	leftBoundStat(reachesLeftBound: boolean)
	{
		this.leftNavDisabled = reachesLeftBound;
	}

	rightBoundStat(reachesRightBound: boolean)
	{
		this.rightNavDisabled = reachesRightBound;
	}

	get canEditAttributes(): boolean
	{
		return this.canEditAgreement && (!this.isPastCutOff || this.canOverride);
	}

	get disableAttribute(): boolean
	{
		return (!this.isActive && this.attributes.length > 1) || (this.attributes.length === 1 && this.selectedAttributeGroup.hasOptionCommunityAssoc); // If it is a single-attribute, allow it to be toggled if the attribute group is no longer associated to the community
	}

	constructor(private store: Store<fromRoot.State>) { super() }

	// Close image preview when clicking outside of it
	@HostListener('document:click', ['$event'])
	clickedOutside($event)
	{
		if (this.previewAttribute)
		{
			this.closePreview();
		}
	}

	ngOnInit()
	{
		this.responsiveOptions = [
			{
				breakpoint: '1440px',
				numVisible: 3,
				numScroll: 3
			},
			{
				breakpoint: '1366px',
				numVisible: 4,
				numScroll: 4
			},
			{
				breakpoint: '1024px',
				numVisible: 3,
				numScroll: 3
			},
			{
				breakpoint: '768px',
				numVisible: 2,
				numScroll: 2
			},
			{
				breakpoint: '560px',
				numVisible: 1,
				numScroll: 1
			}
		];

		this.attributes = this.selectedAttributeGroup.attributes;

		if (this.selectedAttributeId == null)
		{
			if (this.selectedAttributes && this.selectedAttributes.length)
			{
				const attr = this.selectedAttributes ? this.selectedAttributes.find(a => a.attributeGroupId === this.selectedAttributeGroup.id) : null;

				this.selectedAttributeId = attr ? attr.attributeId : null;
			}
		}

		if (this.isActive)
		{
			this.defaultSingleAttribute();
		}
	}

	defaultSingleAttribute(setActive: boolean = false)
	{
		// checking that there is only one item
		if (this.attributes.length === 1)
		{
			// this will be false if within a location, so set to true so attributeClick will work
			if (setActive)
			{
				this.isActive = true;
			}

			if (this.selectedAttributeId == null && this.selectedAttributeGroup.hasOptionCommunityAssoc)
			{
				// apply the only item
				this.setAttribute(this.attributes[0]);
			}

			// set to stop users from deselecting the only value
			this.isActive = false;
		}
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes.isCollapsed)
		{
			// need this for Locations with Attributes.  Without it the nav buttons will not resize properly 
			//this.ds.onResize();
		}
	}

	attributeClick(attribute: Attribute)
	{
		if (this.canEditAttributes && !this.disableAttribute)
		{
			this.setAttribute(attribute);
		}
	}

	private setAttribute(attribute: Attribute)
	{
		this.selectedAttributeId = this.selectedAttributeId !== attribute.id ? attribute.id : null;

		this.onAttributeClick.emit({ attribute: attribute, attributeGroupId: this.attributeGroupId, updateParent: this.updateParent });
	}

	preview(attribute: Attribute, $event: any)
	{
		$event.preventDefault();
		$event.stopPropagation();

		if (!this.showCarousel)
		{
			this.previewAttribute = attribute;
		}
		else
		{
			this.onPreview.emit(attribute);
		}
	}

	closePreview()
	{
		this.previewAttribute = null;
	}

	getTitle(attribute: Attribute): string
	{
		return (this.isActive || this.attributes.length === 1) ? attribute.name : 'Please enter a quantity first.';
	}

	getImageSrc(attribute: Attribute): string
	{
		this.hasImage = attribute.imageUrl?.length > 0;

		return attribute.imageUrl || '';
	}

	isFavoriteAttribute(attribute: Attribute): boolean
	{
		return this.favoriteChoiceAttributes?.findIndex(fca => fca.attributeCommunityId === attribute.id) > -1;
	}

	isAttributeSelected(attribute: Attribute): boolean
	{
		return this.selectedAttributeId === attribute.id;
	}

	closeClicked()
	{
		this.closeExpandedAttribute.emit(true);
	}
}
