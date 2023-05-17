import { Component, Input, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';

import { SidePanelComponent } from '../../../../shared/components/side-panel/side-panel.component';
import { DTVersion } from '../../../../shared/models/tree.model';
import * as moment from 'moment';

@Component({
	selector: 'tree-side-panel',
	templateUrl: './tree-side-panel.component.html',
	styleUrls: ['./tree-side-panel.component.scss']
})
export class TreeSidePanelComponent implements OnInit
{
	constructor(
		private _fb: FormBuilder
	) { }

	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Input() treeVersion: DTVersion;
	@Input() canEdit = false;
	@Input() isReadOnly = false;
	@Input() isSaving = false;
	@Input() sidePanelOpen = false;
	@Input() title: string;

	@Output() hasChanges = new EventEmitter<boolean>();
	@Output() sidePanelClose = new EventEmitter();
	@Output() save = new EventEmitter<{ treeVersion: DTVersion, canUnpublishTree: boolean }>();

	today = new Date();
	publishStartDate: Date = null;
	publishEndDate: Date = null;

	hasBeenPublished: boolean = false;

	treeDetailsForm: FormGroup;

	ngOnInit(): void
	{
		if (this.treeVersion.publishStartDate)
		{
			this.publishStartDate = this.treeVersion.publishStartDate.toDate();
			this.hasBeenPublished = true;
		}
		else
		{
			this.publishStartDate = this.today;
		}

		if (this.treeVersion.publishEndDate)
		{
			this.publishEndDate = this.treeVersion.publishEndDate.toDate();
		}
		else
		{
			if (this.canUnpublishTree)
			{
				this.publishEndDate = this.today;
			}
		}

		this.createForm();
	}

	private createForm()
	{
		this.treeDetailsForm = this._fb.group(
			{
				name: [{ value: this.treeVersion.name, disabled: this.isReadOnly }, [Validators.required, Validators.maxLength(50)]],
				description: [{ value: this.treeVersion.description, disabled: this.isReadOnly }, Validators.maxLength(50)],
				effectiveDate: [{ value: this.publishStartDate, disabled: this.isReadOnly }, Validators.required],
				endDate: [{ value: this.publishEndDate, disabled: !this.canUnpublishTree }]
			}
		);

		this.treeDetailsForm.get('endDate').setValidators(this.conditionalRequired());
	}

	private conditionalRequired()
	{
		if (this.canUnpublishTree)
		{
			return [Validators.required];
		}
		else
		{
			return [];
		}
	}

	get canUnpublishTree(): boolean
	{
		// has rights, has been published, empty or future end date
		return this.canEdit &&
			this.treeVersion.publishStartDate != null && this.hasBeenPublished &&
			(this.treeVersion.publishEndDate == null || !moment().isAfter(this.treeVersion.publishEndDate)) &&
			this.isReadOnly;
	}

	get showEndDate(): boolean
	{
		return this.treeVersion.publishStartDate != null && this.isReadOnly && this.hasBeenPublished;
	}

	get canSave(): boolean
	{
		let canSave = ((!this.treeDetailsForm.pristine || this.treeDetailsForm.touched) && this.treeDetailsForm.valid) || this.isSaving;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = canSave;
		}

		return canSave;
	}

	setHasChanges()
	{
		this.hasChanges.emit(this.treeDetailsForm.dirty);
	}

	async onSaveClick()
	{
		this.treeVersion.name = this.treeDetailsForm.get('name').value;
		this.treeVersion.description = this.treeDetailsForm.get('description').value;

		const effectiveDate = this.treeDetailsForm.get('effectiveDate').value;
		const endDate = this.treeDetailsForm.get('endDate').value;

		this.treeVersion.publishStartDate = moment(effectiveDate);

		if (endDate)
		{
			this.treeVersion.publishEndDate = moment(endDate);
		}

		this.save.emit({ treeVersion: this.treeVersion, canUnpublishTree: this.canUnpublishTree });
	}

	onCloseClick()
	{
		this.sidePanelClose.emit();
	}

	toggleSidePanel()
	{
		this.sidePanel.toggleSidePanel();
	}
}
