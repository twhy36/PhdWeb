import { Component, OnInit } from '@angular/core';
import { ColorService } from '../../../core/services/color.service';
import { IColorItemDto } from '../../../shared/models/colorItem.model';

@Component({
	selector: 'color-items-page',
	templateUrl: './color-items-page.component.html',
	styleUrls: ['./color-items-page.component.scss']
})
export class ColorItemsPageComponent implements OnInit
{
	list:IColorItemDto[];

	constructor(private _colorService: ColorService){}

	ngOnInit() 
	{
		let a =[31622,31766];
		let res=this._colorService.getColorItems(8362,a).subscribe((x)=>{
			this.list=x;
		});
	}
}
