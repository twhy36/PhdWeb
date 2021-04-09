import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { Store, select } from '@ngrx/store';

import { Subject, Subscription, timer } from 'rxjs';
import { flatMap, combineLatest, switchMap, withLatestFrom } from 'rxjs/operators';

import * as _ from 'lodash';

import {
	UnsubscribeOnDestroy, flipOver, ModalRef, ScenarioStatusType, PriceBreakdown, TreeFilter, SubGroup,
	DecisionPoint, Choice
} from 'phd-common';

import * as fromRoot from '../../../../ngrx-store/reducers';
import * as fromScenario from '../../../../ngrx-store/scenario/reducer';
import * as SalesAgreementActions from '../../../../ngrx-store/sales-agreement/actions';
import * as ScenarioActions from '../../../../ngrx-store/scenario/actions';
import { ActionBarCallType } from '../../../../shared/classes/constants.class';
import { DecisionPointFilterType } from '../../../../shared/models/decisionPointFilter';
import { environment } from '../../../../../../environments/environment';
import { JobService } from '../../../../core/services/job.service';
import { loadScript, unloadScript } from 'phd-common/utils';
import { ScenarioService } from '../../../../core/services/scenario.service';
import { ModalService } from '../../../../core/services/modal.service';

declare var AVFloorplan: any;

@Component({
	selector: 'floor-plan',
	templateUrl: './floor-plan.component.html',
	styleUrls: ['./floor-plan.component.scss'],
	animations: [flipOver]
})
export class FloorPlanComponent extends UnsubscribeOnDestroy implements OnInit, OnChanges, OnDestroy
{
	fp: any;
	private readonly avAPISrc = "//vpsstorage.blob.core.windows.net/api/floorplanAPIv2.3.js";
	private readonly jquerySrc = "//cdnjs.cloudflare.com/ajax/libs/jquery/1.11.1/jquery.min.js";

	@ViewChild('disabledModal') disabledModal: any;
	@ViewChild('av_floor_plan') img: any;

	@Input() complete: boolean;
	@Input() errorMessage: string;
	@Input() inChangeOrder: boolean = false;
	@Input() planId: number;
	@Input() priceBreakdown: PriceBreakdown;
	@Input() selectedPointFilter: DecisionPointFilterType;
	@Input() enabledPointFilters: DecisionPointFilterType[];
	@Input() scenarioStatus: ScenarioStatusType;
	@Input() subGroup: SubGroup;
	@Input() treeFilter: TreeFilter;
	@Input() canConfigure: boolean;
	@Input() canOverride: boolean;

	@Output() onBuildIt = new EventEmitter<void>();
	@Output() onSaveScenario = new EventEmitter<void>();
	@Output() onSelectChoice = new EventEmitter<{ choiceId: number, overrideNote: string, quantity: number }>();
	@Output() onChoiceModal = new EventEmitter<Choice>();
	@Output() pointTypeFilterChanged = new EventEmitter<DecisionPointFilterType>();

	private enabledOptions: number[] = [];
	private initialized$ = new Subject<any>();
	private sgSub: Subscription;
	private subGroup$ = new Subject<SubGroup>();

	canEditAgreement: boolean = true;
	currentChoice: Choice;
	currentDecisionPoint: DecisionPoint;
	flipping: boolean = false;
	fpLoaded = false;
	isFloorplanFlipped: boolean;
	mergedOptions: any[];
	modalReference: ModalRef;
	primaryAction: string = 'Generate Agreement';
	salesAgreementId: number;
	scenarioId: number;
	selectedFloor: any = null;
	useDefaultFP = false;
	jobId: number;
	buildMode: string;

	constructor(private router: Router,
		private store: Store<fromRoot.State>,
		private scenarioService: ScenarioService,
		private modalService: ModalService,
		private renderer: Renderer2,
		private jobService: JobService) { super() }

