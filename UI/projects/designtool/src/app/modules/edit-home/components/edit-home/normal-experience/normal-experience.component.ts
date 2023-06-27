import { Component, OnInit, OnDestroy, Input, OnChanges, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../../ngrx-store/reducers';
import * as fromScenario from '../../../../ngrx-store/scenario/reducer';

import
{
	UnsubscribeOnDestroy, flipOver, Scenario, ScenarioStatusType, PriceBreakdown, TreeFilter, DecisionPoint,
	PickType, SubGroup, Choice, DecisionPointFilterType, Constants
} from 'phd-common';

import { ScenarioService } from '../../../../core/services/scenario.service';

import { ActionBarCallType } from '../../../../shared/classes/constants.class';

@Component({
	selector: 'normal-experience',
	templateUrl: './normal-experience.component.html',
	styleUrls: ['./normal-experience.component.scss'],
	animations: [flipOver]
})
export class NormalExperienceComponent extends UnsubscribeOnDestroy implements OnInit, OnDestroy, OnChanges
{
	choices: Choice[];

	@Input() point: DecisionPoint;
	@Input() subGroup: SubGroup;
	@Input() priceBreakdown: PriceBreakdown;
	@Input() complete: boolean;
	@Input() selectedPointFilter: DecisionPointFilterType;
	@Input() enabledPointFilters: DecisionPointFilterType[];
	@Input() scenarioStatus: ScenarioStatusType;
	@Input() showStatusIndicator: boolean;
	@Input() inChangeOrder: boolean = false;
	@Input() errorMessage: string;
	@Input() treeFilter: TreeFilter;
	@Input() canConfigure: boolean;
	@Input() canOverride: boolean;
	@Input() agreementStatus: string;
	@Input() overrideReason: string;
	@Input() buildMode: string;

	@Output() onToggleChoice = new EventEmitter<{ choice: Choice, saveNow: boolean }>();
	@Output() onSaveScenario = new EventEmitter<void>();
	@Output() pointTypeFilterChanged = new EventEmitter<DecisionPointFilterType>();
	@Output() onBuildIt = new EventEmitter<void>();
	@Output() onChoiceModal = new EventEmitter<Choice>();
	delayedScenario: Subject<Scenario>;

	leftScrollDisabled = false;
	rightScrollDisabled = false;

	monotonyElevationChoiceIds$: Observable<Array<number>>;
	primaryAction: string = 'Generate Agreement';
	salesAgreementId: number;
	isDesignComplete: boolean;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		public scenarioService: ScenarioService,
		private store: Store<fromRoot.State>) { super(); }

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromScenario.buildMode),
			withLatestFrom(this.store.pipe(select(state => state.salesAgreement)))
		).subscribe(([build, salesAgreement]) =>
		{
			if (salesAgreement.id)
			{
				this.salesAgreementId = salesAgreement.id;
				this.primaryAction = 'Agreement Info';
			}
			else if (build === Constants.BUILD_MODE_SPEC)
			{
				this.primaryAction = 'Create Spec';
			}
			else if (build === Constants.BUILD_MODE_MODEL)
			{
				this.primaryAction = 'Create Model';
			}

			this.isDesignComplete = salesAgreement.isDesignComplete;
		});

		if (this.point)
		{
			this.choices = this.point.choices;
		}

		this.monotonyElevationChoiceIds$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.monotonyChoiceIds),
			map(ids =>
			{
				return this.point.dPointTypeId === 1 ? ids.ElevationDivChoiceCatalogIds as number[] : [];
			})
		);
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['point'])
		{
			let { previousValue: previous, currentValue: current } = changes['point'] as { previousValue: DecisionPoint, currentValue: DecisionPoint };

			if (!current)
			{
				return;
			}

			if (!previous || !previous.choices || previous.choices.length !== current.choices.length || previous.choices.some((p, i) => p.id !== current.choices[i].id))
			{
				this.choices = current.choices;
			}
			else
			{
				current.choices.forEach((ch, i) =>
				{
					// assigns but stops OnChanges from triggering on choice-card...maybe
					Object.assign(this.choices[i], ch);
				});
			}
		}
	}

	getSubTitle(): string
	{
		if (this.point)
		{
			switch (this.point.pointPickTypeId)
			{
				case PickType.Pick1:
					return 'Please select 1 of the choices below';
				case PickType.Pick1ormore:
					return 'Please select 1 or more of the Choices below';
				case PickType.Pick0ormore:
					return 'Please select 0 or more of the choices below';
				case PickType.Pick0or1:
					return 'Please select 0 or 1 of the Choices below';
				default:
					return '';
			}
		}

		return '';
	}

	choiceToggleHandler(event: any)
	{
		this.onToggleChoice.emit(event);
	}

	onCallToAction($event: { actionBarCallType: ActionBarCallType })
	{
		switch ($event.actionBarCallType)
		{
			case (ActionBarCallType.PRIMARY_CALL_TO_ACTION):
				if (this.salesAgreementId)
				{
					this.router.navigateByUrl(`/point-of-sale/people/${this.salesAgreementId}`);
				}
				else
				{
					this.onBuildIt.emit();
				}

				break;
		}
	}

	saveAttributes()
	{
		this.onSaveScenario.emit();
	}

	selectDecisionPoint(pointId: number)
	{
		const route = [this.route.snapshot.url[0].path, this.route.snapshot.url[1].path, this.subGroup.points.find(p => p.id === pointId).divPointCatalogId];
		this.router.navigate(route);
	}

	onPointTypeFilterChanged(pointTypeFilter: DecisionPointFilterType)
	{
		this.pointTypeFilterChanged.emit(pointTypeFilter);
	}
}
