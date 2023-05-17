import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormControl, AbstractControl, ValidatorFn, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';

import { Location } from '../../../../../shared/models/location.model';

import { difference } from 'lodash';

@Component({
	selector: 'locations-details-tab',
	templateUrl: './locations-details-tab.component.html',
	styleUrls: ['./locations-details-tab.component.scss']
})
export class LocationsDetailsTabComponent implements OnInit
{
	@Input() selectedLocation: Location;
	@Input() existingLocations: Array<Location>;
	@Input() isSaving$: Observable<boolean>;

	@Output() locationChanged = new EventEmitter();

	locationForm: FormGroup;
	location: Location;
	isSaving: boolean;

	constructor(private route: ActivatedRoute) { }

	ngOnInit()
	{
		this.createForm();

		this.isSaving$.subscribe(saving =>
		{
			this.isSaving = saving;

			if (this.locationForm)
			{
				this.isSaving ? this.locationForm.disable() : this.locationForm.enable();
			}
		});
	}

	createForm()
	{
		this.location = new Location(this.selectedLocation);

		this.locationForm = new FormGroup({
			'locationName': new FormControl(this.location.locationName, { validators: [this.duplicateName()], updateOn: 'blur' }),
			'searchTag': new FormControl('', this.duplicateTag()),
			'tags': new FormArray([]),
			'locationDescription': new FormControl(this.location.locationDescription)
		});

		const tagsArray = this.locationForm.get('tags') as FormArray;

		this.location.tags.forEach(t => tagsArray.push(new FormControl(t)));

		this.locationForm.valueChanges.subscribe(() =>
		{
			this.locationChanged.emit();
		});
	}

	getFormData(): Location
	{
		const tagsArray = this.locationForm.get('tags') as FormArray;

		this.location.marketId = +this.route.parent.snapshot.paramMap.get('marketId');
		this.location.locationName = this.locationForm.get('locationName').value;
		this.location.locationDescription = this.locationForm.get('locationDescription').value;
		this.location.tags = tagsArray.controls.map(t => t.value as string);

		return this.location;
	}

	reset()
	{
		this.locationForm.reset();
		this.location = new Location();

		let tags = <FormArray>this.locationForm.controls['tags'];

		for (let i = tags.length - 1; i >= 0; i--)
		{
			tags.removeAt(i);
		}
	}

	onAddSearchTag()
	{
		let tag = this.locationForm.get('searchTag').value;

		if (tag)
		{
			let existingTag = this.location.tags.find(t => t === tag);

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
		if (!this.isSaving)
		{
			const tagsArray = this.locationForm.get('tags') as FormArray;

			tagsArray.removeAt(index);

			this.detectChangesInTags(tagsArray);
		}
	}

	/**
	 * this checks to see if any changes have been made to the list of tags
	 * and marks the FormArray for tags dirty or pristine 
	 * @param tagsArray
	 */
	private detectChangesInTags(tagsArray: FormArray)
	{
		const tags = tagsArray.controls.map(c => c.value as string);

		const diffA = difference(tags, this.location.tags);
		const diffB = difference(this.location.tags, tags);

		if (diffA.length > 0 || diffB.length > 0)
		{
			tagsArray.markAsDirty();

			this.locationChanged.emit();
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
			const tagsArray = this.locationForm?.get('tags') as FormArray;
			const existingTag = tagsArray?.value.find(t => t?.toLowerCase() == control.value?.toLowerCase().trim());

			return existingTag ? { duplicateTag: true } : null;
		};
	}

	duplicateName(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			let inputName = control.value as string;
			let existingName = inputName ? this.existingLocations.find(n => n.locationName.toLowerCase() === inputName.toLowerCase() && this.location.id !== n.id) : null;

			return existingName ? { duplicateName: true } : null;
		};
	}
}