	ngOnInit(): void
	{
		this.initialized$.subscribe(() =>
		{
			this.store.pipe(
				this.takeUntilDestroyed(),
				withLatestFrom(
					this.store.pipe(select((state: fromRoot.State) => state.salesAgreement && state.salesAgreement.id)),
					this.store.pipe(select((state: fromRoot.State) => state.scenario && state.scenario.scenario && state.scenario.scenario.scenarioId)),
					this.store.pipe(select((state: fromRoot.State) => state.salesAgreement && state.salesAgreement.isFloorplanFlipped)),
					this.store.pipe(select((state: fromRoot.State) => state.scenario && state.scenario.scenario && state.scenario.scenario.scenarioInfo && state.scenario.scenario.scenarioInfo.isFloorplanFlipped)),
					this.store.pipe(select(fromRoot.canEditAgreementOrSpec)),
					this.store.pipe(select(state => state.job.id)),
				)
			).subscribe(([first, agreementId, scenarioId, isAgreementFlipped, isScenarioFlipped, canEditAgreement, jobId]) =>
			{
				this.jobId = jobId;
				this.salesAgreementId = agreementId;
				this.scenarioId = scenarioId;
				this.canEditAgreement = canEditAgreement;

				const isFlipped: boolean = (!!agreementId ? isAgreementFlipped : isScenarioFlipped) || false;

				// we need to set the floorplan direction, but if there's a salesagreementinfo value for it, then override the value scenario might have set
				if (this.canEditAgreement && (this.flipping || this.isFloorplanFlipped == null))
				{
					this.fp.graphic.flip(isFlipped);
					this.isFloorplanFlipped = isFlipped;
				}

				this.flipping = false;

				if (!this.canEditAgreement && !this.fpLoaded)
				{
					this.fpLoaded = true;

					if (!this.jobId)
					{
						this.scenarioService.getFloorPlanImages(this.scenarioId).subscribe(p =>
						{
							this.fp.floors = p.map(floor => { return { name: floor.floorName, index: floor.floorIndex, svg: floor.svg } });

							this.setStaticImage(1);
						});
					}
					else
					{
						this.jobService.getFloorPlanImages(this.jobId, false).subscribe(p =>
						{
							this.fp.floors = p.map(p => { return { name: p.floorName, index: p.floorIndex, svg: p.svg } });

							this.setStaticImage(1);
						});
					}
				}
			})
		});

		let wd: any = window;
		wd.message = function (str) { };

		if (this.canEditAgreement)
		{
			loadScript(this.jquerySrc).pipe(
				flatMap(() => loadScript(this.avAPISrc))
			).subscribe(() =>
			{
				try
				{
					this.fp = wd.fp = new AVFloorplan(environment.alphavision.builderId, "" + this.planId, document.querySelector("#av-floor-plan"), [], this.fpInitialized.bind(this));

					this.saveFloorPlanImages();
				}
				catch (err)
				{
					this.fp = { graphic: undefined };

					this.fpInitialized(null);
				}
			});
		}
		else
		{
			this.fpInitialized(null);
		}

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.buildMode),
			withLatestFrom(this.store.pipe(select(state => state.salesAgreement)))
		).subscribe(([build, salesAgreement]) =>
		{
			if (salesAgreement.id)
			{
				this.salesAgreementId = salesAgreement.id;
				this.primaryAction = 'Agreement Info';
			}
			else if (build === 'spec')
			{
				this.primaryAction = 'Create Spec';
			}
			else if (build === 'model')
			{
				this.primaryAction = 'Create Model';
			}

			this.buildMode = build;
		});

		this.subGroup$.pipe(combineLatest(this.initialized$)).subscribe(([subGroup]) =>
		{
			const previousEnabled = [...this.enabledOptions];
			this.enabledOptions = [];

			_.flatMap(subGroup.points, p => p.choices)
				.forEach(c =>
				{
					if (c.quantity)
					{
						this.enabledOptions.push(...c.options.map(o => +o.financialOptionIntegrationKey));
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
				this.fp.setFloor(this.selectedFloor.id); //AlphaVision automatically changes the floor if you select an option on a different floor
			}

			this.saveFloorPlanImages();
		});

		if (this.subGroup)
		{
			this.subGroup$.next(this.subGroup);
		}
	}

	setStaticImage(index: number)
	{
		this.selectedFloor = this.fp.floors.find(f => f.index === index);

		var count = this.img.nativeElement.children.length;

		for (let i = 0; i < count; i++)
		{
			this.renderer.removeChild(this.img.nativeElement, this.img.nativeElement.children[i]);
		}

		let svgContainer = this.renderer.createElement('div');

		svgContainer.innerHTML = this.selectedFloor.svg;

		this.renderer.setAttribute(svgContainer, 'width', '600');
		this.renderer.setAttribute(svgContainer, 'height', '400');
		this.renderer.appendChild(this.img.nativeElement, svgContainer);
	}

	onPointTypeFilterChanged(pointTypeFilter: DecisionPointFilterType)
	{
		this.pointTypeFilterChanged.emit(pointTypeFilter);
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['subGroup'] && !changes['subGroup'].isFirstChange())
		{
			let current = changes['subGroup'].currentValue as SubGroup;
			let previous = changes['subGroup'].previousValue as SubGroup;

			if (current.points.some(c => previous.points.find(p => p.id === c.id).enabled !== c.enabled))
			{
				this.subGroup$.next(current);
			}
			else
			{
				let currentChoices = _.flatMap(current.points, p => p.choices);
				let previousChoices = _.flatMap(previous.points, p => p.choices);

				if (currentChoices.some(c =>
				{
					let previousChoice = previousChoices.find(p => p.id === c.id);

					return previousChoice.enabled !== c.enabled || previousChoice.quantity != c.quantity;
				}))
				{
					this.subGroup$.next(current);
				}
			}
		}
	}

	ngOnDestroy(): void
	{
		unloadScript("code.jquery.com", "jQuery", "$");
		unloadScript("alpha-vision.com", "AVFloorplan");

		let wd: any = window;

		delete wd.message;
		delete wd.fp;

		if (this.sgSub)
		{
			this.sgSub.unsubscribe();
		}

		super.ngOnDestroy();
	}

	onOptionToggled(choice: any, value: any)
	{
		if (choice.options.length)
		{
			const integrationKey = choice.options[0].financialOptionIntegrationKey;
			const fpOption = this.fp && this.fp.options ? this.fp.options.find(x => x.id.includes(integrationKey)) : null;

			if (fpOption)
			{
				const floor = this.fp.floors.find(f => f.id === fpOption.floor);

				this.selectedFloor = floor;
			}
		}

		this.onSelectChoice.emit({ choiceId: choice.id, overrideNote: choice.overrideNote, quantity: value ? 1 : 0 });
	}

	onCallToAction(event: any)
	{
		switch (event.actionBarCallType)
		{
			case (ActionBarCallType.PRIMARY_CALL_TO_ACTION):
				if (this.salesAgreementId)
				{
					this.router.navigateByUrl(`/point-of-sale/people/${this.salesAgreementId}`);
				}
				else
				{
					this.onBuildIt.emit();
				}

				break;
		}
	}

	saveFloorPlanImages()
	{
		// floor plan image save functionality in here
		timer(1000).pipe(
			switchMap(() => this.store.select(state => state.scenario.scenario.scenarioId).pipe(
				withLatestFrom(this.store.select(state => state.scenario.buildMode)),
			))
		).subscribe(([scenarioId, buildMode]) =>
		{

			if (buildMode !== 'preview' && buildMode !== 'spec' && buildMode !== 'model' && !this.useDefaultFP && this.canEditAgreement)
			{
				if (!this.jobId)
				{
					this.scenarioService.saveFloorPlanImages(scenarioId, this.fp.floors, this.fp.exportStaticSVG());
				}
				else
				{
					this.jobService.saveFloorPlanImages(this.jobId, this.fp.floors, this.fp.exportStaticSVG());
				}
			}
		});
	}

	swapHanding()
	{
		// If there is a sales agreement, save the flipped preference
		if (this.salesAgreementId && this.salesAgreementId > 0)
		{
			this.store.dispatch(new SalesAgreementActions.SetIsFloorplanFlippedAgreement(!this.isFloorplanFlipped));

			this.flipping = true;
		}

		// If there is a scenario, save the flipped preference
		if (this.scenarioId && this.scenarioId > 0)
		{
			this.store.dispatch(new ScenarioActions.SetIsFloorplanFlippedScenario(!this.isFloorplanFlipped));

			this.flipping = true;
		}

		// In Preview, Spec or Model
		if (this.buildMode !== 'buyer')
		{
			this.flipping = true;

			this.store.dispatch(new ScenarioActions.IsFloorplanFlippedScenario(!this.isFloorplanFlipped));
		}
	}

	closeModal()
	{
		this.modalReference.close();
	}

	selectFloor(floor: any)
	{
		if (this.canEditAgreement || this.buildMode === 'spec' || this.buildMode === 'model')
		{
			this.selectedFloor = floor;

			this.fp.setFloor(floor.id);
		}
		else
		{
			this.setStaticImage(floor.index);
		}
	}

	showDisabledPointMessage(p: DecisionPoint)
	{
		this.currentChoice = null;
		this.currentDecisionPoint = p;
		this.showDisabledMessage();
	}

	showDisabledChoiceMessage(c: Choice) 
	{
		this.currentChoice = c;
		this.currentDecisionPoint = null;
		this.showDisabledMessage();
	}

	showDisabledMessage()
	{
		this.modalReference = this.modalService.open(this.disabledModal, { windowClass: `phd-ngb-modal` });
	}

	disabledModalAction(to: { choice: Choice, path: Array<string | number> })
	{
		this.modalReference.close();

		if (to.choice)
		{
			this.onChoiceModal.emit(to.choice);
		}
		else
		{
			this.router.navigate(to.path);
		}
	}

	private fpInitialized(event): void
	{
		if (!this.canEditAgreement)
		{
			//cant change floorplan, use static images
			this.initialized$.next();
			this.initialized$.complete();

			return;
		}
		else if (this.fp.graphic)
		{
			//use fp returned from AV
			if (!this.selectedFloor)
			{
				const floor1 = this.fp.floors.find(x => x.name === 'Floor 1');
				this.selectedFloor = floor1;
			}

			this.fp.setRoomsColor("#080049");
			this.fp.setOptionsColor("#48A5F1");
			this.fp.addHomeFootPrint("#eaf1fc");

		}
		else
		{
			//no fp found in AV
			this.useDefaultFP = true;
		}

		this.fpLoaded = true;
		this.initialized$.next();
		this.initialized$.complete();
	}

	hasAttributeOrLocationGroups(choice: Choice)
	{
		return (choice.mappedAttributeGroups && choice.mappedAttributeGroups.length > 0) || (choice.mappedLocationGroups && choice.mappedLocationGroups.length > 0);
	}
}
