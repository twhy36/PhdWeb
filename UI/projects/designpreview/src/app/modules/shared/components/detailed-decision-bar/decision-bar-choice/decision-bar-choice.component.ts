import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { DecisionPoint, Group, ModalRef, ModalService, Tree } from 'phd-common';
import { ChoiceExt } from '../../../models/choice-ext.model';
import { Store } from '@ngrx/store';

import * as fromRoot from '../../../../ngrx-store/reducers';
import * as NavActions from '../../../../ngrx-store/nav/actions';
import _ from 'lodash';

@Component({
	selector: 'decision-bar-choice',
	templateUrl: './decision-bar-choice.component.html',
	styleUrls: ['./decision-bar-choice.component.scss']
	})
export class DecisionBarChoiceComponent 
{
	@Input() choice: ChoiceExt;
	@Input() point: DecisionPoint;
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;
	@Input() isPresale: boolean;

	@Output() toggleChoice = new EventEmitter<ChoiceExt>();
	@Output() viewChoiceDetail = new EventEmitter<ChoiceExt>();
	@Output() selectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal;
	@ViewChild('hiddenChoicePriceModal') hiddenChoicePriceModal;

	blockedChoiceModalRef: ModalRef;

	constructor(
		private store: Store<fromRoot.State>,
		public modalService: ModalService
	) { }

	clickToggleChoice()
	{
		if (!this.isReadonly)
		{
			this.toggleChoice.emit(this.choice);
		}
	}

	clickViewChoiceDetail()
	{
		this.viewChoiceDetail.emit(this.choice);
	}

	openBlockedChoiceModal()
	{
		const subGroup = _.flatMap(this.groups, g => _.flatMap(g.subGroups)).find(sg => !!sg.points.find(p => this.point.id === p.id)) || null;
		this.store.dispatch(new NavActions.SetSelectedSubgroup(subGroup.id, this.point.id, null));

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
