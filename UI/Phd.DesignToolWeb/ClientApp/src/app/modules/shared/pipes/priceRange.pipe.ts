import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { map, takeWhile } from 'rxjs/operators';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromScenario from '../../ngrx-store/scenario/reducer';

@Pipe({
	name: 'priceRange'
})

export class PriceRangePipe implements PipeTransform
{
	constructor(private store: Store<fromRoot.State>) { }

	transform(choiceId: number): Observable<string>
	{
		return this.store.pipe(
			select(fromScenario.selectScenario),
			map(scenarioState => {
				if (!!scenarioState.priceRanges) {
					let range = '$0';

					const priceRange = scenarioState.priceRanges.find(x => x.choiceId === choiceId);
					if (priceRange && (priceRange.min === priceRange.max)) {
						range = `\$${priceRange.min}`;
					}
					else if (priceRange && (priceRange.min !== priceRange.max)) {
						range = `\$${priceRange.min} - \$${priceRange.max}`;
					}

					return range;
				} else {
					return null;
				}
			}),
			takeWhile(res => !res, true),
			map(res => res || 'TBD')
		);
	}
}
