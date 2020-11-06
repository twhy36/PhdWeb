import { Pipe, PipeTransform } from '@angular/core';

import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromScenario from '../../ngrx-store/scenario/reducer';

@Pipe({
	name: 'priceRange'
})

export class PriceRangePipe implements PipeTransform {
	constructor(private store: Store<fromRoot.State>) { }

	transform(choiceId: number): Observable<string> {
		return this.store.pipe(
			select(fromScenario.choicePriceRangeByChoice, { choiceId }),
			map(priceRange => {
				let range = '$0';

				if (priceRange && (priceRange.min === priceRange.max)) {
					range = `\$${priceRange.min}`;
				}
				else if (priceRange && (priceRange.min !== priceRange.max)) {
					range = `\$${priceRange.min} - \$${priceRange.max}`;
				}

				return range;
			})
		);

	}
}
