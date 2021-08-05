import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { SidePanelComponent } from "phd-common";
import { CommunityPdf, ISectionHeader } from "../../../shared/models/communityPdf.model";

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
	@Input() selected: CommunityPdf;
	@Input() saving: boolean;
	@Input() sidePanelOpen: boolean = false;

	communityPdfForm: FormGroup;

	oneDay: number = 86400000;
	pdf: Blob;
	effectiveDate: Date;
	expirationDate: Date;
	minEffectiveDate: Date = new Date(new Date().getTime() - this.oneDay);
	minDate: Date = new Date();

	public sectionHeaders: Array<ISectionHeader> = [
		{ label: 'Home Warranty', id: 0 },
		{ label: 'Community Association', id: 1 },
		{ label: 'Additional Documents', id: 2 }
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
		this.createForm();
	}

	convertDate(date)
	{
		return moment.parseZone(date).format("M/DD/YYYY")
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
		}

		let sortOrder = this.selected ? this.selected.sortOrder : null;
		let linkText = this.selected ? this.selected.linkText : null;
		let fileName = this.selected ? this.selected.fileName : null;
		let sectionHeader = this.selected ? this.selected.sectionHeader : null;
		let description = this.selected ? this.selected.description : '';

		this.communityPdfForm = new FormGroup({
			'sortOrder': new FormControl(sortOrder),
			'linkText': new FormControl({ value: linkText, disabled: (this.selected) }, Validators.required),
			'fileName': new FormControl({ value: fileName, disabled: (this.selected) }, [Validators.required, this.requiredFileType('pdf')]),
			'sectionHeader': new FormControl(sectionHeader, Validators.required),
			'effectiveDate': new FormControl(this.effectiveDate ? this.effectiveDate.toISOString() : null, Validators.required),
			'expirationDate': new FormControl(this.expirationDate ? this.expirationDate.toISOString() : null, Validators.required),
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
				const split = file.split('.');

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
