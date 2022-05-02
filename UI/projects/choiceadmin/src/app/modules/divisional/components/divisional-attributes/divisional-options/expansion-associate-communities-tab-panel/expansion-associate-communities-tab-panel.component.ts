import { Component, Input, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';

import { Option } from '../../../../../shared/models/option.model';
import { IFinancialCommunity } from '../../../../../shared/models/financial-community.model';

import { PhdTableComponent } from 'phd-common';

@Component({
	selector: 'expansion-associate-communities-tab-panel',
	templateUrl: './expansion-associate-communities-tab-panel.component.html',
	styleUrls: ['./expansion-associate-communities-tab-panel.component.scss']
})
export class ExpansionAssociateCommunitiesTabPanelComponent implements OnInit
{
	@Input() option: Option;
	@Input() communities: Array<IFinancialCommunity>;
	@Input() isReadOnly: boolean;

	@Output() onDataChange = new EventEmitter();

	associatedCommunities: Array<IFinancialCommunity>;
	disableSaveBtn: boolean = false;

	@ViewChild(PhdTableComponent)
	private tableComponent: PhdTableComponent;

	constructor() { }

	ngOnInit()
	{
		this.getAssociatedCommunities();
	}

	getAssociatedCommunities()
	{
		this.associatedCommunities = this.communities.filter(c => c.optionAssociated);
	}

	onDataChanged()
	{
		this.onDataChange.emit();
	}

	toggleCommunities()
	{
		// close all open panels
		this.tableComponent.collapseAllExpandedRows();
	}
}
