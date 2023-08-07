import { Component, OnInit, ViewChildren, QueryList, AfterViewInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Store, select } from '@ngrx/store';
import { ReplaySubject, Observable, of, combineLatest } from 'rxjs';
import { withLatestFrom, map, switchMap, take, distinctUntilChanged } from 'rxjs/operators';

import { ToastrService } from 'ngx-toastr';

import * as _ from 'lodash';

import
{
	UnsubscribeOnDestroy, blink, ChangeOrderHanding, ChangeTypeEnum, ChangeOrderChoice, PlanOption,
	PointStatus, SelectedChoice, PriceBreakdown, ScenarioStatusType, SummaryData, BuyerInfo, SummaryReportType,
	SDGroup, SDSubGroup, SDPoint, SDChoice, SDImage, SDAttributeReassignment, Group, Choice, DecisionPoint,
	PDFViewerComponent, ModalService, SubGroup, TreeFilter, FloorPlanImage, PointStatusFilter, DecisionPointFilterType,
	ConfirmModalComponent, ChoiceImageAssoc, SDChoiceImage, ModalRef, TreeService, Constants, Tree, TreeVersionRules
} from 'phd-common';

import { environment } from '../../../../../environments/environment';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromLot from '../../../ngrx-store/lot/reducer';

import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as JobActions from '../../../ngrx-store/job/actions';
import * as SummaryActions from '../../../ngrx-store/summary/actions';
import * as ChangeOrderActions from '../../../ngrx-store/change-order/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { LotService } from '../../../core/services/lot.service';
import { ReportsService } from '../../../core/services/reports.service';
import { ScenarioService } from '../../../core/services/scenario.service';
import { JobService } from '../../../core/services/job.service';
import { ChangeOrderService } from '../../../core/services/change-order.service';
import { LiteService } from '../../../core/services/lite.service';

import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';
import { DecisionPointSummaryComponent } from '../../../shared/components/decision-point-summary/decision-point-summary.component';
import { SummaryHeader, SummaryHeaderComponent } from '../../../shared/components/summary-header/summary-header.component';

import { MonotonyConflict } from '../../../shared/models/monotony-conflict.model';
import { PhdSubMenu } from '../../../new-home/subNavItems';
import { checkElevationAndColorSelectionOptions } from '../../../shared/classes/tree.utils';

@Component({
	selector: 'app-scenario-summary',
	templateUrl: './scenario-summary.component.html',
	styleUrls: ['./scenario-summary.component.scss'],
	animations: [blink]
})
export class ScenarioSummaryComponent extends UnsubscribeOnDestroy implements OnInit, AfterViewInit
{
	@ViewChildren(DecisionPointSummaryComponent) decisionPoints: QueryList<DecisionPointSummaryComponent>;
	@ViewChild(SummaryHeaderComponent) summaryHeaderComponent: SummaryHeaderComponent;

	@ViewChild('monotonyConflictModal') monotonyConflictModal: any;

	isSticky: boolean = false;

	groups: any[] = [];
	fullGroups: Group[] = [];
	pointStatusFilter$: Observable<PointStatusFilter>;
	selectedChoices: SelectedChoice[];
	PointStatus = PointStatus;
	choiceImages: ChoiceImageAssoc[] = [];

	public fragment: string;
	savingAll$: Observable<boolean>;
	scenarioId$: Observable<number>;
	title: string;

	summaryHeader: SummaryHeader = new SummaryHeader();
	priceBreakdown: PriceBreakdown;
	allowEstimates: boolean;
	salesAgreementId: number;
	isSpecOrModel: boolean;

	imageLoading: boolean = false;
	activeIndex: any = { current: 0, direction: '', prev: 0 };
	summaryImages: SDImage[] = [];

	showImages: boolean = false;
	isChangingOrder$: Observable<boolean>;
	canEditHanding: boolean = true;
	canEditSummary: boolean = true;

	selectedPointFilter$: Observable<DecisionPointFilterType>;
	enabledPointFilters$: Observable<DecisionPointFilterType[]>;

	isComplete: boolean;
	scenarioStatus$: Observable<ScenarioStatusType>;

	hasFloorPlan: boolean = false;
	canEditAgreement$: Observable<boolean>;
	canConfigure$: Observable<boolean>;

