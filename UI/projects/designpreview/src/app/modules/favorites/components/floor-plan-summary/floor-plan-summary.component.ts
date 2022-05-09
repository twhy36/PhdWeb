import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

import { BehaviorSubject, combineLatest } from 'rxjs';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, PriceBreakdown, Group, SubGroup } from 'phd-common';
import { BrandService } from '../../../core/services/brand.service';

@Component({
  selector: 'floor-plan-summary',
  templateUrl: './floor-plan-summary.component.html',
  styleUrls: ['./floor-plan-summary.component.scss']
})

export class FloorPlanSummaryComponent extends UnsubscribeOnDestroy implements OnInit {
	floors: any[];
	group: Group;
	subGroup: SubGroup;
	isDesignComplete: boolean;
	isFloorplanFlipped: boolean;
	selectedFloor: any;
	priceBreakdown: PriceBreakdown;
	communityName: string = '';
	planName: string = '';
	marketingPlanId$ = new BehaviorSubject<number>(0);
	noVisibleFP: boolean = false;
	isPlainFloorplan: boolean = false;
	pageName: string;

	constructor(
		private store: Store<fromRoot.State>,
		private location: Location,
		private brandService: BrandService) {
		super();
	}

	ngOnInit() {
		combineLatest([
			this.store.pipe(select(fromRoot.contractedTree), this.takeUntilDestroyed()),
			this.store.pipe(select(state => state.scenario), this.takeUntilDestroyed()),
			this.store.pipe(select(fromPlan.planState), this.takeUntilDestroyed()),
		])
		.subscribe(([contractedTree, scenarioState, plan]) => {
			const tree = contractedTree || scenarioState?.tree?.treeVersion;
			if (tree && plan && plan.marketingPlanId && plan.marketingPlanId.length) {
				let sgs = _.flatMap(contractedTree?.groups, g => g.subGroups.filter(sg => sg.useInteractiveFloorplan));
				this.isPlainFloorplan = false;
				if (sgs.length === 0) {
					sgs = _.flatMap(scenarioState?.tree?.treeVersion?.groups, g => g.subGroups.filter(sg => sg.useInteractiveFloorplan));
					this.isPlainFloorplan = true;
				}
				const fpSubGroup = sgs.pop();
				if (fpSubGroup) {
					this.subGroup = fpSubGroup;
					this.marketingPlanId$.next(plan.marketingPlanId[0]);
				} else {
					this.noVisibleFP = true;
				}
			} else {
				this.noVisibleFP = true;
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

	getDefaultFPImageSrc() {
		return this.brandService.getBrandImage('logo');
	}
}
