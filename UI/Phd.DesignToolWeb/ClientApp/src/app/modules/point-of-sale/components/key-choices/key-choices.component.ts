import { Component, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';

import { Observable } from 'rxjs';

import { Group } from '../../../shared/models/tree.model.new';
import { PointStatus } from '../../../shared/models/point.model';
import * as fromRoot from '../../../ngrx-store/reducers';

@Component({
    selector: 'app-key-choices',
    templateUrl: './key-choices.component.html',
    styleUrls: ['./key-choices.component.scss']
})
export class KeyChoicesComponent implements OnInit {
    groups$: Observable<Group[]>;
    scenarioId$: Observable<number>;
    PointStatus = PointStatus;

    constructor(private store: Store<fromRoot.State>) { }

    ngOnInit() {
        this.groups$ = this.store.pipe(
			select(state => state.scenario.tree.treeVersion.groups)
        );
		
        this.scenarioId$ = this.store.pipe(
            select(state => state.scenario.scenario.scenarioId)
        );
    }
}
