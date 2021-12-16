import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { UnsubscribeOnDestroy, PriceBreakdown, ScenarioStatusType, SummaryReportType } from 'phd-common';

import { DecisionPointFilterType } from '../../../shared/models/decisionPointFilter';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';

import { withLatestFrom } from 'rxjs/operators';

@Component({
	selector: 'summary-action-bar',
	templateUrl: './summary-action-bar.component.html',
	styleUrls: ['./summary-action-bar.component.scss']
})
export class SummaryActionBarComponent extends UnsubscribeOnDestroy implements OnInit 
{
	@Input() selectedPointFilter: DecisionPointFilterType;
	@Input() enabledPointFilters: DecisionPointFilterType[];
	@Input() isComplete: boolean;
	@Input() priceBreakdown: PriceBreakdown;
	@Input() scenarioStatus: ScenarioStatusType;
	@Input() hasFloorPlan: boolean = false;
	@Input() inChangeOrder: boolean = false;
	@Input() canChange: boolean;
	@Input() priceRangesCalculated: boolean;

	@Output() pointTypeFilterChanged = new EventEmitter<DecisionPointFilterType>();
	@Output() onBuildIt = new EventEmitter<void>();
	@Output() onPrintPreview = new EventEmitter<string>();

	primaryAction: string = 'Generate Agreement';

	summaryReportType = SummaryReportType;
	salesAgreementId: number;

	constructor(private store: Store<fromRoot.State>, private router: Router) { super(); }

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.buildMode),
			withLatestFrom(this.store.pipe(select(state => state.salesAgreement)))
		).subscribe(([build, salesAgreement]) =>
		{
			if (salesAgreement.id)
			{
				this.salesAgreementId = salesAgreement.id;
				this.primaryAction = 'Agreement Info';
			}
			else if (build === 'spec')
			{
				this.primaryAction = 'Create Spec';
			}
			else if (build === 'model')
			{
				this.primaryAction = 'Create Model';
			}
		});
	}

	onPointTypeFilterChanged(pointTypeFilter: DecisionPointFilterType)
	{
		this.pointTypeFilterChanged.emit(pointTypeFilter);
	}

	printConfig(reportName: string)
	{
		this.onPrintPreview.emit(reportName);
	}

	onCallToAction()
	{
		if (this.salesAgreementId)
		{
			this.router.navigateByUrl(`/point-of-sale/people/${this.salesAgreementId}`);
		}

		this.onBuildIt.emit();
	}

	isReportDisabled(reportName: string): boolean
	{
		return !this.priceRangesCalculated && (reportName === SummaryReportType.CHOICE_LIST || reportName === SummaryReportType.DESIGN_CHOICE_LIST);
	}
}
