import { Component, Input, Output, OnChanges, SimpleChanges, EventEmitter, ViewChild } from '@angular/core';
import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver3, DecisionPoint, Group, Tree, ModalService, ModalRef, getChoiceImage } from 'phd-common';
import { ChoiceExt } from '../../models/choice-ext.model';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as NavActions from '../../../ngrx-store/nav/actions';

@Component({
	selector: 'choice-card',
	templateUrl: './choice-card.component.html',
	styleUrls: ['./choice-card.component.scss'],
	animations: [
		flipOver3
	]
})
export class ChoiceCardComponent extends UnsubscribeOnDestroy implements OnChanges
{
	@Input() currentChoice: ChoiceExt;
	@Input() currentPoint: DecisionPoint;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPresale: boolean = false;
	@Input() isIncludedOptions: boolean = false;

	@Output() toggled = new EventEmitter<ChoiceExt>();
	@Output() viewChoiceDetail = new EventEmitter<ChoiceExt>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal;
	@ViewChild('hiddenChoicePriceModal') hiddenChoicePriceModal;

	choice: ChoiceExt;
	choiceMsg: object[] = [];
	imageUrl: string = '';
	blockedChoiceModalRef: ModalRef;
	choiceDisabledLabel: string;

	constructor(
		private store: Store<fromRoot.State>,
		public modalService: ModalService
	)
	{
		super();
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['currentChoice'])
		{
			this.choice = changes['currentChoice'].currentValue;

			this.imageUrl = getChoiceImage(this.choice);
		}
	}

	getBodyHeight(): string
	{
		return this.isPresale ? '260px' : '285px';
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event)
	{
		event.srcElement.src = 'assets/NoImageAvailable.png';
	}

	toggleChoice()
	{
		if (!this.isReadonly)
		{
			this.toggled.emit(this.choice);
		}
	}

	clickViewChoiceDetail()
	{
		this.viewChoiceDetail.emit(this.choice);
	}

	openBlockedChoiceModal()
	{
		if (!this.isIncludedOptions)
		{
			const subGroup = _.flatMap(this.groups, g => _.flatMap(g.subGroups)).find(sg => !!sg.points.find(p => this.currentPoint.id === p.id)) || null;
			this.store.dispatch(new NavActions.SetSelectedSubgroup(subGroup.id, this.currentPoint.id, null));
		}

		this.blockedChoiceModalRef = this.modalService.open(this.blockedChoiceModal, { backdrop: true, windowClass: 'phd-blocked-choice-modal' }, true);
	}

	onCloseClicked()
	{
		this.blockedChoiceModalRef?.close();
	}

	onBlockedItemClick()
	{
		this.blockedChoiceModalRef?.close();
	}
}
