import { Component, OnInit, Input, Output, OnDestroy, EventEmitter } from '@angular/core';
import { FormGroup, FormControl, AbstractControl, ValidatorFn, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, Observable } from 'rxjs';

import { Attribute } from '../../../../../shared/models/attribute.model';
import { MessageService } from 'primeng/api';

import { difference } from "lodash";
import { IPictureParkAsset } from '../../../../../shared/models/image.model';

@Component({
	selector: 'attribute-details-tab',
	templateUrl: './attribute-details-tab.component.html',
	styleUrls: ['./attribute-details-tab.component.scss']
})
export class AttributeDetailsTabComponent implements OnInit, OnDestroy
{
	@Input() selectedAttribute: Attribute;
	@Input() existingAttributes: Array<Attribute>;
	@Input() isSaving$: Observable<boolean>;
	@Input() isReadOnly: boolean;

	@Output() attributeChanged = new EventEmitter();

	attributeForm: FormGroup;
	attribute: Attribute;
	isSaving: boolean;
	
    private formSubs: Subscription[];

	get imgUrl(): string
	{
		return this.attributeForm.get('image').value ? this.attributeForm.get('image').value : '';
	}

	set imgUrl(val: string)
	{
		this.attributeForm.get('image').setValue(val);
	}

	constructor(private route: ActivatedRoute, private _msgService: MessageService) { }

	ngOnInit() {
		this.createForm();

		this.isSaving$.subscribe(saving => {
			this.isSaving = saving;
			if (this.attributeForm) {
				this.isSaving ? this.attributeForm.disable() : this.attributeForm.enable();
			}
		});
    }

    ngOnDestroy() {
        if (this.formSubs) {
            this.formSubs.forEach(sub => sub.unsubscribe());
        }
    }

	createForm() {
		this.attribute = new Attribute(this.selectedAttribute);
		if (this.selectedAttribute && this.selectedAttribute.isDefaultEndDate()) {
			this.attribute.endDate = null;
		}

		this.attributeForm = new FormGroup({
			'name': new FormControl(this.attribute.name, { validators: [this.duplicateName()], updateOn: 'blur'}),
			'image': new FormControl(this.attribute.imageUrl),
			'manufacturer': new FormControl(this.attribute.manufacturer),
			'sku': new FormControl(this.attribute.sku),
			'searchTag': new FormControl('', this.duplicateTag()),
			'tags': new FormArray([]),
			'description': new FormControl(this.attribute.attributeDescription),
			'startDate': new FormControl(this.attribute.startDate),
			'endDate': new FormControl(this.attribute.endDate),
		});

        this.attributeForm.validator = this.validateDates;

        this.formSubs = [
            this.attributeForm.get('manufacturer').valueChanges.subscribe(() => this.attributeForm.get('name').updateValueAndValidity()),
            this.attributeForm.get('sku').valueChanges.subscribe(() => this.attributeForm.get('name').updateValueAndValidity())
		];

		const tagsArray = this.attributeForm.get("tags") as FormArray;
		this.attribute.tags.forEach(t => tagsArray.push(new FormControl(t)));

		this.attributeForm.valueChanges.subscribe(() => {
			this.attributeChanged.emit();
		});
	}

	getFormData(): Attribute {
		const tagsArray = this.attributeForm.get("tags") as FormArray;

		this.attribute.marketId = +this.route.parent.snapshot.paramMap.get('marketId');
		this.attribute.name = this.attributeForm.get('name').value;
		this.attribute.imageUrl = this.attributeForm.get('image').value;
		this.attribute.manufacturer = this.attributeForm.get('manufacturer').value;
		this.attribute.sku = this.attributeForm.get('sku').value;
		this.attribute.attributeDescription = this.attributeForm.get('description').value;
		this.attribute.startDate = this.attributeForm.get('startDate').value;
		this.attribute.endDate = this.attributeForm.get('endDate').value;
		this.attribute.tags = tagsArray.controls.map(t => t.value as string);

		if (!this.attribute.startDate)
		{
			this.attribute.startDate = new Date();
		}

		if (!this.attribute.endDate)
		{
			this.attribute.endDate = this.attribute.defaultEndDate;
		}

		return this.attribute;
	}

	reset()
	{
		this.attributeForm.reset();
		this.attribute = new Attribute();
		this.imgUrl = "";

		let tags = <FormArray>this.attributeForm.controls['tags'];
		for (let i = tags.length - 1; i >= 0; i--) {
			tags.removeAt(i);
		}
	}

	onAddSearchTag()
	{
		let tag = this.attributeForm.get('searchTag').value;

		if (tag)
		{
			let existingTag = this.attribute.tags.find(t => t === tag);

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
		if (!this.isSaving) {
			const tagsArray = this.attributeForm.get("tags") as FormArray;
			tagsArray.removeAt(index);

			this.detectChangesInTags(tagsArray);
		}
	}

	validateDates(formGroup: FormGroup): { [key: string]: boolean }
	{
		let startDate = formGroup.controls['startDate'];
		let endDate = formGroup.controls['endDate'];

		if (endDate.valid && endDate.value)
		{
			let startDateValue = startDate.valid && startDate.value ? startDate.value : new Date();

			if (startDateValue > endDate.value)
			{
				return {
					invalidDates: true
				};
			}
		}

		return null;
	}

	duplicateTag(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			let existingTag = this.attribute.tags.find(t => t == control.value);

			return existingTag ? { duplicateTag: true } : null;
		};
	}

	duplicateName(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
        {
            const inputName = control.value as string;
            const manufacturer = control.parent ? control.parent.get('manufacturer').value as string : null;
            const sku = control.parent ? control.parent.get('sku').value as string : null;
			const attPred = (att: Attribute) =>
				!(this.selectedAttribute && this.selectedAttribute.id === att.id)
				&& att.name.toLowerCase() === inputName.toLowerCase()
                && ((att.manufacturer || '').toLowerCase() === (manufacturer || '').toLowerCase())
                && ((att.sku || '').toLowerCase() === (sku || '').toLowerCase());
            const existingName = inputName ? this.existingAttributes.find(attPred) : null;

			return existingName ? { duplicateName: true } : null;
		};
	}

	onAddImage(assets: IPictureParkAsset[])
	{
		let imgForm = this.attributeForm.get('image');

		imgForm.markAsDirty();
		imgForm.markAsTouched();

		if (assets && assets.length > 0)
		{
			const imgUrl = assets[0].url;

			this.imgUrl = imgUrl;
			
			imgForm.setValue(imgUrl);
		}
		else
		{
			this._msgService.add({ severity: 'error', summary: 'Unable to get image from Picture Park.'	});
		}
	}

	onClearImage()
	{
		this.imgUrl = '';
		let imgForm = this.attributeForm.get('image');

		imgForm.markAsDirty();
		imgForm.markAsTouched();
		imgForm.setValue('');
	}

	/**
	 * this checks to see if any changes have been made to the list of tags
	 * and marks the FormArray for tags dirty or pristine 
	 * @param tagsArray
	 */
	private detectChangesInTags(tagsArray: FormArray) {

		const tags = tagsArray.controls.map(c => c.value as string);

		const diffA = difference(tags, this.attribute.tags);
		const diffB = difference(this.attribute.tags, tags);

		if (diffA.length > 0 || diffB.length > 0) {
			tagsArray.markAsDirty();
			this.attributeChanged.emit();
		} else {
			tagsArray.markAsPristine();
		}
	}
}
