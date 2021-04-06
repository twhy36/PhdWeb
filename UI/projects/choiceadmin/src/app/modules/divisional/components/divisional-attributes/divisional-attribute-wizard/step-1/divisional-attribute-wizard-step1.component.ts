import { Component, ViewChild, TemplateRef, OnInit } from '@angular/core';
import { DivAttributeWizardService, DivAttributeWizOption } from '../../../../services/div-attribute-wizard.service';
import { Option } from '../../../../../shared/models/option.model';

@Component({
	selector: 'divisional-attribute-wizard-step1',
	templateUrl: './divisional-attribute-wizard-step1.component.html',
	styleUrls: ['./divisional-attribute-wizard-step1.component.scss']
})
/** divisional-attribute-wizard-step1 component*/
export class DivisionalAttributeWizardStep1Component implements OnInit
{
	@ViewChild('headerTemplate') headerTemplate: TemplateRef<any>;

	get filteredOptions(): DivAttributeWizOption[]
	{
		return this.wizardService.filteredOptions;
	}

	get selectedOption(): DivAttributeWizOption
	{
		return this.wizardService.selectedOption;
	}

	constructor(private wizardService: DivAttributeWizardService)
	{

	}

	ngOnInit(): void
	{
		if (!this.wizardService.hasFilteredOptions)
		{
			this.wizardService.getFilteredOptions();
		}
	}
	
	updateOptionList(option: Option)
	{
		this.wizardService.selectedOption = new DivAttributeWizOption(option);
	}
}
