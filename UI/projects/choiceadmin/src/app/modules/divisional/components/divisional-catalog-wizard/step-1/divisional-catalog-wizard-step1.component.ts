import { Component, OnInit, ChangeDetectorRef, TemplateRef, ViewChild } from '@angular/core';

import { DivDGroup } from '../../../../shared/models/group.model';
import { DivDChoice } from '../../../../shared/models/choice.model';
import { DivisionalCatalogWizardService, DivCatWizChoice } from '../../../services/div-catalog-wizard.service';

@Component({
	selector: 'divisional-catalog-wizard-step1',
	templateUrl: './divisional-catalog-wizard-step1.component.html',
	styleUrls: ['./divisional-catalog-wizard-step1.component.scss']
})
export class DivisionalCatalogWizardStep1Component implements OnInit
{
	@ViewChild('headerTemplate') headerTemplate: TemplateRef<any>;

	get groups(): DivDGroup[]
	{
		return this.wizardService.catalogGroups;
	}

	get selectedChoices(): DivCatWizChoice[]
	{
		return this.wizardService.selectedChoices;
	}

	constructor(private wizardService: DivisionalCatalogWizardService, private cd: ChangeDetectorRef) { }

	ngOnInit()
	{

	}

	updateChoiceList(choice: DivDChoice)
	{
		let index = this.selectedChoices.findIndex(c => c.id === choice.id);

		if (index > -1)
		{
			this.selectedChoices.splice(index, 1);
		}
		else
		{
			this.selectedChoices.push({ id: choice.id, pointLabel: choice.parent.label, choiceLabel: choice.label, action: null } as DivCatWizChoice);
		}
	}

	isChecked(choice: DivDChoice): boolean
	{
		return this.selectedChoices.findIndex(x => x.id === choice.id) > -1;
	}
}
