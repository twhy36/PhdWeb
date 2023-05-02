import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

import { flatMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { MergeField, CommunityMergeField, isCommunityMergeField } from '../../../shared/models/mergeField.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { SidePanelComponent } from 'phd-common';

@Component({
	selector: 'merge-fields-side-panel-component',
	templateUrl: './merge-fields-side-panel.component.html',
	styleUrls: ['./merge-fields-side-panel.component.scss']
})
export class MergeFieldsSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent

	@Input() currentMkt: FinancialMarket;
	@Input() marketMergeFields: Array<MergeField>;
	@Input() communityMergeFields: Array<CommunityMergeField>;
	@Input() selected: MergeField | CommunityMergeField;
	@Input() sidePanelOpen: boolean = false;
	@Input() saving: boolean;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Output() onSave = new EventEmitter<object>();

	get isActive(): boolean
	{
		let isActive = this.selected ? this.selected.isActive : true;

		return isActive;
	}

	mergeFieldsForm: UntypedFormGroup;

	get isDirty(): boolean
	{
		return this.mergeFieldsForm.dirty;
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = (!this.selected) ? (this.mergeFieldsForm.pristine || !this.mergeFieldsForm.valid) : !this.mergeFieldsForm.dirty;

		return saveDisabled;
	}

	constructor(private _orgService: OrganizationService) { }

	ngOnInit(): void
	{
		this.createForm();
	}

	createForm()
	{
		let fieldName = this.selected ? this.selected.fieldName : null;
		let fieldValue = this.selected ? this.selected.fieldValue : null;
		let isActive = this.selected ? this.selected.isActive : null;

		this.mergeFieldsForm = new UntypedFormGroup({
			'fieldName': new UntypedFormControl({ value: fieldName, disabled: (this.selected && isCommunityMergeField(this.selected)) }, [Validators.required, this.whiteSpaceValidator(), this.fieldNameDuplicateCheck()]),
			'fieldValue': new UntypedFormControl(fieldValue, [Validators.required, this.whiteSpaceValidator(), this.fieldValueDuplicateCheck()]),
			'isActive': new UntypedFormControl(isActive)
		});

		if (this.selected)
		{
			this.mergeFieldsForm.addControl('customFieldMarketId', new UntypedFormControl(this.selected.customFieldMarketId));

			if (isCommunityMergeField(this.selected))
			{
				this.mergeFieldsForm.addControl('customFieldFinancialCommunityId', new UntypedFormControl(this.selected.customFieldFinancialCommunityId));
			}
		}
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	onCancel()
	{
		this.sidePanel.toggleSidePanel();
	}

	whiteSpaceValidator(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			let isWhitespace = (control.value || '').trim().length === 0;
			let isValid = !isWhitespace;

			return isValid ? null : { whiteSpaceValidator: true }
		};
	}

	fieldNameDuplicateCheck(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			let inputName = control.value as string;
			let existingName;

			if (this.selected)
			{
				let remainingMergeFields = this.marketMergeFields.filter(t => t.customFieldMarketId !== this.selected.customFieldMarketId);

				existingName = inputName ? remainingMergeFields.find(n => n.fieldName.toLowerCase() === inputName.toLowerCase()) : null;
			}
			else
			{
				existingName = inputName ? this.marketMergeFields.find(n => n.fieldName.toLowerCase() === inputName.toLowerCase()) : null;
			}

			return existingName ? { fieldNameDuplicateCheck: true } : null;
		};
	}

	fieldValueDuplicateCheck(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			let inputName = control.value as string;
			let existingName;

			if (this.selected && isCommunityMergeField(this.selected))
			{
				let remainingMergeFields = this.communityMergeFields.filter(t => t.customFieldMarketId !== this.selected.customFieldMarketId);

				existingName = inputName ? remainingMergeFields.find(n => n.fieldValue.toLowerCase() === inputName.toLowerCase()) : null;
			}
			else if (this.selected && !isCommunityMergeField(this.selected))
			{
				let remainingMergeFields = this.marketMergeFields.filter(t => t.customFieldMarketId !== this.selected.customFieldMarketId);

				existingName = inputName ? remainingMergeFields.find(n => n.fieldValue.toLowerCase() === inputName.toLowerCase()) : null;
			}
			else
			{
				existingName = inputName ? this.marketMergeFields.find(n => n.fieldValue.toLowerCase() === inputName.toLowerCase()) : null;
			}

			return existingName ? { fieldValueDuplicateCheck: true } : null;
		};
	}

	save()
	{
		if (!this.selected && !this.mergeFieldsForm.controls.isActive.touched)
		{
			this.mergeFieldsForm.controls['isActive'].setValue('true');
		}

		this.saveNewOrg(this.currentMkt);
	}

	saveNewOrg(marketDto: FinancialMarket)
	{
		this._orgService.getInternalOrgs(marketDto.id).pipe(
			flatMap(orgs =>
			{
				let org = orgs.find(o => (o.edhMarketId === marketDto.id && o.edhFinancialCommunityId === null));

				if (org)
				{
					return of(org);
				}
				else
				{
					return this._orgService.createInternalOrg(marketDto);
				}
			})
		).subscribe(data =>
		{
			this.onSave.emit(this.mergeFieldsForm.value);
			this.saving = true;
		});
	}
}
