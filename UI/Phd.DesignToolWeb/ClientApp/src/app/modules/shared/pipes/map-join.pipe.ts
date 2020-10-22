import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'mapjoin'
})
export class MapJoinPipe implements PipeTransform
{
	/**
	 * Maps an array of objects to a 'joinWith' separated string of values.
	 * usage: objArray | mapjoin:'nameOfProperty':', '
	 * @param values
	 * @param property - can use dot notation in case the property is nested, for example 'child.grandchild'
	 * @param joinWith
	 */
	transform(values: Array<any>, property: string, joinWith: string): string
    {
		return values && values.map(value => property.split('.').reduce((a, b) => a[b], value)).join(joinWith);
    }
}
