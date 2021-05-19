import { Component, Input, Output, OnInit, OnChanges, SimpleChanges, EventEmitter, ViewChild } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver3, OptionImage, DecisionPoint, Group } from 'phd-common';
import { ChoiceExt } from '../../models/choice-ext.model';

@Component({
	selector: 'choice-card',
	templateUrl: './choice-card.component.html',
	styleUrls: ['./choice-card.component.scss'],
	animations: [
		flipOver3
	]
})
export class ChoiceCardComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges
{
	@Input() currentChoice: ChoiceExt;
	@Input() currentPoint: DecisionPoint;
	@Input() groups: Group[];

	@Output() toggled = new EventEmitter<ChoiceExt>();
	@Output() onViewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() onSelectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal: any;

	choice: ChoiceExt;
	choiceMsg: object[] = [];
	optionImages: OptionImage[];
	imageUrl: string = '';
	blockedChoiceModalRef: NgbModalRef;
	disabledByList: {label: string, pointId: number, choiceId?: number}[];

	constructor(public modalService: NgbModal) {
		super();
	}

	ngOnInit()
	{
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['currentChoice'])
		{
			this.choice = changes['currentChoice'].currentValue;

			const options = this.choice ? this.choice.options : null;
			if (options && options.length) {
				let option = options.find(x => x.optionImages && x.optionImages.length > 0);

				if (option) {
					this.optionImages = option.optionImages;
				}
			}

			this.imageUrl = this.getImagePath();
		}
	}

	getImagePath(): string
	{
		let imagePath = '';

		if (this.optionImages && this.optionImages.length)
		{
			imagePath = this.optionImages[0].imageURL;
		}
		else if (this.choice && this.choice.imagePath)
		{
			imagePath = this.choice.imagePath;
		}

		return imagePath;
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		event.srcElement.src = 'assets/pultegroup_logo.jpg';
	}

	toggleChoice() {
		this.toggled.emit(this.choice);
	}

	viewChoiceDetail()
	{
		this.onViewChoiceDetail.emit(this.choice);
	}

	openBlockedChoiceModal() {
		this.disabledByList = [];
		const allPoints = _.flatMap(this.groups, g => _.flatMap(g.subGroups, sg => sg.points));
		const allChoices = _.flatMap(allPoints, p => p.choices.map(c => ({...c, pointId: p.id})));
		this.currentPoint.disabledBy.forEach(disabledPoint => {
			disabledPoint.rules.forEach(rule => {
				rule.points.forEach(disabledByPointId => {
					this.disabledByList.push({
						label: allPoints.find(point => point.id === disabledByPointId)?.label,
						pointId: disabledByPointId
					});
				});
				rule.choices.forEach(disabledByChoiceId => {
					const disabledByChoice = allChoices.find(choice => choice.id === disabledByChoiceId);
					this.disabledByList.push({
						label: disabledByChoice?.label,
						pointId: disabledByChoice?.pointId,
						choiceId: disabledByChoiceId
					});
				});
			});
		});
		this.choice.disabledBy.forEach(disabledChoice => {
			disabledChoice.rules.forEach(rule => {
				rule.choices.forEach(disabledByChoiceId => {
					const disabledByChoice = allChoices.find(choice => choice.id === disabledByChoiceId);
					this.disabledByList.push({
						label: disabledByChoice?.label,
						pointId: disabledByChoice?.pointId,
						choiceId: disabledByChoiceId
					});
				});
			});
		});
		this.blockedChoiceModalRef = this.modalService.open(this.blockedChoiceModal, { windowClass: 'phd-blocked-choice-modal' });
	}

	closeClicked() {
		this.blockedChoiceModalRef?.close();
		delete this.disabledByList;
	}

	onBlockedItemClick(pointId: number) {
		this.blockedChoiceModalRef?.close();
		delete this.disabledByList;
		this.onSelectDecisionPoint.emit(pointId);
	}
}
