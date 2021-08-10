import { Component, OnInit } from '@angular/core';
import {OptionService} from '../../services/option.service';
import { IOptionSubCategory } from '../../../shared/models/option.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { switchMap, filter, map, last } from 'rxjs/operators';
import { Observable} from 'rxjs';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { PhdTableComponent, ConfirmModalComponent, UnsubscribeOnDestroy } from 'phd-common';
import { IColor, IColorDto } from '../../../shared/models/color.model';
import { ColorService } from '../../services/color.service';
import { findIndex } from 'lodash';
@Component({
	selector: 'colors-search-header',
	templateUrl: './colors-search-header.component.html',
	styleUrls: ['./colors-search-header.component.scss']
})
export class ColorsSearchHeaderComponent extends UnsubscribeOnDestroy implements OnInit
{
	colorname:string=null;
	isCounterVisible:boolean;
	optionSubCategory$:Observable<Array<IOptionSubCategory>>;
	colors$:Observable<Array<IColor>>;
	colorsDto$:Observable<Array<IColorDto>>;
	infiniteScrollThrottle: number = 50;
	infiniteScrollPageSize: number = 50;
	currentCommunityId:number
	allDataLoaded:boolean;
	constructor(private _optionService: OptionService,private _orgService:OrganizationService,private _colorService:ColorService) {
		super();
	}
	ngOnInit() {
        this.optionSubCategory$=this._orgService.currentCommunity$.pipe(
							this.takeUntilDestroyed(),
							filter(comm => !!comm),
							switchMap((comm) =>
							{
								this.currentCommunityId = comm.id;
								return this._optionService.getOptionsCategorySubcategory(this.currentCommunityId);
								
			}));
			
    }
	showCounter(){
		this.isCounterVisible=true;
	}
	hideCounter(){
		this.isCounterVisible=false;
	}	
	onPanelScroll(){

	}
	filterColors(){
		
	}
}
