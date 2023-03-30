import { Component, OnInit, OnDestroy, ViewChild, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef } from '@angular/core';
import * as _ from 'lodash';
import { combineLatest, Observable, Subject, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';
import { UnsubscribeOnDestroy, loadScript, unloadScript, SubGroup, Group, FloorPlanImage } from 'phd-common';
import { environment } from '../../../../../environments/environment';

declare var AVFloorplan;

@Component({
	selector: 'floor-plan',
	templateUrl: 'floor-plan.component.html',
	styleUrls: ['floor-plan.component.scss']
})
export class FloorPlanComponent extends UnsubscribeOnDestroy implements OnInit, OnDestroy, OnChanges
{
	@ViewChild('av_floor_plan') img: ElementRef;

	@Input() height: string = '100%';
	@Input() planId$: Observable<number>;
	@Input() selectedFloor;
	@Input() subGroup: SubGroup;
	@Input() isFlipped: boolean;
	@Input() isPresavedFloorplan: boolean = false;
	@Input() isPlainFloorplan: boolean = false;
	@Input() ifpID: string = 'av-floor-plan';

	@Output() floorPlanLoaded = new EventEmitter();
	@Output() floorPlanSaved = new EventEmitter<FloorPlanImage[]>();

	fp;
	private readonly avAPISrc = '//apps.alpha-vision.com/api/floorplanAPIv2.3.js';
	private readonly jquerySrc = '//cdnjs.cloudflare.com/ajax/libs/jquery/1.11.1/jquery.min.js';
	planId: number = 0;
	subGroup$ = new Subject<SubGroup>();
	initialized$ = new Subject();
	jobId: number;
	enabledOptions: number[] = [];
	unfilteredGroups: Group[];
	floorPlanImages: FloorPlanImage[] = [];

	constructor(
		private store: Store<fromRoot.State>
	)
	{
		super();
	}

	ngOnInit(): void
	{
		window['message'] = function (str) { };

		loadScript(this.jquerySrc).pipe(
			mergeMap(() => loadScript(this.avAPISrc)),
			mergeMap(() => this.planId$)
		).subscribe(planId =>
		{
			if (planId > 0 && this.planId !== planId)
			{
				this.planId = planId;

				try
				{
					this.fp = window['fp'] = new AVFloorplan(environment.alphavision.builderId, '' + planId, document.querySelector('#' + this.ifpID), [], this.fpInitialized.bind(this));
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

		combineLatest([
			this.initialized$,
			this.store.pipe(
				this.takeUntilDestroyed(),
				select(state => state.scenario),
			),
		]).subscribe(([init, scenario]) =>
		{
			if (init && scenario)
			{
				const unfilteredSubGroup = scenario.tree.treeVersion.groups.flatMap(g => g.subGroups).find(sg => sg.id === this.subGroup.id);
				const previousEnabled = [...this.enabledOptions];
				this.enabledOptions = [];
				// We want to use the unfiltered tree so that all enabled options will appear on the ifp and not just the DPs and choices shown
				if (unfilteredSubGroup)
				{
					_.flatMap(unfilteredSubGroup.points, p => p.choices).forEach(c =>
					{
						if (!this.isPlainFloorplan)
						{
							if (c.quantity)
							{
								this.enabledOptions.push(...c.options.map(o => +o.financialOptionIntegrationKey));
							}
						}
					});

					let changed = false;

					_.difference(previousEnabled, this.enabledOptions).forEach(opt =>
					{
						changed = true;
						this.fp.disableOption(opt);
					});

					_.difference(this.enabledOptions, previousEnabled).forEach(opt =>
					{
						changed = true;
						this.fp.enableOption(opt);
					});

					if (this.selectedFloor && this.selectedFloor.id)
					{
						this.fp.setFloor(this.selectedFloor?.id); //AlphaVision automatically changes the floor if you select an option on a different floor
					}

					if (changed)
					{
						this.saveFloorPlanImages();
					}
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

		delete window['message'];
		delete window['fp'];

		super.ngOnDestroy();
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['selectedFloor'] && this.fp)
		{
			this.fp.setFloor(changes['selectedFloor'].currentValue?.id);
		}
	}

	private fpInitialized(): void
	{
		this.fp.setRoomsColor('#080049');
		this.fp.setOptionsColor('#48A5F1');
		this.fp.addHomeFootPrint('#eaf1fc');
		this.floorPlanLoaded.emit(this.fp);
		this.fp.graphic.flip(this.isFlipped || false);
		this.initialized$.next(true);
		this.initialized$.complete();
	}

	saveFloorPlanImages()
	{
		if (!this.fp)
		{
			return;
		}

		// save floorplan images to onFloorPlanSaved event
		timer(1000).subscribe(() =>
		{
			const floorPlanSvgs = this.fp?.exportStaticSVG();
			const floorPlanImages = [];
			this.fp.floors.forEach(floor =>
			{
				if (!floorPlanSvgs[floor.index]?.outerHTML)
				{
					return;
				}

				const image = new FloorPlanImage({
					floorName: floor.name,
					floorIndex: floor.index,
					svg: floorPlanSvgs[floor.index]?.outerHTML
				});

				floorPlanImages.push(image);
			})

			if (!floorPlanImages.length)
			{
				return;
			}

			this.floorPlanImages = floorPlanImages;
			this.floorPlanSaved.emit(floorPlanImages);
		});
	}
}
