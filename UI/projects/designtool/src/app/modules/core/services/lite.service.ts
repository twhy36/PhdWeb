import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from "@angular/router";
import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError, switchMap, take, tap } from 'rxjs/operators';
import { Store, ActionsSubject, select } from '@ngrx/store';
import { ofType } from '@ngrx/effects';

import * as _ from 'lodash';

import { environment } from '../../../../environments/environment';

import
{
	withSpinner, getNewGuid, createBatchGet, createBatchHeaders, createBatchBody,
	SalesAgreement, ISalesAgreement, ModalService, Job, ChangeOrderGroup, JobPlanOptionAttribute,
	JobPlanOption, ChangeOrderPlanOption, SummaryData, defaultOnNotFound,
	ChangeOrderHanding, ChangeTypeEnum, ChangeInput, SelectedChoice, ConstructionStageTypes,
	ScenarioOption, ScenarioOptionColor, Scenario, IJob
} from 'phd-common';

import * as fromRoot from '../../ngrx-store/reducers';

import {
	LitePlanOption, ColorItem, Color, ScenarioOptionColorDto, IOptionSubCategory, OptionRelation,
	OptionRelationEnum, Elevation, IOptionCategory, LiteReportType, LiteMonotonyRule, SummaryReportData
} from '../../shared/models/lite.model';
import { LotService } from './lot.service';
import { ChangeOrderService } from './change-order.service';
import { MonotonyConflict } from '../../shared/models/monotony-conflict.model';
import * as LiteActions from '../../ngrx-store/lite/actions';
import * as moment from 'moment';

@Injectable()
export class LiteService
{
	private _ds: string = encodeURIComponent("$");

    constructor(
		private _http: HttpClient,
		private router: Router,
		private lotService: LotService,
		private changeOrderService: ChangeOrderService,
		private modalService: ModalService,
		private store: Store<fromRoot.State>,
		private actions: ActionsSubject
	) { }

	getLitePlanOptions(planId: number, optionIds?: Array<string>, skipSpinner?: boolean): Observable<LitePlanOption[]>
	{
		let filterOptions = '';

		if (optionIds != null)
		{
			filterOptions = " and (" + optionIds.map(id => `optionCommunity/option/financialOptionIntegrationKey eq '${id}'`).join(' or ') + ")";
		}

		const entity = 'planOptionCommunities';
		const expand = `optionCommunity($expand=option($select=financialOptionIntegrationKey,id),optionSubCategory($select=optionCategoryId); $select=optionSalesName,optionDescription,option,id,optionSubCategoryId)`;
		const filter = `planId eq ${planId}${filterOptions}`;
		const select = `id, planId, optionCommunity, maxOrderQty, listPrice, isActive, isBaseHouse, isBaseHouseElevation, cutOffDays, cutOffStage`;

		const endPoint = environment.apiUrl + `${entity}?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

		return (skipSpinner ? this._http : withSpinner(this._http)).get(endPoint).pipe(
			this.mapOptions(),
			catchError(this.handleError)
		);
    }

	private mapOptions = () => (source: Observable<any>) =>
		source.pipe(
			map((response: any) =>
			{
				return response.value.map(data =>
				{
					return {
						id: data['id'],
						name: data['optionCommunity']['optionSalesName'],
						isActive: data['isActive'],
						listPrice: data['listPrice'] || 0,
						maxOrderQuantity: data['maxOrderQty'],
						isBaseHouse: data['isBaseHouse'],
						isBaseHouseElevation: data['isBaseHouseElevation'],
						attributeGroups: [],
						locationGroups: [],
						financialOptionIntegrationKey: data['optionCommunity']['option']['financialOptionIntegrationKey'],
						description: data['optionCommunity']['optionDescription'],
						optionImages: [],
						planId: data['planId'] ? data['planId'] : 0,
                        communityId: data['communityId'] ? data['communityId'] : 0,
						optionSubCategoryId: data['optionCommunity']['optionSubCategoryId'],
						optionCommunityId: data['optionCommunity']['id'],
						colorItems: [],
						optionCategoryId: data['optionCommunity']['optionSubCategory']['optionCategoryId'],
						mustHavePlanOptionIds: [],
						cantHavePlanOptionIds: [],
						cutOffDays: data['cutOffDays'],
						cutOffStage: data['cutOffStage']
					} as LitePlanOption;
				}) as LitePlanOption[];
			})
        );

	getScenarioOptions(scenarioId: number) : Observable<ScenarioOption[]>
	{
		const entity = `scenarioOptions`;
		const filter = `scenarioId eq ${scenarioId}`;
		const expand = `scenarioOptionColors`;

		const endpoint = `${environment.apiUrl}${entity}?${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}`;

		return withSpinner(this._http).get<any>(endpoint).pipe(
			map(results =>
			{
				return results['value'];
			}),
			catchError(this.handleError)
		);
	}

	saveScenarioOptions(scenarioId: number, scenarioOptions: ScenarioOption[]) : Observable<ScenarioOption[]>
	{
		const endpoint = environment.apiUrl + `SaveScenarioOptions`;

		let data = {
			scenarioId: scenarioId,
			scenarioOptions: scenarioOptions
		};

		return this._http.post(endpoint, data).pipe(
			map(response =>
			{
				return response['value'];
			}),
			catchError(this.handleError)
		);
	}

	saveScenarioOptionColors(scenarioId: number, optionColors: ScenarioOptionColorDto[]) : Observable<ScenarioOption[]>
	{
		const endpoint = environment.apiUrl + `SaveScenarioOptionColors`;

		let data = {
			scenarioId: scenarioId,
			scenarioOptionColors: optionColors.map(color => {
				return {
					scenarioOptionColorId: color.scenarioOptionColorId,
					scenarioOptionId: color.scenarioOptionId,
					colorItemId: color.colorItemId,
					colorId: color.colorId,
					isDeleted: color.isDeleted
				};
			})
		};

		return this._http.post(endpoint, data).pipe(
			map(response =>
			{
				return response['value'];
			}),
			catchError(this.handleError)
		);
	}

	getColorItems(optionIds: Array<number>): Observable<ColorItem[]>
	{
		const batchGuid = getNewGuid();
		const batchSize = 50;

		let requests = [];

		for (let i = 0; i < optionIds.length; i = i + batchSize)
		{
			const batchIds = optionIds.slice(i, i + batchSize);
			const entity = `colorItems`;
			const expand =  `colorItemColorAssoc($expand=color)`
			let filter = `(edhPlanOptionId in (${batchIds.join(',')})) and (isActive eq true)`;
			const select = `colorItemId,name,edhPlanOptionId,isActive`;

			let qryStr = `${this._ds}expand=${encodeURIComponent(expand)}&${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

			const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

			requests.push(createBatchGet(endpoint));
		}

		let headers = createBatchHeaders(batchGuid);
		let batch = createBatchBody(batchGuid, requests);

		return withSpinner(this._http).post(`${environment.apiUrl}$batch`, batch, { headers: headers }).pipe(
			map((response: any) =>
			{
				let responseBodies = response.responses.map(res => res.body);
				let colorItems: Array<ColorItem> = [];

				responseBodies.forEach((result)=>
				{
					let resultItems = result.value as Array<ColorItem>;

					resultItems.forEach(item => {
						colorItems.push({
							colorItemId: item.colorItemId,
							name: item.name,
							edhPlanOptionId: item.edhPlanOptionId,
							isActive: item.isActive,
							color: this.mapColors(item['colorItemColorAssoc'], item.colorItemId)
						});
					});
				})

			return colorItems;
		}),
			catchError(this.handleError)
		)
	}

