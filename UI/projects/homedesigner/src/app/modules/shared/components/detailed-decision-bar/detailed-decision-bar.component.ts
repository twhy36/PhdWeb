import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver2, slideOut, DecisionPoint, JobChoice, PickType, Choice } from 'phd-common';
import { ChoiceExt } from '../../models/choice-ext.model';
import { MyFavoritesChoice } from '../../models/my-favorite.model';

@Component({
	selector: 'detailed-decision-bar',
	templateUrl: './detailed-decision-bar.component.html',
	styleUrls: ['./detailed-decision-bar.component.scss'],
	animations: [
		flipOver2,
		slideOut
	]
})
export class DetailedDecisionBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() points: DecisionPoint[];
	@Input() currentPointId: number;
	@Input() salesChoices: JobChoice[];
	@Input() myFavoritesChoices: MyFavoritesChoice[];

	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();

	constructor() { super(); }

	ngOnInit() {
	}

	getSubTitle(point: DecisionPoint): string {
		if (point) {
			const contractedChoices = point.choices.filter(c => this.salesChoices.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);
			const isPreviouslyContracted = contractedChoices && contractedChoices.length;

			switch (point.pointPickTypeId) {
				case PickType.Pick1:
					return isPreviouslyContracted ? 'Previously Contracted Option' : 'Please select one of the choices below';
				case PickType.Pick1ormore:
					return isPreviouslyContracted ? 'Previously Contracted Options' : 'Please select at least one of the Choices below';
				case PickType.Pick0ormore:
					return isPreviouslyContracted ? 'Previously Contracted Options' : 'Please select at least one of the Choices below';
				case PickType.Pick0or1:
					return isPreviouslyContracted ? 'Previously Contracted Option' : 'Please select one of the choices below';
				default:
					return '';
			}
		}

		return '';
	}

	getChoiceExt(choice: Choice, point: DecisionPoint) : ChoiceExt {
		let choiceStatus = 'Available';
		if (point.isPastCutOff || this.salesChoices.findIndex(c => c.divChoiceCatalogId === choice.divChoiceCatalogId) > -1) {
			choiceStatus = 'Contracted';
		}	else {
			const contractedChoices = point.choices.filter(c => this.salesChoices.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);
			if (contractedChoices && contractedChoices.length && (point.pointPickTypeId === PickType.Pick1 || point.pointPickTypeId === PickType.Pick0or1)) {
				choiceStatus = 'ViewOnly';
			}
		}

		const myFavoritesChoice = this.myFavoritesChoices ? this.myFavoritesChoices.find(x => x.divChoiceCatalogId === choice.divChoiceCatalogId) : null;
		return new ChoiceExt(choice, choiceStatus, myFavoritesChoice, point.isStructuralItem);
	}

	toggleChoice (choice) {
		this.onToggleChoice.emit(choice);
	}

	viewChoiceDetail (choice) {
		this.onViewChoiceDetail.emit(choice);
	}
}
