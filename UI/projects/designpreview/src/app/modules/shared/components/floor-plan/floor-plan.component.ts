import { Component, OnInit, OnDestroy, ViewChild, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import * as _ from 'lodash';
import { Observable, Subject, timer } from 'rxjs';
import { combineLatest, flatMap, map, switchMap } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import { UnsubscribeOnDestroy, loadScript, unloadScript, SubGroup, Group, FloorPlanImage } from 'phd-common';
import { environment } from '../../../../../environments/environment';
import { JobService } from '../../../core/services/job.service';

declare var AVFloorplan: any;

@Component({
	selector: 'floor-plan',
	templateUrl: 'floor-plan.component.html',
	styleUrls: ['floor-plan.component.scss']
})
export class FloorPlanComponent extends UnsubscribeOnDestroy implements OnInit, OnDestroy, OnChanges
{
	@ViewChild('av_floor_plan') img: any;

	@Input() height: string = '100%';
	@Input() planId$: Observable<number>;
	@Input() selectedFloor: any;
	@Input() subGroup: SubGroup;
	@Input() isFlipped: boolean;
	@Input() isPresavedFloorplan: boolean = false;
	@Input() isPlainFloorplan: boolean = false;
	@Input() ifpID: string = "av-floor-plan";

	@Output() onFloorPlanLoaded = new EventEmitter();
	@Output() onFloorPlanSaved = new EventEmitter<FloorPlanImage[]>();

	fp: any;
	private readonly avAPISrc = '//apps.alpha-vision.com/api/floorplanAPIv2.3.js';
	private readonly jquerySrc = '//cdnjs.cloudflare.com/ajax/libs/jquery/1.11.1/jquery.min.js';
	planId: number = 0;
	subGroup$ = new Subject<SubGroup>();
	initialized$ = new Subject<any>();
	jobId: number;
	enabledOptions: number[] = [];
	unfilteredGroups: Group[];
	floorPlanImages: FloorPlanImage[] = [];

	constructor(
		private store: Store<fromRoot.State>,
		private jobService: JobService
	)
	{
		super();
	}

	ngOnInit(): void
	{
		let wd: any = window;

		wd.message = function (str) { };

		loadScript(this.jquerySrc).pipe(
			flatMap(() => loadScript(this.avAPISrc)),
			flatMap(() => this.planId$)
		).subscribe(planId =>
		{
			if (planId > 0 && this.planId !== planId)
			{
				this.planId = planId;

				try
				{
					this.fp = wd.fp = new AVFloorplan(environment.alphavision.builderId, '' + planId, document.querySelector('#' + this.ifpID), [], this.fpInitialized.bind(this));

					if (this.floorPlanImages.length === 0) {
						this.saveFloorPlanImages();
					}
				}
				catch (err)
				{
					this.fp = { graphic: undefined };

					this.fpInitialized();
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.job.id),
		).subscribe((jobId) =>
		{
			this.jobId = jobId;
		})

		// On subGroup Changes (ie when a choice is favorited) this can modify the ifp image based on the options
		this.subGroup$.pipe(combineLatest(this.initialized$),
			switchMap(([subGroup]) =>
				this.store.pipe(
					select(state => state.scenario),
					map(scenario => ({
						subGroup,
						unfilteredSubGroup: _.flatMap(scenario.tree.treeVersion.groups, g => g.subGroups).find(sg => sg.id === subGroup.id)
					}))
				)
			)
		).subscribe((data: { subGroup: SubGroup, unfilteredSubGroup: SubGroup }) =>
		{
			const previousEnabled = [...this.enabledOptions];
			this.enabledOptions = [];

			// We want to use the unfiltered tree so that all enabled options will appear on the ifp and not just the DPs and choices shown
			if (data.unfilteredSubGroup)
			{
				_.flatMap(data.unfilteredSubGroup.points, p => p.choices).forEach(c =>
				{
					if (!this.isPlainFloorplan)
					{
						if (c.quantity)
						{
							this.enabledOptions.push(...c.options.map(o => +o.financialOptionIntegrationKey));
						}
					}
				});

				_.difference(previousEnabled, this.enabledOptions).forEach(opt =>
				{
					this.fp.disableOption(opt);
				});

				_.difference(this.enabledOptions, previousEnabled).forEach(opt =>
				{
					this.fp.enableOption(opt);
				});

				if (this.selectedFloor && this.selectedFloor.id)
				{
					this.fp.setFloor(this.selectedFloor?.id); //AlphaVision automatically changes the floor if you select an option on a different floor
				}
			}
		});

		if (this.subGroup)
		{
			this.subGroup$.next(this.subGroup);
		}
	}

	ngOnDestroy(): void
	{
		unloadScript('code.jquery.com', 'jQuery', '$');
		unloadScript('alpha-vision.com', 'AVFloorplan');

		this.saveFloorPlanImages();

		let wd: any = window;

		delete wd.message;
		delete wd.fp;

		super.ngOnDestroy();
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['selectedFloor'] && this.fp)
		{
			this.fp.setFloor(changes['selectedFloor'].currentValue?.id);
		}

		if (changes['subGroup'] && !changes['subGroup'].isFirstChange())
		{
			this.subGroup$.next(changes['subGroup'].currentValue);
		}
	}

	private fpInitialized(): void
	{
		this.fp.setRoomsColor('#080049');
		this.fp.setOptionsColor('#48A5F1');
		this.fp.addHomeFootPrint('#eaf1fc');
		this.onFloorPlanLoaded.emit(this.fp);
		this.fp.graphic.flip(this.isFlipped || false);
		this.initialized$.next();
		this.initialized$.complete();
	}

	saveFloorPlanImages()
	{
		// floor plan image save functionality in here
		timer(1000).subscribe(() =>
		{
			let floorPlanSvgs = this.fp?.exportStaticSVG();
			let floorPlanImages = [];

			this.fp.floors.forEach(floor =>
				{
				let image = new FloorPlanImage({
					floorName: floor.name,
					floorIndex: floor.index,
					svg: floorPlanSvgs[floor.index]?.outerHTML
				});

				floorPlanImages.push(image);
			})
			this.floorPlanImages = floorPlanImages;

			this.store.dispatch(new ScenarioActions.SaveFloorPlanImages(this.floorPlanImages));
		});
	}
}