	private mapColors(colorItemAssoc: any[], colorItemId: number) : Color[]
	{
		let colors : Color[] = [];

		if (colorItemAssoc)
		{
			colorItemAssoc.forEach(assoc => {
				colors.push({
					colorId: assoc.color?.colorId,
					name: assoc.color?.name,
					sku: assoc.color?.sku,
					edhFinancialCommunityId: assoc.color?.edhFinancialCommunityId,
					edhOptionSubcategoryId: assoc.color?.edhOptionSubcategoryId,
					isActive: assoc.color?.isActive,
					colorItemId: colorItemId
				})
			})
		}

		return colors;
	}

	getOptionRelations(optionCommunityIds: Array<number>): Observable<OptionRelation[]>
	{
		const batchGuid = getNewGuid();
		const batchSize = 50;

		let requests = [];

		for (let i = 0; i < optionCommunityIds.length; i = i + batchSize)
		{
			const batchIds = optionCommunityIds.slice(i, i + batchSize);
			const entity = `optionRelations`;
			let filter = `(mainEdhOptionCommunityId in (${batchIds.join(',')}))`;
			const select = `optionRelationId,mainEdhOptionCommunityId,relatedEdhOptionCommunityId,relationType`;

			let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;

			const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

			requests.push(createBatchGet(endpoint));
		}

		let headers = createBatchHeaders(batchGuid);
		let batch = createBatchBody(batchGuid, requests);

		return withSpinner(this._http).post(`${environment.apiUrl}$batch`, batch, { headers: headers }).pipe(
			map((response: any) =>
			{
				let responseBodies = response.responses.map(res => res.body);
				let optionRelations: Array<OptionRelation> = [];

				responseBodies.forEach((result)=>
				{
					let resultItems = result?.value as Array<OptionRelation>;

					resultItems?.forEach(item => {
						optionRelations.push({
							optionRelationId: item.optionRelationId,
							mainEdhOptionCommunityId: item.mainEdhOptionCommunityId,
							relatedEdhOptionCommunityId: item.relatedEdhOptionCommunityId,
							relationType: item.relationType
						});
					});
				})

			return optionRelations;
		}),
			catchError(this.handleError)
		)
	}

	applyOptionRelations(options: LitePlanOption[], optionRelations: OptionRelation[])
	{
		if (optionRelations?.length)
		{
			optionRelations.forEach(or => {
				const mainOption = options.find(o => o.optionCommunityId === or.mainEdhOptionCommunityId && o.isActive);
				const relatedOption = options.find(o => o.optionCommunityId === or.relatedEdhOptionCommunityId && o.isActive);

				if (mainOption && relatedOption)
				{
					if (or.relationType === OptionRelationEnum.CantHave)
					{
						mainOption.cantHavePlanOptionIds.push(relatedOption.id);
						relatedOption.cantHavePlanOptionIds.push(mainOption.id);
					}
					else if (or.relationType === OptionRelationEnum.MustHave)
					{
						mainOption.mustHavePlanOptionIds.push(relatedOption.id);
					}
				}
			});
		}
	}

