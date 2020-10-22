import { Component, OnInit } from "@angular/core";

import { Store, select } from "@ngrx/store";
import { Observable, ReplaySubject } from "rxjs";
import { combineLatest } from 'rxjs/operators';

import * as fromJobs from '../../../ngrx-store/job/reducer';
import { UnsubscribeOnDestroy } from "phd-common/utils/unsubscribe-on-destroy";
import * as fromRoot from '../../../ngrx-store/reducers';
import { Plan } from "../../../shared/models/plan.model";
import { Job } from "../../../shared/models/job.model";

@Component({
    selector: 'quick-move-in',
    templateUrl: 'quick-move-in.component.html',
    styleUrls: ['quick-move-in.component.scss'],
})
export class QuickMoveInComponent extends UnsubscribeOnDestroy implements OnInit {
    specJobs: Job[];
    plans$: Observable<Array<Plan>>;
    selectedFilterBy$ = new ReplaySubject<number>(1);
	filteredSpecJobs: Job[];
	canConfigure$: Observable<boolean>;

    constructor(private store: Store<fromRoot.State>) {
        super();
        this.selectedFilterBy$.next(null);
    }

    ngOnInit() {
        this.store.pipe(
            this.takeUntilDestroyed(),
            select(state => state.scenario.financialCommunityFilter)
        ).subscribe(filter => this.selectedFilterBy$.next(filter));

        this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromJobs.specJobs),
            combineLatest(this.selectedFilterBy$)
		).subscribe(([jobs, filter]) => {
			if (jobs) {
				this.specJobs = jobs;
				this.filteredSpecJobs = filter === 0
					? this.specJobs
                    : this.specJobs.filter(job => job.lot.financialCommunityId === filter);
                this.filteredSpecJobs.sort(function (a, b) {
                    if (a.lot.lotBlock < b.lot.lotBlock) {
                        return -1;
                    }
                    if (a.lot.lotBlock > b.lot.lotBlock) {
                        return 1;
                    }
                });
            } else {
				this.filteredSpecJobs = [];
            }
        });

        this.plans$ = this.store.pipe(
            select(state => state.plan.plans)
		);

		this.canConfigure$ = this.store.pipe(select(fromRoot.canConfigure));
    }
}
