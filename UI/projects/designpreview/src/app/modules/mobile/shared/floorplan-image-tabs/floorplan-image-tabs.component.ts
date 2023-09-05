import { Component, Input, OnInit } from '@angular/core';
import { FloorPlanImage, SubGroup, UnsubscribeOnDestroy } from 'phd-common';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { Store, select } from '@ngrx/store';

import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';

import { withLatestFrom } from 'rxjs/operators';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
	selector: 'floorplan-image-tabs',
	templateUrl: './floorplan-image-tabs.component.html',
	styleUrls: ['./floorplan-image-tabs.component.scss'],
	// eslint-disable-next-line indent
})
export class FloorplanImageTabsComponent
	extends UnsubscribeOnDestroy
	implements OnInit
{
	@Input() showExpandImageIcons: boolean;
	@Input() imageHeight: string;
	@Input() selectedIndex: number = 0;
	@Input() showImageContainerBorder: boolean;

	floorPlanImages: FloorPlanImage[];
	marketingPlanId = new BehaviorSubject<number>(0);
	IFPsubGroup: SubGroup;
	isFloorplanFlipped: boolean;

	constructor(
		private store: Store<fromRoot.State>,
		private dialogService: DialogService,
		public sanitizer: DomSanitizer
	) 
	{
		super();
	}

	ngOnInit(): void 
	{
		// get marketing plan id for interactive floorplan
		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select(fromPlan.planState),
				withLatestFrom(
					this.store.pipe(select((state) => state.scenario))
				)
			)
			.subscribe(([plan, scenario]) => 
			{
				const subGroups =
					scenario.tree.treeVersion.groups.flatMap(
						(g) => g.subGroups
					);
				const fpSubGroup = subGroups.find(
					(sg) => sg.useInteractiveFloorplan
				);
				this.IFPsubGroup = fpSubGroup;
				this.marketingPlanId.next(plan.marketingPlanId[0]);
			});
		
		this.store
			.pipe(
				this.takeUntilDestroyed(),
				select(fromSalesAgreement.salesAgreementState)
			)
			.subscribe((sag) => 
			{
				this.isFloorplanFlipped = sag?.isFloorplanFlipped;
			});
	}

	onFloorPlanSaved(images: FloorPlanImage[]) 
	{
		if (!images || !images.length) 
		{
			return;
		}
		this.floorPlanImages = images;
	}

	getIfpId(image: FloorPlanImage) 
	{
		return `phd-ifp-${image?.floorIndex}`;
	}

	expandFloorplanImage(selectedIndex?: number) 
	{
		const options = {
			selectedIndex: selectedIndex ?? 0,
		};
		this.dialogService.openImageDialog(options);
	}
}