	private handleError(error: Response)
	{
		// In the future, we may send the server to some remote logging infrastructure
		console.error(error);

		return _throw(error || 'Server error');
	}

	getOptionsCategorySubcategory(
		financialCommunityId: number
	): Observable<IOptionSubCategory[]> {
		const dollarSign: string = encodeURIComponent('$');
		const entity = `optionSubCategories`;
		const expand = `optionCategory($select=id,name)`;
		const filter = `optionCommunities/any(oc: oc/financialCommunityId eq ${financialCommunityId})`;
		const select = `id,name`;

		let qryStr = `${dollarSign}expand=${encodeURIComponent(expand)}&${
			dollarSign
		}filter=${encodeURIComponent(filter)}&${
			dollarSign
		}select=${encodeURIComponent(select)}`;

		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return this._http.get<any>(endpoint).pipe(
			map((response) => {
				let subCategoryList =
					response.value as Array<IOptionSubCategory>;
				// sort by categoryname and then by subcategoryname
				return subCategoryList.sort((a, b) => {
					let aName = a.optionCategory.name.toLowerCase();
					let bName = b.optionCategory.name.toLowerCase();

					if (aName < bName) {
						return -1;
					}

					if (aName > bName) {
						return 1;
					}

					if ((aName === bName)) {
						let aSubName = a.name.toLowerCase();
						let bSubName = b.name.toLowerCase();

						if (aSubName < bSubName) {
							return -1;
						}

						if (aSubName > bSubName) {
							return 1;
						}

						return 0;
					}
					return 0;
				});
			}),
			catchError(error =>
				{
					console.error(error);

					return _throw(error);
				})
		);
	}

	createSalesAgreementForLiteScenario(
		scenarioOptions: ScenarioOption[],
		options: LitePlanOption[],
		categories: IOptionCategory[],
		scenarioId: number,
		salePrice: number,
		baseHousePrice: number,
		overrideNote: string
	): Observable<SalesAgreement>
	{
		const action = `CreateSalesAgreementForLiteScenario`;
		const url = `${environment.apiUrl}${action}`;

		const elevations = options.filter(option => option.optionSubCategoryId === Elevation.Detached || option.optionSubCategoryId === Elevation.Attached);
		const selectedElevation = elevations.find(elev => scenarioOptions?.find(opt => opt.edhPlanOptionId === elev.id && opt.planOptionQuantity > 0));
		const baseHouseOptions = this.getSelectedBaseHouseOptions(scenarioOptions, options, categories);

		const data = {
			scenarioId: scenarioId,
			options: this.mapScenarioOptions(
						scenarioOptions,
						options,
						selectedElevation,
						baseHouseOptions.selectedBaseHouseOptions,
						baseHousePrice,
						overrideNote),
			salePrice: salePrice
		};

		return this._http.post<ISalesAgreement>(url, data).pipe(
			map(dto => new SalesAgreement(dto)),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getSelectedBaseHouseOptions(scenarioOptions: ScenarioOption[], options: LitePlanOption[], categories: IOptionCategory[])
	{
		const baseHouseCategory = categories.find(x => x.name.toLowerCase() === "base house");
		const selectedBaseHouseOptions = options.filter(option =>
			option.optionCategoryId === baseHouseCategory?.id
			&& scenarioOptions?.find(opt => opt.edhPlanOptionId === option.id));

		return { selectedBaseHouseOptions: selectedBaseHouseOptions, baseHouseCategory: baseHouseCategory };
	}

	private mapScenarioOptions(
		scenarioOptions: ScenarioOption[],
		options: LitePlanOption[],
		selectedElevation: LitePlanOption,
		selectedBaseHouseOptions: LitePlanOption[],
		baseHousePrice: number,
		overrideNote: string
	) : Array<any>
	{
		return scenarioOptions.reduce((optionList, scenarioOption) =>
		{
			const planOption = options.find(opt => opt.id === scenarioOption.edhPlanOptionId);

			if (planOption)
			{
				let optionPrice = planOption.listPrice;
				if (!!selectedBaseHouseOptions.find(opt => opt.id === planOption.id))
				{
					optionPrice = baseHousePrice;
				}

				optionList.push({
					planOptionId: scenarioOption.edhPlanOptionId,
					price: optionPrice,
					quantity: scenarioOption.planOptionQuantity,
					optionSalesName: planOption.name,
					optionDescription: planOption.description,
					jobOptionTypeName: this.mapJobOptionType(planOption, selectedElevation, selectedBaseHouseOptions),
					overrideNote: planOption.id === selectedElevation.id ? overrideNote : null,
					colors: this.mapOptionColors(planOption, scenarioOption.scenarioOptionColors),
					action: 'Add'
				});
			}

			return optionList;
		}, []);
	}

	private mapJobOptionType(
		option: LitePlanOption,
		selectedElevation: LitePlanOption,
		selectedBaseHouseOptions: LitePlanOption[]
	) : string
	{
		let optionType = 'Standard';

		if (option.id === selectedElevation.id)
		{
			optionType = 'Elevation';
		}

		if (!!selectedBaseHouseOptions.find(opt => opt.id === option.id))
		{
			optionType = 'BaseHouse';
		}

		return optionType;
	}

	private mapOptionColors(option: LitePlanOption, optionColors: ScenarioOptionColor[]) : Array<any>
	{
		return optionColors.reduce((colorList, optionColor) =>
		{
			const colorItem = option.colorItems?.find(item => item.colorItemId === optionColor.colorItemId);
			const color = colorItem?.color?.find(c => c.colorId === optionColor.colorId);

			if (colorItem && color)
			{
				colorList.push({
					colorName: color.name,
					colorItemName: colorItem.name,
					sku: color.sku,
					action: 'Add'
				});
			}

			return colorList;
		}, []);
	}

	onGenerateSalesAgreementWithColorWarning(buildMode: string, lotStatus: string, selectedLotId: number, salesAgreementId: number)
	{
		const title = "Generate Home Purchase Agreement";
		const body = 'This House Configuration has Options selected that require a color.  Either some colors were not selected or some colors you selected have been set to inactive.  Click Continue to generate this sales agreement now, or click Cancel to select the colors for options.';
		const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };
		const secondaryButton = { text: 'Cancel', result: false, cssClass: 'btn-secondary' };

		this.showConfirmModal(body, title, primaryButton, secondaryButton).subscribe(result =>
		{
			if (result)
			{
				this.onGenerateSalesAgreement(buildMode, lotStatus, selectedLotId, salesAgreementId);
			}
		});
	}

	onGenerateSalesAgreement(buildMode: string, lotStatus: string, selectedLotId: number, salesAgreementId: number)
	{
		if (buildMode === 'spec' || buildMode === 'model')
		{
			if (buildMode === 'model' && lotStatus === 'Available')
			{
				const title = 'Create Model';
				const body = 'The Lot Status for this model will be set to UNAVAILABLE.';
				const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };

				this.showConfirmModal(body, title, primaryButton).subscribe(result =>
				{
					this.lotService.buildScenario();
				});
			}
			else if (buildMode === 'model' && lotStatus === 'PendingRelease')
			{
				this.lotService.getLotReleaseDate(selectedLotId).pipe(
					switchMap((releaseDate) =>
					{
						const title = 'Create Model';
						const body = 'The selected lot is scheduled to be released on ' + releaseDate + '. <br><br> If you continue, the lot will be removed from the release and the Lot Status will be set to UNAVAILABLE.';

						const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };
						const secondaryButton = { text: 'Cancel', result: false, cssClass: 'btn-secondary' };

						return this.showConfirmModal(body, title, primaryButton, secondaryButton);
					})).subscribe(result =>
					{
						if (result)
						{
							this.lotService.buildScenario();
						}
					});
			}
			else
			{
				this.lotService.buildScenario();
			}
		}
		else if (salesAgreementId)
		{
			this.router.navigateByUrl(`/point-of-sale/people/${salesAgreementId}`);
		}
		else
		{
			const title = 'Generate Home Purchase Agreement';
			const body = 'You are about to generate an Agreement for your configuration. Do you wish to continue?';

			const primaryButton = { text: 'Continue', result: true, cssClass: 'btn-primary' };
			const secondaryButton = { text: 'Cancel', result: false, cssClass: 'btn-secondary' };

			this.showConfirmModal(body, title, primaryButton, secondaryButton).subscribe(result =>
			{
				if (result)
				{
					this.lotService.buildScenario();
				}
			});
		}
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

