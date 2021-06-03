import { Component, Input, Output, OnInit, OnChanges, SimpleChanges, EventEmitter } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver3, DecisionPoint } from 'phd-common';
import { MyFavoritesPointDeclined } from '../../models/my-favorite.model';

@Component({
	selector: 'choice-decline-card',
	templateUrl: './choice-decline-card.component.html',
	styleUrls: ['./choice-decline-card.component.scss'],
	animations: [
		flipOver3
	]
})
export class ChoiceDeclineCardComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() point: DecisionPoint;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[]

	@Output() onDeclineDecisionPoint = new EventEmitter<DecisionPoint>();

	isDeclined: boolean = false;

	constructor()
	{
		super();
	}

	ngOnInit()
	{
        this.isDeclined = !!this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === this.point.divPointCatalogId);
	}

	ngOnChanges(changes: SimpleChanges) { }

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		event.srcElement.src = 'assets/pultegroup_logo.jpg';
	}

	toggleDecline() {
		this.onDeclineDecisionPoint.emit(this.point);
	}
}
