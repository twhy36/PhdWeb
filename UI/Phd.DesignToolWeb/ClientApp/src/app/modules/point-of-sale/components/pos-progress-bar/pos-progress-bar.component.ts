import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
	selector: 'pos-progress-bar',
	templateUrl: './pos-progress-bar.component.html',
	styleUrls: ['./pos-progress-bar.component.scss']
})
export class PosProgressBarComponent implements OnInit
{
	@Input() displayAgreement: boolean = true;
	@Input() isPeopleComplete: boolean;
	@Input() isSalesInfoComplete: boolean;
	@Input() isAgreementInfoViewed: boolean;
	@Output() onViewAgreementInfo = new EventEmitter();

	constructor() { }

	ngOnInit()
	{
	}

	openAgreementInfo() {
		this.onViewAgreementInfo.emit();
	}

}
