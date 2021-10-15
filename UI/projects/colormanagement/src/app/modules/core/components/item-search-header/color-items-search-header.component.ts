import { Component, OnInit, ViewChild } from '@angular/core';
import { UnsubscribeOnDestroy, ModalRef, ModalService } from 'phd-common';
import { IPlanCommunity, IOptionCommunity, IPlanOptionCommunityDto, IPlanOptionCommunity, IPlanOptionCommunityGridDto } from '../../../shared/models/community.model';
import { OrganizationService } from '../../services/organization.service';
import { PlanOptionService } from '../../services/plan-option.service';
import { Observable, of } from 'rxjs';
import { filter, map, switchMap, flatMap } from 'rxjs/operators';
import { ColorService } from '../../../core/services/color.service';
import { SettingsService } from '../../services/settings.service';
import { Settings } from '../../../shared/models/settings.model';
import * as _ from 'lodash';
import { IColorItemDto } from '../../../shared/models/colorItem.model';

@Component({
	selector: 'color-items-search-header',
	templateUrl: './color-items-search-header.component.html',
	styleUrls: ['./color-items-search-header.component.scss']
})
export class ColorItemsSearchHeaderComponent
	extends UnsubscribeOnDestroy
	implements OnInit {
	planCommunityList$: Observable<Array<IPlanCommunity>>;
	planCommunityList: Array<IPlanCommunity>;
	currentFinancialCommunityId: number;
	selectedPlans: Array<number> = [];
	planOptionList: Array<IOptionCommunity>;
	optionListIndex: number;
	planOptionDtosList: Array<IPlanOptionCommunityGridDto> = [];
	currentOption: IOptionCommunity = null;
	isActiveColor: boolean = null;
	colorItemDtolist: IColorItemDto[];
	settings: Settings;
	allDataLoaded: boolean;
	currentPage: number = 0;
	isLoading: boolean = true;
	skip: number;
	selectedplanids = null;
	pageNumber: number = 1;
	planOptionHasNoColorItem: boolean;
	modalReference: ModalRef;
	disableAddColorItemButton: boolean = true;
	@ViewChild('addColorItemModal') addColorItemModal: any;

	constructor(
		private _orgService: OrganizationService,
		private _planService: PlanOptionService,
		private _colorService: ColorService,
		private _settingsService: SettingsService,
		private _modalService: ModalService
	) {
		super();
	}

	ngOnInit() {
		this.settings = this._settingsService.getSettings();

		this.planCommunityList$ = this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			filter((comm) => !!comm),
			switchMap((comm) => {
				this.reset();
				this.selectedPlans = [];
				this.currentFinancialCommunityId = comm.id;
				return this._planService.getPlanCommunities(this.currentFinancialCommunityId).pipe(
					map((plans) => {
						return [
							{ planSalesName: 'All Plans', id: 0 },
							...plans
						];
					})
				)
			})
		);

		this.planCommunityList$.subscribe((plans) => {
			this.planCommunityList = plans;
		})
	}

	reset() {
		this.skip = 0;
		this.planOptionDtosList = [];
		this.currentOption = null;
		this.planOptionList = [];
		this.currentPage = 0;
		this.pageNumber = 1;
		this.optionListIndex = -1;
	}

	onShowOptions() {

		this.reset();
		this.selectedplanids = null;
		// if >= 0 means user selected all plans
		// if -1 means user selected individual plans
		if (this.selectedPlans?.findIndex(x => x == 0) == -1) {
			this.selectedplanids = this.selectedPlans;
		}

		this._planService
			.getPlanOptions(this.currentFinancialCommunityId, this.selectedplanids)
			.subscribe((options) => {
				this.planOptionList = options;
			});
	}

	showAddColorItemDialog() {
		this.modalReference = this._modalService.open(this.addColorItemModal);
		this.modalReference.result.catch(err => console.log(err));
	}

	loadColorItemsGrid() {
		if (this.currentOption) {
			//Case when all Options, get coloritems for each option.
			if (!this.currentOption?.id) {
				this.optionListIndex++;
				let list = this.planOptionList[this.optionListIndex].planOptionCommunities.map((planoption: IPlanOptionCommunity) => {
					let planOptionDto: IPlanOptionCommunityDto = {
						planCommunity: {
							id: planoption.planId,
							planSalesName: this.planCommunityList.find((plan) => plan.id == planoption.planId)?.planSalesName
						},
						optionCommunityId: this.planOptionList[this.optionListIndex].id,
						optionSalesName: this.planOptionList[this.optionListIndex].optionSalesName,
						planOptionId: planoption.id,
						colorItem: null,
						isBaseHouse: planoption.isBaseHouse
					}
					return planOptionDto;
				}) as Array<IPlanOptionCommunityDto>;
				//Get coloritems for each optionCommunity.
				this.getColorItemsForOption(list);
			}
			else {
				let list = this.currentOption?.planOptionCommunities.map((planoption: IPlanOptionCommunity) => {
					let planOptionDto: IPlanOptionCommunityDto = {
						planCommunity: {
							id: planoption.planId,
							planSalesName: this.planCommunityList.find((plan) => plan.id == planoption.planId)?.planSalesName
						},
						optionCommunityId: this.currentOption.id,
						optionSalesName: this.currentOption.optionSalesName,
						planOptionId: planoption.id,
						colorItem: null,
						isBaseHouse: planoption.isBaseHouse
					}
					return planOptionDto;
				}) as Array<IPlanOptionCommunityDto>;
				//Get coloritems for each optionCommunity.
				this.getColorItemsForOption(list);
			}
		}
	}

	getColorItemsForOption(planoptionDto: IPlanOptionCommunityDto[]) {
		this._colorService.getPlanOptionAssocColorItems
			(this.currentFinancialCommunityId,
				planoptionDto.map(planoption => planoption.planOptionId),
				this.isActiveColor
			)
			.pipe(
				map((colorItemDtos) => {
					planoptionDto.forEach(element => {
						element.colorItem = colorItemDtos?.find(coloritem => coloritem.edhPlanOptionId === element.planOptionId);
					});
					return planoptionDto;
				})
			).subscribe((planOptionDtos) => {
				this.currentPage++;
				this.allDataLoaded = planOptionDtos.length < this.settings.infiniteScrollPageSize && this.optionListIndex === this.planOptionList.length;
				if (planOptionDtos.filter(x => x.colorItem)?.length > 0) {
					this.planOptionHasNoColorItem = false;
				}
				else {
					this.planOptionHasNoColorItem = true;
				}
				planOptionDtos = planOptionDtos.filter(x => !!x.colorItem);	
				if (planOptionDtos.length > 0) {
					let groupByColorItemName = _.groupBy(planOptionDtos.filter(x => x.isBaseHouse === false), c => c.colorItem.name);
					let planOptionGridList = [];
					for (const key in groupByColorItemName) {
						if (groupByColorItemName.hasOwnProperty(key)) {
							let item = groupByColorItemName[key];
							let planOptiongrid: IPlanOptionCommunityGridDto =
							{
								planOptionId: item[0].planOptionId,
								planCommunity: item.map(x => x.planCommunity).sort((a,b)=>a.planSalesName.localeCompare(b.planSalesName)),
								optionCommunityId: item[0].optionCommunityId,
								optionSalesName: item[0].optionSalesName,
								colorItem: item.map(x => x.colorItem),
								hasSalesAgreement:null,
								hasConfig:null
							}
							planOptionGridList.push(planOptiongrid);
						}
					}
					let planOptionBaseHouse = planOptionDtos.filter(x => x.isBaseHouse);
					planOptionBaseHouse.map((item) => {
						let planOptiongrid: IPlanOptionCommunityGridDto =
						{
							planOptionId: item.planOptionId,
							planCommunity: [item.planCommunity],
							optionCommunityId: item.optionCommunityId,
							optionSalesName: item.optionSalesName,
							colorItem: [item.colorItem],
							hasSalesAgreement:null,
							hasConfig:null
						}
						planOptionGridList.push(planOptiongrid);
					});
					this.planOptionDtosList = [...this.planOptionDtosList, ...planOptionGridList];					
					let expectedListLength = this.pageNumber * this.settings.infiniteScrollPageSize;
					if (this.planOptionDtosList.length < expectedListLength && !this.allDataLoaded && !this.currentOption?.id) {
						this.onPanelScroll();
					}
					else if (this.planOptionDtosList.length >= expectedListLength && !this.allDataLoaded && !this.currentOption?.id) {
						this.pageNumber++;
						this.getSalesagreementOrConfig(this.planOptionDtosList);	
					}
					else
					{
						this.getSalesagreementOrConfig(this.planOptionDtosList);	
					}
				}
				else if (!this.allDataLoaded && !this.currentOption?.id) {
					this.onPanelScroll();
				}

				if (this.allDataLoaded) {
					this.processAddColorItemButtonState();					
				}
			});

	}
	getSalesagreementOrConfig(gridlist:IPlanOptionCommunityGridDto[])
	{
		this._colorService.getSalesAgreementForGrid(gridlist,this.currentFinancialCommunityId).subscribe((result)=>
		{
			result.map((item:IPlanOptionCommunityGridDto) => {
				this.planOptionDtosList.find(c =>c.planOptionId === item.planOptionId).hasSalesAgreement = item.hasSalesAgreement;
			});
		});
		this._colorService.getconfigForGrid(gridlist,this.currentFinancialCommunityId).subscribe((result)=>
		{
			result.map((item:IPlanOptionCommunityGridDto) => {
				this.planOptionDtosList.find(c =>c.planOptionId === item.planOptionId).hasConfig = item.hasConfig;
			});
		});			
	}
	onPanelScroll()
	{
		this.isLoading = true;
		this.skip = this.currentPage * this.settings.infiniteScrollPageSize;
		this.loadColorItemsGrid();
	}

	onActiveColorChange() {
		this.planOptionDtosList = [];
		this.skip = 0;
		this.optionListIndex = -1;
		this.currentPage = 0;
		this.pageNumber = 1;
		this.loadColorItemsGrid();
	}

	onChangeOption() {
		this.planOptionDtosList = [];
		this.skip = 0;
		this.currentPage = 0;
		this.pageNumber = 1;
		this.optionListIndex = -1;
		this.loadColorItemsGrid();
	}

	private processAddColorItemButtonState() {
		// 1. DONE. Add Color Item button is DISABLED unless a specific Option is chosen in criteria (which initiates search per prior story)
		// 2. DONE. Add Color Item button is DISABLED if the Option "All" was used in search criteria.
		// 3. if 0 results in the grid after search is done, button is enabled (provided 'All' was not the option chosen)
		// 4. if the option is an elevation option and any plans for the elevation option don't have an active color item,
		//		then the button is enabled, otherwise it is disabled (because all plans for elevation option already have an active color item)
		//		because:  only 1 active color item is allowed for an elevation/plan/option

		// Default is disabled
		this.disableAddColorItemButton = true;

		if (this.currentOption.id > 0) {
			// Specific option was selected

			if (this.planOptionDtosList.length == 0) {
				// 0 results in the grid, enable the button even if option is elevation or not
				this.disableAddColorItemButton = false;
			} else if (this.isElevationOption(this.currentOption.optionSubCategoryId)) {
				// Option is an elevation

				if (this.planOptionHasNoColorItem) {
					// At least 1 plan does not have an active color item assigned
					this.disableAddColorItemButton = false;
				}
			} else {
				this.disableAddColorItemButton = false;
			}
		}
	}

	private isElevationOption(optionSubCategoryId: number) {
		var elevationOptionSubCategoryIds: Array<number> = [361, 362];
		return elevationOptionSubCategoryIds.includes(optionSubCategoryId);
	}
}
