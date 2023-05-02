import { Component, OnInit, Input } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, take } from 'rxjs/operators';

import * as _ from 'lodash';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../ngrx-store/reducers';
import * as ChangeOrderActions from '../../ngrx-store/change-order/actions';

import {
	UnsubscribeOnDestroy, ModalRef, ChangeOrderGroup, ChangeOrderNonStandardOption, JobNonStandardOption,
	PriceBreakdown
} from 'phd-common';

import { Observable } from 'rxjs';

type ActionBarStatusType = 'INCOMPLETE' | 'COMPLETE' | 'DISABLED';

@Component({
	selector: 'non-standard-change',
	templateUrl: './non-standard-change.component.html',
	styleUrls: ['./non-standard-change.component.scss']
})
export class NonStandardChangeComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() rejectedChangeOrder: ChangeOrderGroup;

	nssForm: UntypedFormGroup;
	jobNonStandardOptions: Array<JobNonStandardOption> = [];
	currentAddedOption: ChangeOrderNonStandardOption;
	currentDeletedOptions: Array<ChangeOrderNonStandardOption> = [];
	canDelete: boolean = false;
	canAdd: boolean = false;
	optionDirty: boolean = false;
	selectedNssIds: Array<number> = [];
	modalReference: ModalRef;
	priceBreakdown$: Observable<PriceBreakdown>;
	isChangeDirty: boolean = false;
	canEdit: boolean;
	actionBarStatus: ActionBarStatusType = 'INCOMPLETE';
	isDirty: boolean = false;

	constructor(
		private store: Store<fromRoot.State>,
		private router: Router,
	) { super(); }

	ngOnInit()
	{
		this.store.pipe(
			select(state => state.job),
			combineLatest(this.store.pipe(select(state => state.changeOrder.currentChangeOrder))),
			take(1)
		).subscribe(([job, changeOrder]) =>
		{
			// job.jobNonStandardOptions is readonly so must clone before applying a sort.
			let jobNonStandardOptions = job.jobNonStandardOptions && job.jobNonStandardOptions.length ? _.cloneDeep(job.jobNonStandardOptions) : [];

			this.jobNonStandardOptions = jobNonStandardOptions.sort((a, b) => a.financialOptionNumber < b.financialOptionNumber ? -1 : a.financialOptionNumber > b.financialOptionNumber ? 1 : 0);

			const changeOrderGroup = !this.rejectedChangeOrder ? changeOrder as ChangeOrderGroup : this.rejectedChangeOrder;

			if (changeOrderGroup && changeOrderGroup.jobChangeOrders && changeOrderGroup.jobChangeOrders.length)
			{
				const currentChangeOrder = changeOrderGroup.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'NonStandard');
				const options = currentChangeOrder ? currentChangeOrder.jobChangeOrderNonStandardOptions : [];

				this.currentAddedOption = options.find(x => x.action === 'Add');
				this.currentDeletedOptions = options.filter(x => x.action === 'Delete');

				this.currentDeletedOptions.forEach(o =>
				{
					const jobOption = this.jobNonStandardOptions.find(x => x.name === o.nonStandardOptionName);

					if (jobOption)
					{
						this.selectedNssIds.push(jobOption.id);
					}
				});
			}

			this.canAdd = !!this.currentAddedOption || !this.jobNonStandardOptions.length;
			this.canDelete = !!this.currentDeletedOptions.length;
			this.createNssForm();
		});

		this.priceBreakdown$ = this.store.pipe(
			select(fromRoot.priceBreakdown)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canSell),
			combineLatest(
				this.store.pipe(select(state => state.changeOrder.changeInput)),
				this.store.pipe(select(fromRoot.canDesign))
			)
		).subscribe(([canSell, changeInput, canDesign]) =>
		{
			this.canEdit = canSell || canDesign;

			if (changeInput && changeInput.isDirty)
			{
				this.isDirty = changeInput.isDirty;

				if (this.isDirty)
				{
					this.actionBarStatus = 'COMPLETE';
				}
			}
		});
	}

	createNssForm()
	{
		this.nssForm = new UntypedFormGroup({
			'name': new UntypedFormControl(this.currentAddedOption ? this.currentAddedOption.nonStandardOptionName : ''),
			'quantity': new UntypedFormControl(this.currentAddedOption ? this.currentAddedOption.qty : ''),
			'price': new UntypedFormControl(this.currentAddedOption ? this.currentAddedOption.unitPrice : ''),
			'description': new UntypedFormControl(this.currentAddedOption ? this.currentAddedOption.nonStandardOptionDescription : '')
		});

		this.nssForm.statusChanges.subscribe(change =>
		{
			if (!this.nssForm.pristine && !this.isChangeDirty)
			{
				this.isChangeDirty = true;
				this.store.dispatch(new ChangeOrderActions.SaveChangeOrderScenario());
			}

			this.actionBarStatus = 'INCOMPLETE';

			//setting the action bar status
			if (this.isDirty)
			{
				if (this.nssForm.valid || ((this.currentAddedOption === undefined) && this.nssForm.pristine && this.nssForm.invalid))
				{
					this.actionBarStatus = 'COMPLETE';
				}
			}
		})
	}

	onToggleAdd()
	{
		this.canAdd = !this.canAdd;

		if (!this.currentAddedOption)
		{
			this.nssForm.reset();
		}
	}

	onToggleDelete()
	{
		this.canDelete = !this.canDelete;
		this.optionDirty = false;

		if (!this.canDelete && !this.currentDeletedOptions.length)
		{
			this.selectedNssIds = [];
		}
	}

	onSelectNss(option: JobNonStandardOption)
	{
		if (this.actionBarStatus === 'INCOMPLETE' && (this.nssForm.valid || (this.nssForm.invalid && !this.currentAddedOption)))
		{
			this.actionBarStatus = 'COMPLETE';
		}

		const selectedIndex = this.selectedNssIds.findIndex(x => x === option.id);

		if (selectedIndex > -1)
		{
			this.selectedNssIds.splice(selectedIndex, 1);
		}
		else
		{
			this.selectedNssIds.push(option.id);
		}

		this.optionDirty = this.currentDeletedOptions.length !== this.selectedNssIds.length;

		if (!this.optionDirty)
		{
			const selectedNssOptions = this.jobNonStandardOptions.filter(x => this.selectedNssIds.findIndex(id => id === x.id) > -1);
			const changedOptionIds = selectedNssOptions.filter(x => this.currentDeletedOptions.findIndex(o => o.nonStandardOptionName === x.name) < 0);

			if (changedOptionIds && changedOptionIds.length)
			{
				this.optionDirty = true;
			}
		}

		if (!this.isChangeDirty)
		{
			this.isChangeDirty = true;

			this.store.dispatch(new ChangeOrderActions.SaveChangeOrderScenario());
		}

		const currentDeletedOption = this.currentDeletedOptions.find(x => x.nonStandardOptionName === option.name);

		let changeOrderNonStandardOption = {
			id: currentDeletedOption ? currentDeletedOption.id : 0,
			nonStandardOptionName: option.name,
			nonStandardOptionDescription: option.description,
			financialOptionNumber: option.financialOptionNumber,
			action: 'Delete',
			qty: option.quantity,
			unitPrice: option.unitPrice
		};

		this.store.dispatch(new ChangeOrderActions.SetChangeOrderNonStandardOptions(changeOrderNonStandardOption));
	}

	saveChangeNote(event)
	{
		let options = [];
		let saving = false;

		this.store.pipe(select(state => state.changeOrder.currentChangeOrder))
			.subscribe(changeOrder =>
			{
				if (!saving)
				{
					saving = true;
					options = changeOrder.jobChangeOrders.find(t => t.jobChangeOrderTypeDescription === 'NonStandard').jobChangeOrderNonStandardOptions;

					this.store.dispatch(new ChangeOrderActions.CreateNonStandardChangeOrder(options));

					this.router.navigateByUrl('/change-orders');
				}
			})
	}

	getNextFinancialOptionNumber(): string
	{
		let newOptionNumber = '99000';

		if (this.jobNonStandardOptions.length)
		{
			let lastOptionNumber = +(this.jobNonStandardOptions[this.jobNonStandardOptions.length - 1].financialOptionNumber);

			newOptionNumber = (++lastOptionNumber).toString();
		}

		return newOptionNumber;
	}

	isOptionSelected(option: JobNonStandardOption): boolean
	{
		return this.currentDeletedOptions.findIndex(x => x.nonStandardOptionName === option.name) > -1;
	}

	onBlur()
	{
		let option = {
			id: this.currentAddedOption ? this.currentAddedOption.id : 0,
			nonStandardOptionName: this.nssForm.get('name').value,
			nonStandardOptionDescription: this.nssForm.get('description').value,
			financialOptionNumber: this.getNextFinancialOptionNumber(),
			action: 'Add',
			qty: +this.nssForm.get('quantity').value,
			unitPrice: +this.nssForm.get('price').value
		};

		this.store.dispatch(new ChangeOrderActions.SetChangeOrderNonStandardOptions(option));
	}
}
