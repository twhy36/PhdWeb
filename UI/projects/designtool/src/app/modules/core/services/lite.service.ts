import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from "@angular/router";
import { Observable, throwError as _throw } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import * as _ from 'lodash';

import { environment } from '../../../../environments/environment';

import
{
	withSpinner, getNewGuid, createBatchGet, createBatchHeaders, createBatchBody,
	SalesAgreement, ISalesAgreement, ModalService, Job, ChangeOrderGroup, JobPlanOptionAttribute,
	ChangeOrderPlanOptionAttribute, JobPlanOption, ChangeOrderPlanOption, SummaryData
} from 'phd-common';

import {
	LitePlanOption, ScenarioOption, ColorItem, Color, ScenarioOptionColorDto, IOptionSubCategory, OptionRelation,
	OptionRelationEnum, ScenarioOptionColor, Elevation, IOptionCategory, LiteReportType
} from '../../shared/models/lite.model';
import { LotService } from './lot.service';
import { ChangeOrderService } from './change-order.service';

@Injectable()
export class LiteService
{
	private _ds: string = encodeURIComponent("$");

    constructor(
		private _http: HttpClient,
		private router: Router,
		private lotService: LotService,
		private changeOrderService: ChangeOrderService,
		private modalService: ModalService
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
		const select = `id, planId, optionCommunity, maxOrderQty, listPrice, isActive, isBaseHouse, isBaseHouseElevation`;

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
						cantHavePlanOptionIds: []
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
			scenarioOptionColors: optionColors
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
		salePrice: number
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
						baseHouseOptions.selectedBaseHouseOptions),
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
			option.optionCategoryId === baseHouseCategory.id
			&& scenarioOptions?.find(opt => opt.edhPlanOptionId === option.id));

		return { selectedBaseHouseOptions: selectedBaseHouseOptions, baseHouseCategory: baseHouseCategory };
	}

	private mapScenarioOptions(
		scenarioOptions: ScenarioOption[],
		options: LitePlanOption[],
		selectedElevation: LitePlanOption,
		selectedBaseHouseOptions: LitePlanOption[]
	) : Array<any>
	{
		return scenarioOptions.reduce((optionList, scenarioOption) =>
		{
			const planOption = options.find(opt => opt.id === scenarioOption.edhPlanOptionId);

			if (planOption)
			{
				optionList.push({
					planOptionId: scenarioOption.edhPlanOptionId,
					price: planOption.listPrice,
					quantity: scenarioOption.planOptionQuantity,
					optionSalesName: planOption.name,
					optionDescription: planOption.description,
					jobOptionTypeName: this.mapJobOptionType(planOption, selectedElevation, selectedBaseHouseOptions),
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
		let planOptions: (JobPlanOption | ChangeOrderPlanOption)[] = [
			...job.jobPlanOptions,
			...(changeOrder ? this.changeOrderService.getJobChangeOrderPlanOptions(changeOrder) : [])
		];

		return planOptions.map(planOption => {
			const option = options.find(opt => opt.id === planOption.planOptionId);

			return {
				scenarioOptionId: 0,
				scenarioId: 0,
				edhPlanOptionId: planOption.planOptionId,
				planOptionQuantity: planOption instanceof JobPlanOption ? planOption.optionQty : planOption.qty,
				scenarioOptionColors: this.mapSelectedOptionColors(
					option,
					planOption instanceof JobPlanOption ? planOption.jobPlanOptionAttributes : planOption.jobChangeOrderPlanOptionAttributes
				)
			};
		});
	}

	mapSelectedOptionColors(option: LitePlanOption, optionAttributes: (JobPlanOptionAttribute | ChangeOrderPlanOptionAttribute)[]): Array<ScenarioOptionColor>
	{
		return option && optionAttributes
			? optionAttributes.reduce((colorList, att) =>
				{
					const attributeGroupLabel = att instanceof JobPlanOptionAttribute
						? att.attributeGroupLabel
						: att['attributeGroupLabel'];
					const attributeName = att instanceof JobPlanOptionAttribute
						? att.attributeName
						: att['attributeName'];

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
		}
	}
}
