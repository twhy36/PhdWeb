import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';

import * as _ from 'lodash';
import moment from 'moment';

import { MessageService } from 'primeng/api';

import { DivDChoice } from '../../../../shared/models/choice.model';
import { DivisionalCatalogWizardService, ChoiceActionEnum, DivCatWizPlan, DivCatWizChoice } from '../../../services/div-catalog-wizard.service';
import { FinancialCommunity } from '../../../../shared/models/financial-community.model';
import { Router } from '@angular/router';
import { TreeService } from '../../../../core/services/tree.service';

@Component({
	selector: 'divisional-catalog-wizard-step4',
	templateUrl: './divisional-catalog-wizard-step4.component.html',
	styleUrls: ['./divisional-catalog-wizard-step4.component.scss']
})
export class DivisionalCatalogWizardStep4Component implements OnInit
{
	@ViewChild('headerTemplate') headerTemplate: TemplateRef<any>;
	@ViewChild('buttonTemplate') buttonTemplate: TemplateRef<any>;

	get selectedChoices(): DivCatWizChoice[]
	{
		return this.filteredChoices;
	}

	get selectedPlansCreated(): DivCatWizPlan[]
	{
		return this.wizardService.selectedPlans.filter(p => p.draftType === 'Copy');
	}

	get selectedPlansExisting(): DivCatWizPlan[]
	{
		return this.wizardService.selectedPlans.filter(p => p.draftType === 'Existing');
	}

	filteredChoices: DivCatWizChoice[] = [];
	communities: FinancialCommunity[] = [];

	constructor(private router: Router, private wizardService: DivisionalCatalogWizardService, private treeService: TreeService, private _msgService: MessageService) { }

	ngOnInit()
	{
		if (!this.wizardService.hasSelectedChoices)
		{
			this.wizardService.getSelectedChoices();
		}

		if (this.wizardService.hasSelectedChoices)
		{
			this.filteredChoices = this.wizardService.getChoices();
		}
		else
		{
			// do something
		}

		if (!this.wizardService.hasSelectedPlans)
		{
			this.wizardService.getSelectedPlans();
		}
	}

	getChoiceAction(choice: DivDChoice): string
	{
		let selectedChoice = this.wizardService.selectedChoices.find(c => c.id === choice.id);

		return selectedChoice.action === ChoiceActionEnum.Update ? '<strong>UPDATE</strong>' : 'INACTIVATE';
	}

	onDivisionMappingClick()
	{
		this.router.navigateByUrl('/divisional/divisional-attributes/' + this.wizardService.market.id + '/divisional-attribute-wizard');
	}

	onDownloadListClick()
	{
		this.treeService.muExportUpdateTreeResultsToExcel(this.selectedChoices, this.wizardService.selectedPlans).subscribe(xlsData =>
		{
			let formattedDate = moment(new Date()).format('M.DD.YYYY');

			const anchor = document.createElement('a');

			document.body.appendChild(anchor);

			anchor.href = xlsData;
			anchor.download = `Choice Update Results - ${formattedDate}.xlsx`;
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
