import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DecisionPoint } from 'phd-common';
import { MyFavoritesPointDeclined } from '../../../models/my-favorite.model';

@Component({
  selector: 'decision-bar-decline-choice',
  templateUrl: './decision-bar-decline-choice.component.html',
  styleUrls: ['./decision-bar-decline-choice.component.scss']
})
export class DecisionBarDeclineChoiceComponent implements OnInit {
	@Input() point: DecisionPoint;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];

	@Output() onDeclineDecisionPoint = new EventEmitter<DecisionPoint>();

	isDeclined: boolean = false;

	constructor() { }

	ngOnInit() {
		this.updateIsDeclined();
	}

	ngOnChanges() {
		this.updateIsDeclined();
	}

	updateIsDeclined() {
		this.isDeclined = !!this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === this.point.divPointCatalogId);
	}

	toggleDecline() {
		this.onDeclineDecisionPoint.emit(this.point);
	}
}
