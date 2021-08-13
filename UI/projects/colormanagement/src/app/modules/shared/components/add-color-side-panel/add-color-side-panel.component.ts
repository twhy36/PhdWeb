import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormArray, FormControl, Validators, AbstractControl } from '@angular/forms';

import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';

@Component({
  selector: 'add-color-side-panel',
  templateUrl: './add-color-side-panel.component.html',
  styleUrls: ['./add-color-side-panel.component.scss']
})
export class AddColorSidePanelComponent implements OnInit {

	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Input() sidePanelOpen: boolean = false;
	@Input() isSaving: boolean;

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
		return true;
	}

	get disableHideChoice(): boolean
	{
		return true;
	}

	get disableHideChoicePrice(): boolean
	{
		return true;
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

	constructor() { }

	ngOnInit()
	{
		this.isAdd = true;
		this.sidePanelHeader = 'Add Color';
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
		return 'Subheader title goes here';
	}

	createForm()
	{

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

		return of(null);
	}

	save()
	{

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
