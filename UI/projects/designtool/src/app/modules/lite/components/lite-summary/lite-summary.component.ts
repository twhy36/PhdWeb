import { Component, OnInit, ChangeDetectorRef, ViewChildren, QueryList, ViewChild } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { withLatestFrom, map, take } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';

import * as _ from "lodash";

import
{
	UnsubscribeOnDestroy, PriceBreakdown, ChangeTypeEnum,
	ChangeOrderHanding, ModalService, SummaryData, BuyerInfo,
	PDFViewerComponent, SDGroup, SDSubGroup, SDPoint,
	SDChoice, ScenarioOption,
	PriceBreakdownType
} from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromLite from '../../../ngrx-store/lite/reducer';
import * as fromLot from '../../../ngrx-store/lot/reducer';
import * as SummaryActions from '../../../ngrx-store/summary/actions';
import { selectSelectedLot } from '../../../ngrx-store/lot/reducer';

import { ChangeOrderService } from '../../../core/services/change-order.service';
import { LiteService } from '../../../core/services/lite.service';
import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';

import { SummaryHeader, SummaryHeaderComponent } from '../../../shared/components/summary-header/summary-header.component';
import
{
	LitePlanOption, IOptionSubCategory, LiteReportType, SummaryReportData,
	SummaryReportGroup, SummaryReportSubGroup, SummaryReportOption, SummaryReportSubOption, LegacyColorScheme
} from '../../../shared/models/lite.model';
import { OptionSummaryComponent } from '../option-summary/option-summary.component';
import { environment } from '../../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';

