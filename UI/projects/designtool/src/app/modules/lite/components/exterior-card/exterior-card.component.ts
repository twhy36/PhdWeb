import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver3, ModalService, ScenarioOption, Constants } from 'phd-common';
import { LitePlanOption, Color, LitePlanOptionUI } from '../../../shared/models/lite.model';
import { MonotonyConflict } from '../../../shared/models/monotony-conflict.model';
import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as LiteActions from '../../../ngrx-store/lite/actions';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';
import { withLatestFrom } from 'rxjs/operators';

@Component({
	selector: 'exterior-card',
	templateUrl: './exterior-card.component.html',
	styleUrls: ['./exterior-card.component.scss'],
	animations: [
		flipOver3
	]
})
export class ExteriorCardComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() option: LitePlanOptionUI;
	@Input() color: Color;
	@Input() scenarioOptions: ScenarioOption[];
	@Input() isSelected: boolean;

	@Output() toggled: EventEmitter<{ option: LitePlanOption, color: Color }> = new EventEmitter();

	canConfigure: boolean;
	canEditAgreementOrSpec: boolean;
	canOverride: boolean;
	monotonyConflict = new MonotonyConflict();
	override$ = new ReplaySubject<boolean>(1);
	overrideReason: string;
	buildMode: "buyer" | "spec" | "model" | "preview";

	constructor(
		private store: Store<fromRoot.State>,
		private modalService: ModalService)
	{
		super();
	}

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.liteMonotonyOptions)
		).subscribe(monotonyOptions =>
		{
			let conflictMessage: MonotonyConflict = new MonotonyConflict();

			if (!this.color && monotonyOptions?.elevationOptionIds?.some(id => id === this.option.id))
			{
				conflictMessage.elevationConflict = true;
				conflictMessage.monotonyConflict = true;
			}
			else if (this.color && monotonyOptions.colorSchemeNames?.length)
			{
				if (monotonyOptions.colorSchemeNames.some(names =>
					names.colorSchemeColorName === this.color.name))
				{
					conflictMessage.colorSchemeConflict = true;
					conflictMessage.monotonyConflict = true;
				}
			}

			this.monotonyConflict = conflictMessage;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canConfigure)
		).subscribe(canConfigure =>
		{
			this.canConfigure = canConfigure;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canEditAgreementOrSpec),
			withLatestFrom(this.store.pipe(select(fromScenario.buildMode)))
		).subscribe(([canEditAgreementOrSpec, buildMode]) =>
		{
			this.canEditAgreementOrSpec = canEditAgreementOrSpec;
			this.buildMode = buildMode;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canOverride)
		).subscribe(canOverride =>
		{
			this.canOverride = canOverride;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.lite)
		).subscribe(lite =>
		{
			this.overrideReason = lite.elevationOverrideNote || lite.colorSchemeOverrideNote;

			const isOverride = this.color ? !!lite.colorSchemeOverrideNote : !!lite.elevationOverrideNote;
			this.override$.next((isOverride));
		});
	}

	get inCutOffPhaseButCantOverride(): boolean
	{
		return this.option.isPastCutOff && !this.canOverride;
	}

	get inCutOffPhaseAndCanOverride(): boolean
	{
		return this.option.isPastCutOff && this.canOverride;
	}

	get isReadonly(): boolean
	{
		return this.isSelected ? false : !this.option.isActive;
	}

	getName(): string
	{
		return this.color ? this.color.name : this.option.name;
	}

	getButtonLabel(): string
	{
		if (!this.canEditAgreementOrSpec)
		{
			return this.isSelected ? 'selected' : this.buildMode === Constants.BUILD_MODE_SPEC ? 'SPEC LOCKED' : 'AGREEMENT LOCKED';
		}

		return this.isSelected ? 'Unselect' : 'CHOOSE';
	}

	get showConfirmButton(): boolean
	{
		return (!this.monotonyConflict.monotonyConflict || this.canOverride) && this.canConfigure;
	}

	toggleSelection()
	{
		const isOptionSelected = !this.color && !!this.scenarioOptions.find(option => option.edhPlanOptionId === this.option.id);

		const selectedColors = _.flatMap(this.scenarioOptions, opt => opt.scenarioOptionColors) || [];
		const isColorSelected = !!this.color && !!selectedColors.find(color => color.colorItemId === this.color.colorItemId && color.colorId === this.color.colorId);

		if ((this.monotonyConflict.monotonyConflict && !isOptionSelected && !isColorSelected) || this.inCutOffPhaseAndCanOverride)
		{
			this.onOverride();
		}
		else if (this.canEditAgreementOrSpec)
		{
			this.addOverrideReason(null);
		}
	}

	onOverride()
	{
		if (!this.overrideReason)
		{
			let body = '';

			if (this.monotonyConflict.monotonyConflict && this.option.isPastCutOff)
			{
				body = Constants.OVERRIDE_MONOTONY_AND_CUT_OFF;
			}
			else if (this.monotonyConflict.monotonyConflict)
			{
				body = Constants.OVERRIDE_MONOTONY;
			}
			else
			{
				body = Constants.OVERRIDE_CUT_OFF;
			}

			const confirm = this.modalService.open(ModalOverrideSaveComponent);

			confirm.componentInstance.title = Constants.WARNING;
			confirm.componentInstance.body = body;
			confirm.componentInstance.defaultOption = Constants.CANCEL;

			return confirm.result.then((result) =>
			{
				if (result !== Constants.CLOSE)
				{
					this.addOverrideReason(result);
				}
			});
		}
		else
		{
			this.addOverrideReason(this.overrideReason);
		}
	}

	addOverrideReason(overrideReason: string)
	{
		this.override$.next((!!overrideReason));
		this.store.dispatch(new LiteActions.SetLiteOverrideReason(overrideReason, !this.color));
		this.toggled.emit({ option: this.option, color: this.color });
	}
}
