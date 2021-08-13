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

	sidePanelHeader: string = '';
	sidePanelSubheader: string = '';

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

	get canSave(): boolean
	{
		return true;
	}

	constructor() { }

	ngOnInit()
	{
		this.sidePanelHeader = 'Add Color';
		this.sidePanelSubheader = this.getSidePanelSubheader();

		this.createForm();
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

	onCloseSidePanel()
	{
		this.sidePanelOpen = false;
		this.onSidePanelClose.emit(this.sidePanelOpen);
	}
}
