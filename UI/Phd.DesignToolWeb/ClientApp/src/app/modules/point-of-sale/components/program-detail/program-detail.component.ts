import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Validators, FormGroup, FormControl } from '@angular/forms';
import { Store } from '@ngrx/store';
import * as _ from "lodash";

import * as fromRoot from '../../../ngrx-store/reducers';
import { SaveProgram, DeleteProgram } from '../../../ngrx-store/sales-agreement/actions';

import { SalesProgram } from '../../../shared/models/sales-program.model';
import { SalesAgreementProgram, SalesAgreement, ISalesProgram } from '../../../shared/models/sales-agreement.model';
import { ComponentCanNavAway } from '../../../shared/classes/component-can-nav-away.class';
import { SalesChangeOrderSalesProgram } from '../../../shared/models/sales-change-order.model';
import { ModalService } from '../../../../modules/core/services/modal.service';

@Component({
	selector: 'program-detail',
	templateUrl: './program-detail.component.html',
	styleUrls: ['./program-detail.component.scss']
})
export class ProgramDetailComponent extends ComponentCanNavAway implements OnInit, OnChanges
{
	// Sales Agreement object, contains a "programs" array that may have Sales Programs already saved by the user
	@Input() agreement: SalesAgreement;
	// Available Sales Programs for this community that the user can choose from in the drop down menu.
	@Input() salesPrograms: Array<SalesProgram> = [];
	// The position within the array of programs. 
	@Input() position: number;
	@Input() program: SalesAgreementProgram;
	@Input() editing: any;
	@Input() isChangingOrder: boolean;
	@Input() changeOrderPrograms: Array<SalesChangeOrderSalesProgram>;
	@Input() canEdit: boolean = true;

	default: SalesAgreementProgram = new SalesAgreementProgram();

	@Output() onRemove = new EventEmitter<number>();
	@Output() onEdit = new EventEmitter<SalesAgreementProgram>();
	@Output() checkChanges = new EventEmitter<boolean>();
	@Output() onSavingProgram = new EventEmitter<{ action: string, programs: Array<SalesChangeOrderSalesProgram>, originalProgramId?: number }>();

	// The Sales Program the user has selected from the drop down menu
	selectedSalesProgram: SalesProgram;

	// form elements
	form: FormGroup;
	programName: FormControl;
	description: FormControl;
	discountAmount: FormControl;
	disableForm: boolean = true;

	// Defines if editable or in display mode
	deleting: boolean = false;

	constructor(
		private store: Store<fromRoot.State>,
		private modalService: ModalService)
	{
		super();
	}

	get availableSalesPrograms()
	{
		return this.salesPrograms.filter(p =>
		{
			let isProgramOwner = this.program?.salesProgramId === p.id;
			let isInUse = this.changeOrderPrograms.findIndex(x => x.salesProgramId === p.id) > -1;

			if (this.isChangingOrder && isInUse && !isProgramOwner)
			{
				return false;
			}
			else
			{
				return p.maximumAmount > this.getSalesProgramTotalAmount(p.id);
			}
		});
	}

	ngOnInit()
	{
		// Create a copy of the sales agreement program so that we can reset the values later if needed.
		this.default = new SalesAgreementProgram({ ...this.program });
		this.setFormData();
	}

	setFormData()
	{
		let totalAmount = this.selectedSalesProgram ? this.getSalesProgramTotalAmount(this.selectedSalesProgram.id) : 0;
		let programAmount = this.program && this.program.amount ? this.program.amount : null;
		let maxAmount = this.selectedSalesProgram ? (this.selectedSalesProgram.maximumAmount - totalAmount) + programAmount : null;

		// Setup form controls, only on component creation/init
		this.discountAmount = new FormControl(programAmount, [
			Validators.required,
			Validators.max(maxAmount || null),
			Validators.min(1)
		]);

		this.description = new FormControl(this.program && this.program.salesProgramDescription || null, [Validators.nullValidator]);
		this.programName = new FormControl(this.selectedSalesProgram && this.selectedSalesProgram.name || null, [Validators.required]);

		this.createForm();
	}

