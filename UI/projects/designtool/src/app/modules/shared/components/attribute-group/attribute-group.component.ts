import { Component, OnInit, Input, Output, EventEmitter, HostListener, ViewChild, ViewChildren, QueryList } from '@angular/core';

import { Store } from '@ngrx/store';

import { UnsubscribeOnDestroy, ModalRef, ModalService, Attribute, AttributeGroup, DesignToolAttribute, MyFavoritesChoiceAttribute, Constants } from 'phd-common';

import { AttributeListComponent } from '../attribute-list/attribute-list.component';

import { ReplaySubject } from 'rxjs';

import * as fromRoot from '../../../ngrx-store/reducers';

import * as ScenarioActions from '../../../ngrx-store/scenario/actions';

import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';
import { MonotonyConflict } from '../../models/monotony-conflict.model';

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
	@Input() favoriteChoiceAttributes?: MyFavoritesChoiceAttribute[];
	@Input() isDesignComplete: boolean;

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
		if (this.previewAttribute)
		{
			this.closePreview();
		}
	}

	@ViewChild('content') content: any;

	// Image preview vars
	previewAttribute: Attribute = null;

	constructor(private store: Store<fromRoot.State>, private modalService: ModalService) { super(); }

	ngOnInit()
	{
		this.choiceOverride = this.monotonyConflict.choiceOverride;

		this.monotonyOverride$.next(this.choiceOverride);
	}

	setDefaultSelectedAttribute(setActive: boolean = false)
	{
		if (this.attributeListComponents.some(x => x.attributes.length === 1))
		{
			this.attributeListComponents.forEach(al =>
			{
				// check for single attributes so they can be auto selected
				al.defaultSingleAttribute(setActive);
			});
		}
	}

	clearSelectedAttributes(clearSingles: boolean = false)
	{
		this.attributeListComponents.forEach(alc =>
		{
			// clear attributes except those with only one item which must stay selected unless its contained in a location which then it can be cleared.
			if (alc.attributes != null && (alc.attributes.length > 1 || clearSingles))
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

		return attributeId;
	}

	preview(attribute: Attribute)
	{
		this.previewAttribute = attribute;
	}

	closePreview()
	{
		this.previewAttribute = null;
	}

	expandAttributes(attributeGroup: AttributeGroup)
	{
		const alc = this.attributeListComponents.find(x => x.attributeGroupId == attributeGroup.id);

		if (alc && alc.selectedAttributeId != null)
		{
			// sets the current value for the modal version
			this.expandedSelectedAttributeId = alc.selectedAttributeId;
		}
		else
		{
			// If there is no selected attribute, ensure the modal's value is unset
			this.expandedSelectedAttributeId = null;
		}

		this.expandedAttributeGroup = attributeGroup;
		this.expandedAttributeGroupId = attributeGroup.id;

		this.modalReference = this.modalService.open(this.content);
	}

	closeExpanded()
	{
		this.modalReference.close();
	}

	//called from the attribute-list component onAttributeClick method
	attributeClick($event: { attribute: Attribute, attributeGroupId: number, updateParent: boolean })
	{
		const attributeGroupId = $event.attributeGroupId;
		const attribute = $event.attribute;
		const selectedAttributeId = this.getSelectedAttributeId(attributeGroupId);
		const alc = this.attributeListComponents?.find(x => x.attributeGroupId == attributeGroupId); //reference to attribute group's attribute list component

		//if a user selected a different attribute and the attribute group is active
		if (this.isActive && selectedAttributeId !== attribute.id)
		{
			// update the selectedAttributeId before calling attributeSelected, else nothing gets updated properly. This is for the modal/expanded version of the attribute group.
			if ($event.updateParent && alc)
			{
				alc.selectedAttributeId = attribute.id;
			}

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

				this.attributeSelected(attribute, attributeGroupId, false);
			}
		}
		//if the user selects the same attribute in a group
		else if (this.isActive && selectedAttributeId === attribute.id)
		{
			// update the selectedAttributeId before calling attributeSelected, else nothing gets updated properly. This is for the modal/expanded version of the attribute group.
			if ($event.updateParent && alc)
			{
				alc.selectedAttributeId = null;
			}

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
			let body = '';

			if (attribute.monotonyConflict && this.isPastCutOff)
			{
				body = Constants.OVERRIDE_MONOTONY_AND_CUT_OFF;
			}
			else if (attribute.monotonyConflict)
			{
				body = Constants.OVERRIDE_MONOTONY;
			}
			else
			{
				body = Constants.OVERRIDE_CUT_OFF;
			}

			const confirm = this.modalService.open(ModalOverrideSaveComponent);

			confirm.componentInstance.title = Constants.WARNING;
			confirm.componentInstance.body = body;
			confirm.componentInstance.defaultOption = Constants.CANCEL;

			return confirm.result.then((result) =>
			{
				if (result !== Constants.CLOSE)
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
