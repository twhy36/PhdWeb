import { Component, OnInit, Input, Inject, EventEmitter, Output } from "@angular/core";
import { APP_BASE_HREF } from '@angular/common';

import { Store } from '@ngrx/store';

import { UnsubscribeOnDestroy, Job, Plan, ChoiceImageAssoc } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
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
	hasPendingChangeOrder: boolean;

	private imagePath : string;

	constructor(
		private store: Store<fromRoot.State>, 
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