@Component({
	selector: 'lite-summary',
	templateUrl: './lite-summary.component.html',
	styleUrls: ['./lite-summary.component.scss']
})
export class LiteSummaryComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChildren(OptionSummaryComponent) options: QueryList<OptionSummaryComponent>;
	@ViewChild(SummaryHeaderComponent) summaryHeaderComponent: SummaryHeaderComponent;

	title: string;
	summaryHeader: SummaryHeader = new SummaryHeader();
	priceBreakdown: PriceBreakdown;
	allowEstimates$: Observable<boolean>;
	selectedHanding: string;
	canEditAgreement$: Observable<boolean>;
	canConfigure$: Observable<boolean>;
	canOverride$: Observable<boolean>;
	canEditHanding: boolean = true;
	canEditSummary: boolean = true;
	disableHanding = false;
	isSticky: boolean = false;
	optionCategories: Array<any> = [];
	isLiteComplete$: Observable<boolean>;

	primaryAction: string = 'Generate Agreement';
	salesAgreementId: number;
	isChangingOrder$: Observable<boolean>;
	summaryReportType = [LiteReportType.PRICE_LIST_WITH_SALES_DESCRIPTION, LiteReportType.PRICE_LIST, LiteReportType.SUMMARY];
	buildMode: string;

	constructor(private store: Store<fromRoot.State>,
		private cd: ChangeDetectorRef,
		private modalService: ModalService,
		private _toastr: ToastrService,
		private changeOrderService: ChangeOrderService,
		private liteService: LiteService)
	{
		super();
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.title)
		).subscribe(title => this.title = title);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.priceBreakdown)
		).subscribe(pb => this.priceBreakdown = pb);

		this.allowEstimates$ = this.store.select(fromRoot.allowEstimates);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.plan.plans ? state.plan.plans.find(p => p.id === state.plan.selectedPlan) : null)
		).subscribe(plan => this.summaryHeader.plan = plan);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(selectSelectedLot)
		).subscribe(lot => this.summaryHeader.lot = lot);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.org)
		).subscribe(o => this.summaryHeader.communitySalesName = o.salesCommunity ? o.salesCommunity.name : null);

		combineLatest([
			this.store.pipe(select(state => state.changeOrder)),
			this.store.pipe(select(state => state.scenario)),
			this.store.pipe(select(state => state.job)),
			this.store.pipe(select(state => state.salesAgreement))
		])
			.pipe(this.takeUntilDestroyed())
			.subscribe(([changeOrder, scenario, job, sag]) =>
			{
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
				}

				this.selectedHanding = this.summaryHeader.handing;

				if (job && job.projectedDates && job.projectedDates.projectedStartDate)
				{
					const constructionDate = new Date(job.projectedDates.projectedStartDate);

					constructionDate.setDate(constructionDate.getDate() - 14);

					const date = new Date();

					this.disableHanding = constructionDate < date;
				}
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.isPreview)
		).subscribe(isPreview => this.summaryHeader.isPreview = isPreview);

		this.canEditAgreement$ = this.store.pipe(
			select(fromRoot.canEditAgreementOrSpec));

		this.canConfigure$ = this.store.pipe(
			select(fromRoot.canConfigure));

		this.canOverride$ = this.store.pipe(
			select(fromRoot.canOverride));

		combineLatest([
			this.store.pipe(select(state => state.lite)),
			this.store.pipe(select(fromLite.selectedElevation)),
			this.store.pipe(select(fromRoot.selectedPlanPrice)),
			this.store.pipe(select(fromRoot.legacyColorScheme))
		])
			.pipe(this.takeUntilDestroyed())
			.subscribe(([lite, selectedElevation, planPrice, legacyColorScheme]) =>
			{
				// Build the data list for UI display
				this.buildOptionCategories(lite, selectedElevation, planPrice, legacyColorScheme);
			});

		this.isLiteComplete$ = this.store.pipe(
			select(fromRoot.isLiteComplete)
		);

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

				if (buildMode === 'preview')
				{
					return false;
				}

				if (lot && lot.lotBuildTypeDesc !== 'Dirt' && buildMode === 'buyer' && salesAgreement.id === 0)
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
	}

	private buildOptionCategories(lite: fromLite.State, selectedElevation: LitePlanOption, planPrice: number, legacyColorScheme: LegacyColorScheme)
	{
		const baseHouseOptions = this.liteService.getSelectedBaseHouseOptions(
			lite.scenarioOptions,
			lite.options,
			lite.categories
		);

		const selectedBaseHouseOptions: LitePlanOption[] = baseHouseOptions.selectedBaseHouseOptions;

		const allSubCategories = _.flatMap(lite.categories, c => c.optionSubCategories) || [];
		this.optionCategories = [];

		// Add selected elevation
		this.optionCategories.push({
			categoryName: 'Exterior',
			optionSubCategories: selectedElevation
				? this.buildOptionSubCategories(
					[selectedElevation],
					allSubCategories,
					lite.scenarioOptions,
					null,
					legacyColorScheme
				)
				: []
		});

		// Add selected base house options
		if (selectedBaseHouseOptions?.length)
		{
			const baseHouseCategory = baseHouseOptions.baseHouseCategory;

			this.optionCategories.push({
				categoryName: baseHouseCategory.name,
				optionSubCategories: this.buildOptionSubCategories(
					selectedBaseHouseOptions,
					allSubCategories,
					lite.scenarioOptions,
					planPrice
				)
			});
		}

		// Add other selected options
		const selectedOptions = lite.options.filter(option =>
			lite.scenarioOptions?.find(opt => opt.edhPlanOptionId === option.id)
			&& (!selectedElevation || selectedElevation.id !== option.id)
			&& !selectedBaseHouseOptions?.find(opt => opt.id === option.id));
		const optionCategoryGroups = _.groupBy(selectedOptions, option => option.optionCategoryId);
		let sortedOptionCategories = [];

		for (const categoryId in optionCategoryGroups)
		{
			const categoryName = lite.categories?.find(category => category.id === +categoryId)?.name;

			if (categoryName)
			{
				sortedOptionCategories.push({
					categoryName: categoryName,
					optionSubCategories: this.buildOptionSubCategories(
						optionCategoryGroups[categoryId],
						allSubCategories,
						lite.scenarioOptions
					)
				});
			}
		};

		this.optionCategories.push(...(_.sortBy(sortedOptionCategories, 'categoryName')));
	}

	private buildOptionSubCategories(
		options: LitePlanOption[],
		subCategories: IOptionSubCategory[],
		scenarioOptions: ScenarioOption[],
		planPrice?: number,
		legacylColorScheme?: LegacyColorScheme)
	{
		let optionSubCategories = [];

		const optionsubCategories = _.groupBy(options, o => o.optionSubCategoryId);

		for (const subCategoryId in optionsubCategories)
		{
			const subCategoryName = subCategories.find(subCategory => subCategory.id === +subCategoryId)?.name;

			if (subCategoryId)
			{
				optionSubCategories.push({
					subCategoryName: subCategoryName,
					options: _.sortBy(optionsubCategories[subCategoryId].map(option =>
					{
						const scenarioOption = scenarioOptions?.find(opt => opt.edhPlanOptionId === option.id);

						return {
							id: option.id,
							name: option.name,
							financialOptionIntegrationKey: option.financialOptionIntegrationKey,
							listPrice: planPrice || option.listPrice,
							quantity: scenarioOption?.planOptionQuantity || 0,
							colors: this.buildOptionColors(option, scenarioOption, legacylColorScheme),
							showColors: false
						};
					}), 'name')
				});
			}
		};

		return optionSubCategories;
	}

	private buildOptionColors(option: LitePlanOption, scenarioOption: ScenarioOption, legacylColorScheme: LegacyColorScheme)
	{
		let optionColors = [];

		if (legacylColorScheme?.isSelected)
		{
			optionColors.push({
				colorItemName: legacylColorScheme.colorItemName,
				colorName: legacylColorScheme.colorName
			});
		}
		else
		{
			scenarioOption?.scenarioOptionColors?.forEach(scnOptColor =>
			{
				const colorItem = option.colorItems?.find(item => item.colorItemId === scnOptColor.colorItemId);
				const color = colorItem?.color?.find(c => c.colorId === scnOptColor.colorId);

				if (colorItem && color)
				{
					optionColors.push({
						colorItemName: colorItem.name,
						colorName: color.sku ? color.name + "/" + color.sku : color.name
					});
				}
			});
		}

		return optionColors;
	}

	onToggleAllColorsChanged(toggleAllColors: boolean)
	{
		this.options.forEach(opt =>
		{
			opt.toggleColors(toggleAllColors);
		});
	}

	/**
	 * Used to add additional padding to the header when scrolling so the first category doesn't get hidden
	 * @param isSticky
	 */
	onIsStickyChanged(isSticky: boolean)
	{
		this.isSticky = isSticky;

		this.cd.detectChanges();
	}

	onHandingChanged(handing: string)
	{
		if (this.selectedHanding !== handing)
		{
			const newHanding = new ChangeOrderHanding();

			if (handing !== "NA")
			{
				newHanding.handing = handing;
			}

			if (this.disableHanding)
			{
				const body = 'This will override the Cut-off';
				const confirm = this.modalService.open(ModalOverrideSaveComponent, { backdropClass: 'phd-second-backdrop' });

				confirm.componentInstance.title = 'Warning';
				confirm.componentInstance.body = body;
				confirm.componentInstance.defaultOption = 'Cancel';

				return confirm.result.then((result) =>
				{
					if (result !== 'Close')
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

	getCategorySubTotals(optionCategory: any)
	{
		var subtotal = 0;

		optionCategory.optionSubCategories.map(sub =>
		{
			subtotal += sub.options.reduce((sum, option) => sum += (option.listPrice * option.quantity || 0), 0);
		});

		return subtotal;
	}

	onBuildIt()
	{
		combineLatest([
			this.liteService.hasLiteMonotonyConflict(),
			this.store.pipe(select(fromLite.areColorSelectionsValid), take(1))
		])
			.subscribe(([mc, areColorsValid]) =>
			{
				if (mc.monotonyConflict)
				{
					alert('Danger! Monotony Issues!  Please fix!')
				}
				else if (!areColorsValid)
				{
					this.liteService.onGenerateSalesAgreementWithColorWarning(
						this.buildMode,
						this.summaryHeader.lot.lotStatusDescription,
						this.summaryHeader.lot.id,
						this.salesAgreementId
					);
				}
				else
				{
					this.liteService.onGenerateSalesAgreement(
						this.buildMode,
						this.summaryHeader.lot.lotStatusDescription,
						this.summaryHeader.lot.id,
						this.salesAgreementId
					);
				}
			});
	}

	printConfig(reportType: LiteReportType)
	{
		if (reportType === LiteReportType.SUMMARY)
		{
			let data = this.getSummaryReportData();

			this.liteService.getLiteSelectionSummaryReport(LiteReportType.SUMMARY, data)
				.subscribe(pdfData =>
				{
					let pdfViewer = this.modalService.open(PDFViewerComponent, { backdrop: 'static', windowClass: 'phd-pdf-modal', size: 'lg' });
					pdfViewer.componentInstance.pdfModalTitle = `Configuration Preview - ${reportType}`;
					pdfViewer.componentInstance.pdfData = pdfData;
					pdfViewer.componentInstance.pdfBaseUrl = `${environment.pdfViewerBaseUrl}`;
				});

			return;
		}

		const showSalesDescription = reportType === LiteReportType.PRICE_LIST_WITH_SALES_DESCRIPTION;
		const reportData = this.getPriceListReportData();
		this.liteService.getSelectionSummary(LiteReportType.PRICE_LIST, reportData, showSalesDescription)
			.subscribe(pdfData =>
			{
				let pdfViewer = this.modalService.open(PDFViewerComponent, { backdrop: 'static', windowClass: 'phd-pdf-modal', size: 'lg' });
				pdfViewer.componentInstance.pdfModalTitle = `Configuration Preview - ${reportType}`;
				pdfViewer.componentInstance.pdfData = pdfData;
				pdfViewer.componentInstance.pdfBaseUrl = `${environment.pdfViewerBaseUrl}`;
			},
				error =>
				{
					this._toastr.error(`There was an issue generating ${reportType} configuration.`, 'Error - Print Configuration');
				});
	}

	getPriceListReportData(): SummaryData
	{
		let summaryData = {} as SummaryData;
		let buyerInfo = {} as BuyerInfo;
		summaryData.title = 'Price List';
		summaryData.groups = [];
		buyerInfo.communityName = this.summaryHeader.communitySalesName;
		buyerInfo.planName = this.summaryHeader.plan.salesName;

		summaryData.buyerInfo = buyerInfo;
		summaryData.includeImages = false;

		combineLatest([
			this.store.select(state => state.lite.categories),
			this.store.select(state => state.lite.options)
		])
			.pipe(take(1))
			.subscribe(([categories, options]) =>
			{
				const baseHouseCategory = categories.find(x => x.name.toLowerCase() === "base house");

				options.filter(x => x.optionCategoryId !== baseHouseCategory.id && x.isActive).forEach(option =>
				{
					let categoryGroup = summaryData.groups.find(g => g.id === option.optionCategoryId);

					if (!categoryGroup)
					{
						categoryGroup = new SDGroup({
							id: option.optionCategoryId,
							label: categories.find(c => c.id === option.optionCategoryId).name,
							groupCatalogId: 0,
							treeVersionId: 0,
							sortOrder: 0,
							subGroups: [],
							status: 0,
						});

						summaryData.groups.push(categoryGroup);
					}

					let subGroupPlaceholder = categoryGroup.subGroups.find(x => x.id === option.optionCategoryId);

					if (!subGroupPlaceholder)
					{
						subGroupPlaceholder = new SDSubGroup({
							id: option.optionCategoryId,
							label: option.name,
							groupId: 0,
							subGroupCatalogId: 0,
							sortOrder: 0,
							useInteractiveFloorplan: false,
							treeVersionId: 0,
							points: [],
							status: 0
						});

						categoryGroup.subGroups.push(subGroupPlaceholder);
					}

					let subcategory = subGroupPlaceholder.points.find(x => x.id === option.optionSubCategoryId);

					if (!subcategory)
					{
						subcategory = new SDPoint({
							id: option.optionSubCategoryId,
							label: categories.find(x => x.id === option.optionCategoryId).optionSubCategories.find(x => x.id === option.optionSubCategoryId).name,
							hasPointToPointRules: false,
							hasPointToChoiceRules: false,
							subGroupId: 0,
							divPointCatalogId: 0,
							pointPickTypeId: 0,
							pointPickTypeLabel: '',
							sortOrder: 0,
							isQuickQuoteItem: false,
							isStructuralItem: false,
							isHiddenFromBuyerView: false,
							edhConstructionStageId: 0,
							cutOffDays: 0,
							description: '',
							treeVersionId: 0,
							choices: [],
							completed: false,
							viewed: false,
							enabled: true,
							disabledBy: [],
							status: 0,
							price: 0,
							dPointTypeId: 0,
							subGroupCatalogId: 0,
							isPastCutOff: false
						});

						subGroupPlaceholder.points.push(subcategory);
					}

					subcategory.choices.push(new SDChoice({
						id: option.id,
						label: option.name,
						description: option.description,
						price: option.listPrice,
						mappedAttributeGroups: [],
						mappedLocationGroups: [],
						attributeGroups: [],
						locationGroups: [],
						choiceMaxQuantity: null,
						disabledBy: [],
						divChoiceCatalogId: 0,
						enabled: false,
						hasChoiceRules: false,
						hasOptionRules: false,
						imagePath: '',
						hasImage: false,
						isDecisionDefault: false,
						isSelectable: false,
						maxQuantity: 1,
						options: [],
						overrideNote: '',
						quantity: 0,
						selectedAttributes: [],
						sortOrder: 0,
						treePointId: 0,
						treeVersionId: 0,
						lockedInOptions: [],
						changedDependentChoiceIds: [],
						lockedInChoice: null,
						mappingChanged: false,
						isHiddenFromBuyerView: false,
						priceHiddenFromBuyerView: false,
						isRequired: false,
						disabledByHomesite: false,
						disabledByReplaceRules: [],
						disabledByBadSetup: false,
						disabledByRelocatedMapping: []
					}));
				});

				let exteriorSubGroup = new SDSubGroup({
					id: 8888,
					label: 'Exterior',
					groupId: 0,
					subGroupCatalogId: 0,
					sortOrder: 0,
					useInteractiveFloorplan: false,
					treeVersionId: 0,
					points: [],
					status: 0
				});

				let elevationsSubCategory = new SDPoint({
					id: 7777,
					label: 'Elevations',
					price: 0,
					hasPointToPointRules: false,
					hasPointToChoiceRules: false,
					subGroupId: 0,
					divPointCatalogId: 0,
					pointPickTypeId: 0,
					pointPickTypeLabel: '',
					sortOrder: 0,
					isQuickQuoteItem: false,
					isStructuralItem: false,
					isHiddenFromBuyerView: false,
					edhConstructionStageId: 0,
					cutOffDays: 0,
					description: '',
					treeVersionId: 0,
					choices: [],
					completed: false,
					viewed: false,
					enabled: true,
					disabledBy: [],
					status: 0,
					dPointTypeId: 0,
					subGroupCatalogId: 0,
					isPastCutOff: false
				});

				const elevationsGroup = summaryData.groups.find(x => x.label.toLowerCase() === "elevations");
				const elevationsSubGroup = elevationsGroup.subGroups[0];
				elevationsSubCategory.choices = elevationsSubGroup.points.find(x => x.label.toLowerCase() === "attached" || x.label.toLowerCase() === "detached").choices;
				exteriorSubGroup.points.push(elevationsSubCategory);

				let colorSubGroup = new SDSubGroup({
					id: 9999,
					label: 'Color Scheme',
					groupId: 0,
					subGroupCatalogId: 0,
					sortOrder: 0,
					useInteractiveFloorplan: false,
					treeVersionId: 0,
					points: [],
					status: 0
				});

				let colorSubCategory = new SDPoint({
					id: 9999,
					label: 'Color Scheme',
					price: 0,
					hasPointToPointRules: false,
					hasPointToChoiceRules: false,
					subGroupId: 0,
					divPointCatalogId: 0,
					pointPickTypeId: 0,
					pointPickTypeLabel: '',
					sortOrder: 0,
					isQuickQuoteItem: false,
					isStructuralItem: false,
					isHiddenFromBuyerView: false,
					edhConstructionStageId: 0,
					cutOffDays: 0,
					description: '',
					treeVersionId: 0,
					choices: [],
					completed: false,
					viewed: false,
					enabled: true,
					disabledBy: [],
					status: 0,
					dPointTypeId: 0,
					subGroupCatalogId: 0,
					isPastCutOff: false
				});

				colorSubGroup.points.push(colorSubCategory);

				const exteriorCategory = categories.find(x => x.name.toLowerCase() === "elevations");

				options.filter(x => x.optionCategoryId === exteriorCategory.id && x.isActive).forEach(elOption =>
				{
					elOption.colorItems.filter(ci => ci.isActive).forEach(ci =>
					{
						ci.color.filter(color => color.isActive)
							.sort((color1, color2) =>
							{
								return color1.name > color2.name ? 1 : -1;
							})
							.forEach(color =>
							{
								colorSubCategory.choices
									.push(new SDChoice({
										id: color.colorId,
										label: color.name,
										description: '',
										price: 0,
										mappedAttributeGroups: [],
										mappedLocationGroups: [],
										attributeGroups: [],
										locationGroups: [],
										choiceMaxQuantity: null,
										disabledBy: [],
										divChoiceCatalogId: 0,
										enabled: false,
										hasChoiceRules: false,
										hasOptionRules: false,
										imagePath: '',
										hasImage: false,
										isDecisionDefault: false,
										isSelectable: false,
										maxQuantity: 1,
										options: [],
										overrideNote: '',
										quantity: 0,
										selectedAttributes: [],
										sortOrder: 0,
										treePointId: 0,
										treeVersionId: 0,
										lockedInOptions: [],
										changedDependentChoiceIds: [],
										lockedInChoice: null,
										mappingChanged: false,
										isHiddenFromBuyerView: false,
										priceHiddenFromBuyerView: false,
										isRequired: false,
										disabledByHomesite: false,
										disabledByReplaceRules: [],
										disabledByBadSetup: false,
										disabledByRelocatedMapping: []
									}));
							});
					});
				});

				let exteriorGroup = new SDGroup({
					id: 99999,
					label: 'Exterior',
					groupCatalogId: 0,
					treeVersionId: 0,
					sortOrder: 0,
					subGroups: [],
					status: 0,
				});

				exteriorGroup.subGroups.push(exteriorSubGroup);
				exteriorGroup.subGroups.push(colorSubGroup);
				exteriorGroup.subGroups.forEach(subgrp =>
				{
					subgrp.points = subgrp.points.sort((group1, group2) =>
					{
						return group1.label > group2.label ? 1 : -1;
					});

					subgrp.points.forEach(point =>
					{
						point.choices = point.choices.sort((group1, group2) =>
						{
							return group1.label > group2.label ? 1 : -1;
						});
					});
				});

				summaryData.groups = summaryData.groups.sort((group1, group2) =>
				{
					return group1.label > group2.label ? 1 : -1;
				});

				summaryData.groups.forEach(grp =>
				{
					grp.subGroups.forEach(subgrp =>
					{
						subgrp.points = subgrp.points.sort((group1, group2) =>
						{
							return group1.label > group2.label ? 1 : -1;
						});

						subgrp.points.forEach(point =>
						{
							point.choices = point.choices.sort((group1, group2) =>
							{
								return group1.label > group2.label ? 1 : -1;
							});
						});
					});
				});

				summaryData.groups.unshift(exteriorGroup);
				summaryData.groups = summaryData.groups.filter(g => g.label.toLowerCase() !== "elevations");
			});

		return summaryData;
	}

	getSummaryReportData(): SummaryReportData
	{
		let summaryHeader = this.summaryHeaderComponent;
		let priceBreakdown = summaryHeader.priceBreakdownComponent;
		let optionalPricingSelections: string = priceBreakdown.breakdownFilters.toString();

		let summaryData = {} as SummaryReportData;

		summaryData.showHomesiteEstimate = optionalPricingSelections.includes(PriceBreakdownType.HOMESITE.toString());
		summaryData.showDesignEstimate = optionalPricingSelections.includes(PriceBreakdownType.DESIGN.toString());
		summaryData.showClosingIncentive = optionalPricingSelections.includes(PriceBreakdownType.CLOSING.toString());
		summaryData.showSalesProgram = optionalPricingSelections.includes(PriceBreakdownType.DISCOUNT.toString());
		summaryData.configurationName = this.title;
		summaryData.community = this.summaryHeader.communitySalesName || "N/A";
		summaryData.plan = this.summaryHeader.plan.salesName + ", " + this.summaryHeader.plan.integrationKey;

		if (this.summaryHeader.lot) 
		{
			summaryData.lot = this.summaryHeader.lot.lotBlock;
			if (this.summaryHeader.handing)
			{
				summaryData.lot += " (" + this.summaryHeader.handing + " Garage)";
			}
			summaryData.address = this.summaryHeader.lot.streetAddress1 + ", "
				+ this.summaryHeader.lot.city + ", " + this.summaryHeader.lot.stateProvince
				+ ", " + this.summaryHeader.lot.postalCode;
		}
		else 
		{
			summaryData.lot = 'No Lot Selected';
		}

		summaryData.basePrice = this.priceBreakdown.baseHouse || 0;
		summaryData.lotPremium = this.priceBreakdown.homesite || 0;
		summaryData.lotPremiumEstimate = this.priceBreakdown.homesiteEstimate || 0;
		summaryData.optionsTotal = this.priceBreakdown.selections || 0;
		summaryData.totalPrice = this.priceBreakdown.totalPrice || 0;
		summaryData.salesProgram = this.priceBreakdown.salesProgram || 0;
		summaryData.closingIncentive = this.priceBreakdown.closingIncentive || 0;
		summaryData.designEstimate = this.priceBreakdown.designEstimate || 0;
		summaryData.groups = [];

		this.optionCategories.forEach(category =>
		{
			let newGroup = new SummaryReportGroup();

			newGroup.groupName = category.categoryName;
			newGroup.groupSubTotal = 0;

			summaryData.groups.push(newGroup);

			newGroup.subGroups = [];

			category.optionSubCategories.forEach(subCategory =>
			{
				let newSubGroup = new SummaryReportSubGroup();

				newSubGroup.subGroupName = subCategory.subCategoryName;

				newGroup.subGroups.push(newSubGroup);

				newSubGroup.options = [];

				subCategory.options.forEach(option =>
				{
					let newOption = new SummaryReportOption();
					newOption.name = option.name;
					newOption.id = option.financialOptionIntegrationKey;
					newOption.quantity = option.quantity;
					newOption.listPrice = option.listPrice;
					newSubGroup.options.push(newOption);
					newOption.subOptions = [];

					option.colors.forEach(color =>
					{
						let newSubOption = new SummaryReportSubOption();

						newSubOption.attribute = color.colorItemName;
						newSubOption.attributeValue = color.colorName;

						newOption.subOptions.push(newSubOption);
					});
				});
			});
		});

		return summaryData;
	}
}
