import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

import { BehaviorSubject } from 'rxjs';
import { withLatestFrom } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, PriceBreakdown, Group, SubGroup } from 'phd-common';

@Component({
  selector: 'floor-plan-summary',
  templateUrl: './floor-plan-summary.component.html',
  styleUrls: ['./floor-plan-summary.component.scss']
})

export class FloorPlanSummaryComponent extends UnsubscribeOnDestroy implements OnInit {	
	floors: any[];
	groups: Group[];
	subGroup: SubGroup;
	isDesignComplete: boolean;
	isFloorplanFlipped: boolean; 
	selectedFloor: any;
	priceBreakdown: PriceBreakdown;
	communityName: string = '';
	planName: string = '';
	marketingPlanId$ = new BehaviorSubject<number>(0);
	noVisibleGroups: boolean = false; 

	constructor(private store: Store<fromRoot.State>, private location: Location) {
		super();
	}

	ngOnInit() {
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree => {
			if (tree) {
				this.groups = tree.groups;
				if (!this.groups.length) {
					this.noVisibleGroups = true;
				} else {
					const sgs = _.flatMap(this.groups, g => g.subGroups.filter(sg => sg.useInteractiveFloorplan));
					this.subGroup = sgs.pop();
					this.noVisibleGroups = false;
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.planState),
			withLatestFrom(this.store.pipe(select(state => state.scenario)))
		).subscribe(([plan, scenario]) => {
			if (plan && plan.marketingPlanId && plan.marketingPlanId.length) {
				if (scenario.tree && scenario.tree.treeVersion) {
					const subGroups = _.flatMap(scenario.tree.treeVersion.groups, g => g.subGroups) || [];
					const fpSubGroup = subGroups.find(sg => sg.useInteractiveFloorplan);
					if (fpSubGroup) {
						this.marketingPlanId$.next(plan.marketingPlanId[0]);
					}
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromSalesAgreement.salesAgreementState)
		).subscribe(sag => {
			this.isFloorplanFlipped = sag?.isFloorplanFlipped;
			this.isDesignComplete = sag?.isDesignComplete || false;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData => {
			this.planName = planData && planData.salesName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialCommunityName),
		).subscribe(communityName => {
			this.communityName = communityName;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(tree => {
			if (tree) {
				if (!tree.groups.length) {
					this.noVisibleGroups = true;
				} else {
					this.noVisibleGroups = false;
				}
			}
		});
	}

	onBack() {
		this.location.back();
	}

	loadFloorPlan(fp) {
		// load floors
		this.floors = fp.floors;
		if (!this.selectedFloor) {
			const floor1 = this.floors.find(floor => floor.name === 'Floor 1');
			if (floor1) {
				this.selectedFloor = floor1;
			} else {
				this.selectedFloor = this.floors[0];
			}
		}
	}

	selectFloor(floor: any) {
		this.selectedFloor = floor;
	}
}
