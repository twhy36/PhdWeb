import { Component, Input } from '@angular/core';

import { ModalContent } from 'phd-common';
import { LitePlanOption } from '../../../shared/models/lite.model';

@Component({
	selector: 'confirm-option-relation',
	templateUrl: './confirm-option-relation.component.html',
	styleUrls: ['./confirm-option-relation.component.scss']
})
export class ConfirmOptionRelationComponent extends ModalContent
{
	@Input() relatedOptions: LitePlanOption[];
	@Input() relationType: number;

	constructor()
	{
		super();
	}

	getOptionDescription(option: LitePlanOption)
	{
		return `${option.financialOptionIntegrationKey}: ${option.name}`;
	}
}
