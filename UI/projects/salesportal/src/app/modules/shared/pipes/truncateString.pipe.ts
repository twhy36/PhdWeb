import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'truncateString',
	pure: false
})
export class TruncateStringPipe implements PipeTransform
{
	transform(value: string, limit: number = 50)
	{
		return value.length > limit ? value.substr(0, limit) : value;
	}
}
