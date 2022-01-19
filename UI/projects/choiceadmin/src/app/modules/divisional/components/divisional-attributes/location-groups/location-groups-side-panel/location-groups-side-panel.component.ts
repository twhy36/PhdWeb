import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormControl, AbstractControl, ValidatorFn, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { Observable, EMPTY as empty, throwError as _throw } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { SidePanelComponent } from '../../../../../shared/components/side-panel/side-panel.component';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { LocationGroupMarketTag } from '../../../../../shared/models/location-group-market-tag.model';
import { LocationService } from '../../../../../core/services/location.service';
import { MessageService } from 'primeng/api';

import * as _ from "lodash";

@Component({
	selector: 'location-groups-side-panel',
	templateUrl: './location-groups-side-panel.component.html',
	styleUrls: ['./location-groups-side-panel.component.scss']
})
export class LocationGroupsSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Input() sidePanelOpen: boolean = false;
	@Input() locationGroups: Array<LocationGroupMarket>;
	@Input() locationGroup: LocationGroupMarket;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Output() onSaveLocationGroup = new EventEmitter<LocationGroupMarket>();

	locationForm: FormGroup;

	isSaving: boolean = false;
	isAdd: boolean = false;
	isEdit: boolean = false;

	get sidePanelHeader(): string
	{
		let action = this.isEdit ? 'Edit' : 'Add';

		return `${action} Location Groups`;
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = this.locationForm.pristine || !this.locationForm.valid || this.isSaving;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !saveDisabled;
		}

		return saveDisabled;
	}

	constructor(private route: ActivatedRoute, private _locoService: LocationService, private _msgService: MessageService) { }

	ngOnInit()
	{
		this.createForm();
	}

	createForm()
	{
		if (!this.locationGroup)
		{
			this.locationGroup = new LocationGroupMarket();
			this.locationGroup.groupLabel = 'Location';
		}
		else
		{
			this.isEdit = true;
		}

		this.locationForm = new FormGroup({
			'locationGroupName': new FormControl(this.locationGroup.locationGroupName, { validators: [this.duplicateName()], updateOn: 'blur' }),
			'searchTag': new FormControl('', this.duplicateTag()),
			'tags': new FormArray([]),
			'locationGroupDescription': new FormControl(this.locationGroup.locationGroupDescription),
			'groupLabel': new FormControl(this.locationGroup.groupLabel, { updateOn: 'blur' })
		});

		const tagsArray = this.locationForm.get('tags') as FormArray;

		this.locationGroup.tags.forEach(t => tagsArray.push(new FormControl(t)));
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);

		this.locationForm.reset();

		this.locationGroup = new LocationGroupMarket();
	}

	toggleSidePanel()
	{
		if (!this.locationForm.pristine)
		{
			// sets isDirty flag to allow nav away message to show.
			this.sidePanel.setIsDirty();
		}

		this.sidePanel.toggleSidePanel();
	}

	save(): Observable<LocationGroupMarket>
	{
		this.isSaving = true;

		const tagsArray = this.locationForm.get('tags') as FormArray;

		this.locationGroup.marketId = +this.route.parent.snapshot.paramMap.get('marketId');
		this.locationGroup.locationGroupName = this.locationForm.get('locationGroupName').value;
		this.locationGroup.locationGroupDescription = this.locationForm.get('locationGroupDescription').value;
		this.locationGroup.groupLabel = this.locationForm.get('groupLabel').value;
		this.locationGroup.tags = tagsArray.controls.map(t => t.value as string);

		let locationGroup: Observable<LocationGroupMarket> = null;

		if (this.locationGroup.id == null || this.locationGroup.id == 0)
		{
			locationGroup = this._locoService.addLocationGroup(this.locationGroup);
		}
		else
		{
			const groupData = {
				locationGroupDescription: this.locationGroup.locationGroupDescription,
				locationGroupName: this.locationGroup.locationGroupName,
				groupLabel: this.locationGroup.groupLabel,
				isActive: this.locationGroup.isActive,
				id: this.locationGroup.id,
				tags: this.locationGroup.tags
			} as LocationGroupMarket;

			locationGroup = this._locoService.patchLocationGroup(groupData);
		}

		return locationGroup.pipe(
			map(loco =>
			{
				loco.locationGroupMarketTags = this.locationGroup.tags.map(t =>
				{
					return {
						locationGroupMarketId: loco.id,
						tag: t
					} as LocationGroupMarketTag
				});

				loco.tags = _.cloneDeep(this.locationGroup.tags);

				this.isSaving = false;

				return loco;
			}),
			catchError(error =>
			{
				return _throw(error || 'Server error');
			})
		);
	}

	saveAndContinue()
	{
		this.isAdd = true;

		this.save().subscribe(loco =>
		{
			this.onSaveComplete(loco);
		},
			error => this.handleSaveError()
		);
	}

	saveAndClose()
	{
		this.isAdd = false;

		this.save().subscribe(loco =>
		{
			this.onSaveComplete(loco);
			this.sidePanel.isDirty = false;

			this.sidePanel.toggleSidePanel();
		},
			error => this.handleSaveError()
		);
	}

	onSaveComplete(loco: LocationGroupMarket)
	{
		this.onSaveLocationGroup.emit(loco);
		this.handleSaveSuccess();
		this.locationForm.reset();

		const tags = <FormArray>this.locationForm.controls['tags'];

		// reset doesn't apply to FormArrays so removing the tags manually.
		for (let x = tags.length - 1; x >= 0; x--)
		{
			tags.removeAt(x);
		}

		this.locationGroup = new LocationGroupMarket();
	}

	onAddSearchTag()
	{
		let tag = this.locationForm.get('searchTag').value;

		if (tag)
		{
			let existingTag = this.locationGroup.tags.find(t => t === tag);

			if (!existingTag)
			{
				const tagsArray = this.locationForm.get('tags') as FormArray;
				const tagControl = new FormControl(tag);

				tagsArray.push(tagControl);

				this.detectChangesInTags(tagsArray);

				let searchTagControl = this.locationForm.controls['searchTag'];

				if (searchTagControl)
				{
					searchTagControl.reset();
				}
			}
		}
	}

	onRemoveTag(index: number)
	{
		const tagsArray = this.locationForm.get('tags') as FormArray;

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

		const diffA = _.difference(tags, this.locationGroup.tags);
		const diffB = _.difference(this.locationGroup.tags, tags);

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
			let existingTag = this.locationGroup.tags.find(t => t == control.value);

			return existingTag ? { duplicateTag: true } : null;
		};
	}

	duplicateName(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			let inputName = control.value as string;
			let existingName = inputName ? this.locationGroups.find(n => n.locationGroupName.toLowerCase() === inputName.toLowerCase() && n.id != this.locationGroup.id) : null;

			return existingName ? { duplicateName: true } : null;
		};
	}

	private handleSaveError()
	{
		this.isSaving = false;

		this._msgService.add({ severity: 'error', summary: 'Location Group', detail: `failed to saved!` });

		return empty;
	}

	private handleSaveSuccess()
	{
		this._msgService.add({ severity: 'success', summary: 'Location Group', detail: `has been saved!` });
	}
}
