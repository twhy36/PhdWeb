import { Component, Input, EventEmitter, OnInit, Output } from '@angular/core';
import { Store, select } from '@ngrx/store';

import { map, filter, combineLatest, distinctUntilChanged, withLatestFrom, debounceTime, take } from 'rxjs/operators';

import * as _ from 'lodash';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

import { Choice, DecisionPoint } from '../../models/tree.model.new';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';

@Component({
	selector: 'disabled-error',
	templateUrl: './disabled-error.component.html',
	styleUrls: ['./disabled-error.component.scss']
})

export class DisabledErrorComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() choice: Choice;
	@Input() point: DecisionPoint;
	@Input() errorOverride: string;
	@Output() onLink = new EventEmitter<{ choice?: Choice, path?: Array<string | number> }>();

	errors: Array<{ errorType: ErrorTypeEnum, disabledBy: Array<any> }> = []; // DP to DP, then Dp to Choice, then Choice to Choice
	scenarioId: number;
	isMultiError: boolean = true;
	ErrorTypeEnum = ErrorTypeEnum;
	choicesById;
	pointsById;

	constructor(private store: Store<fromRoot.State>) { super(); }

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.scenario.scenarioId)
		).subscribe(scenarioId =>
		{
			this.scenarioId = scenarioId;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.getChoicesById),
			withLatestFrom(this.store.pipe(select(fromScenario.getPointsById)))
		).subscribe(([choicesById, pointsById]) =>
		{
			this.choicesById = choicesById;
			this.pointsById = pointsById;
		});

		if (this.point && !!this.point.disabledBy.length)
		{
			// break out decision point to dp rules from dp to choice rules
			const dp2dp = this.point.disabledBy.map(db => { return { rules: db.rules.filter(r => r.points.length > 0) } });
			const dp2c = this.point.disabledBy.map(db => { return { rules: db.rules.filter(r => r.choices.length > 0) } });

			if (dp2dp.filter(r => r.rules.length).length > 0) {
				this.errors.push({ errorType: ErrorTypeEnum.DP2DP, disabledBy: dp2dp });
			}

			if (dp2c.filter(r => r.rules.length > 0).length > 0) {
				this.errors.push({ errorType: ErrorTypeEnum.DP2C, disabledBy: dp2c });
			}
		}

		if (this.choice && !!this.choice.disabledBy.length)
		{
			this.errors.push({ errorType: ErrorTypeEnum.C2C, disabledBy: this.choice.disabledBy });
		}

		this.isMultiError = this.errors && this.errors.length && this.errors.length > 1;
	}

	onPointNav(p: number)
	{
		this.onLink.emit({ path: ['/edit-home/', this.scenarioId, this.pointsById[p].divPointCatalogId]});
	}

	onChoiceNav(c: number)
	{
		const choice: Choice = this.choicesById[c];
		this.onLink.emit({ choice: choice });
	}
}

export enum ErrorTypeEnum
{
	C2C,
	DP2C,
	DP2DP
}
