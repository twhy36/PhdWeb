import { Component, OnInit, ChangeDetectorRef, OnDestroy, TemplateRef, ViewChild } from '@angular/core';

import * as _ from 'lodash';

import { DivDChoice } from '../../../../shared/models/choice.model';
import { DivisionalCatalogWizardService, ChoiceActionEnum, DivCatWizChoice } from '../../../services/div-catalog-wizard.service';

@Component({
	selector: 'divisional-catalog-wizard-step2',
	templateUrl: './divisional-catalog-wizard-step2.component.html',
	styleUrls: ['./divisional-catalog-wizard-step2.component.scss']
})
export class DivisionalCatalogWizardStep2Component implements OnInit, OnDestroy
{
	@ViewChild('headerTemplate') headerTemplate: TemplateRef<any>;

	get selectedChoices(): DivCatWizChoice[]
	{
		return this.filteredChoices;
	}

	filteredChoices: DivCatWizChoice[] = [];
	
	constructor(private wizardService: DivisionalCatalogWizardService, private cd: ChangeDetectorRef) { }

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
	}

	ngOnDestroy()
	{

	}

	setChoiceAction(choice: DivDChoice, action: string)
	{
		let choiceToUpdate = this.wizardService.selectedChoices.find(c => c.id === choice.id);

		choiceToUpdate.action = action === 'Update' ? ChoiceActionEnum.Update : ChoiceActionEnum.Inactivate;
	}

	isChecked(divChoice: DivDChoice, action: string)
	{
		let choice = this.wizardService.selectedChoices.find(c => c.id === divChoice.id);
		let isChecked = false;

		if (choice.action === ChoiceActionEnum.Update && action === 'Update')
		{
			isChecked = true;
		}
		else if (choice.action === ChoiceActionEnum.Inactivate && action === 'Inactivate')
		{
			isChecked = true;
		}

		return isChecked;
	}
}