	/**
	 * *We only care about the program amount from agreement for any remaining amount
	 * @param salesProgramId
	 */
	getSalesProgramTotalAmount(salesProgramId: number)
	{
		const sumAmounts = (total: number, program: SalesAgreementProgram | SalesChangeOrderSalesProgram) => { return total + program.amount; };
		const agreementPrograms = this.agreement.programs?.filter(x => x.salesProgramId === salesProgramId);
		const agreementAmount = agreementPrograms && agreementPrograms.length > 0 ? agreementPrograms.reduce(sumAmounts, 0) : 0;
		const changeOrderPrograms = this.changeOrderPrograms.filter(x => x.salesProgramId === salesProgramId);
		const changeOrderAmount = changeOrderPrograms && changeOrderPrograms.length > 0 ? changeOrderPrograms.reduce(sumAmounts, 0) : 0;

		return agreementAmount + changeOrderAmount;
	}

	createForm()
	{
		if (this.program && this.program.salesProgramId)
		{
			let salesProgram = this.salesPrograms && this.salesPrograms.length > 0 ? this.salesPrograms.find(item => item.id === this.program.salesProgramId) : null;

			this.selectedSalesProgram = salesProgram || new SalesProgram(this.program.salesProgram);
		}

		this.form = new FormGroup({
			discountAmount: this.discountAmount,
			description: this.description,
			programName: this.programName
		});

		this.salesProgramChange();
	}