	params$ = new ReplaySubject<{ jobId: number }>(1);
	canDisplay = false;
	buildMode: string;
	disableHanding = false;
	selectedHanding: string;
	canOverride$: Observable<boolean>;
	overrideReason: string;
	interactiveFloorplanSG: SubGroup;
	hasFloorPlanImages: boolean = true;
	marketingPlanId: number[];
	treeFilter$: Observable<TreeFilter>;
	choiceImagesLoaded: boolean = false;
	priceRangesCalculated: boolean;
	isPhdLite: boolean = false;
	monotonyConflict: MonotonyConflict;
	monotonyConflictModalRef: ModalRef;
	opportunityId: string;
	tree: Tree;
	treeVersionRules: TreeVersionRules;

	get showRemoveDesignSelectionsButton(): boolean
	{
		const choices = this.getNonStructuralChoices();

		return choices.length && this.isComplete && !this.isSpecOrModel && this.salesAgreementId === 0 && !this.isPhdLite && !this.summaryHeader.isPreview;
	}

	constructor(private route: ActivatedRoute,
		private lotService: LotService,
		private cd: ChangeDetectorRef,
		private store: Store<fromRoot.State>,
		private modalService: ModalService,
		private _reportsService: ReportsService,
		private _toastr: ToastrService,
		private scenarioService: ScenarioService,
		private jobService: JobService,
		private changeOrderService: ChangeOrderService,
		private router: Router,
		private treeService: TreeService,
		private liteService: LiteService
	) { super(); }

	isDirty(status: { pointId: number, isDirty: boolean, updatedChoices: { choiceId: number, quantity: number }[] }[]): boolean
	{
		return status.some(p => p.isDirty);
	}

