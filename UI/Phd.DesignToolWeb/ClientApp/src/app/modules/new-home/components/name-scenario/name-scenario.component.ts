import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';

import { Observable } from 'rxjs/Observable';
import { combineLatest, map, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { never } from 'rxjs/observable/never';

import { ScenarioService } from '../../../core/services/scenario.service';
import { OpportunityService } from '../../../core/services/opportunity.service';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';
import { Scenario } from '../../../shared/models/scenario.model';
import { flipOver } from '../../../shared/classes/animations.class';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromOpportunity from '../../../ngrx-store/opportunity/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';

import { BrowserService } from '../../../core/services/browser.service';
import { NewHomeService } from '../../services/new-home.service';

@Component({
	selector: 'name-scenario',
	templateUrl: './name-scenario.component.html',
	styleUrls: ['./name-scenario.component.scss'],
	animations: [
		flipOver
	]
})
export class NameScenarioComponent extends UnsubscribeOnDestroy implements OnInit
{
	scenarioForm: FormGroup;

	scenario: Scenario;
	nameCheckComplete = true;
	loadingOpportunity: boolean;
	opportunityId: string;
	scenarioName: string = "";
	scenarioId: number = 0;
	scenarioHasSalesAgreement: boolean;
	isTablet$: Observable<boolean>;
	canConfigure: boolean;
	isDuplicateScenarioName: boolean = false;
	scenarioNameInput: string = "";

	private noOppInRoute = false;

	@ViewChild('content') content;

	constructor(private router: Router,
		public scenarioService: ScenarioService,
		public oppService: OpportunityService,
		private activatedRoute: ActivatedRoute,
		private store: Store<fromRoot.State>,
		private browserService: BrowserService,
		private _actions$: Actions,
		private newHomeService: NewHomeService)
	{
		super();
	}

	ngOnInit()
	{
		this.isTablet$ = this.browserService.isTablet();
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.scenario),
			combineLatest(
				this.store.pipe(select(fromScenario.scenarioHasSalesAgreement))
			)
		).subscribe(([scenario, hasAgreement]) =>
		{
			this.scenarioName = scenario && scenario.scenarioName.length ? scenario.scenarioName : '';
			this.scenarioNameInput = this.scenarioName;
			this.scenarioId = scenario ? scenario.scenarioId : 0;
			this.scenarioHasSalesAgreement = hasAgreement;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.opportunity.loadingOpportunity)
		).subscribe(loading => this.loadingOpportunity = loading);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromOpportunity.opportunityId)
		).subscribe(oppId => this.opportunityId = oppId);

		this.store.pipe(
			select(fromOpportunity.opportunityId)
		).subscribe(oppId =>
		{
			this.noOppInRoute = !oppId;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canConfigure)
		).subscribe(canConfigure =>
		{
			this.canConfigure = canConfigure
		});

		this.createForm();
	}

	createForm()
	{
		this.scenarioForm = new FormGroup({
			'scenarioName': new FormControl(this.scenarioNameInput,
				[Validators.maxLength(100), Validators.required])
		});
	}

	createScenario()
	{
		if (this.scenarioNameInput.length > 0 && this.scenarioNameInput !== this.scenarioName)
		{
			this.nameCheckComplete = false;

			this.store.pipe(
				select(fromOpportunity.opportunityId),
				switchMap(oppId => this.scenarioService.isScenarioNameUsed(this.scenarioNameInput, oppId)),
				switchMap(isNameUsed =>
				{
					this.nameCheckComplete = true;

					if (isNameUsed)
					{
						this.isDuplicateScenarioName = true;
						return never();
					}
					else
					{
						// if contactOpp has already been set then it will have an id
						if (this.opportunityId)
						{
							// try to save the opportunity (if opp alread exists in EDH then it will return the existing opp)
							return this.store.pipe(
								take(1),
								select(state => state.opportunity.opportunityContactAssoc),
								switchMap(opp => this.oppService.trySaveOpportunity(opp)),
								switchMap(() => this.store.pipe(select(fromOpportunity.opportunityId)))
							)
						}
					}
				})
			).subscribe(opp =>
			{
				if (!this.scenarioId && !this.scenarioName)
				{
					this._actions$.pipe(
						ofType<ScenarioActions.CreateScenario>(ScenarioActions.ScenarioActionTypes.CreateScenario),
						withLatestFrom(this.store),
						map(([action, store]) =>
						{
							return store.scenario
						})).subscribe(scenario =>
						{
							this.newHomeService.setSubNavItemsStatus(scenario.scenario, scenario.buildMode, null);

							this.store.dispatch(new NavActions.SetSelectedSubNavItem(2));

							this.router.navigate([this.noOppInRoute ? '..' : '../..', 'plan'], { relativeTo: this.activatedRoute });
						});

					this.store.dispatch(new ScenarioActions.CreateScenario(opp.toString(), this.scenarioNameInput));
				}
				else if (!this.scenarioId)
				{
					this.store.dispatch(new ScenarioActions.SetScenarioName(this.scenarioNameInput));
				}
				else
				{
					this.store.dispatch(new ScenarioActions.SetScenarioName(this.scenarioNameInput));

					this.store.dispatch(new ScenarioActions.SaveScenario());
				}
			});
		}
	}

	onKey()
	{
		this.isDuplicateScenarioName = false;
	}

	get subTitle(): string
	{
		return this.scenarioHasSalesAgreement ? "" : "Enter a unique name for this customer's configuration";
	}
}
