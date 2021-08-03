import { Component } from '@angular/core';
import {OptionService} from '../../services/option.service';
import { IOptionSubCategory } from '../../../shared/models/option.model';
import { OrganizationService } from '../../../core/services/organization.service';

@Component({
	selector: 'colors-search-header',
	templateUrl: './colors-search-header.component.html',
	styleUrls: ['./colors-search-header.component.scss']
})
export class ColorsSearchHeaderComponent
{
	colorname:string;
	isCounterVisible:boolean;
	optionSubCategory:Array<IOptionSubCategory>=[];
	currentCommunityId:number;
	constructor(private _optionService: OptionService,private _orgService:OrganizationService) {

	}
	ngOnInit() {
		this._orgService.currentFinancialCommunity$.subscribe(x=>{this.currentCommunityId=x.id});

		if(this.currentCommunityId)
		{
			this._optionService.getOptionsCategorySubcategory(this.currentCommunityId).subscribe(data=>
				{
					this.optionSubCategory = data; 					
				});
		}
    }
	showCounter(){
		this.isCounterVisible=true;
	}
	hideCounter(){
		this.isCounterVisible=false;
	}

    
	
	
}
