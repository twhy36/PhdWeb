import { Component, EventEmitter, Output, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, Validators, FormGroup, FormBuilder, FormControlStatus } from '@angular/forms';
import { ConfirmModalComponent, ModalRef, ModalService } from 'phd-common';
import { from, Observable, throwError } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
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
		updateOn: 'change'
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
  ) {
	}

	open(currentFinancialCommunityId: number): void
	{
		this.currentFinancialCommunityId = currentFinancialCommunityId;
		this.form.reset();
		this.modalRef = this.modalService.open(this.content);
	}

	save()
	{
		if (this.form.invalid) 
		{
			return;
		}

		const optionPackage: IOptionPackage = {
			bundleId: undefined,
			bundleCommonId: undefined,
			edhFinancialCommunityId: this.currentFinancialCommunityId,
			name: this.name.value,
			presentationOrder: 1,
			isCommon: 0,
			dragPlaceholder: undefined
			
		};
		const validate$ = UniqueOptionNameValidatorService.validate(this.optionPackageService, this.name, this.currentFinancialCommunityId);
		const save$ = this.optionPackageService.saveOptionPackage(optionPackage);

		validate$.pipe(
			switchMap((invalid) => invalid
				? throwError(invalid)
				: save$
			)
		)
		.subscribe({
			next: () => {
				this.modalRef.close();
				this.changes.emit(optionPackage);
			},
			error: (error) => {
				this.name.setErrors(typeof error === 'string' ? { servererror: true } : error);
			}
		});
	}

	cancel() 
	{
		if (this.form.dirty && this.form.valid) {
			this.showConfirmModal('Do you want to cancel without saving? If so, the data entered will be lost.')
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

	private showConfirmModal(body: string): Observable<boolean>
	{
		const confirm = this.modalService.open(ConfirmModalComponent, { centered: true, windowClass: "phd-modal-window" });

		confirm.componentInstance.body = body;
		confirm.componentInstance.title = 'Warning';
		confirm.componentInstance.defaultOption = 'Continue';

		return from(confirm.result).pipe(
			map(res => res === 'Continue')
		);
	}
}