	get hasChoiceImagesLoaded(): boolean
	{
		return this.choiceImagesLoaded;
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.buildMode)
		).subscribe((build) => this.buildMode = build);

		this.store.dispatch(new SummaryActions.SetPointStatusFilter({ statusFilters: [PointStatus.COMPLETED, PointStatus.PARTIALLY_COMPLETED] }));

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.overrideReason)
		).subscribe(overrideReason => this.overrideReason = overrideReason);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.filteredTree)
		).subscribe(filteredTree => this.groups = filteredTree ? filteredTree.groups : []);

		combineLatest([
			this.store.pipe(select(state => state.scenario)),
			this.store.pipe(select(fromScenario.isPreview))
		])
			.pipe(
				this.takeUntilDestroyed(),
				switchMap(([scenario, isPreview]) =>
				{
					let choiceImages$ = of(null);

					// set fullGroups, which has everything, nothing filtered out unlike groups.
					this.fullGroups = scenario.tree ? scenario.tree.treeVersion.groups : null;

					if (this.fullGroups !== null)
					{
						const subGroups = _.flatMap(this.fullGroups, g => g.subGroups);
						const points = _.flatMap(subGroups, sg => sg.points);
						const choices = _.flatMap(points, p => p.choices);
						const selectedChoices = choices.filter(c => c.quantity > 0);

						if (selectedChoices.length)
						{
							// get images for only selected choices
							choiceImages$ = this.treeService.getChoiceImages(selectedChoices, isPreview, scenario.tree?.treeVersion.publishStartDate);
						}
					}

					return choiceImages$;
				}))
			.subscribe((choiceImages: ChoiceImageAssoc[]) =>
			{
				this.choiceImages = choiceImages;

				this.choiceImagesLoaded = true;
			},
			error =>
			{
				this.choiceImagesLoaded = true;
			});

		this.pointStatusFilter$ = this.store.pipe(
			select(state => state.summary.pointStatusFilter)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.elevationDP),
			withLatestFrom(this.store.pipe(select(state => state.scenario)))
		).subscribe(([dp, scenario]) =>
		{
			const elevationOption = scenario.options ? scenario.options.find(x => x.isBaseHouseElevation) : null;

			if (dp)
			{
				const selectedChoice = dp.choices.find(x => x.quantity > 0);
				let option: PlanOption = null;

				if (selectedChoice && selectedChoice.options && selectedChoice.options.length)
				{
					// look for a selected choice to pull the image from
					option = selectedChoice.options.find(x => x.optionImages != null);
				}
				else if (!selectedChoice && elevationOption)
				{
					// if a choice hasn't been selected then get the default option
					option = elevationOption;
				}

				if (option && option.optionImages.length > 0)
				{
					// grab the first image and throw it into the array.
					this.summaryImages.push({ imageUrl: option.optionImages[0].imageURL } as SDImage);
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.title)
		).subscribe(title => this.title = title);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);

		combineLatest([
			this.store.pipe(select(state => state.salesAgreement)),
			this.store.pipe(select(fromRoot.allowEstimates)),
			this.store.pipe(select(fromRoot.isSpecOrModel))
		])
			.pipe(this.takeUntilDestroyed())
			.subscribe(([sag, allowEstimates, isSpecOrModel]) =>
			{
				this.allowEstimates = allowEstimates;
				this.isSpecOrModel = isSpecOrModel;
				this.salesAgreementId = sag?.id ?? 0;
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.plan.plans ? state.plan.plans.find(p => p.id === state.plan.selectedPlan) : null)
		).subscribe(plan => this.summaryHeader.plan = plan);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromLot.selectSelectedLot)
		).subscribe(lot => this.summaryHeader.lot = lot);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario)
		).subscribe(sc => this.summaryHeader.communitySalesName = sc.salesCommunity ? sc.salesCommunity.name : null);

		combineLatest([
			this.store.pipe(select(state => state.changeOrder)),
			this.store.pipe(select(state => state.scenario)),
			this.store.pipe(select(state => state.job)),
			this.store.pipe(select(state => state.salesAgreement))
		])
			.pipe(this.takeUntilDestroyed())
			.subscribe(([changeOrder, scenario, job, sag]) =>
			{
				if ((scenario.buildMode === Constants.BUILD_MODE_MODEL || scenario.buildMode === Constants.BUILD_MODE_SPEC) && job && !job.jobLoading && changeOrder && !changeOrder.loadingCurrentChangeOrder) 
				{
					this.liteService.isPhdLiteEnabled(job.financialCommunityId)
						.subscribe(isPhdLiteEnabled =>
						{
							this.isPhdLite = isPhdLiteEnabled && this.liteService.checkLiteAgreement(job, changeOrder.currentChangeOrder);

							if (this.isPhdLite) 
							{
								this._toastr.clear();

								this.router.navigate(['lite-summary']);
							}
						});
				}

				if (changeOrder.isChangingOrder)
				{
					this.summaryHeader.handing = changeOrder.changeInput && changeOrder.changeInput.handing ? changeOrder.changeInput.handing.handing : null;
				}
				else if (!!sag.id)
				{
					this.summaryHeader.handing = this.changeOrderService.getSelectedHanding(job).handing;
				}
				else if (scenario.scenario)
				{
					this.summaryHeader.handing = scenario.scenario.handing && scenario.scenario.handing.handing ? scenario.scenario.handing.handing : job.handing;
					this.opportunityId = scenario.scenario.opportunityId;
				}

				this.selectedHanding = this.summaryHeader.handing;
			});

		this.scenarioId$ = this.store.pipe(
			select(state => state.scenario.scenario.scenarioId)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.isPreview)
		).subscribe(isPreview => this.summaryHeader.isPreview = isPreview);

		this.isChangingOrder$ = combineLatest([
			this.store.pipe(select(state => state.changeOrder)),
			this.store.pipe(select(fromLot.selectSelectedLot)),
			this.store.pipe(select(fromScenario.buildMode)),
			this.store.pipe(select(state => state.salesAgreement))
		]).pipe(
			this.takeUntilDestroyed(),
			map(([changeOrder, lot, buildMode, salesAgreement]) =>
			{
				this.canEditHanding = changeOrder.isChangingOrder
					? changeOrder.changeInput && changeOrder.changeInput.type === ChangeTypeEnum.CONSTRUCTION
					: true;
				this.canEditSummary = changeOrder.isChangingOrder
					? changeOrder.changeInput && (changeOrder.changeInput.type === ChangeTypeEnum.CONSTRUCTION || changeOrder.changeInput.type === ChangeTypeEnum.PLAN)
					: true;

				if (buildMode === Constants.BUILD_MODE_PREVIEW)
				{
					return false;
				}

				if (lot && lot.lotBuildTypeDesc !== 'Dirt' && buildMode === Constants.BUILD_MODE_BUYER && salesAgreement.id === 0)
				{
					return false;
				}
				else
				{
					return (changeOrder.changeInput
						&& (changeOrder.changeInput.type === ChangeTypeEnum.CONSTRUCTION
							|| changeOrder.changeInput.type === ChangeTypeEnum.PLAN))
						? changeOrder.isChangingOrder
						: false;
				}
			})
		);

		this.selectedPointFilter$ = this.store.pipe(
			select(state => state.scenario.selectedPointFilter)
		);

		this.enabledPointFilters$ = this.store.pipe(
			select(state => state.scenario.enabledPointFilters)
		);

		this.store.pipe(
			select(fromRoot.isComplete)
		).subscribe(isComplete => this.isComplete = isComplete);

		this.scenarioStatus$ = this.store.pipe(
			select(fromRoot.scenarioStatus)
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.interactiveFloorplanSG),
			map(sg =>
			{
				return sg;
			})
		).subscribe(sg =>
		{
			this.interactiveFloorplanSG = sg;
			this.hasFloorPlan = sg != null;
		});

		this.store.pipe(
			select(state => state.scenario),
			withLatestFrom(this.store.select(state => state.job), this.store.select(state => state.changeOrder)),
			switchMap(([scenario, job, changeOrder]) =>
			{
				if (job.id === 0 && !!scenario?.scenario?.scenarioId)
				{
					return this.scenarioService.getFloorPlanImages(scenario.scenario.scenarioId);
				}
				else if (job.id && changeOrder)
				{
					return this.jobService.getFloorPlanImages(job.id, (changeOrder.currentChangeOrder !== null) ? true : false);
				}
				else
				{
					return new Observable<never>();
				}
			}),
			take(1)
		).subscribe(images =>
		{
			this.hasFloorPlanImages = images && images.length > 0;

			this.hasFloorPlanImages && images.map(img =>
			{
				img.svg = `data:image/svg+xml;base64,${btoa(img.svg)}`;

				this.summaryImages.push({ imageUrl: img.svg, hasDataUri: true, floorIndex: img.floorIndex, floorName: img.floorName } as SDImage);
			});
		});

		this.store.pipe(
			take(1),
			select(state => state.changeOrder),
			withLatestFrom(
				this.store.pipe(select(fromRoot.changeOrderChoicesPastCutoff)),
				this.store.pipe(select(fromRoot.canOverride))
			)
		).subscribe(([changeOrder, changeOrderChoicesPastCutoff, canOverride]) =>
		{
			const inConstructionChangeOrder = changeOrder.changeInput && changeOrder.changeInput.type === ChangeTypeEnum.CONSTRUCTION;

			if (changeOrder.isChangingOrder && inConstructionChangeOrder && changeOrderChoicesPastCutoff && changeOrderChoicesPastCutoff.length)
			{
				this.onOverrideWarning(canOverride, changeOrderChoicesPastCutoff);
			}
		});

		this.canEditAgreement$ = this.store.pipe(
			select(fromRoot.canEditAgreementOrSpec));

		this.canConfigure$ = this.store.pipe(
			select(fromRoot.canConfigure));

		this.route.paramMap.pipe(
			this.takeUntilDestroyed(),
			map(params => ({ jobId: +params.get('jobId') })),
			distinctUntilChanged()
		).subscribe(params => this.params$.next(params));

		combineLatest([
			this.store.pipe(select(state => state.job)),
			this.params$,
			this.store.pipe(select(fromScenario.selectScenario))
		])
			.pipe(this.takeUntilDestroyed())
			.subscribe(([job, params, scenario]) =>
			{
				if (job && job.projectedDates && job.projectedDates.projectedStartDate)
				{
					const constructionDate = new Date(job.projectedDates.projectedStartDate);

					constructionDate.setDate(constructionDate.getDate() - 14);

					const date = new Date();

					this.disableHanding = constructionDate < date;
				}

				if (!scenario.tree)
				{
					if (params && params.jobId && job.id !== params.jobId && !job.jobLoading)
					{
						this.store.dispatch(new JobActions.LoadJobForJob(params.jobId));
						this.store.dispatch(new ScenarioActions.SetBuildMode(Constants.BUILD_MODE_MODEL));
					}
				}
				else
				{
					this.canDisplay = true;
				}
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.plan.marketingPlanId)
		).subscribe(marketingPlanId =>
		{
			this.marketingPlanId = marketingPlanId;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.plan.marketingPlanId)
		).subscribe(marketingPlanId =>
		{
			this.marketingPlanId = marketingPlanId;
		});

		this.treeFilter$ = this.store.pipe(
			select(state => state.scenario.treeFilter)
		);

		this.canOverride$ = this.store.pipe(select(fromRoot.canOverride));

		// #335248
		// Determine if the price ranges have been fully calculated
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.choicePriceRanges)
		).subscribe(choicePriceRanges =>
		{
			this.priceRangesCalculated = choicePriceRanges != null;

			const message = 'Calculating the price ranges may take a few minutes. Please do not close the tab until the PDF loads.';

			if (this.priceRangesCalculated)
			{
				this._toastr.clear();
			}
			// Only display the toastr if it doesn't already exist. ToastrId doesn't seem to work for tracking, but going by the message works.
			else if (!this._toastr.toasts.map(t => t.message).includes(message) && !this.isPhdLite)
			{
				this._toastr.info(message, null, { disableTimeOut: true });
			}
		});
	}

	ngAfterViewInit()
	{
		this.route.fragment.pipe(this.takeUntilDestroyed()).subscribe(fragment =>
		{
			this.fragment = fragment;
			this.cd.detectChanges();

			const decision = document.getElementById(fragment);

			if (decision)
			{
				decision.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
			}
		});
	}

	onPointStatusFilterChanged(pointStatusFilter: PointStatusFilter)
	{
		this.store.dispatch(new SummaryActions.SetPointStatusFilter(pointStatusFilter));
	}

	/**
	 * Updates showAttributes flag on choices
	 * @param toggleAllAttributes
	 */
	onToggleAllAttributesChanged(toggleAllAttributes: boolean)
	{
		this.decisionPoints.forEach(dp =>
		{
			dp.toggleAttributes(toggleAllAttributes);
		});

		this.cd.detectChanges();
	}

	onToggleImagesChanged(toggleImages: boolean)
	{
		this.showImages = toggleImages;
	}

	/**
	 * Used to add additional padding to the header when scrolling so the first group header doesn't get hidden
	 * @param isSticky
	 */
	onIsStickyChanged(isSticky: boolean)
	{
		this.isSticky = isSticky;

		this.cd.detectChanges();
	}

	/**
	 * Runs when the carousel moves to a new image
	 * @param event
	 */
	onSlide(event: any)
	{
		this.activeIndex = event;
		this.imageLoading = true;
	}

	/** Removes the loading flag when Cloudinary is able to load an image */
	onLoadImage()
	{
		this.imageLoading = false;
	}

	/**
	 * Used to set a default image if Cloudinary can't load an image
	 * @param event
	 */
	onLoadImageError(event: any)
	{
		this.imageLoading = false;

		event.srcElement.src = environment.defaultImageURL;
	}

	onPointTypeFilterChanged(pointTypeFilter: DecisionPointFilterType)
	{
		// set the new filter type
		this.store.dispatch(new ScenarioActions.SetPointTypeFilter(pointTypeFilter));
	}

	async onBuildIt()
	{
		combineLatest([
			this.lotService.hasMonotonyConflict(),
			this.store.pipe(select(fromScenario.elevationDP), take(1)),
			this.store.pipe(select(fromScenario.colorSchemeDP), take(1))
		]).subscribe(([mc, elevationDP, colorSchemeDP]) =>
		{
			if (mc.monotonyConflict)
			{
				this.monotonyConflict = mc;

				this.loadMonotonyModal();
			}
			else
			{
				// find selected elevation and color scheme choices
				const elevationChoice = elevationDP?.choices.find(c => c.quantity > 0);
				const colorSchemeChoice = colorSchemeDP?.choices.find(c => c.quantity > 0);

				// check elevation and color scheme choices to make sure there is only one option assigned to each.
				const message = checkElevationAndColorSelectionOptions(this.tree, this.treeVersionRules.optionRules, elevationChoice, colorSchemeChoice);

				if (!!message)
				{
					this.modalService.showOkOnlyModal(message, '', true);
				}
				else
				{
					this.scenarioService.onGenerateSalesAgreement(
						this.buildMode,
						this.summaryHeader.lot.lotStatusDescription,
						this.summaryHeader.lot.id,
						this.salesAgreementId,
						this.opportunityId
					);
				}
			}
		});
	}

	loadMonotonyModal()
	{
		this.monotonyConflictModalRef = this.modalService.open(this.monotonyConflictModal);
		this.monotonyConflictModalRef.result.catch(err => console.log(err));
	}

	navigateToElevation()
	{
		this.store.pipe(
			select(fromScenario.elevationDP),
			withLatestFrom(this.store.pipe(select(store => store.scenario.scenario.scenarioId))),
		).subscribe(([mytree, scenario]) =>
		{
			const elevationUrl = 'edit-home/' + scenario + '/' + mytree.divPointCatalogId;

			this.navigateTo([elevationUrl]);
		});
	}

	navigateToColorScheme()
	{
		combineLatest([
			this.store.pipe(select(fromScenario.elevationDP)),
			this.store.pipe(select(store => store.scenario.scenario.scenarioId)),
			this.store.pipe(select(fromScenario.colorSchemeDP))
		]).subscribe(([elevationDP, scenario, colorSchemeDP]) =>
		{
			if (colorSchemeDP)
			{
				const colorSchemeUrl = 'edit-home/' + scenario + '/' + colorSchemeDP.divPointCatalogId;

				this.navigateTo([colorSchemeUrl]);
			}
			else
			{
				const elevationUrl = 'edit-home/' + scenario + '/' + elevationDP.divPointCatalogId;

				this.navigateTo([elevationUrl, { 'choiceId': elevationDP.choices.find(z => z.quantity > 0).id }]);
			}
		});
	}

	navigateToLot()
	{
		this.navigateTo(['/new-home/lot'], PhdSubMenu.ChooseLot);
	}

	navigateTo(navUrl: any[], navItem: number = null)
	{
		this.monotonyConflictModalRef.dismiss();

		if (navItem !== null)
		{
			this.store.dispatch(new NavActions.SetSelectedSubNavItem(navItem));
		}

		this.router.navigate(navUrl);
	}

	printPreview(reportType: SummaryReportType)
	{
		this.compileSummaryData(reportType).pipe(
			switchMap(summaryData => this._reportsService.getSelectionSummary(reportType, summaryData))
		).subscribe(pdfData =>
		{
			const pdfViewer = this.modalService.open(PDFViewerComponent, { backdrop: 'static', windowClass: 'phd-pdf-modal', size: 'lg' });

			pdfViewer.componentInstance.pdfModalTitle = `Configuration Preview - ${reportType}`;
			pdfViewer.componentInstance.pdfData = pdfData;
			pdfViewer.componentInstance.pdfBaseUrl = `${environment.pdfViewerBaseUrl}`;
		},
			error =>
			{
				this._toastr.error(`There was an issue generating ${reportType} configuration.`, 'Error - Print Configuration');
			});
	}

	compileSummaryData(reportType: SummaryReportType): Observable<SummaryData>
	{
		return of(reportType).pipe(
			switchMap(rt =>
			{
				if (rt === SummaryReportType.CHOICE_LIST || rt === SummaryReportType.DESIGN_CHOICE_LIST || rt === SummaryReportType.SALES_CHOICE_LIST)
				{
					return this.store.pipe(
						select(fromScenario.choicePriceRanges),
						take(1)
					);
				}
				else
				{
					return of<{ choiceId: number, min: number, max: number }[]>([]);
				}
			}),
			map(choicePriceRanges =>
			{
				const summaryData = {} as SummaryData;
				const buyerInfo = {} as BuyerInfo;
				const summaryHeader = this.summaryHeaderComponent;
				const priceBreakdown = summaryHeader.priceBreakdownComponent;

				summaryData.title = this.title;
				summaryData.images = this.summaryImages;
				summaryData.hasHomesite = summaryHeader.hasHomesite;
				summaryData.allowEstimates = this.allowEstimates;
				summaryData.priceBreakdown = this.priceBreakdown;
				summaryData.priceBreakdownTypes = priceBreakdown.breakdownFilters.map(x => x.toString());
				summaryData.includeImages = reportType == SummaryReportType.OPTION_DETAILS_IMAGES || reportType == SummaryReportType.SELECTIONS_IMAGES;

				buyerInfo.communityName = summaryHeader.communityName;
				buyerInfo.homesite = summaryHeader.homesite;
				buyerInfo.planName = summaryHeader.planName;
				buyerInfo.address = summaryHeader.address;

				summaryData.buyerInfo = buyerInfo;

				let choiceFilter: (choice: Choice) => boolean;
				let pointFilter: (point: DecisionPoint) => boolean;

				if (reportType === SummaryReportType.CHOICE_LIST || reportType === SummaryReportType.DESIGN_CHOICE_LIST || reportType === SummaryReportType.SALES_CHOICE_LIST)
				{
					choiceFilter = () => true;
				}
				else
				{
					choiceFilter = ch => ch.quantity > 0;
				}

				if (reportType === SummaryReportType.DESIGN_CHOICE_LIST)
				{
					pointFilter = pt => !pt.isStructuralItem;
				}
				else if (reportType === SummaryReportType.SALES_CHOICE_LIST)
				{
					pointFilter = pt => pt.isStructuralItem;
				}
				else
				{
					pointFilter = () => true;
				}

				summaryData.groups = this.fullGroups.map(g =>
				{
					const group = new SDGroup(g);

					group.subGroups = g.subGroups.map(sg =>
					{
						const subGroup = new SDSubGroup(sg);

						subGroup.points = sg.points.filter(pointFilter).map(p =>
						{
							const point = new SDPoint(p);

							point.choices = p.choices.filter(choiceFilter).map(c =>
							{
								let choice = new SDChoice(c, choicePriceRanges.find(ch => ch.choiceId === c.id));
								let choiceImages = this.choiceImages && this.choiceImages.length ? this.choiceImages.filter(x => x.dpChoiceId === choice.id) : [];

								// add images to choice
								choice.choiceImages = choiceImages.length ? choiceImages.map(x => new SDChoiceImage(x)).sort((a, b) => a.sortKey < b.sortKey ? -1 : 1) : [];

								return choice;
							});

							return point;
						}).filter(dp => !!dp.choices.length);

						return subGroup;
					}).filter(sg => !!sg.points.length);

					return group;
				}).filter(g => !!g.subGroups.length);

				const subGroups = _.flatMap(summaryData.groups, g => g.subGroups);
				const points = _.flatMap(subGroups, sg => sg.points);
				const choices = _.flatMap(points, p => p.choices);

				// filter down to just choices with reassignments
				const choicesWithReassignments = choices.filter(c => c.selectedAttributes && c.selectedAttributes.length > 0 && c.selectedAttributes.some(sa => sa.attributeReassignmentFromChoiceId != null));

				choicesWithReassignments.forEach(choice =>
				{
					// return only those selected attributes that are reassignments
					const selectedAttributes = choice.selectedAttributes.filter(sa => sa.attributeReassignmentFromChoiceId != null);

					selectedAttributes.forEach(sa =>
					{
						// find the parent the attribute originally came from
						const parentChoice = choices.find(c => c.id === sa.attributeReassignmentFromChoiceId);

						// Add where the reassignment landed
						parentChoice.attributeReassignments.push({ id: choice.id, label: choice.label } as SDAttributeReassignment);
					});
				});

				return summaryData;
			}),
			take(1)
		);
	}

	onHandingChanged(handing: string)
	{
		if (this.selectedHanding !== handing)
		{
			const newHanding = new ChangeOrderHanding();

			if (handing !== 'NA')
			{
				newHanding.handing = handing;
			}

			if (this.disableHanding)
			{
				const body = Constants.OVERRIDE_CUT_OFF;
				const confirm = this.modalService.open(ModalOverrideSaveComponent, { backdropClass: 'phd-second-backdrop' });

				confirm.componentInstance.title = Constants.WARNING;
				confirm.componentInstance.body = body;
				confirm.componentInstance.defaultOption = Constants.CANCEL;

				return confirm.result.then((result) =>
				{
					if (result !== Constants.CLOSE)
					{
						newHanding.overrideNote = result;

						this.store.dispatch(new SummaryActions.SetHanding(newHanding, this.summaryHeader.lot.id));
					}
				});

			}
			else
			{
				this.store.dispatch(new SummaryActions.SetHanding(newHanding, this.summaryHeader.lot.id));
			}

			this.selectedHanding = handing;
		}
	}

	getGroupSubTotals(group: SDGroup)
	{
		var groupSubtotal = 0;

		group.subGroups.map(sg =>
		{
			groupSubtotal += sg.points.reduce((sum, point) => sum += (point.price || 0), 0);
		});

		return groupSubtotal;
	}

	private showConfirmModal(body: string, title: string, primaryButton: any = null, secondaryButton: any = null): Observable<boolean>
	{
		const buttons = [];

		if (primaryButton)
		{
			buttons.push(primaryButton);
		}

		if (secondaryButton)
		{
			buttons.push(secondaryButton);
		}

		return this.modalService.showModal({
			buttons: buttons,
			content: body,
			header: title,
			type: 'normal'
		});
	}

	onOverrideWarning(canOverride: boolean, changeOrderChoicesPastCutoff: ChangeOrderChoice[])
	{
		let deselect = false;
		const body = `Some of your change order choices are Past Cutoff date/stage and will need to have an Cutoff Override.`;
		const title = Constants.WARNING;

		if (canOverride)
		{
			const defaultOption = Constants.CANCEL;
			const confirm = this.modalService.open(ModalOverrideSaveComponent);

			confirm.componentInstance.title = title;
			confirm.componentInstance.body = body;
			confirm.componentInstance.defaultOption = defaultOption;

			confirm.result.then((result) =>
			{
				if (result === Constants.CLOSE)
				{
					deselect = true;
				}
				else
				{
					const selectedChoices = changeOrderChoicesPastCutoff.map(choice =>
					{
						return {
							choiceId: choice.decisionPointChoiceID,
							overrideNote: result,
							quantity: choice.quantity
						};
					});

					this.store.dispatch(new ScenarioActions.SelectChoices(true, ...selectedChoices));
					this.store.dispatch(new ChangeOrderActions.SetChangeOrderOverrideNote(result));
				}
			});
		}
		else
		{
			const primaryButton = { text: 'Okay', result: true, cssClass: 'btn-primary' };

			this.showConfirmModal(body, title, primaryButton, null).subscribe(result =>
			{
				deselect = result;
			});
		}

		if (deselect)
		{
			const deSelectedChoices = changeOrderChoicesPastCutoff.map(choice =>
			{
				return {
					choiceId: choice.decisionPointChoiceID,
					overrideNote: null,
					quantity: 0
				};
			});

			this.store.dispatch(new ScenarioActions.SelectChoices(true, ...deSelectedChoices));
		}
	}

	/**
	 * Handles a save event from the child floor plan component, in order to render the IFP report.
	 * @param floorPlanImages The images that were saved.
	 */
	onFloorPlanSaved(floorPlanImages: FloorPlanImage[])
	{
		floorPlanImages.forEach(img =>
		{
			img.svg = `data:image/svg+xml;base64,${btoa(img.svg)}`;

			const sdImg = { imageUrl: img.svg, hasDataUri: true, floorIndex: img.floorIndex, floorName: img.floorName } as SDImage;
			const idx = this.summaryImages.findIndex(i => i.floorIndex === img.floorIndex);

			if (idx === -1)
			{
				this.summaryImages.push(sdImg);
			}
			else
			{
				this.summaryImages[idx] = sdImg;
			}
		});
	}

	onRemoveDesignSelections()
	{
		const confirm = this.modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = Constants.WARNING;
		confirm.componentInstance.body = `This will remove all Design Selections. Once removed, you must make the Design Selections again if you want to add it to the configuration.<br /><br />${Constants.DO_YOU_WISH_TO_CONTINUE}`;
		confirm.componentInstance.defaultOption = Constants.CONTINUE;

		confirm.result.then((result) =>
		{
			if (result == Constants.CONTINUE)
			{
				const subGroups = _.flatMap(this.fullGroups, g => g.subGroups);
				const points = _.flatMap(subGroups, sg => sg.points.filter(p => !p.isStructuralItem));
				const choices = _.flatMap(points, p => p.choices.filter(c => c.quantity > 0));

				if (choices.length > 0)
				{
					var deselectChoiceList = choices.map(c =>
					{
						return { choiceId: c.id, overrideNote: null, quantity: 0 };
					});

					this.store.dispatch(new ScenarioActions.SelectChoices(true, ...deselectChoiceList));
				}
			}
		});
	}

	getNonStructuralChoices(): Choice[]
	{
		const subGroups = _.flatMap(this.fullGroups, g => g.subGroups);
		const points = _.flatMap(subGroups, sg => sg.points.filter(p => !p.isStructuralItem));
		const choices = _.flatMap(points, p => p.choices.filter(c => c.quantity > 0));

		return choices;
	}
}
