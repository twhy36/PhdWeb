import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';

import * as fromRoot from '../../../ngrx-store/reducers';

@Component({
	selector: 'plan-container',
	templateUrl: './plan-container.component.html'
})
export class PlanContainerComponent implements OnInit {

	canConfigure$: Observable<boolean>;

	constructor(private store: Store<fromRoot.State>) { }

	ngOnInit() {
		this.canConfigure$ = this.store.pipe(select(fromRoot.canConfigure));
	}
}
