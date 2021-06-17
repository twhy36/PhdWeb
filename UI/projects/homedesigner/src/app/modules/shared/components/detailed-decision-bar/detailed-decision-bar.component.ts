import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver2, slideOut, DecisionPoint, JobChoice, PickType, Choice, ChoiceImageAssoc } from 'phd-common';
import { ChoiceExt } from '../../models/choice-ext.model';
import { MyFavoritesChoice, MyFavoritesPointDeclined } from '../../models/my-favorite.model';

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
	@Input() choiceImages: ChoiceImageAssoc[];
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];

	@Output() onToggleChoice = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onDeclineDecisionPoint = new EventEmitter<DecisionPoint>();

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
		const images = this.choiceImages?.filter(x => x.dpChoiceId === choice.id);

		return new ChoiceExt(choice, choiceStatus, myFavoritesChoice, point.isStructuralItem, images);
	}

	showDeclineChoice(point: DecisionPoint): boolean {
		return (point.pointPickTypeId === 2 || point.pointPickTypeId === 4)
			&& !point.isStructuralItem
			&& !point.isPastCutOff
			&& point.choices.filter(c => this.salesChoices.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1)?.length > 0;
	}

	toggleChoice (choice) {
		this.onToggleChoice.emit(choice);
	}

	viewChoiceDetail (choice) {
		this.onViewChoiceDetail.emit(choice);
	}

	declineDecisionPoint(point: DecisionPoint) {
		this.onDeclineDecisionPoint.emit(point);
	}
}