	salesProgramChange()
	{
		// reset the validators on the maximumAmount since it needs new values
		if (this.selectedSalesProgram && this.selectedSalesProgram.maximumAmount)
		{
			let totalAmount = this.getSalesProgramTotalAmount(this.selectedSalesProgram.id);
			let programAmount = this.program && this.program.amount ? this.program.amount : null;
			let maxAmount = this.selectedSalesProgram ? this.selectedSalesProgram.maximumAmount - totalAmount : null;

			if (this.default.salesProgramId === this.selectedSalesProgram?.id)
			{
				// add the amount back to the maxAmount so we can include what was already added.
				maxAmount += programAmount;
			}

			this.discountAmount.setValidators([Validators.required, Validators.max(maxAmount), Validators.min(1)]);
			this.discountAmount.updateValueAndValidity();
		}
		else
		{
			this.discountAmount.setValidators([Validators.required]);
		}
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes.program && !changes.program.firstChange)
		{
			// reset default in case we need to reset to "original" value.
			this.default = new SalesAgreementProgram(this.program);

			// set values of form elements
			if (this.program.salesProgramId)
			{
				this.selectedSalesProgram = this.salesPrograms.find(item => item.id === this.program.salesProgramId);
			}

			this.form.setValue({
				description: this.program.salesProgramDescription,
				discountAmount: this.program.amount || 0
			});
		}
	}

	save()
	{
		if (!this.isChangingOrder)
		{
			const salesAgreementProgram: SalesAgreementProgram = {
				amount: this.discountAmount.value * 1,
				salesProgramId: this.selectedSalesProgram.id,
				salesAgreementId: this.agreement.id,
				salesProgramDescription: this.description.value,
				salesProgram: {
					salesProgramType: this.selectedSalesProgram.salesProgramType.toString()
				} as ISalesProgram
			};

			if (this.program.id)
			{
				salesAgreementProgram.id = this.program.id;
			}

			this.store.dispatch(new SaveProgram(salesAgreementProgram, this.selectedSalesProgram.name));
		}
		else
		{
			let salesChangeOrderSalesPrograms: Array<SalesChangeOrderSalesProgram> = [];

			if (this.form.controls['programName'].value !== null && this.form.controls['discountAmount'].value !== null)
			{
				salesChangeOrderSalesPrograms.push({ salesProgramId: this.selectedSalesProgram.id, salesProgramDescription: this.form.controls['description'].value, amount: this.form.controls['discountAmount'].value, action: 'Add', salesProgramType: this.selectedSalesProgram.salesProgramType.toString() });
			}

			let originalProgramId = this.default.salesProgramId !== salesChangeOrderSalesPrograms[0].salesProgramId ? this.default.salesProgramId : null;

			this.onSavingProgram.emit({ action: 'Add', programs: salesChangeOrderSalesPrograms, originalProgramId: originalProgramId });

			this.onEdit.emit(null);
		}
	}

	edit()
	{
		this.onEdit.emit(this.program);
	}

	delete()
	{
		const content = "Sure you want to continue?";

		const confirm = this.modalService.showWarningModal(content);

		confirm.subscribe((result) =>
		{
			if (result)
			{
				if (this.isChangingOrder)
				{
					let salesChangeOrderSalesPrograms: Array<SalesChangeOrderSalesProgram> = [];

					salesChangeOrderSalesPrograms.push({
						id: this.program.id,
						salesProgramId: this.program.salesProgramId,
						salesProgramDescription: this.program.salesProgramDescription,
						amount: this.program.amount,
						action: 'Delete',
						salesProgramType: this.program.salesProgram.salesProgramType
					});

					this.onSavingProgram.emit({ action: 'Delete', programs: salesChangeOrderSalesPrograms });
				}
				else
				{
					this.deleting = true;

					// You will lose your saved or unsaved program....
					if (this.program.id)
					{
						this.store.dispatch(new DeleteProgram(this.program));
					}
					else
					{
						this.cancel();
					}
				}
			}
		});
	}

	cancel()
	{
		// We need the confirm modal working to confirm first
		// You will lose your changes....
		if (this.program.id)
		{
			this.program = new SalesAgreementProgram(_.cloneDeep(this.default));
			this.setFormData();
		}
		else if (!this.isChangingOrder || !this.program.salesProgramId)
		{
			// Don't switch to edit mode if it is new, just get rid of the entry.
			this.remove();
		}

		this.onEdit.emit(null);
	}

	// Remove is not like delete, it removes a new, empty Sales Program from the display.
	// It is not deleted because it never existed in the state.
	remove()
	{
		this.onRemove.emit(this.position);
	}

	get hasChanges()
	{
		const check = this.form && this.form.dirty;

		return check;
	}

	canNavAway(): boolean
	{
		return !this.hasChanges;
	}

	/*
	 * COMPLETELY UNKNOWN reason for the modelService not working properly,
	 * leaving this to continue working on it as this is in review.
	*/

	//async deleteProgram() {
	//	console.log( 'deleteProgram()' );
	//	const confirmMessage = `Are you sure you want to delete this Program?`;
	//	const confirmTitle = `Warning!`;
	//	const confirmDefaultOption = `Cancel`;

	//	if ( await this.showConfirmModal( confirmMessage, confirmTitle, confirmDefaultOption ) ) {
	//		this.delete();
	//	}
	//}

	//async cancelProgram() {
	//	console.log( 'cancelProgram()' );
	//	const confirmMessage = `If you continue you will lose your changes.<br><br>Do you wish to continue?`;
	//	const confirmTitle = `Warning!`;
	//	const confirmDefaultOption = `Cancel`;

	//	if ( await this.showConfirmModal( confirmMessage, confirmTitle, confirmDefaultOption ) ) {
	//		this.cancel();
	//	}
	//}

	//private async showConfirmModal( body: string, title: string, defaultButton: string ): Promise<boolean> {
	//	const confirm = this._modalService.open( ConfirmModalComponent, { centered: true } );

	//	confirm.componentInstance.title = title;
	//	confirm.componentInstance.body = body;
	//	confirm.componentInstance.defaultOption = defaultButton;

	//	return confirm.result.then( ( result ) => {
	//		return result === 'Continue';
	//	} );
	//}

}
