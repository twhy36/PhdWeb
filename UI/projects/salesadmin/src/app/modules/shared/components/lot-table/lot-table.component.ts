import { OnInit, Component, Input } from "@angular/core";

import { PhdTableComponent } from 'phd-common';

import { HomeSiteDtos } from '../../../shared/models/homesite.model';
import { HomeSiteViewModel } from "../../models/plan-assignment.model";
import { HandingsPipe } from "../../pipes/handings.pipe";

@Component({
	selector: 'lot-table',
	templateUrl: './lot-table.component.html',
	styleUrls: ['./lot-table.component.scss']
})
export class LotTableComponent implements OnInit
{
	@Input() lots: HomeSiteViewModel[];

	constructor()
	{

	}

	ngOnInit()
	{

	}

	formatAddress(address: HomeSiteDtos.IAddress)
	{
		let fa = address.streetAddress1;

		fa += address.streetAddress2 && address.streetAddress2.length > 0 ? ` ${address.streetAddress2}` : '';
		fa += ` ${address.city}, ${address.stateProvince} ${address.postalCode}`;

		return fa;
	}

	showHandingTooltip(event: any, handing: Array<HomeSiteDtos.IHanding>, tableComponent: PhdTableComponent): void {
		const handingTooltipText = (new HandingsPipe()).transform(handing);

		tableComponent.showTooltip(event, handingTooltipText);
	}

	showTooltip(event: any, tooltipText: string, tableComponent: PhdTableComponent): void
	{
		tableComponent.showTooltip(event, tooltipText);
	}

	hideTooltip(tableComponent: PhdTableComponent): void
	{
		tableComponent.hideTooltip();
	}
}
