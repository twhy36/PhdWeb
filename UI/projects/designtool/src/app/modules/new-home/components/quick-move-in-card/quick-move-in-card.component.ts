import { Component, OnInit, Input, Inject, EventEmitter, Output } from "@angular/core";
import { APP_BASE_HREF } from '@angular/common';

import { Store } from '@ngrx/store';

import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';
import * as fromRoot from '../../../ngrx-store/reducers';
import { Plan } from '../../../shared/models/plan.model';
import { Job } from '../../../shared/models/job.model';

@Component({
	selector: 'quick-move-in-card',
	templateUrl: 'quick-move-in-card.component.html',
	styleUrls: ['quick-move-in-card.component.scss']
})
export class QuickMoveInCardComponent extends UnsubscribeOnDestroy
	implements OnInit
{
	@Input() plans: Plan[];
	@Input() specJob: Job;
	@Input() canConfigure: boolean;
	@Input() selectedJob: Job;

	@Output() onToggleSpecHome = new EventEmitter<{ job: Job, selectedJobId: number }>();

	lot = new QuickMoveInLot();
	plan: Plan;
	choices: { choiceId: number, overrideNote: string, quantity: number }[];
	hasPendingChangeOrder: boolean;

	constructor(private store: Store<fromRoot.State>, @Inject(APP_BASE_HREF) private _baseHref: string)
	{
		super();
	}

	ngOnInit()
	{
		this.plan = this.plans.find(
			plan => plan.id === this.specJob.planId
		);

		this.lot = {
			id: this.specJob.lot.id,
			lotBlock: this.specJob.lot.lotBlock,
			price: this.specJob.jobSalesInfo.specPrice,
			salesName: this.plan?.salesName
		};

		this.hasPendingChangeOrder = this.specJob.changeOrderGroups && this.specJob.changeOrderGroups.some(x => x.salesStatusDescription === 'Pending' || (x.salesStatusDescription === 'Approved' && x.constructionStatusDescription === 'Pending'));
	}

	toggleSpecHome()
	{
		this.onToggleSpecHome.emit({ job: this.specJob, selectedJobId: this.selectedJob.id });
	}

	getImagePath(): string
	{
		// Images to be added in later story
		const imagePath = this.plan && this.plan.baseHouseElevationImageUrl ? this.plan.baseHouseElevationImageUrl : `${this._baseHref}assets/pultegroup_logo.jpg`;

		return imagePath;
	}

	loadImageError(event: any)
	{
		event.srcElement.src = `${this._baseHref}assets/pultegroup_logo.jpg`;
	}

	getButtonLabel(): string
	{
		return this.selectedJob.id === this.specJob.id ? 'UNSELECT' : 'CHOOSE';
	}
}

class QuickMoveInLot
{
	id: number;
	lotBlock: string;
	salesName: string;
	price: number;
}
