import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'capitalCaseSpace'
})
export class CapitalCaseSpacePipe implements PipeTransform {
	transform(value: string): string {
		return value.replace(/([A-Z])/g, " $1");
	}
}
