import { Component, OnInit } from '@angular/core';
import { UnsubscribeOnDestroy } from 'phd-common';
import { IPlanCommunity, IOptionCommunity, IPlanOptionCommunityDto } from '../../../shared/models/community.model';
import { OrganizationService } from '../../services/organization.service';
import { PlanOptionService } from '../../services/plan-option.service';
import { Observable, of } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { ColorService } from '../../../core/services/color.service';
import { IColorItemDto } from '../../../shared/models/colorItem.model';
import {SettingsService} from '../../services/settings.service';
import {Settings} from '../../../shared/models/settings.model';

@Component({
	selector: 'color-items-search-header',
	templateUrl: './color-items-search-header.component.html',
	styleUrls: ['./color-items-search-header.component.scss']
})
export class ColorItemsSearchHeaderComponent
	extends UnsubscribeOnDestroy
	implements OnInit {
	planCommunityList$: Observable<Array<IPlanCommunity>>;
	currentFinancialCommunityId: number;
	selectedPlans: Array<number> = [];
	planOptionList: Array<IOptionCommunity>;
	planOptionDtosList: Array<IPlanOptionCommunityDto> = [];
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
				this.planOptionList = options
			});			
	}

	loadColorItemsGrid()
	{
		// Skip if currentOption is blank
		if(this.currentOption){
			this._planService.getPlanOptionsGrid(this.currentFinancialCommunityId,
				this.currentOption?.id,
				this.selectedplanids,
				this.settings.infiniteScrollPageSize,
				this.skip,
				)
				.pipe(
					map((planOptions) =>
						{
							let planOptionsList = planOptions.map((planoption) => 
							{
								let planOptionDto : IPlanOptionCommunityDto = {
									planId : planoption.planCommunity.id,
									planSalesName : planoption.planCommunity.planSalesName,
									optionCommunityId : planoption.optionCommunity.id,
									optionSalesName : planoption.optionCommunity.optionSalesName,
									planOptionId : planoption.id,
									colorItem : null
								}
								return planOptionDto;
							}) as Array<IPlanOptionCommunityDto>;
							return planOptionsList;
						}),
						switchMap((planOptionDtos) => 
						{	
							if(planOptionDtos?.length>0){
								return this._colorService
									.getPlanOptionAssocColorItems
										(this.currentFinancialCommunityId,
										planOptionDtos.map(planoption=>planoption.planOptionId), 
										this.isActiveColor
										)
										.pipe(
											map((colorItemDtos) => {
												planOptionDtos.forEach(element => {
													element.colorItem = colorItemDtos?.find(coloritem => coloritem.edhPlanOptionId === element.planOptionId);
												});
												return planOptionDtos;
											})
										) 
							}	
							else{
								return of([]);
							}				
						})
				)
				.subscribe((planOptionDtos) => {	
					this.currentPage++;														
					this.allDataLoaded = planOptionDtos.length < this.settings.infiniteScrollPageSize;
					planOptionDtos = planOptionDtos.filter(x=>!!x.colorItem);
					if(planOptionDtos.length>0)
					{	
						this.getSalesagreementOrConfig(planOptionDtos.map(x=>x.colorItem));
						this.planOptionDtosList = [...this.planOptionDtosList, ...planOptionDtos];
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
	}
	getSalesagreementOrConfig(coloritem:IColorItemDto[])
	{
		this._colorService.getSalesAgreementForColorItem(coloritem,this.currentFinancialCommunityId).subscribe((result)=>
		{
			result.map((coloritem) => 
			{
				this.planOptionDtosList.find(c =>c.colorItem?.colorItemId === coloritem.colorItemId).colorItem.hasSalesAgreement = coloritem.hasSalesAgreement;
			});
		})

		this._colorService.getconfigForColorItem(coloritem,this.currentFinancialCommunityId).subscribe((result)=>
		{
			result.map((coloritem) => 
			{
				this.planOptionDtosList.find(c =>c.colorItem?.colorItemId === coloritem.colorItemId).colorItem.hasConfig = coloritem.hasConfig;
			});
		})
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
		this.loadColorItemsGrid();
	}
}
