import { Component, OnInit, OnDestroy } from '@angular/core';
import {OptionService} from '../../services/option.service';
import { IOptionSubCategory } from '../../../shared/models/option.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { switchMap, startWith,filter,map } from 'rxjs/operators';
import { UnsubscribeOnDestroy } from 'phd-common';

@Component({
	selector: 'colors-search-header',
	templateUrl: './colors-search-header.component.html',
	styleUrls: ['./colors-search-header.component.scss']
})
export class ColorsSearchHeaderComponent extends UnsubscribeOnDestroy implements OnInit
{
	colorname:string;
	isCounterVisible:boolean;
	optionSubCategory:Array<IOptionSubCategory>=[];
	currentCommunityId:number;
	constructor(private _optionService: OptionService,private _orgService:OrganizationService) {
		super();
	}
	ngOnInit() {
		this._orgService.currentFinancialCommunity$
		.pipe(
			this.takeUntilDestroyed(),
			startWith(this._orgService.currentFinancialCommunity),
			filter(p =>p!=null && p['id'] && p['id'] != 0),
			switchMap((comm) =>
			{
				return this._optionService.getOptionsCategorySubcategory(comm.id)
			})).subscribe( subCategories=>
			{
				this.optionSubCategory = subCategories; 					
			});
    }
	showCounter(){
		this.isCounterVisible=true;
	}
	hideCounter(){
		this.isCounterVisible=false;
	}
}
