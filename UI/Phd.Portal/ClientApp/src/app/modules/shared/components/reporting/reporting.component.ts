import { Component, OnInit, Input, Output, ViewEncapsulation, EventEmitter } from '@angular/core';

import { LinkAction } from '../../models/action.model';
import { environment } from '../../../../../environments/environment';

@Component({
	selector: 'reporting',
	templateUrl: './reporting.component.html',
	styleUrls: ['./reporting.component.scss'],
	encapsulation: ViewEncapsulation.None
})

export class ReportingComponent implements OnInit
{
	@Input() action: LinkAction;
	@Output() onClose = new EventEmitter<void>();


	selectedReport: string;

	constructor() { }

	ngOnInit()
	{
	}

	viewReport()
	{
		// Convert report type to enum
		const reportSelected: ReportTypesEnum = ReportTypesEnum[this.selectedReport as keyof typeof ReportTypesEnum];
		let url: string;

		switch (reportSelected)
		{
			case ReportTypesEnum.SalesReport:
				url = environment.baseUrl.reports;
				break;
			case ReportTypesEnum.SalesTally:
				url = environment.baseUrl.salesTally;
				break;
		}

		window.open(url, '_blank');
	}
	
	close()
	{
		this.onClose.emit();
	}

	get reportTypes(): Array<string> {
		// gets a list of the eNums and adds a space before each capital letter
		return [...this.enumKeys(ReportTypesEnum)];
	}

	enumKeys(enumType) {
		//grab enum key and values -- return keys
		return Object.keys(enumType).filter(
			type => isNaN(<any>type)
		);
	}
}

export enum ReportTypesEnum {
	SalesReport = 1,
	SalesTally = 2
}