	getSelectedOptions(options: LitePlanOption[], job: Job, changeOrder?: ChangeOrderGroup ): Array<ScenarioOption>
	{
		let selectedOptions: JobPlanOption[] = _.cloneDeep(job.jobPlanOptions);

		const jobChangeOrderPlanOptions = changeOrder?.id
			? this.changeOrderService.getJobChangeOrderPlanOptions(changeOrder)
			: [];

		if (jobChangeOrderPlanOptions.length)
		{
			// Delete options
			selectedOptions = selectedOptions.filter(option => !jobChangeOrderPlanOptions.filter(opt => opt.action === 'Delete').some(opt => opt.planOptionId === option.planOptionId));

			// Add options
			selectedOptions = [
				...selectedOptions,
				...jobChangeOrderPlanOptions.filter(option => option.action === 'Add').map(opt =>
					{
						return <JobPlanOption> {
							id: opt.id,
							planOptionId: opt.planOptionId,
							listPrice: opt.listPrice,
							optionSalesName: opt.optionSalesName,
							optionDescription: opt.optionDescription,
							integrationKey: opt.integrationKey,
							optionQty: opt.qty,
							jobPlanOptionAttributes: opt.jobChangeOrderPlanOptionAttributes?.length
								? opt.jobChangeOrderPlanOptionAttributes.map(a => new JobPlanOptionAttribute(<JobPlanOptionAttribute>{
									id: a.id,
									attributeGroupLabel: a.attributeGroupLabel,
									attributeName: a.attributeName,
									manufacturer: a.manufacturer,
									sku: a.sku
								}))
								: []
						};
					})
			];

			// Update options
			jobChangeOrderPlanOptions.filter(option => option.action === 'Change').forEach(opt =>
			{
				let changedOption = selectedOptions.find(selectedOption => selectedOption.planOptionId === opt.planOptionId);

				if (changedOption)
				{
					this.mergeSelectedOptionAttributes(changedOption, opt);

					changedOption.optionQty = opt.qty;
				}
			});


		}

		return selectedOptions.map(planOption => {
			const option = options.find(opt => opt.id === planOption.planOptionId);

			return {
				scenarioOptionId: 0,
				scenarioId: 0,
				edhPlanOptionId: planOption.planOptionId,
				planOptionQuantity: planOption.optionQty,
				scenarioOptionColors: this.mapSelectedOptionColors(
					option,
					planOption.jobPlanOptionAttributes
				)
			} as ScenarioOption;
		});
	}

