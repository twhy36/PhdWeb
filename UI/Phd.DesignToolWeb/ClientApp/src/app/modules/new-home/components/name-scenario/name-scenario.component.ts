import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store, select } from '@ngrx/store';

import { Observable } from 'rxjs/Observable';
import { distinctUntilChanged, combineLatest, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { never } from 'rxjs/observable/never';

import { ScenarioService } from '../../../core/services/scenario.service';
import { OpportunityService } from '../../../core/services/opportunity.service';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';
import { Scenario } from '../../../shared/models/scenario.model';
import { PointStatus } from '../../../shared/models/point.model';
import { flipOver } from '../../../shared/classes/animations.class';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromOpportunity from '../../../ngrx-store/opportunity/reducer';

import * as ScenarioActions from '../../../ngrx-store/scenario/actions';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as OppActions from '../../../ngrx-store/opportunity/actions';

import { BrowserService } from '../../../core/services/browser.service';

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
	isTablet$: Observable<boolean>;
	canConfigure: boolean;
	isDuplicateScenarioName: boolean = false;
	private noOppInRoute = false;

	@ViewChild('content') content;

	constructor(private router: Router,
		public scenarioService: ScenarioService,
		public oppService: OpportunityService,
		private activatedRoute: ActivatedRoute,
		private store: Store<fromRoot.State>,
		private browserService: BrowserService) { super(); }

	ngOnInit()
	{
		this.isTablet$ = this.browserService.isTablet();
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.scenario.scenario)
		).subscribe(scenario =>
		{
			this.scenarioName = scenario && scenario.scenarioName.length ? scenario.scenarioName : '';
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
			'scenarioName': new FormControl(this.scenarioName,
				[Validators.maxLength(100), Validators.required])
		});
	}

	createScenario()
	{
		const scenarioName = this.scenarioForm.get('scenarioName').value.trim();

		if (scenarioName.length > 0 && scenarioName !== this.scenarioName)
		{
			this.nameCheckComplete = false;

			this.store.pipe(
				select(fromOpportunity.opportunityId),
				switchMap(oppId => this.scenarioService.isScenarioNameUsed(scenarioName, oppId)),
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
				this.store.dispatch(new ScenarioActions.CreateScenario(opp.toString(), scenarioName));

				this.store.dispatch(new NavActions.SetSubNavItemStatus(1, PointStatus.COMPLETED));
				this.store.dispatch(new NavActions.SetSubNavItemStatus(2, PointStatus.REQUIRED));
				this.store.dispatch(new NavActions.SetSubNavItemStatus(3, PointStatus.REQUIRED));
				this.store.dispatch(new NavActions.SetSubNavItemStatus(4, PointStatus.REQUIRED));
				this.store.dispatch(new NavActions.SetSelectedSubNavItem(2));

				this.router.navigate([this.noOppInRoute ? '..' : '../..', 'plan'], { relativeTo: this.activatedRoute });
			});
		}
	}

	onKey()
	{
		this.isDuplicateScenarioName = false;
	}
}
