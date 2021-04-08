import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';

import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { SidePanelComponent } from '../../../../shared/components/side-panel/side-panel.component';

import { DivDChoice } from '../../../../shared/models/choice.model';

import { DivisionalService } from '../../../../core/services/divisional.service';

@Component({
	selector: 'choice-side-panel',
	templateUrl: './choice-side-panel.component.html',
	styleUrls: ['./choice-side-panel.component.scss']
})
export class ChoiceSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Input() sidePanelOpen: boolean = false;
	@Input() catalogItem: DivDChoice;
	@Input() isSaving: boolean;

	@Output() onSaveCatalogItem = new EventEmitter<{ item: DivDChoice | DivDChoice[] }>();
	@Output() onSidePanelClose = new EventEmitter<boolean>();

	isOpen: boolean = true;
	isAdd: boolean;
	catalogForm: FormGroup;
	maxLabels: number = 10;
	sidePanelHeader: string = '';
	sidePanelSubheader: string = '';

	get showPlus(): boolean
	{
		return (<FormArray>this.catalogForm.get('labelArray')).length < this.maxLabels;
	}

	get disableIsDefault(): boolean
	{
		return this.catalogItem.parent.choices.some(x => x.isDefault == true && x.id != this.catalogItem.id);
	}

	get labelArray(): FormArray
	{
		return <FormArray>this.catalogForm.get('labelArray');
	}

	get canSave(): boolean
	{
		let canSave = this.catalogForm.pristine || !this.catalogForm.valid || this.isSaving;

		if (this.sidePanel)
		{
			// make panel dirty if at least one label input has a value
			if (this.isAdd)
			{				
				this.sidePanel.isDirty = this.labelArray.controls.some(c => c.value && (<string>c.value).trim().length > 0);
			}
			else
			{
				this.sidePanel.isDirty = !canSave;
			}
		}

		return canSave;
	}

	constructor(private _divService: DivisionalService) { }

	ngOnInit()
	{
		this.isAdd = this.catalogItem.id == null;
		this.sidePanelHeader = `${this.isAdd ? 'Add' : 'Edit'} Choice`;
		this.sidePanelSubheader = this.getSidePanelSubheader();

		this.createForm();

		if (this.isAdd)
		{
			// re-validate array of label inputs whenever one changes
			this.catalogForm.get('labelArray').valueChanges.subscribe((labels: Array<string>) =>
			{
				if (labels.some(l => l && l.trim().length > 0))
				{
					// remove required validation if at least one label input has a value
					(<FormArray>this.catalogForm.get('labelArray')).controls.forEach(c => c.clearValidators());
				}
				else
				{
					// add required validation when no label inputs have a value
					(<FormArray>this.catalogForm.get('labelArray')).controls.forEach(c => c.setValidators(Validators.required));
				}

				(<FormArray>this.catalogForm.get('labelArray')).controls.forEach(c => c.updateValueAndValidity({ onlySelf: true }));
			});
		}
	}

	getSidePanelSubheader(): string
	{
		const item = this.catalogItem;

		let subheader = `${item.parent.parent.label} >> ${item.parent.label}`;

		if (item instanceof DivDChoice)
		{
			subheader = `${item.parent.parent.parent.label} >> ${subheader}`;
		}

		if (item.id != null)
		{
			subheader = `${subheader} >> ${item.label}`;
		}

		return subheader;
	}

	createForm()
	{
		let item = this.catalogItem;

		if (item.id == null)
		{
			this.catalogForm = new FormGroup({
				'labelArray': new FormArray([
					new FormControl(null, Validators.required, this.labelValidator.bind(this))
				])
			});
		}
		else
		{
			let label: string = item.label;
			let isDefault: boolean = item.isDefault;

			this.catalogForm = new FormGroup({
				'label': new FormControl(label, Validators.required, this.labelValidator.bind(this)),
				'isDefault': new FormControl({ value: isDefault, disabled: this.disableIsDefault })
			});
		}
	}

	onAddChoice(tabIndex?: number)
	{
		const labelArray = <FormArray>this.catalogForm.get('labelArray');

		if (this.showPlus && (tabIndex === undefined || (tabIndex === labelArray.length - 1)))
		{
			const control = new FormControl(null, Validators.required, this.labelValidator.bind(this));

			labelArray.push(control);
		}
	}

	/**
	 * Validate label checking for duplicates
	 * @param control
	 */
	labelValidator(control: AbstractControl): Promise<{ [key: string]: any; }> | Observable<{ [key: string]: any; }>
	{
		const divDPointId = this.catalogItem.parent.id;
		const labelValue = control.value ? (<string>control.value).toLowerCase() : '';
		const label: string = labelValue.trim();

		if (label.length > 0)
		{
			let obs = this._divService.doesChoiceLabelExist(label, this.catalogItem.id, divDPointId).pipe(map((data) =>
			{
				if (!data && this.isAdd)
				{
					let labelArray = (<FormArray>this.catalogForm.get('labelArray'));

					// check the current array of labels for any duplicates
					data = labelArray.controls.some(x => x.value && (<string>x.value).toLowerCase().trim() == label && x != control);
				}

				return data ? { 'alreadyExist': true } : null;
			}));

			return obs;
		}
		else if (labelValue.length && label.length === 0)
		{
			return of({ 'invalidLabel': true });
		}

		return of(null);
	}

	save()
	{
		const item = this.catalogItem;
		const form = this.catalogForm;

		if (item.id == null)
		{
			const labelArray = (<FormArray>form.get('labelArray'));

			const choices = labelArray.controls.filter(c => c.value && c.value.length).map(c =>
			{
				let newChoice = new DivDChoice({
					choiceLabel: c.value.trim(),
					divChoiceCatalogID: 0,
					divChoiceSortOrder: 0,
					divDpointCatalogID: item.parent.id,
					dPointCatalogID: item.parent.dto.dPointCatalogID,
					isActive: true,
					isDecisionDefault: false,
					isInUse: false
				});

				newChoice.parent = item.parent;

				return newChoice;
			});

			this.onSaveCatalogItem.emit({ item: choices });
		}
		else
		{
			let label = form.get('label').value.trim();
			let isDefault = form.get('isDefault').value;

			item.dto.choiceLabel = label;
			item.isDefault = isDefault;

			this.onSaveCatalogItem.emit({ item: item });
		}
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	toggleSidePanel()
	{
		this.sidePanel.toggleSidePanel();
	}
}