	mergeSelectedOptionAttributes(jobPlanOption: JobPlanOption, changeOrderPlanOption: ChangeOrderPlanOption)
	{
		const deletedAttributes = changeOrderPlanOption.jobChangeOrderPlanOptionAttributes.filter(x => x.action === 'Delete');

		deletedAttributes.forEach(attr =>
		{
			const deletedAttribute = jobPlanOption.jobPlanOptionAttributes.findIndex(
				d => d.attributeGroupLabel === attr.attributeGroupLabel && d.attributeName === attr.attributeName);

			if (deletedAttribute > -1)
			{
				jobPlanOption.jobPlanOptionAttributes.splice(deletedAttribute, 1);
			}
		});

		const addedAttributes = changeOrderPlanOption.jobChangeOrderPlanOptionAttributes.filter(x => x.action === 'Add');

		addedAttributes.forEach(attr =>
		{
			jobPlanOption.jobPlanOptionAttributes.push(
				new JobPlanOptionAttribute(<JobPlanOptionAttribute>{
					id: attr.id,
					attributeGroupLabel: attr.attributeGroupLabel,
					attributeName: attr.attributeName,
					manufacturer: attr.manufacturer,
					sku: attr.sku
				})
			);
		});
	}

	mapSelectedOptionColors(option: LitePlanOption, optionAttributes: JobPlanOptionAttribute[]): Array<ScenarioOptionColor>
	{
		return option && optionAttributes
			? optionAttributes.reduce((colorList, att) =>
				{
					const attributeGroupLabel = att.attributeGroupLabel;
					const attributeName = att.attributeName;

					const colorItem = option.colorItems?.find(item => item.name === attributeGroupLabel);
					const color = colorItem?.color?.find(c => c.name === attributeName);

					if (colorItem && color)
					{
						colorList.push({
							scenarioOptionColorId: 0,
							scenarioOptionId: 0,
							colorItemId: colorItem.colorItemId,
							colorId: color.colorId
						});
					}

					return colorList;
				}, [])
			: [];
	}

	getLiteSelectionSummaryReport(reportType: LiteReportType, summaryRptData: SummaryReportData): Observable<string>
	{
		const action = this.getSummaryAction(reportType);
		const url = `${environment.apiUrl}${action}`;
		const headers = new HttpHeaders({
			'Content-Type': 'application/json',
			'Accept': 'application/pdf'
		});

		let data = {};
		data = {summaryRptData: summaryRptData};

		return withSpinner(this._http).post(url, data, { headers: headers, responseType: 'blob' }).pipe(
			map(response =>
			{
				return window.URL.createObjectURL(response);
			}),
		);
	}

	getSelectionSummary(reportType: LiteReportType, summaryData: SummaryData, showSalesDescription?: boolean): Observable<string>
	{
		const action = this.getSummaryAction(reportType);
		const url = `${environment.apiUrl}${action}`;
		const headers = new HttpHeaders({
			'Content-Type': 'application/json',
			'Accept': 'application/pdf'
		});

		let data = {};

		switch(reportType)
		{
			case LiteReportType.PRICE_LIST:
			case LiteReportType.PRICE_LIST_WITH_SALES_DESCRIPTION:
				if (typeof showSalesDescription === 'undefined')
				{
					return _throw('no value was provided for the showSalesDescription parameter in the getSelectionSummary function');
				}
				else
				{
					data = { summaryData, showSalesDescription };
				}

				break;

			default:
				data = {summaryData: summaryData};
				break;
		}

		return withSpinner(this._http).post(url, data, { headers: headers, responseType: 'blob' }).pipe(
			map(response =>
			{
				return window.URL.createObjectURL(response);
			}),
		);
	}

	private getSummaryAction(reportType: LiteReportType): string
	{
		switch (reportType)
		{
			case LiteReportType.PRICE_LIST:
			case LiteReportType.PRICE_LIST_WITH_SALES_DESCRIPTION:
				return 'GetPriceList';
			case LiteReportType.SUMMARY:
				return 'GetLiteSelectionSummaryReport';
		}
	}

	hasLiteMonotonyConflict(): Observable<MonotonyConflict> {
		return this.store.pipe(
			select(state => state.org),
			switchMap(org => {
				//TODO: check if it's a Job change order
				this.store.dispatch(new LiteActions.LoadLiteMonotonyRules(org.salesCommunity.id));

				return this.actions.pipe(
					ofType<LiteActions.LiteMonotonyRulesLoaded>(LiteActions.LiteActionTypes.LiteMonotonyRulesLoaded),
					switchMap(() => this.store.pipe(
						select(fromRoot.liteMonotonyConflict)
					)),
					take(1)
				);
			}),
			take(1)
		);
	}

