import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import * as fromRoot from '../../../ngrx-store/reducers';

import { NewHomeService } from '../../services/new-home.service';

@Component({
	selector: 'plan-container',
	templateUrl: './plan-container.component.html'
})
export class PlanContainerComponent implements OnInit
{
	canConfigure$: Observable<boolean>;

	constructor(private store: Store<fromRoot.State>,
		private newHomeService: NewHomeService) { }

	ngOnInit()
	{
		this.canConfigure$ = this.store.pipe(select(fromRoot.canConfigure));
	}

	onPlanToggled()
	{
		this.store.pipe(
			take(1)
		).subscribe(state =>
		{
			this.newHomeService.setSubNavItemsStatus(state.scenario.scenario, state.scenario.buildMode, state.job);
		});
	}
}
