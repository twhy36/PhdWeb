import { Component, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { DecisionPoint, Group, Tree, MyFavoritesPointDeclined, ModalRef, ModalService } from 'phd-common';
import _ from 'lodash';

import { Store } from '@ngrx/store';

import * as fromRoot from '../../../../ngrx-store/reducers';
import * as NavActions from '../../../../ngrx-store/nav/actions';
import { BrandService } from '../../../../core/services/brand.service';

@Component({
	selector: 'decision-bar-decline-choice',
	templateUrl: './decision-bar-decline-choice.component.html',
	styleUrls: ['./decision-bar-decline-choice.component.scss']
	})
export class DecisionBarDeclineChoiceComponent implements OnInit, OnChanges 
{
	@Input() point: DecisionPoint;
	@Input() myFavoritesPointsDeclined?: MyFavoritesPointDeclined[];
	@Input() groups: Group[];
	@Input() tree: Tree;
	@Input() isReadonly: boolean;

	@Output() declineDecisionPoint = new EventEmitter<DecisionPoint>();
	@Output() selectDecisionPoint = new EventEmitter<number>();

	@ViewChild('blockedChoiceModal') blockedChoiceModal;

	isDeclined: boolean = false;
	blockedChoiceModalRef: ModalRef;
	brandTheme: string;

	constructor(
		private store: Store<fromRoot.State>,
		private brandService: BrandService,
		public modalService: ModalService
	) { }

	ngOnInit() 
	{
		this.updateIsDeclined();
		this.brandTheme = this.brandService.getBrandTheme();
	}

	ngOnChanges() 
	{
		this.updateIsDeclined();
	}

	updateIsDeclined() 
	{
		this.isDeclined = !!this.myFavoritesPointsDeclined?.find(p => p.divPointCatalogId === this.point.divPointCatalogId);
	}

	toggleDecline()
	{
		if (!this.isReadonly)
		{
			this.declineDecisionPoint.emit(this.point);
		}
	}

	openBlockedChoiceModal()
	{
		const subGroup = _.flatMap(this.groups, g => _.flatMap(g.subGroups)).find(sg => !!sg.points.find(p => this.point.id === p.id)) || null;
		this.store.dispatch(new NavActions.SetSelectedSubgroup(subGroup.id, this.point.id, null));

		this.blockedChoiceModalRef = this.modalService.open(this.blockedChoiceModal, { backdrop: true, windowClass: `phd-blocked-choice-modal ${this.brandTheme}` }, true);
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
