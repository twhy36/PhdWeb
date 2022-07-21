import { Component, EventEmitter, Output, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, Validators, FormGroup, FormBuilder, FormControlStatus } from '@angular/forms';
import { ModalRef, ModalService } from 'phd-common';
import { throwError } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { OptionPackageService } from '../../../core/services/option-packages.service';
import { UniqueOptionNameValidatorService } from '../../../core/services/unique-option-name-validator.service';
import { IOptionPackage } from '../../../shared/models/optionpackage.model';


@Component({
	selector: 'add-dialog',
	templateUrl: './add-dialog.component.html',
	styleUrls: ['./add-dialog.component.scss']
})
export class AddDialogComponent {
	currentFinancialCommunityId: number;
	modalRef: ModalRef;

	@ViewChild('content') content: TemplateRef<any>;

	nameControl = new FormControl('', {
		validators: [Validators.required, Validators.maxLength(50)],
		updateOn: 'submit'
	});

	form: FormGroup = this.formBuilder.group({
		name: this.nameControl
	});

	get name() { return this.form.get('name'); }

	@Output() changes: EventEmitter<IOptionPackage> = new EventEmitter();

  constructor(
	  private modalService: ModalService,
	  private formBuilder: FormBuilder,
	  private optionPackageService: OptionPackageService
	) { }

	open(currentFinancialCommunityId: number): void
	{
		this.currentFinancialCommunityId = currentFinancialCommunityId;
		this.form.patchValue({ name: '' });
		this.nameControl.addAsyncValidators(UniqueOptionNameValidatorService.createValidator(this.currentFinancialCommunityId, this.optionPackageService));
		this.modalRef = this.modalService.open(this.content);
	}

	save()
	{
		return this.form.statusChanges.pipe(
			filter((status: FormControlStatus) => (status !== 'PENDING')),
			switchMap((status) => {
				if (status === 'VALID') 
				{
					const optionPackage: IOptionPackage = {
						bundleId: undefined,
						bundleCommonId: undefined,
						edhFinancialCommunityId: this.currentFinancialCommunityId,
						name: this.name.value,
						presentationOrder: 1,
						isCommon: 0,
						dragPlaceholder: undefined
		
					};
					return this.optionPackageService.saveOptionPackage(optionPackage);
				}
				else 
				{
					return throwError(status);
				}
			})
		).subscribe({
			next: (newOptionPackage: IOptionPackage) => {
				this.modalRef.close();
				this.changes.emit(newOptionPackage);
			},
			error: (error) => {
				if (error !== 'INVALID')
				{
					this.name.setErrors({ servererror: true });
				}
			}
		});
	}

	cancel() 
	{
		if (this.form.valid && this.form.dirty) {
			this.modalService
				.showWarningModal('Do you want to cancel without saving? If so, the data entered will be lost.')
				.pipe(filter((result) => result === true))
				.subscribe({
					next: () => this.modalRef.dismiss()
				});
		}
		else
		{
			this.modalRef.dismiss();
		}
	}
}
