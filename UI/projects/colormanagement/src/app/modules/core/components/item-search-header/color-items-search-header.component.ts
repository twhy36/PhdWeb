import { Component, OnInit, ViewChild } from '@angular/core';
import { UnsubscribeOnDestroy, ModalRef, ModalService,ConfirmModalComponent } from 'phd-common';
import { IPlanCommunity, IOptionCommunity, IPlanOptionCommunityDto, IPlanOptionCommunity, IPlanOptionCommunityGridDto } from '../../../shared/models/community.model';
import { OrganizationService } from '../../services/organization.service';
import { PlanOptionService } from '../../services/plan-option.service';
import { from, Observable, of } from 'rxjs';
import { filter, map, switchMap, flatMap } from 'rxjs/operators';
import { ColorService } from '../../../core/services/color.service';
import { SettingsService } from '../../services/settings.service';
import { Settings } from '../../../shared/models/settings.model';
import * as _ from 'lodash';
import { IColorItemDto } from '../../../shared/models/colorItem.model';
import { IToastInfo } from  '../../../../../../../phd-common/src/lib/models/toast-info.model';
import { MessageService } from 'primeng/api';

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
	optionsPerPlan: Array<IPlanOptionCommunityDto> = [];
	currentOption: IOptionCommunity = null;
	isActiveColor: boolean = null;
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
	elevationHasActiveColorItem: boolean;

	constructor(
		private _orgService: OrganizationService,
		private _planService: PlanOptionService,
		private _colorService: ColorService,
		private _settingsService: SettingsService,
		private _modalService: ModalService,
		private _msgService: MessageService
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
				this.disableAddColorItemButton = true;
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
				const list = this.planOptionList[this.optionListIndex].planOptionCommunities.map((planoption: IPlanOptionCommunity) => {
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
				const isElevation = this.isElevationOption(this.planOptionList[this.optionListIndex].optionSubCategoryId);
				//Get coloritems for each optionCommunity.
				this.getColorItemsForOption(list, true, isElevation);
			}
			else {
				const list = this.currentOption?.planOptionCommunities.map((planoption: IPlanOptionCommunity) => {
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
				//Get coloritems for selected optionCommunity.
				const isElevation = this.isElevationOption(this.currentOption?.optionSubCategoryId);
				this.getColorItemsForOption(list, false, isElevation);
			}
		}
	}

	getColorItemsForOption(planoptionDto: IPlanOptionCommunityDto[], isAllOption:boolean, isElevation:boolean)
	{
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
				this.allDataLoaded = isAllOption ? planOptionDtos.length < this.settings.infiniteScrollPageSize && (isAllOption && this.optionListIndex === (this.planOptionList.length - 1)): planOptionDtos.length < this.settings.infiniteScrollPageSize;
				//Verify if atleast one ColorItem missed for Elevation option, disable Add Button
				if(isElevation)
				{
					if (planOptionDtos.filter(x => !!x.colorItem).length === planOptionDtos.length && planOptionDtos.filter(x=>!x.colorItem.isActive).length===0) {
						this.planOptionHasNoColorItem = false;
					}
					else {
						this.planOptionHasNoColorItem = true;
					}					
				}

				planOptionDtos = planOptionDtos.filter(x => !!x.colorItem);
				this.optionsPerPlan = planOptionDtos;

				if (planOptionDtos.length > 0)
				{
					const planOptionGridList = [];
					if(!isElevation)
					{
						//Group by ColorItem Name for Non basehouse and elevation options
						const groupByColorItemName = _.groupBy(planOptionDtos.filter(x => x.isBaseHouse === false), c => c.colorItem.name);
						for (const key in groupByColorItemName) {
							if (groupByColorItemName.hasOwnProperty(key)) {
								let item = groupByColorItemName[key];
								let planOptiongrid: IPlanOptionCommunityGridDto =
								{
									planOptionId: item[0].planOptionId,
									planCommunity: item.map(x => x.planCommunity).sort((a, b) => a.planSalesName.localeCompare(b.planSalesName)),
									optionCommunityId: item[0].optionCommunityId,
									optionSalesName: item[0].optionSalesName,
									colorItem: item.map(x => x.colorItem),
									hasSalesAgreement: null,
									hasConfig: null,
									loadingDeleteIcon: false
								}
								planOptionGridList.push(planOptiongrid);
							}
						}
						// Do not group by ColorItem Name for BaseHouse Option
						const planOptionBaseHouse = planOptionDtos.filter(x => x.isBaseHouse);
						planOptionBaseHouse.map((item) => {
							let planOptiongrid: IPlanOptionCommunityGridDto =
							{
								planOptionId: item.planOptionId,
								planCommunity: [item.planCommunity],
								optionCommunityId: item.optionCommunityId,
								optionSalesName: item.optionSalesName,
								colorItem: [item.colorItem],
								hasSalesAgreement: null,
								hasConfig: null,
								loadingDeleteIcon: false
							}
							planOptionGridList.push(planOptiongrid);
						});
					}
					else
					{
						// Do not group by ColorItem Name for Elevation Option
						planOptionDtos.map((item) => {
							let planOptiongrid: IPlanOptionCommunityGridDto =
							{
								planOptionId: item.planOptionId,
								planCommunity: [item.planCommunity],
								optionCommunityId: item.optionCommunityId,
								optionSalesName: item.optionSalesName,
								colorItem: [item.colorItem],
								hasSalesAgreement: null,
								hasConfig: null,
								loadingDeleteIcon: false
							}
							planOptionGridList.push(planOptiongrid);
						});

					}
					this.planOptionDtosList = [...this.planOptionDtosList, ...planOptionGridList];
					const expectedListLength = this.pageNumber * this.settings.infiniteScrollPageSize;
					if (this.planOptionDtosList.length < expectedListLength && !this.allDataLoaded && isAllOption && this.optionListIndex < (this.planOptionList.length-1)) {
						this.onPanelScroll();
					}
					else if (this.planOptionDtosList.length >= expectedListLength && !this.allDataLoaded && isAllOption) {
						this.pageNumber++;
						this.getSalesagreementOrConfig(this.planOptionDtosList.filter(x => !x.loadingDeleteIcon));
					}
					else
					{
						this.getSalesagreementOrConfig(this.planOptionDtosList.filter(x => !x.loadingDeleteIcon));
						this.processAddColorItemButtonState();
					}
				}
				else if (!this.allDataLoaded && isAllOption && this.optionListIndex < (this.planOptionList.length-1)) {
					this.onPanelScroll();
				}
				else if(this.optionListIndex === (this.planOptionList.length-1) && isAllOption)
				{
					this.getSalesagreementOrConfig(this.planOptionDtosList.filter(x=>!x.loadingDeleteIcon));
				}

				if (this.allDataLoaded && !isAllOption) {
					this.processAddColorItemButtonState();
				}
			});

	}
	getSalesagreementOrConfig(gridlist:IPlanOptionCommunityGridDto[])
	{
		gridlist.map(x=>x.loadingDeleteIcon=true);
		this._colorService.getSalesAgreementForGrid(gridlist,this.currentFinancialCommunityId).subscribe((result)=>
		{
			result.map((item:IPlanOptionCommunityGridDto) => {
				const planoption = this.planOptionDtosList.find(c =>c.planOptionId === item.planOptionId);
				if(planoption){
					planoption.hasSalesAgreement = item.hasSalesAgreement;
				}
			});
		});
		this._colorService.getconfigForGrid(gridlist,this.currentFinancialCommunityId).subscribe((result)=>
		{
			result.map((item:IPlanOptionCommunityGridDto) => {
				const planoption = this.planOptionDtosList.find(c =>c.planOptionId === item.planOptionId);
				if(planoption){
					planoption.hasConfig = item.hasConfig;
				}
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
		// Default button to be disabled on option change
		this.disableAddColorItemButton = true;
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
		var elevationOptionSubCategoryIds: Array<number> = [Elevations.DetachedElevation, Elevations.AttachedElevation];
		return elevationOptionSubCategoryIds.includes(optionSubCategoryId);
	}

	getRowClass(rowData: any): string
	{
		return rowData.colorItem[0]?.isActive? null : 'phd-inactive-color';
	}
	
	private showConfirmModal(body: string, title: string, defaultButton: string): Observable<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true, windowClass: "phd-modal-window" });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		return from(confirm.result.then((result) => result !== 'Continue'));
	}

	activateColorItem(coloritemDto: IColorItemDto[], planOptionDto : IPlanOptionCommunityGridDto)
	{	
		let isElevation;		
		const option = this.planOptionList.find(x=>x.id === planOptionDto.optionCommunityId);
		if(option)
			isElevation = this.isElevationOption(option.optionSubCategoryId);
		
		if(isElevation)
		{
			const planOptions = this.planOptionDtosList.filter(row => row.optionCommunityId === planOptionDto.optionCommunityId);
			//Verify if there is already an active color item for the elevation option
			if(planOptions.filter(x=>x.colorItem[0].isActive)?.length>0)
			{
				this.elevationHasActiveColorItem = true;
				const message = 'There is already an active color item for this elevation option';	
				this.showConfirmModal(message, 'Info', '').pipe(
				map(cancel => {
						return;
				})).subscribe((x)=>{

				});
			}
			else
			{
				this.elevationHasActiveColorItem = false;
			}			
		}
		else
		{
			const colorItemsToUpdate: IColorItemDto[] =[];

			coloritemDto.forEach((ci)=>
			{
				const colorItemToSave = {
					colorItemId: ci.colorItemId,
					isActive: true,						
					} as IColorItemDto;

				colorItemsToUpdate.push(colorItemToSave);
			})

			let toast:IToastInfo; 
			
			this._colorService.updateColorItem(colorItemsToUpdate, planOptionDto.planOptionId).subscribe((colorItems) => {
				if (colorItems) {
					toast = {
						severity: 'success',
						summary: 'Activate Color Item',
						detail: 'Color Item activation was successful!'
					}
					this._msgService.add(toast);
					const updatedResult = this.planOptionDtosList.find(row => row.planOptionId === planOptionDto.planOptionId).colorItem;
					updatedResult.forEach((coloritem) => 
					{
						coloritem.isActive =colorItems.find(c =>c.colorItemId === coloritem.colorItemId).isActive;
					})
				}
				else{				
					toast = {
						severity: 'error',
						summary: 'Activate Color Item',
						detail: 'Color Item activation failed. Please try again.'
					} as IToastInfo;
					this._msgService.add(toast);
				}
			},error => {
				toast = {
					severity: 'error',
					summary: 'Activate Color Item',
					detail: 'Color Item activation failed due to an unexpected error.'
				} as IToastInfo;
				this._msgService.add(toast);
			}
			);
		} 
	}

	inactivateColorItem(coloritemDto: IColorItemDto[], id: number)
	{	
		const message = 'Are you sure you want to inactivate this colorItem?';
		let cancelled = false;
		let toast:IToastInfo;

	 	this.showConfirmModal(message, 'Warning', 'Continue').pipe(
			switchMap(cancel => {
				if (cancel) {
					cancelled = true;
					return;
				}
				const colorItemsToUpdate: IColorItemDto[] =[];
				coloritemDto.forEach((ci)=>
				{
					const colorItemToSave = {
						colorItemId: ci.colorItemId,
						isActive: false,						
						} as IColorItemDto;

					colorItemsToUpdate.push(colorItemToSave);
				})
				return this._colorService.updateColorItem(colorItemsToUpdate, id)
				})).subscribe((colorItems:IColorItemDto[]) => {
					if (colorItems) {
						toast = {
							severity: 'success',
							summary: 'Inactivate Color Item',
							detail: 'Color Item inactivation was successful!'
						}
						this._msgService.add(toast);
						const updatedResult = this.planOptionDtosList.find(row => row.planOptionId === id).colorItem;
						updatedResult.forEach((coloritem) => 
						{
							coloritem.isActive =colorItems.find(c =>c.colorItemId === coloritem.colorItemId).isActive;
						})
					}
					else{				
						toast = {
							severity: 'error',
							summary: 'Inactivate Color Item',
							detail: 'Color Item inactivation failed. Please try again.'
						} as IToastInfo;
						this._msgService.add(toast);
					}					
				},error => {
					if(!cancelled)
					{
						toast = {
							severity: 'error',
							summary: 'Inactivate Color Item',
							detail: 'Color Item inactivation failed due to an unexpected error.'
						} as IToastInfo;
						this._msgService.add(toast);
					}
				}
				);									 
	}


	onAddColorItemDialogWasCanceled() {
		this.modalReference.dismiss();
	}
}
