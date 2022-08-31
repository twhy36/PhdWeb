import { Pipe, PipeTransform } from '@angular/core';
import { IColor } from '../models/color.model';

@Pipe({
	name: 'colorDisplay'
})
export class ColorDisplayPipe implements PipeTransform {
	transform(color: IColor): string {
		return !!color?.sku 
			? `${color?.name} / ${color?.sku}`
			: color?.name;
	}
}
