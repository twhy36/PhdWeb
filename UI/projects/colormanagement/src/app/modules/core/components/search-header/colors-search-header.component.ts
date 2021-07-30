import { Component } from '@angular/core';
import {OptionService} from '../../services/option.service';
import { IOptionCommunity } from '../../../shared/models/option.model';
import { OrganizationService } from '../../../core/services/organization.service';
import{IFinancialCommunity} from '../../../shared/models/community.model';

@Component({
	selector: 'colors-search-header',
	templateUrl: './colors-search-header.component.html',
	styleUrls: ['./colors-search-header.component.scss']
})
export class ColorsSearchHeaderComponent
{
	colorname:string;
	isCounterVisible:boolean;
	optionCommunities:Array<IOptionCommunity>=[];
	currentCommunity:IFinancialCommunity;

	constructor(private _optionService: OptionService,private _orgService:OrganizationService) {

	}
	ngOnInit() {
		this.currentCommunity = this._orgService.currentFinancialCommunity;
		if(this.currentCommunity)
		{
			this._optionService.getOptionsCategorySubcategoryByCommunity(this.currentCommunity.id).subscribe(data=>
				{
					this.optionCommunities = data;
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
