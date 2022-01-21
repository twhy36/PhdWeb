import { Component, OnInit, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, combineLatest } from 'rxjs';
import { withLatestFrom, map } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';

import * as _ from "lodash";

import { UnsubscribeOnDestroy, PriceBreakdown, ChangeTypeEnum, ChangeOrderHanding, ModalService } from 'phd-common';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import * as fromLite from '../../../ngrx-store/lite/reducer';
import * as fromLot from '../../../ngrx-store/lot/reducer';
import * as SummaryActions from '../../../ngrx-store/summary/actions';
import { selectSelectedLot } from '../../../ngrx-store/lot/reducer';

import { ChangeOrderService } from '../../../core/services/change-order.service';
import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';

import { SummaryHeader } from '../../../shared/components/summary-header/summary-header.component';
import { LitePlanOption, IOptionSubCategory, ScenarioOption } from '../../../shared/models/lite.model';
import { OptionSummaryComponent } from '../option-summary/option-summary.component';

@Component({
	selector: 'lite-summary',
	templateUrl: './lite-summary.component.html',
	styleUrls: ['./lite-summary.component.scss']
})
export class LiteSummaryComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChildren(OptionSummaryComponent) options: QueryList<OptionSummaryComponent>;

	title: string;
	summaryHeader: SummaryHeader = new SummaryHeader();
	priceBreakdown: PriceBreakdown;
	allowEstimates: boolean;
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

	constructor(private store: Store<fromRoot.State>, 
		private cd: ChangeDetectorRef,
		private modalService: ModalService,
		private router: Router,
		private changeOrderService: ChangeOrderService)
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
		
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement)
		).subscribe(sag =>
		{
			this.allowEstimates = sag ? sag.id === 0 : true;
		});		
	
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
			this.store.pipe(select(fromLite.selectedElevation))
		])
		.pipe(this.takeUntilDestroyed())		
		.subscribe(([lite, selectedElevation]) =>
		{
			// Build the data list for UI display
			this.buildOptionCategories(lite, selectedElevation);
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

	private buildOptionCategories(lite: fromLite.State, selectedElevation: LitePlanOption) 
	{
		const allSubCategories = _.flatMap(lite.categories, c => c.optionSubCategories) || [];
		this.optionCategories = [];

		// Add selected elevation
		this.optionCategories.push({
			categoryName: 'Exterior',
			optionSubCategories: selectedElevation 
				? this.buildOptionSubCategories(
						[selectedElevation],
						allSubCategories,
						lite.scenarioOptions
					)
				: []
		});

		// Add selected base house options
		const baseHouseCategory = lite.categories.find(x => x.name.toLowerCase() === "base house");
		const selctedBaseHouseOptions = lite.options.filter(option => 
			option.optionCategoryId === baseHouseCategory.id
			&& lite.scenarioOptions?.find(opt => opt.edhPlanOptionId === option.id));

		if (selctedBaseHouseOptions?.length)
		{
			this.optionCategories.push({
				categoryName: baseHouseCategory.name,
				optionSubCategories: this.buildOptionSubCategories(
					selctedBaseHouseOptions,
					allSubCategories,
					lite.scenarioOptions
				)
			});			
		}

		// Add other selected options
		const selectedOptions = lite.options.filter(option => 
			lite.scenarioOptions?.find(opt => opt.edhPlanOptionId === option.id)
			&& (!selectedElevation || selectedElevation.id !== option.id)
			&& !selctedBaseHouseOptions?.find(opt => opt.id === option.id));
		const optionCategoryGroups = _.groupBy(selectedOptions, option => option.optionCategoryId);
		let sortedOptionCategories = []

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

	private buildOptionSubCategories(options: LitePlanOption[], subCategories: IOptionSubCategory[], scenarioOptions: ScenarioOption[])
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
					options: optionsubCategories[subCategoryId].map(option => {
						const scenarioOption = scenarioOptions?.find(opt => opt.edhPlanOptionId === option.id);

						return {
							id: option.id,
							name: option.name,
							financialOptionIntegrationKey: option.financialOptionIntegrationKey,
							listPrice: option.listPrice,					
							quantity: scenarioOption?.planOptionQuantity || 0,
							colors: this.buildOptionColors(option, scenarioOption),
							showColors: false
						};
					})
				});					
			}
		};
		
		return optionSubCategories;
	}

	private buildOptionColors(option: LitePlanOption, scenarioOption: ScenarioOption)
	{
		let optionColors = [];

		scenarioOption?.scenarioOptionColors?.forEach(scnOptColor => {
			const colorItem = option.colorItems?.find(item => item.colorItemId === scnOptColor.colorItemId);
			const color = colorItem?.color?.find(c => c.colorId === scnOptColor.colorId);

			if (colorItem && color)
			{
				optionColors.push({
					colorItemName: colorItem.name,
					colorName: color.name
				});
			}
		});

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

			if(handing !== "NA")
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

	onCallToAction()
	{
		if (this.salesAgreementId)
		{
			this.router.navigateByUrl(`/point-of-sale/people/${this.salesAgreementId}`);
		}
	}
}
