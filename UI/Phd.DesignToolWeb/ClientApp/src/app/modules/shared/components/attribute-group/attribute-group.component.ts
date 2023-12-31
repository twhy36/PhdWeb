import { Component, OnInit, Input, Output, EventEmitter, HostListener, ViewChild, ViewChildren, QueryList } from '@angular/core';

import { Store } from '@ngrx/store';

import * as _ from 'lodash';

import { AttributeListComponent } from '../attribute-list/attribute-list.component';

import { UnsubscribeOnDestroy } from '../../classes/unsubscribe-on-destroy';

import { Attribute, AttributeGroup, DesignToolAttribute } from '../../models/attribute.model';
import { ReplaySubject } from 'rxjs';

import * as fromRoot from '../../../ngrx-store/reducers';

import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';
import { MonotonyConflict } from '../../models/monotony-conflict.model';
import { ModalService } from '../../../core/services/modal.service';
import { ModalRef } from '../../../shared/classes/modal.class';

@Component({
	selector: 'attribute-group',
	templateUrl: 'attribute-group.component.html',
	styleUrls: ['attribute-group.component.scss']
})
export class AttributeGroupComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() selectedAttributes: DesignToolAttribute[];
	@Input() attributeGroups: AttributeGroup[];
	@Input() isActive: boolean;
	@Input() isPastCutOff: boolean;
	@Input() canEditAgreement: boolean;
	@Input() canOverride: boolean;
	@Input() overrideReason: string;
	@Input() monotonyConflict: MonotonyConflict;
	@Input() isCollapsed: boolean;

	@Output() onAttributeGroupSelected: EventEmitter<{ attributeGroupId: number, attributeGroupName: string, attributeId: number, attributeName: string, sku: string, manufacturer: string, selected: boolean, overrideNote: string, isOverride: boolean }> = new EventEmitter();

	@ViewChildren(AttributeListComponent) attributeListComponents: QueryList<AttributeListComponent>;

	modalReference: ModalRef;
	expandedAttributeGroupId: number;
	expandedAttributeGroup: AttributeGroup;
	expandedSelectedAttributeId: number;

	choiceOverride: boolean;
	monotonyOverride$ = new ReplaySubject<boolean>(1);

	overrideNote: string;

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

	@ViewChild('content') content: any;

	// Image preview vars
	previewImageLabel: string;
	previewImageSrc: string;
	doFade: boolean;

	constructor(private store: Store<fromRoot.State>, private modalService: ModalService) { super(); }

	ngOnInit()
	{
		this.choiceOverride = this.monotonyConflict.choiceOverride;
		this.monotonyOverride$.next(this.choiceOverride);
	}

	clearSelectedAttributes()
	{
		this.attributeListComponents.forEach(alc =>
		{
			if (alc.attributes != null)
			{
				const selectedAttributeId = this.getSelectedAttributeId(alc.attributeGroupId);

				const attribute = alc.attributes.find(x => x.id === selectedAttributeId);

				if (attribute)
				{
					this.unselectAttribute(attribute, alc.attributeGroupId);
				}

				alc.selectedAttributeId = null;
			}
		});
	}

	attributeSelected(attribute: Attribute, attributeGroupId: number, isOverride: boolean)
	{
		const attributeGroupName = this.attributeGroups.find(g => g.id === attributeGroupId).name;

		this.onAttributeGroupSelected.emit({
			attributeGroupId: attributeGroupId,
			attributeGroupName: attributeGroupName,
			attributeId: attribute.id,
			attributeName: attribute.name,
			sku: attribute.sku,
			manufacturer: attribute.manufacturer,
			selected: attribute.selected,
			overrideNote: this.overrideNote,
			isOverride: isOverride
		});
	}

	getSelectedAttributeId(attributeGroupId: number): number
	{
		let attr;
		let attributeId;

		if (this.selectedAttributes && this.selectedAttributes.length)
		{
			attr = this.selectedAttributes ? this.selectedAttributes.find(a => a.attributeGroupId === attributeGroupId) : null;

			attributeId = attr ? attr.attributeId : null;
		}
		else if (this.attributeListComponents)
		{
			const alc = this.attributeListComponents.find(x => x.attributeGroupId == attributeGroupId);

			if (alc && alc.selectedAttributeId != null)
			{
				attributeId = alc.selectedAttributeId;
			}
		}

		return attributeId;
	}

	previewAttribute(attribute: Attribute)
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

	closePreview()
	{
		this.previewImageSrc = null;
	}

	expandAttributes(attributeGroup: AttributeGroup)
	{
		this.expandedSelectedAttributeId = this.getSelectedAttributeId(attributeGroup.id);
		this.expandedAttributeGroup = attributeGroup;
		this.expandedAttributeGroupId = attributeGroup.id;

		this.modalReference = this.modalService.open(this.content);
	}

	closeExpanded()
	{
		this.modalReference.close();
	}

	attributeClick($event: { attribute: Attribute, attributeGroupId: number, updateParent: boolean })
	{
		const attributeGroupId = $event.attributeGroupId;
		const attribute = $event.attribute;
		const selectedAttributeId = this.getSelectedAttributeId(attributeGroupId);

		if (this.isActive && selectedAttributeId !== attribute.id)
		{
			if (attribute.monotonyConflict || this.isPastCutOff)
			{
				if (this.canOverride)
				{
					this.onOverride(attribute, attributeGroupId);
				}
			}
			else
			{
				this.overrideNote = null;
				this.monotonyOverride$.next(!!this.overrideNote);

				// update the selectedAttributeId before calling attributeSelected, else nothing gets updated properly
				if ($event.updateParent)
				{
					const alc = this.attributeListComponents.find(x => x.attributeGroupId == attributeGroupId);

					if (alc)
					{
						alc.selectedAttributeId = attribute.id;
					}
				}

				this.attributeSelected(attribute, attributeGroupId, false);
			}
		}
		else if (this.isActive && selectedAttributeId === attribute.id)
		{
			this.unselectAttribute(attribute, attributeGroupId);
		}
	}

	unselectAttribute(attribute: Attribute, attributeGroupId: number)
	{
		this.overrideNote = null;

		this.monotonyOverride$.next(!!this.overrideNote);

		this.attributeSelected(attribute, attributeGroupId, false);
	}

	addOverrideReason(attribute: Attribute, attributeGroupId: number, overrideReason: string)
	{
		this.overrideNote = overrideReason;
		this.monotonyOverride$.next((!!this.overrideNote));

		this.attributeSelected(attribute, attributeGroupId, true);
	}

	onOverride(attribute: Attribute, attributeGroupId: number)
	{
		if (!this.overrideReason)
		{
			let body = 'This will override the ';

			if (attribute.monotonyConflict && this.isPastCutOff)
			{
				body = `Monotony Conflict and the Cut-off`;
			}
			else if (attribute.monotonyConflict)
			{
				body = `Monotony Conflict`;
			}
			else
			{
				body = `Cut-off`;
			}

			const confirm = this.modalService.open(ModalOverrideSaveComponent);

			confirm.componentInstance.title = 'Warning';
			confirm.componentInstance.body = body;
			confirm.componentInstance.defaultOption = 'Cancel';

			return confirm.result.then((result) =>
			{
				if (result !== 'Close')
				{
					this.store.dispatch(new ScenarioActions.SetOverrideReason(result));

					this.addOverrideReason(attribute, attributeGroupId, result);
				}
			});
		}
		else
		{
			this.addOverrideReason(attribute, attributeGroupId, this.overrideReason);
		}
	}
}
