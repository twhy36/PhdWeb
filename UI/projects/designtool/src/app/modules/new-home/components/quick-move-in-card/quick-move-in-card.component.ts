import { Component, OnInit, Input, Inject, EventEmitter, Output } from "@angular/core";
import { APP_BASE_HREF } from '@angular/common';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, Job, Plan } from 'phd-common';

import { TreeService } from '../../../core/services/tree.service';
import { of } from "rxjs";

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
	hasPendingChangeOrder: boolean = false;

	private imagePath : string;

	constructor(
		@Inject(APP_BASE_HREF) private _baseHref: string,
		private _treeService: TreeService)
	{
		super();
	}

	ngOnInit()
	{
		this.plan = this.plans.find(
			plan => plan.id === this.specJob.planId
		);

		let elevationPlanOptions = this.specJob.jobPlanOptions.filter( x => x.jobOptionTypeName === "Elevation");

		let getImages = elevationPlanOptions?.length > 0 ? 
		this._treeService.getPlanOptionCommunityImageAssoc(elevationPlanOptions) : of(null);

		getImages.subscribe(jobPlanImages =>{
			
			if( jobPlanImages && jobPlanImages.length > 0)
			{
				this.imagePath = jobPlanImages[0].imageUrl;
			}
			else if(this.plan && this.plan.baseHouseElevationImageUrl)
			{
				this.imagePath = this.plan.baseHouseElevationImageUrl;
			}
			else
			{
				this.imagePath =`${this._baseHref}assets/pultegroup_logo.jpg`;
			}
		}) ;

		this.lot = {
			id: this.specJob.lot.id,
			lotBlock: this.specJob.lot.lotBlock,
			price: this.specJob.jobSalesInfo?.specPrice,
			salesName: this.plan?.salesName
		};

		if (this.specJob.changeOrderGroups)
		{
			const sortedChangeOrderGroups = _.orderBy(this.specJob.changeOrderGroups, 'id', 'desc');
			const cancelledChangeOrder = sortedChangeOrderGroups.find(cog => cog.jobChangeOrderGroupDescription === 'Cancellation' && cog.salesStatusDescription === 'Approved' && cog.constructionStatusDescription === 'Approved');
			const pendingChangeOrder = sortedChangeOrderGroups.find(cog => cog.salesStatusDescription === 'Pending' || (cog.salesStatusDescription === 'Approved' && cog.constructionStatusDescription === 'Pending'));

			// Check the pending change order after cancellation changer order
			this.hasPendingChangeOrder = pendingChangeOrder && (cancelledChangeOrder ? cancelledChangeOrder.id < pendingChangeOrder.id : true);
		}
	}

	toggleSpecHome()
	{
		this.onToggleSpecHome.emit({ job: this.specJob, selectedJobId: this.selectedJob.id });
	}

	getImagePath(): string
	{
		return this.imagePath;
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
