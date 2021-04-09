import { Component, OnInit, Input } from '@angular/core';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as ContractActions from '../../../ngrx-store/contract/actions';

import { UnsubscribeOnDestroy, ESignTypeEnum } from 'phd-common';
import { Template, TemplateTypeEnum } from '../../../shared/models/template.model';
import { combineLatest } from 'rxjs/operators';

@Component({
	selector: 'agreement-documents',
	templateUrl: './agreement-documents.component.html',
	styleUrls: ['./agreement-documents.component.scss']
})
export class AgreementDocumentsComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() canEdit: boolean = false;

	contractTemplates: Array<AgreementTemplate>;
	terminationAgreementTemplate: AgreementTemplate;
	selectedTemplates: Array<number>;
	salesOptions: boolean;
	isLockedIn: boolean = false;
	isChangingOrder: boolean = false;

	constructor(private store: Store<fromRoot.State>)
	{
		super();
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.contract.templates),
			combineLatest(
				this.store.pipe(select(state => state.contract.selectedTemplates)),
				this.store.pipe(select(state => state.salesAgreement.status)),
				this.store.pipe(select(state => state.salesAgreement.isLockedIn)),
				this.store.pipe(select(state => state.changeOrder))
			)
		).subscribe(([templates, selectedTemplates, salesAgreementStatus, isLockedIn, co]) =>
		{
			let cancelForm = templates.find(x => x.templateTypeId === TemplateTypeEnum['Cancel Form']);

			this.isLockedIn = isLockedIn;
			this.isChangingOrder = co.isChangingOrder && !!co.changeInput;
			this.terminationAgreementTemplate = cancelForm ? new AgreementTemplate(cancelForm, selectedTemplates) : null;

			this.contractTemplates = templates
				.filter(t => t.templateTypeId !== TemplateTypeEnum['Cancel Form'] || (salesAgreementStatus !== 'Pending' && t.templateTypeId == TemplateTypeEnum['JIO Form']))
				.map(t => new AgreementTemplate(t, selectedTemplates))
				.sort((a, b) => a.displayOrder < b.displayOrder ? -1 : a.displayOrder > b.displayOrder ? 1 : 0);

			this.selectedTemplates = selectedTemplates;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.contract.selectedAgreementType)
		).subscribe(selectedAgreementType =>
		{
			this.salesOptions = selectedAgreementType == ESignTypeEnum.SalesAgreement;
		});
	}

	checkUncheckAll(e: any)
	{
		const shouldRemove = !e.target.checked as boolean;

		this.store.dispatch(new ContractActions.SelectUnselectAllTemplates(shouldRemove));
	}

	changeSelected(templateId: number)
	{
		if (this.canEdit)
		{
			const shouldRemove = this.selectedTemplates && this.selectedTemplates.some(t => t === templateId);

			this.store.dispatch(new ContractActions.AddRemoveSelectedTemplate(templateId, shouldRemove, ESignTypeEnum.SalesAgreement));
		}
	}

	onChangeAgreement()
	{
		this.store.dispatch(new ContractActions.SelectUnselectAllTemplates(true));

		if (!this.salesOptions && this.terminationAgreementTemplate)
		{
			this.store.dispatch(new ContractActions.AddRemoveSelectedTemplate(this.terminationAgreementTemplate.templateId, false, ESignTypeEnum.TerminationAgreement));
		}
	}
}

class AgreementTemplate implements Template
{
	templateId: number;
	documentName: string;
	displayName: string;
	version: number;
	marketId: number;
	templateTypeId: TemplateTypeEnum;
	displayOrder: number;
	isSelected: boolean;

	constructor(template: Template, selectedTemplates: Array<number>)
	{
		Object.assign(this, template);

		this.isSelected = selectedTemplates && selectedTemplates.some(t => t === template.templateId);
	}
}
