import { Component, OnInit } from '@angular/core';
import {OptionService} from '../../services/option.service';
import { IOptionSubCategory } from '../../../shared/models/option.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { switchMap, filter } from 'rxjs/operators';
import { UnsubscribeOnDestroy } from 'phd-common';
import { Observable } from 'rxjs';

@Component({
	selector: 'colors-search-header',
	templateUrl: './colors-search-header.component.html',
	styleUrls: ['./colors-search-header.component.scss']
})
export class ColorsSearchHeaderComponent extends UnsubscribeOnDestroy implements OnInit
{
	colorname:string;
	isCounterVisible:boolean;
	optionSubCategory$:Observable<IOptionSubCategory[]>;
	constructor(private _optionService: OptionService,private _orgService:OrganizationService) {
		super();
	}
	ngOnInit() {
		this.optionSubCategory$ = this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			filter(comm => !!comm),
			switchMap((comm) =>
			{
				return this._optionService.getOptionsCategorySubcategory(comm.id)
			}));
    }
	showCounter(){
		this.isCounterVisible=true;
	}
	hideCounter(){
		this.isCounterVisible=false;
	}
}
