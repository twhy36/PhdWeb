import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../ngrx-store/reducers';

@Component({
	selector: 'plan-change',
	templateUrl: './plan-change.component.html',
	styleUrls: ['./plan-change.component.scss']
})
export class PlanChangeComponent implements OnInit {

	canSell$: Observable<boolean>;
	canDesign$: Observable<boolean>;

	constructor(private store: Store<fromRoot.State>) { }

	ngOnInit() {
		this.canSell$ = this.store.pipe(select(fromRoot.canSell));
		this.canDesign$ = this.store.pipe(select(fromRoot.canDesign));
	}
}
