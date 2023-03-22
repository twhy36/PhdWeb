import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { IFinancialCommunity } from '../../../../../../../../../salesportal/src/app/modules/shared/models/community.model';
import { DivisionalChoice } from '../../../../../shared/models/divisional-catalog.model';

import { PhdTableComponent } from 'phd-common';

@Component({
	selector: 'expansion-choice-communities-tab-panel',
	templateUrl: './expansion-communities-tab-panel.component.html',
	styleUrls: ['./expansion-communities-tab-panel.component.scss']
})
export class ExpansionChoiceCommunitiesTabPanelComponent implements OnInit
{
	@Input() choice: DivisionalChoice;
	@Input() communities: Array<IFinancialCommunity>;
	@Input() isReadOnly: boolean;

	@Output() onDataChange = new EventEmitter();

	@ViewChild(PhdTableComponent)
	private tableComponent: PhdTableComponent;

	ngOnInit() { }

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
