import { Component, OnInit } from '@angular/core';
import { UnsubscribeOnDestroy } from 'phd-common';
import { IPlanCommunity, IOptionCommunity, IPlanOptionCommunityDto, IPlanOptionCommunity, IPlanOptionCommunityGridDto } from '../../../shared/models/community.model';
import { OrganizationService } from '../../services/organization.service';
import { PlanOptionService } from '../../services/plan-option.service';
import { Observable, of } from 'rxjs';
import { filter, map, switchMap, flatMap } from 'rxjs/operators';
import { ColorService } from '../../../core/services/color.service';
import { IColorItemDto } from '../../../shared/models/colorItem.model';
import {SettingsService} from '../../services/settings.service';
import {Settings} from '../../../shared/models/settings.model';
import * as _ from 'lodash';

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
	currentplanOptionList: Array<IOptionCommunity>=[];
	planOptionDtosList: Array<IPlanOptionCommunityGridDto> = [];
    planOptionDtoList : Array<IPlanOptionCommunityDto> = [];
	currentOption: IOptionCommunity = null;
	isActiveColor: boolean = null;
	colorItemDtolist:IColorItemDto[];
	settings: Settings;
	allDataLoaded:boolean;
	currentPage: number = 0;
	isLoading: boolean = true;
	skip: number;
	selectedplanids = null;
	pageNumber:number =1;

	constructor(
		private _orgService: OrganizationService,
		private _planService: PlanOptionService,
		private _colorService: ColorService,
		private _settingsService: SettingsService
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
		
		this.planCommunityList$.subscribe((plans)=>
		{
			this.planCommunityList = plans;
		})
	}

	reset()
	{
		this.skip = 0;
		this.planOptionDtosList = [];
		this.currentOption = null;
		this.planOptionList = [];
		this.currentPage = 0;
		this.pageNumber =1;
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
			.subscribe((options)=>{
				this.planOptionList = options;				
			});			
	}
	
	loadColorItemsGrid()
	{
		if(this.currentOption)
		{
			if(!this.currentOption?.id)
			{
				let list =	this.currentplanOptionList[0].planOptionCommunities.map((planoption:IPlanOptionCommunity)=>
					{
						let planOptionDto : IPlanOptionCommunityDto = {
							planCommunity:{
								id:planoption.planId,
								planSalesName:this.planCommunityList.find((plan)=>plan.id==planoption.planId)?.planSalesName
							},
							optionCommunityId : this.currentplanOptionList[0].id,
							optionSalesName : this.currentplanOptionList[0].optionSalesName,
							planOptionId : planoption.id,
							colorItem : null
						}
						return planOptionDto;
					}) as Array<IPlanOptionCommunityDto>;
					this.currentplanOptionList.splice(0,1);
					//Get coloritems for each optionCommunity.
					this.getColorItemsForOption(list);
			}
			else
			{
				this.currentplanOptionList = [];
				this.currentplanOptionList.push(this.currentOption);
				let list =	this.currentOption?.planOptionCommunities.map((planoption:IPlanOptionCommunity)=>
				{					
					let planOptionDto : IPlanOptionCommunityDto = {
						planCommunity:{
							id:planoption.planId,
							planSalesName:this.planCommunityList.find((plan)=>plan.id==planoption.planId)?.planSalesName
						},
						optionCommunityId : this.currentOption.id,
						optionSalesName : this.currentOption.optionSalesName,
						planOptionId : planoption.id,
						colorItem : null
					}
					return planOptionDto;
				}) as Array<IPlanOptionCommunityDto>;
				//Get coloritems for each optionCommunity.
				this.getColorItemsForOption(list);
				this.currentplanOptionList.splice(0,1);
			
			}
		}
	}

	getColorItemsForOption(planoptionDto:IPlanOptionCommunityDto[])
	{
		this._colorService.getPlanOptionAssocColorItems
											(this.currentFinancialCommunityId,
											planoptionDto.map(planoption=>planoption.planOptionId), 
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
												this.allDataLoaded = planOptionDtos.length < this.settings.infiniteScrollPageSize && this.currentplanOptionList.length === 0;
												planOptionDtos = planOptionDtos.filter(x=>!!x.colorItem);
												if(planOptionDtos.length>0)
												{	
													let groupByColorItemName = _.groupBy(planOptionDtos,c=>c.colorItem.name);
													let planOptiongridList = [];
													for(const key in groupByColorItemName)
													{
														if(groupByColorItemName.hasOwnProperty(key))
														{
															let item = groupByColorItemName[key];
															let planOptiongrid:IPlanOptionCommunityGridDto =
															{
																planCommunity:item.map(x=>x.planCommunity),
																optionCommunityId: item[0].optionCommunityId,
																optionSalesName:item[0].optionSalesName,
																colorItem:item.map(x=>x.colorItem)  																
															}
															planOptiongridList.push(planOptiongrid);
														}
													}
													this.planOptionDtosList = [...this.planOptionDtosList, ...planOptiongridList];
													let expectedListLength = this.pageNumber * this.settings.infiniteScrollPageSize;
													if(this.planOptionDtosList.length<expectedListLength && !this.allDataLoaded)
													{
														this.onPanelScroll();
													}	
													else if(this.planOptionDtosList.length>=expectedListLength && !this.allDataLoaded)
													{
														this.pageNumber++;
													}				
												}
												else if(!this.allDataLoaded){
													this.onPanelScroll();
												}
											}); 	

	}

	onPanelScroll()
	{
		this.isLoading = true;
		this.skip = this.currentPage * this.settings.infiniteScrollPageSize;		
		this.loadColorItemsGrid();		
	}

	onActiveColorChange() 
	{
		this.planOptionDtosList=[];
		this.skip = 0;
		this.currentPage = 0;
		this.pageNumber =1;
		this.loadColorItemsGrid();
	}

	onChangeOption()
	{
		this.planOptionDtosList=[];
		this.skip = 0;
		this.currentPage = 0;
		this.pageNumber =1;
		this.currentplanOptionList = [];
		if(!this.currentOption?.id)
		{
			this.currentplanOptionList = this.planOptionList;
		}
		else
		{
			this.currentplanOptionList.push(this.currentOption);
		}
		this.loadColorItemsGrid();
	}
}