	getMonotonyRulesForLiteSalesCommunity(salesCommunityId: number, skipSpinner: boolean = true): Observable<Array<LiteMonotonyRule>> {
		const url = `${environment.apiUrl}GetMonotonyRulesForLiteSalesCommunity(id=${salesCommunityId})`;

		return (skipSpinner ? this._http : withSpinner(this._http)).get<any>(url).pipe(
			map(response => {
				return response.value as Array<LiteMonotonyRule>;
			}),
			defaultOnNotFound('getMonotonyRulesForLiteSalesCommunity', [])
		);
	}

	createJobChangeOrderLite(data: any, changePrice: number): Observable<ChangeOrderGroup>
	{
		let url = environment.apiUrl + `CreateOrUpdateChangeOrderLite`;

		return withSpinner(this._http).post(url, { changeOrderDto: data, changePrice: changePrice }).pipe(
			tap(response => response['@odata.context'] = undefined),
			map((response: ChangeOrderGroup) =>
			{
				return new ChangeOrderGroup(response as ChangeOrderGroup);
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

	getJobChangeOrderInputDataLite(
		changeOrder: ChangeOrderGroup,
		job: Job,
		handing: ChangeOrderHanding,
		salesAgreementId: number,
		currentOptions: ScenarioOption[],
		options: LitePlanOption[],
		overrideNote: string,
		isJio: boolean = false): any
	{
		const origOptions = isJio ? [] : job.jobPlanOptions;
		const origHanding = isJio ? '' : job.handing;

		return {
			changeOrderGroupId: changeOrder.id,
			changeOrderType: 'Construction',
			jobId: job.id,
			salesAgreementId: salesAgreementId,
			description: changeOrder.jobChangeOrderGroupDescription,
			note: changeOrder.note ? changeOrder.note.noteContent : null,
			overrideNote: changeOrder.overrideNote,
			options: this.createJobChangeOrderOptions(
				origOptions,
				currentOptions,
				options,
				overrideNote
			),
			handings: this.changeOrderService.createJobChangeOrderHandings(handing, origHanding),
			changeOrderGroupSequence: changeOrder.changeOrderGroupSequence,
			changeOrderGroupSequenceSuffix: changeOrder.changeOrderGroupSequenceSuffix
		};
	}

	private createJobChangeOrderOptions(
		origOptions: JobPlanOption[],
		currentOptions: ScenarioOption[],
		options: LitePlanOption[],
		overrideNote: string
	): Array<any>
	{
		const isElevationOption = function(planOptionId: number)
		{
			return !!options.find(opt => opt.id  === planOptionId &&
				(opt.optionSubCategoryId === Elevation.Detached || opt.optionSubCategoryId === Elevation.Attached));
		};

		let optionsDto = [];

		// Loop through selected options to find new or changed options
		currentOptions.forEach(curr => {
			const origOption = origOptions.find(orig => orig.planOptionId === curr.edhPlanOptionId);
			const option = options.find(option => option.id === curr.edhPlanOptionId);
			const isElevation = isElevationOption(curr.edhPlanOptionId);
			const optionType = isElevation ? 'Elevation' : (option.isBaseHouse ? 'BaseHouse' : 'Standard');

			if (origOption)
			{
				// change existing option
				const currentAttributes = this.mapScenarioOptionColorsToAttributes(curr?.scenarioOptionColors, option, null);
				const existingAttributes = this.mapJobPlanOptionAttributes(origOption?.jobPlanOptionAttributes, null);
				const attributes = this.buildAttributeDifference(currentAttributes, existingAttributes);

				if (attributes.length || option.listPrice !== origOption.listPrice || curr.planOptionQuantity !== origOption.optionQty)
				{
					optionsDto.push({
						planOptionId: curr.edhPlanOptionId,
						price: option.listPrice,
						quantity: curr.planOptionQuantity,
						optionSalesName: option.name,
						optionDescription: option.description,
						jobOptionTypeName: optionType,
						overrideNote: overrideNote,
						action: 'Change',
						isElevation: isElevation,
						attributes: attributes
					});
				}
			}
			else if (option)
			{
				// add new option
				optionsDto.push({
					planOptionId: curr.edhPlanOptionId,
					price: option.listPrice,
					quantity: curr.planOptionQuantity,
					optionSalesName: option.name,
					optionDescription: option.description,
					jobOptionTypeName: optionType,
					overrideNote: overrideNote,
					action: 'Add',
					isElevation: isElevation,
					attributes: this.mapScenarioOptionColorsToAttributes(curr?.scenarioOptionColors, option, 'Add')
				});
			}
		});

		origOptions.forEach(orig => {
			const currentOption = currentOptions.find(curr => curr.edhPlanOptionId === orig.planOptionId);

			if (!currentOption)
			{
				// delete option if it is not currently selected
				optionsDto.push({
					planOptionId: orig.planOptionId,
					price: orig.listPrice,
					quantity: orig.optionQty,
					optionSalesName: orig.optionSalesName,
					optionDescription: orig.optionDescription,
					jobOptionTypeName: orig.jobOptionTypeName,
					action: 'Delete',
					isElevation: isElevationOption(orig.planOptionId),
					attributes: this.mapJobPlanOptionAttributes(orig.jobPlanOptionAttributes, 'Delete')
				});
			}
		});

		return optionsDto;
	}

	private mapScenarioOptionColorsToAttributes(
		scenarioOptionColors: ScenarioOptionColor[],
		option: LitePlanOption,
		action: string): Array<any>
	{
		const attributesDto: Array<any> = [];

		if (scenarioOptionColors)
		{
			scenarioOptionColors.forEach(optColor =>
			{
				const colorItem = option.colorItems?.find(item => item.colorItemId === optColor.colorItemId);
				const color =  colorItem?.color.find(cl => cl.colorId === optColor.colorId);

				attributesDto.push({
					attributeName: color?.name,
					attributeGroupLabel: colorItem?.name,
					sku: color?.sku,
					manufacturer: null,
					action: action
				});
			});
		}

		return attributesDto;
	}

	private mapJobPlanOptionAttributes(jobPlanOptionAttributes: Array<JobPlanOptionAttribute>, action: string): Array<any>
	{
		const attributesDto: Array<any> = [];

		if (jobPlanOptionAttributes)
		{
			jobPlanOptionAttributes.forEach(att =>
			{
				attributesDto.push({
					attributeName: att.attributeName,
					attributeGroupLabel: att.attributeGroupLabel,
					sku: att.sku,
					manufacturer: att.manufacturer,
					action: action
				});
			});
		}

		return attributesDto;
	}

	private buildAttributeDifference(currentAttributes: Array<any>, existingAttributes: Array<any>): Array<any>
	{
		let attributes = [];

		currentAttributes.forEach(attr =>
		{
			const existingAttr = existingAttributes.find(ex =>
				ex.attributeName === attr.attributeName &&
				ex.attributeGroupLabel === attr.attributeGroupLabel);

			if (!existingAttr)
			{
				attributes.push({ ...attr, action: 'Add' });
			}
		});

		existingAttributes.forEach(ex =>
		{
			const currentAttr = currentAttributes.find(attr =>
				ex.attributeName === attr.attributeName &&
				ex.attributeGroupLabel === attr.attributeGroupLabel);

			if (!currentAttr)
			{
				attributes.push({ ...ex, action: 'Delete' });
			}
		});

		return attributes;
	}

	checkLiteAgreement(job: Job, changeOrder: ChangeOrderGroup): boolean {
		const changeOrderChoices = changeOrder?.jobChangeOrders
			? _.flatMap(changeOrder.jobChangeOrders, co => co.jobChangeOrderChoices)
			: [];
		const changeOrderOptions = changeOrder?.jobChangeOrders
			? _.flatMap(changeOrder.jobChangeOrders, co => co.jobChangeOrderPlanOptions)
			: [];

			return !job.jobChoices?.length && !!job.jobPlanOptions?.length // there are no job choices but job plan options
			|| !changeOrderChoices.length && !!changeOrderOptions.length // there are no change order choices but change order options
				&& !job.jobChoices?.length && !job.jobPlanOptions?.length;
	}

	checkLiteScenario(scenarioChoices: SelectedChoice[], scenarioOptions: ScenarioOption[]): boolean {
		return !scenarioChoices?.length && !!scenarioOptions?.length; // no scenario choices (full) but scenarion options (lite) is lite
	}

	liteChangeOrderHasChanges(
		isPhdLite: boolean,
		job: Job,
		currentChangeOrder: ChangeOrderGroup,
		changeInput: ChangeInput,
		salesAgreement: SalesAgreement,
		currentOptions: ScenarioOption[],
		options: LitePlanOption[],
		overrideNote: string
	): boolean
	{
		if (isPhdLite && changeInput.type !== ChangeTypeEnum.SALES && changeInput.type !== ChangeTypeEnum.NON_STANDARD)
		{
			const inputData = this.getJobChangeOrderInputDataLite(
				currentChangeOrder,
				job,
				changeInput.handing,
				salesAgreement.id,
				currentOptions,
				options,
				overrideNote
			);

			const data = this.changeOrderService.mergePosData(
				inputData,
				currentChangeOrder,
				salesAgreement,
				changeInput,
				job.id
			);

			return data.options && data.options.length;
		}

		return false;
	}

	setOptionsIsPastCutOff(options: LitePlanOption[], job: Job): void
	{
		let jobStageId = job && job.constructionStageName != null ? ConstructionStageTypes[job.constructionStageName] : null;
		let jobStartDate = job ? job.startDate : null; // example: jobStartDate = 02/20/2019

		options.forEach(option =>
		{
			if (option.cutOffStage != null || option.cutOffDays != null)
			{
				let optionStageId = ConstructionStageTypes[option.cutOffStage];
				if (optionStageId != null && jobStageId != null)
				{
					// check if they have passed the stage cut off point
					option.isPastCutOff = jobStageId >= optionStageId;
				}
				else if (option.cutOffDays != null && jobStartDate != null)
				{
					const now = moment(); // example: now = 02/27/2019
					const dateDiff = now.diff(jobStartDate, 'days'); // example: dateDiff = 7

					// check if they have passed the date cut off point.
					option.isPastCutOff = option.cutOffDays <= dateDiff; // example:  10 < 7 = False
				}
			}
		});
	}

	createJioForSpecLite(scenario: Scenario,
						 scenarioOptions: ScenarioOption[],
						 financialCommunityId: number,
						 buildMode: string,
						 options: LitePlanOption[],
						 selectedElevation: LitePlanOption,
						 skipSpinner: boolean = true): Observable<Job>
	{
		const action = `CreateJIOForSpecLite`;
		const url = `${environment.apiUrl}${action}`;
		const selectedOptions = options.filter(o => scenarioOptions.some(so => so.edhPlanOptionId === o.id));
		const baseHouseOptions = selectedOptions.filter(x => x.isBaseHouse);
		const liteOptions = selectedOptions.map(selectedOption => {

			const jobOptionType = this.mapJobOptionType(selectedOption, selectedElevation, baseHouseOptions);
			const optionColors = this.mapOptionColors(selectedOption, scenarioOptions.find(x => x.edhPlanOptionId === selectedOption.id).scenarioOptionColors);

			return {
				planOptionId: selectedOption.id,
				price: selectedOption.listPrice,
				quantity: scenarioOptions.find(x => x.edhPlanOptionId === selectedOption.id).planOptionQuantity,
				optionSalesName: selectedOption.name,
				optionDescription: selectedOption.description,
				jobOptionTypeName: jobOptionType,
				overrideNote: '',
				colors: optionColors,
				action: 'Add'
			}
		});

		const data = {
			litePlanOptions: liteOptions,
			lotInfo: {
				communityId: financialCommunityId,
				lotId: scenario.lotId,
				planId: scenario.planId,
				handing: scenario.handing ? scenario.handing.handing : null,
				buildMode: buildMode
			}
		};

		return (skipSpinner ? this._http : withSpinner(this._http)).post(url, data).pipe(
			map((results: IJob) => new Job(results)),
			catchError(error =>
			{
				console.error(error);
				return _throw(error);
			})
		);
	}
	getPlanChangeOrderDataLite(
		changeOrder: ChangeOrderGroup,
		job: Job,
		selectedPlanId: number,
		salesAgreementId: number,
		currentOptions: ScenarioOption[],
		options: LitePlanOption[],
		overrideNote: string
	): any
	{
		let plans = [];

		if (selectedPlanId && selectedPlanId !== job.planId)
		{
			let addId = 0;
			let deleteId = 0;

			if (changeOrder.jobChangeOrders && changeOrder.jobChangeOrders.length)
			{
				const planChangeOrder = changeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'Plan');

				if (planChangeOrder)
				{
					const changeOrderPlans = changeOrder.jobChangeOrders[0].jobChangeOrderPlans;

					if (changeOrderPlans && changeOrderPlans.length)
					{
						const addedPlan = changeOrderPlans.find(x => x.action === 'Add');

						addId = addedPlan ? addedPlan.id : 0;

						const deletedPlan = changeOrderPlans.find(x => x.action === 'Delete');

						deleteId = deletedPlan ? deletedPlan.id : 0;
					}
				}
			}

			plans.push({
				id: addId,
				planCommunityId: selectedPlanId,
				action: 'Add'
			});

			plans.push({
				id: deleteId,
				planCommunityId: job.planId,
				action: 'Delete'
			});
		}

		return {
			changeOrderGroupId: changeOrder.id,
			changeOrderType: 'Plan',
			jobId: job.id,
			salesAgreementId: salesAgreementId,
			description: changeOrder.jobChangeOrderGroupDescription,
			note: changeOrder.note ? changeOrder.note.noteContent : null,
			overrideNote: changeOrder.overrideNote,
			changeOrderGroupSequence: changeOrder.changeOrderGroupSequence,
			changeOrderGroupSequenceSuffix: changeOrder.changeOrderGroupSequenceSuffix,
			plans: plans,
			options: this.createPlanChangeOrderOptions(
				job.jobPlanOptions,
				currentOptions,
				options,
				overrideNote
			)
		};
	}

	private createPlanChangeOrderOptions(
		origOptions: JobPlanOption[],
		currentOptions: ScenarioOption[],
		options: LitePlanOption[],
		overrideNote: string
	): Array<any>
	{
		const isElevationOption = function(planOptionId: number)
		{
			return !!options.find(opt => opt.id  === planOptionId &&
				(opt.optionSubCategoryId === Elevation.Detached || opt.optionSubCategoryId === Elevation.Attached));
		};

		let optionsDto = [];

		// Add options selected in the new plan
		currentOptions.forEach(curr => {
			const option = options.find(option => option.id === curr.edhPlanOptionId);
			if (option)
			{
				const isElevation = isElevationOption(curr.edhPlanOptionId);
				const optionType = isElevation ? 'Elevation' : (option.isBaseHouse ? 'BaseHouse' : 'Standard');
	
				optionsDto.push({
					planOptionId: curr.edhPlanOptionId,
					price: option.listPrice,
					quantity: curr.planOptionQuantity,
					optionSalesName: option.name,
					optionDescription: option.description,
					jobOptionTypeName: optionType,
					overrideNote: overrideNote,
					action: 'Add',
					isElevation: isElevation,
					attributes: this.mapScenarioOptionColorsToAttributes(curr?.scenarioOptionColors, option, 'Add')
				});
			}
		});

		// Remove options selected in the old plan
		origOptions.forEach(orig => {
			optionsDto.push({
				planOptionId: orig.planOptionId,
				price: orig.listPrice,
				quantity: orig.optionQty,
				optionSalesName: orig.optionSalesName,
				optionDescription: orig.optionDescription,
				jobOptionTypeName: orig.jobOptionTypeName,
				action: 'Delete',
				isElevation: isElevationOption(orig.planOptionId),
				attributes: this.mapJobPlanOptionAttributes(orig.jobPlanOptionAttributes, 'Delete')
			});
		});

		return optionsDto;
	}
}
