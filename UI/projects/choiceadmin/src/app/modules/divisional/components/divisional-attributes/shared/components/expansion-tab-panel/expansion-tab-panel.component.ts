import { Component, Input, ContentChildren, QueryList, AfterContentInit } from '@angular/core';

import { Subject } from 'rxjs';

import { AttributeGroupMarket } from '../../../../../../shared/models/attribute-group-market.model';
import { IFinancialCommunity } from '../../../../../../shared/models/financial-community.model';

import { PhdColumnDirective } from 'phd-common';

@Component({
	selector: 'expansion-tab-panel',
	templateUrl: './expansion-tab-panel.component.html',
	styleUrls: ['./expansion-tab-panel.component.scss']
})
export class ExpansionTabPanelComponent implements AfterContentInit
{
	@Input() dataItems: Array<IFinancialCommunity | AttributeGroupMarket>;
	@Input() emptyMessage: string;
	@Input() header: string;

	@ContentChildren(PhdColumnDirective) phdColumns: QueryList<PhdColumnDirective>;
	displayColumns$ = new Subject<Array<PhdColumnDirective>>();

	constructor() { }

	ngAfterContentInit(): void
	{
		setTimeout(() => this.displayColumns$.next(this.phdColumns.toArray()), 0);
	}
}
