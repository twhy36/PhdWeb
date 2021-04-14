import { Component, ViewChild, TemplateRef, OnInit } from '@angular/core';
import { DivAttributeWizardService, DivAttributeWizPlan, DivAttributeWizOption, DivAttributeWizChoice } from '../../../../services/div-attribute-wizard.service';
import { TreeService } from '../../../../../core/services/tree.service';

import * as moment from 'moment';

import { MessageService } from 'primeng/api';

@Component({
	selector: 'divisional-attribute-wizard-step4',
	templateUrl: './divisional-attribute-wizard-step4.component.html',
	styleUrls: ['./divisional-attribute-wizard-step4.component.scss']
})

export class DivisionalAttributeWizardStep4Component implements OnInit
{
	@ViewChild('headerTemplate') headerTemplate: TemplateRef<any>;
	@ViewChild('buttonTemplate') buttonTemplate: TemplateRef<any>;

	get selectedMapping(): string
	{
		return this.wizardService.selectedMapping;
	}

	get selectedPlansCreated(): DivAttributeWizPlan[]
	{
		return this.wizardService.selectedPlans.filter(p => p.draftType === 'Copy');
	}

	get selectedPlansExisting(): DivAttributeWizPlan[]
	{
		return this.wizardService.selectedPlans.filter(p => p.draftType === 'Existing');
	}

	get selectedOption(): DivAttributeWizOption
	{
		return this.wizardService.selectedOption;
	}

	get selectedChoices(): DivAttributeWizChoice[]
	{
		return this.wizardService.selectedChoices;
	}

	get selectedOptionHeader(): string
	{
		return this.selectedOption ? `${this.selectedOption.category} >> ${this.selectedOption.subCategory} >> ${this.selectedOption.financialOptionIntegrationKey} -  ${this.selectedOption.optionSalesName}` : '';
	}

	constructor(private wizardService: DivAttributeWizardService, private treeService: TreeService, private _msgService: MessageService)
	{

	}

	ngOnInit()
	{
		if (!this.wizardService.hasSelectedOption)
		{
			this.wizardService.getSelectedOption();
		}

		if (!this.wizardService.hasSelectedMapping)
		{
			this.wizardService.getSelectedMapping();
		}

		if (!this.wizardService.hasSelectedChoices)
		{
			this.wizardService.getSelectedChoices();
		}

		if (!this.wizardService.hasSelectedPlans)
		{
			this.wizardService.getSelectedPlans();
		}
	}

	onDownloadListClick()
	{
		this.treeService.muExportDivMappingResultsToExcel(this.selectedOption, this.selectedChoices, this.wizardService.selectedPlans).subscribe(xlsData =>
		{
			let formattedDate = moment(new Date()).format('M.DD.YYYY');

			const anchor = document.createElement('a');

			document.body.appendChild(anchor);

			anchor.href = xlsData;
			anchor.download = `Option Mapping Results - ${formattedDate}.xlsx`;
			anchor.click();

			document.body.removeChild(anchor);

			window.URL.revokeObjectURL(xlsData);
		},
		error =>
		{
			this.wizardService.setError(error);
		});
	}
}
