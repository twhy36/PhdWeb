import { Pipe, PipeTransform } from '@angular/core';
import { ChoicePriceRange } from '../models/tree.model.new';

@Pipe({
	name: 'priceRange'
})

export class PriceRangePipe implements PipeTransform
{
	transform(values: Array<ChoicePriceRange>, choiceId: number): string
	{
		let range = '$0';
		if (values) {
			const priceRange = values.find(x => x.choiceId === choiceId);
			if (priceRange && (priceRange.min === priceRange.max))
			{
				range = `\$${priceRange.min}`;
			}
			else if (priceRange && (priceRange.min !== priceRange.max)) {
				range = `\$${priceRange.min} - \$${priceRange.max}`;
			}
		}

		return range;
	}
}
