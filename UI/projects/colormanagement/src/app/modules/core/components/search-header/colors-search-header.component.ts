import { Component, OnInit } from '@angular/core';
import {OptionService} from '../../services/option.service';
import { IOptionSubCategory } from '../../../shared/models/option.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { switchMap, filter, map, last} from 'rxjs/operators';
import { Observable,combineLatest} from 'rxjs';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { PhdTableComponent, ConfirmModalComponent, UnsubscribeOnDestroy } from 'phd-common';
import { IColor, IColorDto } from '../../../shared/models/color.model';
import { ColorService } from '../../services/color.service';
import { findIndex, merge } from 'lodash';
@Component({
	selector: 'colors-search-header',
	templateUrl: './colors-search-header.component.html',
	styleUrls: ['./colors-search-header.component.scss']
})
export class ColorsSearchHeaderComponent extends UnsubscribeOnDestroy implements OnInit
{
	colorname:string=null;
	isCounterVisible:boolean;
	optionSubCategory:Array<IOptionSubCategory>;
	selectedSubCategory:IOptionSubCategory;
	colors$:Observable<Array<IColor>>;
	colorsDto$:Observable<IColorDto[]>;
	infiniteScrollThrottle: number = 50;
	infiniteScrollPageSize: number = 50;
	currentCommunityId:number
	allDataLoaded:boolean;
	isActive:boolean=null;
	constructor(private _optionService: OptionService,private _orgService:OrganizationService,private _colorService:ColorService) {
		super();
	}
	ngOnInit() {
							this._orgService.currentCommunity$.pipe(
							this.takeUntilDestroyed(),
							filter(comm => !!comm),
							switchMap((comm) =>
							{
								this.currentCommunityId = comm.id;
								return this._optionService.getOptionsCategorySubcategory(this.currentCommunityId);
								// const filteredColors = this._colorService.getColors(this.currentCommunityId,null,null,40,null,null);
								// return forkJoin([this.optionSubCategory$,filteredColors]).pipe(
								// 	map(([categorys,colors])=>{
								// 	return colors.map(color=>{
								// 			let categorySubcategory = categorys.find(x=>x.id===color.edhOptionSubcategoryId);
								// 			let colorsDto:IColorDto={
								// 				colorId:color.colorId,
								// 				name:color.name,
								// 				sku:color.sku,
								// 				optionCategoryName:categorySubcategory?.optionCategory?.name,
								// 				optionSubCategoryName:categorySubcategory?.name,
								// 				isActive:color.isActive				
								// 		};		
								// 		return colorsDto;
								// 	})
								// }));
						
			}))
			.subscribe(x=>{
				this.optionSubCategory=x;
				this.filterColors();
			});	
			
    }
	showCounter(){
		this.isCounterVisible=true;
	}
	hideCounter(){
		this.isCounterVisible=false;
	}
	filterColors(){	
		this.colorsDto$ =  this._colorService.getColors(this.currentCommunityId,this.colorname,this.selectedSubCategory?.id,40,null,this.isActive).pipe(												
							map((colors)=>{
							let colorsList = colors.map(color=>
								{
								  let categorySubcategory = this.optionSubCategory.find(x=>x.id===color.edhOptionSubcategoryId);
								  let colorsDto:IColorDto={									
											  colorId:color.colorId,
											  name:color.name,
											  sku:color.sku,
											  optionCategoryName:categorySubcategory?.optionCategory?.name,
											  optionSubCategoryName:categorySubcategory?.name,
											  isActive:color.isActive				
											  }
							  return colorsDto;
							  }) as Array<IColorDto>
							  return colorsList;
						}));
	}
	onPanelScroll(){

	}
}
