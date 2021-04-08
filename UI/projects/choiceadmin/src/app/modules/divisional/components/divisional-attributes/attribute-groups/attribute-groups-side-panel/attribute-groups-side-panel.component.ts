import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormControl, AbstractControl, ValidatorFn, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { Observable, EMPTY as empty, throwError as _throw } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SidePanelComponent } from '../../../../../shared/components/side-panel/side-panel.component';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { AttributeGroupMarketTag } from '../../../../../shared/models/attribute-group-market-tag.model';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { MessageService } from 'primeng/api';

import * as _ from "lodash";

@Component({
	selector: 'attribute-groups-side-panel',
	templateUrl: './attribute-groups-side-panel.component.html',
	styleUrls: ['./attribute-groups-side-panel.component.scss']
})
export class AttributeGroupsSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;

	@Output() onSaveAttributeGroup = new EventEmitter<AttributeGroupMarket>();

	@Input() selectedAttributeGroup: AttributeGroupMarket;
	@Input() existingAttributeGroups: Array<AttributeGroupMarket>;

	attributeForm: FormGroup;
	attributeGroup: AttributeGroupMarket;
	isSaving: boolean = false;
	isAdd: boolean = false;

	get sidePanelHeader(): string
	{
		if (this.selectedAttributeGroup)
		{
			return 'Edit Attribute Group';
		}
		else
		{
			return 'Add Attribute Group';
		}
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = this.attributeForm.pristine || !this.attributeForm.valid || this.isSaving;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !saveDisabled;
		}

		return saveDisabled;
	}

	constructor(private route: ActivatedRoute, private _attrService: AttributeService, private _msgService: MessageService) { }

	ngOnInit()
	{
		this.createForm();
	}

	createForm()
	{
		this.attributeGroup = this.selectedAttributeGroup ?
			{
				...this.selectedAttributeGroup,
				tags: this.selectedAttributeGroup.attributeGroupMarketTags.map(t => t.tag),
				formattedTags: this.selectedAttributeGroup.formattedTags,
				tagsString: this.selectedAttributeGroup.tagsString
			} : new AttributeGroupMarket();

		this.attributeForm = new FormGroup({
			'groupName': new FormControl(this.attributeGroup.groupName, { validators: [this.duplicateName()], updateOn: 'blur' }),
			'searchTag': new FormControl('', this.duplicateTag()),
			'tags': new FormArray([]),
			'description': new FormControl(this.attributeGroup.description),
			'groupLabel': new FormControl(this.attributeGroup.groupLabel, { updateOn: 'blur' })
		});

		const tagsArray = this.attributeForm.get("tags") as FormArray;

		this.attributeGroup.tags.forEach(t => tagsArray.push(new FormControl(t)));
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	toggleSidePanel()
	{
		if (!this.attributeForm.pristine)
		{
			this.sidePanel.setIsDirty();
		}

		this.sidePanel.toggleSidePanel();
	}

	save(): Observable<AttributeGroupMarket>
	{
		this.isSaving = true;

		const tagsArray = this.attributeForm.get("tags") as FormArray;

		this.attributeGroup.marketId = +this.route.parent.snapshot.paramMap.get('marketId');
		this.attributeGroup.groupName = this.attributeForm.get('groupName').value;
		this.attributeGroup.description = this.attributeForm.get('description').value;
		this.attributeGroup.groupLabel = this.attributeForm.get('groupLabel').value;
		this.attributeGroup.tags = tagsArray.controls.map(t => t.value as string);

		return (
			!this.attributeGroup.id ?
				this._attrService.addAttributeGroup(this.attributeGroup) :
				this._attrService.updateAttributeGroup(this.attributeGroup)
		)
			.pipe(map(attr =>
			{
				attr.attributeGroupMarketTags = this.attributeGroup.tags.map(t =>
				{
					return {
						attributeGroupMarketId: attr.id,
						tag: t
					} as AttributeGroupMarketTag;
				});

				attr.tags = _.cloneDeep(this.attributeGroup.tags);

				this.isSaving = false;

				return attr;
			}), catchError(error =>
			{
				return _throw(error || 'Server error');
			}));
	}

	saveAndContinue()
	{
		this.isAdd = true;

		this.save().subscribe(attr =>
		{
			this.onSaveComplete(attr);
		},
			error => this.handleSaveError()
		);
	}

	saveAndClose()
	{
		this.isAdd = false;

		this.save().subscribe(attr =>
		{
			this.onSaveComplete(attr);
			this.sidePanel.isDirty = false;

			this.sidePanel.toggleSidePanel();
		},
			error => this.handleSaveError()
		);
	}

	onSaveComplete(attr: AttributeGroupMarket)
	{
		this.onSaveAttributeGroup.emit(attr);
		this.handleSaveSuccess();
		this.attributeForm.reset();
		this.attributeGroup = new AttributeGroupMarket();

		let tags = <FormArray>this.attributeForm.controls['tags'];

		for (let i = tags.length - 1; i >= 0; i--)
		{
			tags.removeAt(i);
		}
	}

	onAddSearchTag()
	{
		let tag = this.attributeForm.get('searchTag').value;

		if (tag)
		{
			let existingTag = this.attributeGroup.tags.find(t => t === tag);

			if (!existingTag)
			{
				const tagsArray = this.attributeForm.get("tags") as FormArray;
				const tagControl = new FormControl(tag);

				tagsArray.push(tagControl);

				this.detectChangesInTags(tagsArray);

				let searchTagControl = this.attributeForm.controls['searchTag'];

				if (searchTagControl)
				{
					searchTagControl.reset();
				}
			}
		}
	}

	onRemoveTag(index: number)
	{
		const tagsArray = this.attributeForm.get("tags") as FormArray;

		tagsArray.removeAt(index);

		this.detectChangesInTags(tagsArray);
	}

	/**
	 * this checks to see if any changes have been made to the list of tags
	 * and marks the FormArray for tags dirty or pristine 
	 * @param tagsArray
	 */
	private detectChangesInTags(tagsArray: FormArray)
	{
		const tags = tagsArray.controls.map(c => c.value as string);

		const diffA = _.difference(tags, this.attributeGroup.tags);
		const diffB = _.difference(this.attributeGroup.tags, tags);

		if (diffA.length > 0 || diffB.length > 0)
		{
			tagsArray.markAsDirty();
		}
		else
		{
			tagsArray.markAsPristine();
		}
	}

	duplicateTag(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			let existingTag = this.attributeGroup.tags.find(t => t === control.value);

			return existingTag ? { duplicateTag: true } : null;
		};
	}

	duplicateName(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			let inputName = control.value as string;
			let existingName = inputName ?
				this.existingAttributeGroups.find(n =>
				{
					if (this.selectedAttributeGroup && this.selectedAttributeGroup.id === n.id)
					{
						// ignore match if it was found on currently selected attribute group
						return false;
					}
					else
					{
						return n.groupName.toLowerCase() === inputName.toLowerCase();
					}
				}) :
				null;

			return existingName ? { duplicateName: true } : null;
		};
	}

	private handleSaveError()
	{
		this.isSaving = false;

		this._msgService.add({ severity: 'error', summary: 'Attribute Group', detail: `failed to saved!` });

		return empty;
	}

	private handleSaveSuccess()
	{
		this._msgService.add({ severity: 'success', summary: 'Attribute Group', detail: `has been saved!` });
	}
}
