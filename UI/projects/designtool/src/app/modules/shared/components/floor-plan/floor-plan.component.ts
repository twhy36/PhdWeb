import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, Renderer2, SimpleChanges, ViewChild, TrackByFunction } from '@angular/core';
import { Router } from '@angular/router';
import { select, Store } from '@ngrx/store';
import * as _ from 'lodash';
import { Choice, DecisionPoint, DesignToolAttribute, flipOver, FloorPlanImage, loadScript, ModalRef, ModalService, MyFavoritesChoice, PriceBreakdown, ScenarioStatusType, SubGroup, TreeFilter, unloadScript, UnsubscribeOnDestroy, DecisionPointFilterType, OptionRule } from 'phd-common';
import { Subject, Subscription, timer, combineLatest } from 'rxjs';
import { flatMap, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { AttributeService } from '../../../core/services/attribute.service';
import { JobService } from '../../../core/services/job.service';
import { ScenarioService } from '../../../core/services/scenario.service';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromSalesAgreement from '../../../ngrx-store/sales-agreement/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as SalesAgreementActions from '../../../ngrx-store/sales-agreement/actions';
import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { ActionBarCallType } from '../../../shared/classes/constants.class';

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
	private readonly avAPISrc = '//apps.alpha-vision.com/api/floorplanAPIv2.3.js';
	private readonly jquerySrc = '//cdnjs.cloudflare.com/ajax/libs/jquery/1.11.1/jquery.min.js';

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
	@Input() canForceSave: boolean;

	@Output() onBuildIt = new EventEmitter<void>();
	@Output() onSaveScenario = new EventEmitter<void>();
	@Output() onSelectChoice = new EventEmitter<{ choice: Choice, saveNow: boolean, quantity?: number }>();
	@Output() onChoiceModal = new EventEmitter<Choice>();
	@Output() pointTypeFilterChanged = new EventEmitter<DecisionPointFilterType>();
	@Output() onFloorPlanSaved = new EventEmitter<FloorPlanImage[]>();

	private enabledOptions: number[] = [];
	private initialized$ = new Subject<any>();
	private sgSub: Subscription;
	private subGroup$ = new Subject<SubGroup>();

	canEditAgreement: boolean;
	currentChoice: Choice;
	currentDecisionPoint: DecisionPoint;
	flipping: boolean = false;
	fpLoaded: boolean = false;
	isFloorplanFlipped: boolean;
	mergedOptions: any[];
	modalReference: ModalRef;
	primaryAction: string = 'Generate Agreement';
	salesAgreementId: number;
	scenarioId: number;
	selectedFloor: any = null;
	useDefaultFP: boolean = false;
	jobId: number;
	buildMode: string;
	favoriteChoices: MyFavoritesChoice[];
	isDesignComplete: boolean;
	replaceRules: OptionRule[];

	get fpFloors()
	{
		return this.isValidFp ? this.fp.floors : [];
	}

	get isValidFp(): boolean
	{
		return this.fpLoaded && this.fp?.graphic;
	}

	constructor(private router: Router,
		private store: Store<fromRoot.State>,
		private scenarioService: ScenarioService,
		private modalService: ModalService,
		private renderer: Renderer2,
		private jobService: JobService,
		private attributeService: AttributeService) { super() }

	ngOnInit(): void
	{
		this.initialized$.subscribe(() =>
		{
			this.store.pipe(
				take(1),
				withLatestFrom(
					this.store.pipe(select((state: fromRoot.State) => state.salesAgreement && state.salesAgreement.id)),
					this.store.pipe(select((state: fromRoot.State) => state.scenario)),
					this.store.pipe(select(state => state.job.id))
				)
			).subscribe(([first, agreementId, scenario, jobId]) =>
			{
				this.jobId = jobId;
				this.salesAgreementId = agreementId;
				this.scenarioId = scenario?.scenario?.scenarioId;

				// Retrieve replace rules
				this.replaceRules = scenario?.rules?.optionRules?.filter(rule => !!rule.replaceOptions?.length) || [];

				if (!this.canEditAgreement && !this.fpLoaded)
				{
					if (!this.jobId && !!this.scenarioId)
					{
						this.scenarioService.getFloorPlanImages(this.scenarioId).subscribe(p =>
						{
							this.handleStaticImages(p);
						});
					}
					else if (this.jobId)
					{
						this.jobService.getFloorPlanImages(this.jobId, false).subscribe(p =>
						{
							this.handleStaticImages(p);
						});
					}
				}
			});
		});

		let wd: any = window;

		wd.message = function (str) { };

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canEditAgreementOrSpec),
			withLatestFrom(
				this.store.pipe(select((fromRoot.canConfigure)))
			)
		).subscribe(([canEditAgreement, canConfigure]) =>
		{
			this.canEditAgreement = canEditAgreement && (canConfigure);

			if (this.canEditAgreement || this.canForceSave)
			{
				loadScript(this.jquerySrc).pipe(
					flatMap(() => loadScript(this.avAPISrc))
				).subscribe(() =>
				{
					try
					{
						this.fp = wd.fp = new AVFloorplan(environment.alphavision.builderId, '' + this.planId, document.querySelector('#av-floor-plan'), [], this.fpInitialized.bind(this));

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
		});

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

		combineLatest([
			this.subGroup$,
			this.initialized$,
		])
		.pipe(withLatestFrom(this.store.pipe(select((state: fromRoot.State) => state.scenario?.tree?.treeVersion))))	
		.subscribe(([[subGroup], treeVersion]) =>
		{
			const previousEnabled = [...this.enabledOptions];
			this.enabledOptions = [];

			if (this.fp?.options?.length && treeVersion)
			{
				// Selected choices outside of IFP
				const selectedChoices = _.flatMap(treeVersion.groups, g =>  _.flatMap(g.subGroups.filter(sg => sg.id !== this.subGroup.id), sg => _.flatMap(sg.points, pt => pt.choices.filter(ch => ch.quantity > 0)))) || [];
				
				// Options in the selected choices
				const selectedOptionNumbers : string[] = [];
				selectedChoices.forEach(ch => 
				{
					const optionNumbers = _.uniq(_.flatMap(ch.options, opt => opt.financialOptionIntegrationKey)
						|| _.flatMap(ch.lockedInOptions, opt => opt.optionId));

					selectedOptionNumbers.push(...optionNumbers);
				})
				
				// Limit to replace options if they are mapped to the same element as the replaced options in Alpha Vision
				selectedOptionNumbers.forEach(optionNum => 
				{
					// Find the mapped element in Alpha Vision IFP
					const mappedOptionElement = this.fp.options.find(fpOption => fpOption.id.includes(optionNum));
					if (mappedOptionElement)
					{
						const replaceRule = this.replaceRules.find(rule => rule.optionId === optionNum);
						const replaceOption = replaceRule?.replaceOptions?.find(ro => mappedOptionElement.id.includes(ro));

						if (replaceOption)
						{
							// Enable the option if it is mapped to the same element as the replaced option
							this.enabledOptions.push(+replaceOption);
						}
					}
				});
			}

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

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.myFavoriteChoices),
			withLatestFrom(
				this.store.pipe(select(fromRoot.isDesignPreviewEnabled)),
				this.store.pipe(select(fromSalesAgreement.isDesignComplete))
			)
		).subscribe(([choices, isDesignPreviewEnabled, isDesignComplete]) =>
		{
			if (isDesignPreviewEnabled)
			{
				this.favoriteChoices = choices;
			}

			this.isDesignComplete = isDesignComplete;
		});

		combineLatest([
			this.store.pipe(select(state => state.salesAgreement && state.salesAgreement.isFloorplanFlipped)),
			this.store.pipe(select((state: fromRoot.State) => state.scenario && state.scenario.scenario && state.scenario.scenario.scenarioInfo && state.scenario.scenario.scenarioInfo.isFloorplanFlipped))
		])
		.pipe(this.takeUntilDestroyed())			
		.subscribe(([isAgreementFlipped, isScenarioFlipped]) =>
		{
			this.handleFlip(isAgreementFlipped, isScenarioFlipped);
		});
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

		// The div container causes magnification of the SVG, so append the pure SVG element instead
		this.renderer.appendChild(this.img.nativeElement, svgContainer.firstChild);
	}

	onPointTypeFilterChanged(pointTypeFilter: DecisionPointFilterType)
	{
		this.pointTypeFilterChanged.emit(pointTypeFilter);
	}

	trackByDecisionPoints: TrackByFunction<DecisionPoint> = function (_index, decisionPoint)
	{
		return decisionPoint.id;
	}

	trackByChoices: TrackByFunction<Choice> = function (_index, choiceSelected)
	{

		return choiceSelected.id?.toString() + choiceSelected.quantity?.toString();
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
		unloadScript('code.jquery.com', 'jQuery', '$');
		unloadScript('alpha-vision.com', 'AVFloorplan');

		let wd: any = window;

		delete wd.message;
		delete wd.fp;

		if (this.sgSub)
		{
			this.sgSub.unsubscribe();
		}

		super.ngOnDestroy();
	}

	isFavorite(choice: Choice)
	{
		return !!this.favoriteChoices?.find(c => c.divChoiceCatalogId === choice.divChoiceCatalogId);
	}

	onOptionToggled(choice: any)
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

		//IFPs do not load attributes for an attribute group,
		//need to fetch them to determine if any are auto selected if the user doesn't open the modal
		if (choice.mappedAttributeGroups.length > 0)
		{
			this.attributeService.getAttributeGroups(choice).subscribe(attributeGroups =>
			{
				attributeGroups.forEach(attributeGroup =>
				{ 
					//if attributeGroup only has 1 attribute, auto select that attribute to the choice
					if (attributeGroup.attributes.length === 1)
					{
						const attribute = attributeGroup.attributes[0];

						const selectedAttribute: DesignToolAttribute = {
							attributeId: attribute.id,
							attributeName: attribute.name,
							attributeImageUrl: attribute.imageUrl,
							attributeGroupId: attributeGroup.id,
							attributeGroupName: attributeGroup.name,
							attributeGroupLabel: attributeGroup.label,
							locationGroupId: null,
							locationGroupName: null,
							locationGroupLabel: null,
							locationId: null,
							locationName: null,
							locationQuantity: null,
							scenarioChoiceLocationId: null,
							scenarioChoiceLocationAttributeId: null,
							sku: attribute.sku,
							manufacturer: attribute.manufacturer
						};

						choice.selectedAttributes.push(selectedAttribute);
					}
				});

				this.onSelectChoice.emit({ choice, saveNow: false, quantity: choice.quantity ? 0 : 1 });
			});
		}
		else
		{

			this.onSelectChoice.emit({ choice, saveNow: false, quantity: choice.quantity ? 0 : 1 });
		}
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
			switchMap(() => this.store.select(state => state.scenario.scenario.scenarioId))
		).subscribe(scenarioId =>
		{
			if (!this.useDefaultFP && (this.canForceSave || this.canEditAgreement))
			{
				if (!this.jobId && !!scenarioId)
				{
					this.scenarioService.saveFloorPlanImages(scenarioId, this.fp.floors, this.fp.exportStaticSVG()).subscribe(images =>
					{
						this.onFloorPlanSaved.emit(images);
					});
				}
				else if (this.jobId)
				{
					this.jobService.saveFloorPlanImages(this.jobId, this.fp.floors, this.fp.exportStaticSVG()).subscribe(images =>
					{
						this.onFloorPlanSaved.emit(images);
					});
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

	handleFlip(isAgreementFlipped: boolean, isScenarioFlipped: boolean)
	{
		const isFlipped: boolean = (!!this.salesAgreementId ? isAgreementFlipped : isScenarioFlipped) || false;

		// we need to set the floorplan direction, but if there's a salesagreementinfo value for it, then override the value scenario might have set
		if (this.canEditAgreement && (this.flipping || this.isFloorplanFlipped == null))
		{
			this.fp?.graphic.flip(isFlipped);

			this.isFloorplanFlipped = isFlipped;

			//must save floorplan image
			this.saveFloorPlanImages();
		}

		this.flipping = false;
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

			try
			{
				this.fp.setFloor(floor.id);
			}
			catch (err)
			{
				this.setStaticImage(floor.index);
			}
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

			if (this.isFloorplanFlipped !== undefined || this.isFloorplanFlipped !== null)
			{
				this.fp?.graphic.flip(this.isFloorplanFlipped);

				//must save floorplan image 
				this.saveFloorPlanImages();
			}

			this.setFloorPlanColors();
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

	/*
	 * Callback function once the IFP has completed its data request.
	 */
	private staticFloorPlanInitialized(): void
	{
		this.fpLoaded = true;

		if (this.isValidFp)
		{

			this.setFloorPlanColors();

			const svgs = this.fp.exportStaticSVG();

			this.fp.floors.forEach((f, idx) =>
			{
				f.svg = svgs[idx].outerHTML;
			});

			this.setStaticImage(0);
		}
		else
		{
			//no fp found in AV
			this.useDefaultFP = true;
		}
	}

	/*
	 * Maps static SVGs to each floor, or if no images are found, creates an IFP instance for further data retrieval.
	 */
	handleStaticImages(images: FloorPlanImage[])
	{
		if (this.fp && images.length)
		{
			this.fp.floors = images.map(img =>
			{
				return { name: img.floorName, index: img.floorIndex, svg: img.svg };
			});

			this.fpLoaded = true;

			this.setStaticImage(0);
		}
		else
		{
			loadScript(this.jquerySrc).pipe(
				flatMap(() => loadScript(this.avAPISrc))
			).subscribe(() =>
			{
				try
				{
					let wd: any = window;

					this.fp = wd.fp = new AVFloorplan(environment.alphavision.builderId, '' + this.planId, document.querySelector('#av-floor-plan'), [], this.staticFloorPlanInitialized.bind(this));
				}
				catch (err)
				{
					this.fp = { graphic: undefined };

					this.fpLoaded = true;
				}
			});
		}
	}

	setFloorPlanColors()
	{
		this.fp.setRoomsColor('#080049');
		this.fp.setOptionsColor('#48A5F1');
		this.fp.addHomeFootPrint('#eaf1fc');
	}

}
