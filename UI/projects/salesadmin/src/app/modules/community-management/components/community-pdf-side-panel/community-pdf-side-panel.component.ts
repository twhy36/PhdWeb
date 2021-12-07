import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from "@angular/forms";
import { SidePanelComponent } from "phd-common";
import { CommunityPdf, ISectionHeader, SectionHeader } from "../../../shared/models/communityPdf.model";
import { FinancialCommunityViewModel } from "../../../shared/models/plan-assignment.model";

import * as moment from "moment";

@Component({
	selector: 'community-pdf-side-panel-component',
	templateUrl: './community-pdf-side-panel.component.html',
	styleUrls: ['./community-pdf-side-panel.component.scss']
})
export class CommunityPdfSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Output() onSave = new EventEmitter<object>();
	@Output() onUpdate = new EventEmitter<object>();
	@Input() communityPdfs: Array<CommunityPdf>;
	@Input() includedFeaturesExists: boolean;
	@Input() selected: CommunityPdf;
	@Input() selectedCommunity: FinancialCommunityViewModel;
	@Input() saving: boolean;
	@Input() sidePanelOpen: boolean = false;

	communityPdfForm: FormGroup;

	customMsgBody: string;
	oneDay: number = 86400000;
	pdf: Blob;
	effectiveDate: Date;
	expirationDate: Date;
	includedFeaturesSelected: boolean = false;
	minEffectiveDate: Date = new Date(new Date().getTime() - this.oneDay);
	minDate: Date = new Date();

	public sectionHeaders: Array<ISectionHeader> = [
		{ label: 'Home Warranty', id: 0 },
		{ label: 'Community Association', id: 1 },
		{ label: 'Additional Documents', id: 2 },
		{ label: 'Included Features', id: 3 }
	]

	get isDirty(): boolean
	{
		return this.communityPdfForm.dirty;
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = (!this.selected) ? (this.communityPdfForm.pristine || !this.communityPdfForm.valid) : (!this.communityPdfForm.valid);

		return saveDisabled;
	}

	constructor() { }

	ngOnInit()
	{
		this.customMsgBody = `An Included Features PDF exists for this community.<br>
			If you choose to Continue, the existing PDF will be<br>
			expired. If you choose to Cancel, no changes will be<br>
			made.`;
		this.createForm();
	}

	convertDate(date)
	{
		return moment.parseZone(date).format("M/DD/YYYY");
	}

	handleSave()
	{
		if (this.includedFeaturesExists && this.communityPdfForm.get('sectionHeader').value === SectionHeader.IncludedFeatures)
		{
			this.sidePanel.showCustomConfirm();
		}
		else{
			this.save();
		}
	}

	save()
	{
		if (this.selected != null)
		{
			const effectiveDateValue = this.communityPdfForm.get('effectiveDate')?.value;
			const expirationDateValue = this.communityPdfForm.get('expirationDate')?.value;
			const updatedPdf =
			{
				marketId: null,
				financialCommunityId: null,
				sortOrder: this.selected.sortOrder,
				linkText: this.communityPdfForm.get('linkText')?.value,
				description: this.communityPdfForm.get('description')?.value,
				effectiveDate: effectiveDateValue !== null ? new Date(effectiveDateValue).toISOString() : null,
				expirationDate: expirationDateValue !== null ? new Date(expirationDateValue).toISOString() : null,
				fileName: this.selected.fileName,
				sectionHeader: this.communityPdfForm.get('sectionHeader')?.value,
			};

			this.onUpdate.emit(updatedPdf as CommunityPdf);

			this.saving = true;
		}
		else
		{
			const formData = new FormData();
			for (const key of Object.keys(this.communityPdfForm.value))
			{
				if (key === 'effectiveDate' || key == 'expirationDate')
				{
					formData.set(key, this.communityPdfForm.get(key).value !== null ? new Date(this.communityPdfForm.get(key).value).toISOString() : null)
				}
				else
				{
					formData.append(key, this.communityPdfForm.get(key).value);
				}
			}
			
			if (this.communityPdfForm.get('sectionHeader').value === SectionHeader.IncludedFeatures)
			{
				formData.set('fileName', this.communityPdfForm.get('fileName').value);
				formData.set('linkText', this.communityPdfForm.get('linkText').value);
			}

			this.onSave.emit(formData);

			this.saving = true;
		}
	}

	createForm()
	{
		if (this.selected)
		{
			this.effectiveDate = this.selected.effectiveDate ? new Date(this.convertDate(this.selected.effectiveDate)) : null;
			this.expirationDate = this.selected.expirationDate ? new Date(this.convertDate(this.selected.expirationDate)) : null;

			if (this.selected.fileName === null)
			{
				let today = new Date(Date.now());

				this.minEffectiveDate.setDate(today.getDate());
			}

			if (this.effectiveDate)
			{
				this.minDate = new Date(this.effectiveDate.getTime() + this.oneDay);
			}

			this.includedFeaturesSelected = this.selected.sectionHeader === SectionHeader.IncludedFeatures ? true : false;
		}

		let sortOrder = this.selected ? this.selected.sortOrder : null;
		let linkText = this.selected ? this.selected.linkText : null;
		let fileName = this.selected ? this.selected.fileName : null;
		let sectionHeader = this.selected ? this.selected.sectionHeader : null;
		let description = this.selected ? this.selected.description : '';

		this.communityPdfForm = new FormGroup({
			'sortOrder': new FormControl(sortOrder),
			'linkText': new FormControl( linkText, Validators.required),
			'fileName': new FormControl({ value: fileName, disabled: (this.selected) }, { validators: [Validators.required, this.duplicateName()]}),
			'sectionHeader': new FormControl(sectionHeader, Validators.required),
			'effectiveDate': new FormControl(this.effectiveDate ? this.effectiveDate.toISOString() : null),
			'expirationDate': new FormControl(this.expirationDate ? this.expirationDate.toISOString() : null),
			'description': new FormControl(description),
			'pdf': new FormControl({ value: this.pdf, disabled: (this.selected) }, [Validators.required, this.requiredFileType('pdf')])
		}, []);
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	requiredFileType(type: string)
	{
		return function (control: FormControl)
		{
			const file = control.value;

			if (file)
			{
				const split = file.name.split('.');

				if (split.length > 1)
				{
					const extension = split[split.length - 1].toLowerCase();

					if (type.toLowerCase() !== extension.toLowerCase())
					{
						return {
							requiredFileType: true
						};
					}

					return null;
				}

				return {
					requiredFileType: true
				};
			}

			return null;
		};
	}

	duplicateName(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			const existingName = this.communityPdfs.some(pdf => pdf.fileName.replace(/\.[^/.]+$/, "") === control.value as string);
			return existingName && !this.selected ? { duplicateName: true } : null;
		};
	}

	setMinimumExpirationDate(dateSet: Date = this.effectiveDate)
	{
		this.minDate = new Date(dateSet.getTime() + this.oneDay);

		if (this.communityPdfForm.value.expirationDate && (new Date(this.communityPdfForm.value.expirationDate).getTime() < this.minDate.getTime()))
		{
			this.expirationDate = this.minDate;

			this.onSetDate(this.minDate, 'expiration');
		}

		this.onSetDate(dateSet, 'effective');
	}

	onCalendarClose(event: any, dateType: 'expiration' | 'effective')
	{
		if (dateType === 'expiration')
		{
			this.communityPdfForm.controls.expirationDate.markAsDirty();
			this.communityPdfForm.controls.expirationDate.markAsTouched();
		}
		else
		{
			this.communityPdfForm.controls.effectiveDate.markAsDirty();
			this.communityPdfForm.controls.effectiveDate.markAsTouched();
		}
	}

	onSectionHeaderChange()
	{
		if (this.communityPdfForm.get('sectionHeader').value as SectionHeader === SectionHeader.IncludedFeatures)
		{
			this.includedFeaturesSelected = true;
			this.communityPdfForm.get('linkText').setValue('Included Features');
			this.communityPdfForm.get('linkText').disable();
			// TODO: 335674 - make this effective date when date logic is added
			const fileName = `${this.selectedCommunity.name}-Included Features-${new Date().toISOString().split('T')[0]}`;
			this.communityPdfForm.get('fileName').setValue(fileName);
			this.communityPdfForm.get('fileName').disable();
		}
		else
		{
			this.includedFeaturesSelected = false;
			this.communityPdfForm.get('linkText').setValue(null);
			this.communityPdfForm.get('linkText').enable();
			this.communityPdfForm.get('fileName').setValue(null);
			this.communityPdfForm.get('fileName').enable();
		}
	}

	onSetDate(event: Date, dateType: 'expiration' | 'effective')
	{
		if (dateType === 'expiration')
		{
			this.communityPdfForm.controls.expirationDate.setValue(event.toISOString());
		}
		else
		{
			this.communityPdfForm.controls.effectiveDate.setValue(event.toISOString());
		}
	}

	onCancel()
	{
		this.sidePanel.toggleSidePanel();
	}

	onFileSelect(event: Event)
	{
		const file = (<HTMLInputElement>event.target).files[0];

		if (file)
		{
			this.communityPdfForm.patchValue({ pdf: file });
			this.communityPdfForm.get('pdf').updateValueAndValidity();
		}

		this.communityPdfForm.controls.pdf.markAsDirty();
		this.communityPdfForm.controls.pdf.markAsTouched();
	}
}
