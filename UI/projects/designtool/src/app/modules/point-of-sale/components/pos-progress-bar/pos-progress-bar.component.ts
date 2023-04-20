import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
	selector: 'pos-progress-bar',
	templateUrl: './pos-progress-bar.component.html',
	styleUrls: ['./pos-progress-bar.component.scss']
})
export class PosProgressBarComponent implements OnInit
{
	@Input() isPeopleComplete: boolean;
	@Input() isSalesInfoComplete: boolean;
	@Input() isAgreementInfoViewed: boolean;
	@Input() salesAgreementId: number;

	@Output() onViewAgreementInfo = new EventEmitter();

	constructor() { }

	ngOnInit()
	{
	}

	openAgreementInfo()
	{
		this.onViewAgreementInfo.emit();
	}

}
