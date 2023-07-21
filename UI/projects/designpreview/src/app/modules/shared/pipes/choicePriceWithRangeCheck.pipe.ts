import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import { Choice } from 'phd-common';

@Pipe({
	name: 'choicePriceWithRangeCheck'
	})

export class ChoicePriceWithRangeCheckPipe implements PipeTransform
{
	constructor(private store: Store<fromRoot.State>) { }

	transform(choice: Choice): Observable<string>
	{
		// Create our number formatter.
		const formatter = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',

			minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
			maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
		});

		return this.store.pipe(
			select(fromScenario.selectScenario),
			map(scenarioState =>
			{
				const choicePrice = formatter.format(choice?.price * (choice.quantity > 0 ? choice.quantity : 1));
				if (choice.enabled)
				{
					return choicePrice;
				}

				if (!!scenarioState.priceRanges)
				{
					const priceRange = scenarioState.priceRanges.find(x => x.choiceId === choice.id);
					if (priceRange && (priceRange.min !== priceRange.max))
					{
						return formatter.format(priceRange.min) + ' - ' + formatter.format(priceRange.max);
					}
					else
					{
						//choice not in priceRange collection, display choice price
						return choicePrice;
					}
				}
				else
				{
					//price ranges not loaded
					return null;
				}
			}),
			takeWhile(res => !res, true),
			map(res => res || 'TBD')
		);
	}
}
