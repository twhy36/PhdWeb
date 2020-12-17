import { take } from 'rxjs/operators';
import { Component, OnInit, Input, Inject } from "@angular/core";
import { APP_BASE_HREF } from '@angular/common';
import { Router } from '@angular/router';

import { Store, ActionsSubject, select } from '@ngrx/store';
import { ofType } from '@ngrx/effects';

import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';
import * as fromRoot from '../../../ngrx-store/reducers';
import { Plan } from '../../../shared/models/plan.model';
import { Job } from '../../../shared/models/job.model';
import * as CommonActions from '../../../ngrx-store/actions';
import * as PlanActions from '../../../ngrx-store/plan/actions';
import * as LotActions from '../../../ngrx-store/lot/actions';
import * as JobActions from '../../../ngrx-store/job/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';
import { ChangeOrderService } from './../../../core/services/change-order.service';
import { CommonActionTypes } from '../../../ngrx-store/actions';
import { PointStatus } from '../../../shared/models/point.model';

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

	lot = new QuickMoveInLot();
	plan: Plan;
	choices: { choiceId: number, overrideNote: string, quantity: number }[];
	hasPendingChangeOrder: boolean;

	constructor(private store: Store<fromRoot.State>,
		private changeOrderService: ChangeOrderService,
		private router: Router,
		private actions: ActionsSubject,
		@Inject(APP_BASE_HREF) private _baseHref: string)
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
		// quick move-in
		if (this.selectedJob.id === this.specJob.id)
		{
			// remove the spec
			this.store.dispatch(new JobActions.DeselectSpec());
			this.store.dispatch(new NavActions.SetSubNavItemStatus(4, PointStatus.REQUIRED));

			// remove the plan
			this.store.dispatch(new PlanActions.DeselectPlan());
			this.store.dispatch(new ScenarioActions.SetScenarioPlan(null, null));
			this.store.dispatch(new NavActions.SetSubNavItemStatus(2, PointStatus.REQUIRED));

			// remove the lot
			this.store.dispatch(new LotActions.DeselectLot());
			this.store.dispatch(new ScenarioActions.SetScenarioLot(null, null, 0));
			this.store.dispatch(new NavActions.SetSubNavItemStatus(3, PointStatus.REQUIRED));
		}
		else
		{
			this.changeOrderService.getTreeVersionIdByJobPlan(this.specJob.planId).subscribe(() =>
			{
				this.store.dispatch(new CommonActions.LoadSpec(this.specJob));

				this.actions.pipe(
					ofType<CommonActions.JobLoaded>(CommonActionTypes.JobLoaded), take(1)).subscribe(() =>
					{
						this.router.navigate(['/scenario-summary']);
					});
			});
		}
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
		let btnLabel;

		if (this.selectedJob.id === this.specJob.id)
		{
			btnLabel = 'UNSELECT';
		}
		else
		{
			btnLabel = 'CHOOSE';
		}

		return btnLabel;
	}
}

class QuickMoveInLot
{
	id: number;
	lotBlock: string;
	salesName: string;
	price: number;
}
