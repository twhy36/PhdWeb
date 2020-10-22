import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'enumToArray'
})
export class EnumToArrayPipe implements PipeTransform {
	transform(obj: Object): string[]
	{
		const keys = Object.keys(obj);

		return keys.map(key => obj[key]);
	}
}
