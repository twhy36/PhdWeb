import { Component, OnInit, ViewChild, Input, Output, EventEmitter, HostListener, SimpleChanges, OnChanges } from '@angular/core';
import * as _ from 'lodash';
import { ReplaySubject } from 'rxjs';
import { Store } from '@ngrx/store';

import { Attribute, AttributeGroup, DesignToolAttribute } from '../../models/attribute.model';
import { DragScrollComponent } from 'ngx-drag-scroll';
import * as fromRoot from '../../../ngrx-store/reducers';
import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';

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

	@Output() closeExpandedAttribute: EventEmitter<boolean> = new EventEmitter();
	@Output() onPreview: EventEmitter<Attribute> = new EventEmitter();
	@Output() onAttributeClick: EventEmitter<{ attribute: Attribute, attributeGroupId: number, updateParent: boolean }> = new EventEmitter();

	@ViewChild('attributeValueContainer', { read: DragScrollComponent, static: true }) ds: DragScrollComponent;

	hasImage: boolean = false;
	attributes: Attribute[];

	previewImageLabel: string;
	previewImageSrc: any;
	doFade: boolean;

	leftNavDisabled: boolean = false;
	rightNavDisabled: boolean = false;

	responsiveOptions: any[];

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

	constructor(private store: Store<fromRoot.State>) { super() }

	// Close image preview when clicking outside of it
	@HostListener('document:click', ['$event'])
	clickedOutside($event)
	{
		if (this.previewImageSrc)
		{
			this.previewImageSrc = null;
			this.previewImageLabel = '';
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
		if (this.canEditAttributes)
		{
			if (this.isActive && this.selectedAttributeId !== attribute.id)
			{
				this.selectedAttributeId = attribute.id;
			}
			else if (this.isActive && this.selectedAttributeId === attribute.id)
			{
				this.selectedAttributeId = null;
			}

			this.onAttributeClick.emit({ attribute: attribute, attributeGroupId: this.attributeGroupId, updateParent: this.updateParent });
		}
	}

	preview(attribute: Attribute, $event: any)
	{
		$event.preventDefault();
		$event.stopPropagation();

		if (!this.showCarousel)
		{
			if (this.previewImageSrc)
			{
				this.previewImageSrc = null;
				this.previewImageLabel = '';
				this.doFade = false;
			}

			_.delay(i => this.doFade = true, 100);

			this.previewImageSrc = attribute.imageUrl;
			this.previewImageLabel = attribute.name;
		}
		else
		{
			this.onPreview.emit(attribute);
		}
	}

	closePreview()
	{
		this.previewImageSrc = null;
		this.previewImageLabel = '';
	}

	getTitle(attribute: Attribute): string
	{
		return this.isActive ? attribute.name : 'Please enter a quantity first.';
	}

	getImageSrc(attribute: Attribute): string
	{
		this.hasImage = attribute.imageUrl ? true : false;

		return attribute.imageUrl || 'assets/attribute-image-not-available.png';
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		this.hasImage = false;

		event.srcElement.src = 'assets/attribute-image-not-available.png';
	}
	
	closeClicked()
	{
		this.closeExpandedAttribute.emit(true)
	}

	get canEditAttributes() : boolean
	{
		return this.canEditAgreement && (!this.isPastCutOff || this.canOverride);
	}
}
