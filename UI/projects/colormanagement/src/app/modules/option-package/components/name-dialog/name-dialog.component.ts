import { Component, EventEmitter, Output, TemplateRef, ViewChild } from '@angular/core';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder } from '@angular/forms';
import _ from 'lodash';
import { ConfirmModalComponent, ModalRef, ModalService } from 'phd-common';
import { from, Observable, throwError } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { OptionPackageService } from '../../../core/services/option-packages.service';
import { UniqueOptionNameValidatorService } from '../../../core/services/unique-option-name-validator.service';
import { IOptionPackage } from '../../../shared/models/optionpackage.model';


@Component({
	selector: 'name-dialog',
	templateUrl: './name-dialog.component.html',
	styleUrls: ['./name-dialog.component.scss']
})
export class NameDialogComponent
{
	optionPackage: IOptionPackage;
	modalRef: ModalRef;

	@ViewChild('content') content: TemplateRef<any>;

	nameControl = new UntypedFormControl('', {
		validators: [Validators.required, Validators.maxLength(50)],
		updateOn: 'change'
	});

	form: UntypedFormGroup = this.formBuilder.group({
		name: this.nameControl
	});

	get name()
	{
		return this.form.get('name');
	}

	get mode(): 'add' | 'edit'
	{
		return this.optionPackage.bundleId === undefined
			? 'add'
			: 'edit';
	}

	get title()
	{
		return this.mode === 'add'
			? 'Add Option Package'
			: 'Rename Option Package';
	}

	@Output() change: EventEmitter<IOptionPackage> = new EventEmitter();

	constructor(
		private modalService: ModalService,
		private formBuilder: UntypedFormBuilder,
		private optionPackageService: OptionPackageService
	) { }

	add(currentFinancialCommunityId: number): void
	{
		this.optionPackage = {
			bundleId: undefined,
			bundleCommonId: undefined,
			edhFinancialCommunityId: currentFinancialCommunityId,
			name: undefined,
			presentationOrder: 1,
			isCommon: 0,
			dragPlaceholder: undefined

		};

		this.form.reset();

		this.modalRef = this.modalService.open(this.content);
	}

	edit(optionPackage: IOptionPackage): void
	{
		this.optionPackage = _.clone(optionPackage);

		this.name.setValue(this.optionPackage.name);

		this.modalRef = this.modalService.open(this.content);
	}

	save()
	{
		if (this.form.invalid) 
		{
			return;
		}

		this.optionPackage.name = this.name.value;

		const validate$ = UniqueOptionNameValidatorService.validate(this.optionPackageService, this.name, this.optionPackage.edhFinancialCommunityId);
		const save$ = this.mode === 'add'
			? this.optionPackageService.saveOptionPackage(this.optionPackage)
			: this.optionPackageService.updateOptionPackage(this.optionPackage);

		validate$.pipe(
			switchMap((invalid) => invalid
				? throwError(invalid)
				: save$
			)
		)
		.subscribe({
			next: () =>
			{
				this.change.emit(this.optionPackage);

				this.modalRef.close();
			},
			error: (error) =>
			{
				this.name.setErrors(typeof error === 'string' ? { servererror: true } : error);
			}
		});
	}

	cancel() 
	{
		if (this.form.dirty && this.form.valid)
		{
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
