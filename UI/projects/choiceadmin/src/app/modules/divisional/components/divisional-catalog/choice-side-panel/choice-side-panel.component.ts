import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormArray, UntypedFormControl, Validators, AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';

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
	catalogForm: UntypedFormGroup;
	maxLabels: number = 10;
	sidePanelHeader: string = '';
	sidePanelSubheader: string = '';

	get showPlus(): boolean
	{
		return this.labelArray.length < this.maxLabels;
	}

	get disableIsDefault(): boolean
	{
		return this.catalogItem.parent.choices.some(x => x.isDefault == true && x.id != this.catalogItem.id);
	}

	get disableHideChoice(): boolean
	{
		return this.catalogItem.parent.choices.some(x => x.priceHiddenFromBuyerView == true);
	}

	get disableHideChoicePrice(): boolean
	{
		return this.catalogItem.parent.choices.some(x => x.isHiddenFromBuyerView == true);
	}

	get labelArray(): UntypedFormArray
	{
		return <UntypedFormArray>this.catalogForm.get('labelArray');
	}

	get canSave(): boolean
	{
		const canSave = this.catalogForm.pristine || !this.catalogForm.valid || this.isSaving;

		if (this.sidePanel)
		{
			// make panel dirty if at least one label input has a value
			this.sidePanel.isDirty = this.isAdd ? this.labelArray.controls.some(c => c.value && (<string>c.value).trim().length > 0) : !canSave;
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
			this.labelArray.valueChanges.subscribe((labels: Array<string>) =>
			{
				if (labels.some(l => l && l.trim().length > 0))
				{
					// remove required validation if at least one label input has a value
					this.labelArray.controls.forEach(c => c.removeValidators(Validators.required));
				}
				else
				{
					// add required validation when no label inputs have a value
					this.labelArray.controls.forEach(c => c.addValidators(Validators.required));
				}

				// will trigger validation to rerun.
				this.labelArray.controls.forEach(c => c.updateValueAndValidity({ onlySelf: true }));
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
		const item = this.catalogItem;

		if (item.id == null)
		{
			this.catalogForm = new UntypedFormGroup({
				'labelArray': new UntypedFormArray([
					new UntypedFormControl(null, { validators: [Validators.required], asyncValidators: [this.labelValidator()], updateOn: 'blur' })
				])
			});
		}
		else
		{
			const label: string = item.label;
			const isDefault: boolean = item.isDefault;
			const isHiddenFromBuyerView: boolean = item.isHiddenFromBuyerView;
			const priceHiddenFromBuyerView: boolean = item.priceHiddenFromBuyerView;

			this.catalogForm = new UntypedFormGroup({
				'label': new UntypedFormControl(label, { validators: [Validators.required], asyncValidators: [this.labelValidator()], updateOn: 'blur' }),
				'isDefault': new UntypedFormControl({ value: isDefault, disabled: this.disableIsDefault }),
				'isHiddenFromBuyerView': new UntypedFormControl(isHiddenFromBuyerView),
				'priceHiddenFromBuyerView': new UntypedFormControl(priceHiddenFromBuyerView)
			});
		}
	}

	onAddChoice(tabIndex?: number)
	{
		if (this.showPlus && (tabIndex === undefined || (tabIndex === this.labelArray.length - 1)))
		{
			const control = new UntypedFormControl(null, { validators: [Validators.required], asyncValidators: [this.labelValidator()], updateOn: 'blur' });

			this.labelArray.push(control);
		}
	}

	/**
	 * Validate label checking for duplicates
	 */
	labelValidator(): AsyncValidatorFn
	{
		return (control: AbstractControl): Observable<ValidationErrors | null> =>
		{
			const divDPointId = this.catalogItem.parent.id;
			const labelValue = control.value ? (<string>control.value).toLowerCase() : '';
			const label: string = labelValue.trim();
			const hasValidLabel = this.isAdd && this.labelArray.controls.some(c => c.value && (<string>c.value).trim().length > 0);

			if (label.length > 0)
			{
				const obs = this._divService.doesChoiceLabelExist(label, this.catalogItem.id, divDPointId).pipe(map((data) =>
				{
					if (!data && this.isAdd)
					{
						// check the current array of labels for any duplicates
						data = this.labelArray.controls.some(x => x.value && (<string>x.value).toLowerCase().trim() == label && x != control);
					}

					return data ? { 'alreadyExist': true } : null;
				}));

				return obs;
			}
			else if (!hasValidLabel && labelValue.length === 0 && label.length === 0)
			{
				return of({ 'invalidLabel': true });
			}

			return of(null);
		}
	}

	save()
	{
		const item = this.catalogItem;
		const form = this.catalogForm;

		if (item.id == null)
		{
			const choices = this.labelArray.controls.filter(c => c.value && c.value.length).map(c =>
			{
				let newChoice = new DivDChoice({
					choiceLabel: c.value.trim(),
					divChoiceCatalogID: 0,
					divChoiceSortOrder: 0,
					divDpointCatalogID: item.parent.id,
					dPointCatalogID: item.parent.dto.dPointCatalogID,
					isActive: true,
					isDecisionDefault: false,
					isInUse: false,
					isHiddenFromBuyerView: false,
					priceHiddenFromBuyerView: false
				});

				newChoice.parent = item.parent;

				return newChoice;
			});

			this.onSaveCatalogItem.emit({ item: choices });
		}
		else
		{
			const label = form.get('label').value.trim();
			const isDefault = form.get('isDefault').value;
			const isHiddenFromBuyerView = form.get('isHiddenFromBuyerView').value;
			const priceHiddenFromBuyerView = form.get('priceHiddenFromBuyerView').value;

			item.dto.choiceLabel = label;
			item.isDefault = isDefault;
			item.isHiddenFromBuyerView = isHiddenFromBuyerView;
			item.priceHiddenFromBuyerView = priceHiddenFromBuyerView;

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

	checkHiddenStatus()
	{
		if (!this.catalogForm.get('isHiddenFromBuyerView').value && this.catalogForm.get('priceHiddenFromBuyerView').value)
		{
			this.catalogForm.get('priceHiddenFromBuyerView').setValue(false);
		}
		else if (!this.catalogForm.get('priceHiddenFromBuyerView').value && this.catalogForm.get('isHiddenFromBuyerView').value)
		{
			this.catalogForm.get('isHiddenFromBuyerView').setValue(false);
		}
	}
}
