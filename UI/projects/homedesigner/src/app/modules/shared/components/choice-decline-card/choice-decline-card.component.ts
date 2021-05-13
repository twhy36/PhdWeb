import { Component, Input, Output, OnInit, OnChanges, SimpleChanges, EventEmitter } from '@angular/core';

import { UnsubscribeOnDestroy, flipOver3 } from 'phd-common';
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
	@Input() decisionPointId?: number;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[]
	
	@Output() onDeclineDecisionPoint = new EventEmitter<{ dPointId: number }>();

	isDeclined: boolean = false;

	constructor()
	{
		super();
	}

	ngOnInit()
	{
        if (this.myFavoritesPointsDeclined?.find(p => p.dPointId === this.decisionPointId)?.dPointId > 0) {
            this.isDeclined = true;
        } else {
            this.isDeclined = false;
        }
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
		this.isDeclined = !this.isDeclined;
		this.onDeclineDecisionPoint.emit({ dPointId: this.decisionPointId });
	}
}
