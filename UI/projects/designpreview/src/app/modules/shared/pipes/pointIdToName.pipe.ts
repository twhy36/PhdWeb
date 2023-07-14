import { Pipe, PipeTransform } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { map } from 'rxjs/operators';
import * as fromRoot from '../../ngrx-store/reducers';
import * as fromScenario from '../../ngrx-store/scenario/reducer';
import { Observable } from 'rxjs';

@Pipe({
	name: 'pointIdToName'
	})
export class PointIdToNamePipe implements PipeTransform
{
	constructor(private store: Store<fromRoot.State>) { }

	transform(value: number): Observable<string>
	{
		return this.store.pipe(
			select(fromScenario.getPointsById),
			map(points => points[value] ? points[value].label: '')
		);
	}
}
