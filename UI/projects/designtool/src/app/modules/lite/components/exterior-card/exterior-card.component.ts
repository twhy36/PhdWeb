import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';
import { ReplaySubject } from 'rxjs';

import * as _ from 'lodash';

import { UnsubscribeOnDestroy, flipOver3, ModalService, ScenarioOption } from 'phd-common';
import { LitePlanOption, Color } from '../../../shared/models/lite.model';
import { MonotonyConflict } from '../../../shared/models/monotony-conflict.model';
import { ModalOverrideSaveComponent } from '../../../core/components/modal-override-save/modal-override-save.component';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as LiteActions from '../../../ngrx-store/lite/actions';

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
	@Input() option: LitePlanOption;
	@Input() color: Color;
	@Input() scenarioOptions: ScenarioOption[];
	@Input() isSelected: boolean;

	@Output() toggled: EventEmitter<{option: LitePlanOption, color: Color}> = new EventEmitter();

	canConfigure: boolean;
	canEditAgreement: boolean;
	canOverride: boolean;
	monotonyConflict = new MonotonyConflict();
	override$ = new ReplaySubject<boolean>(1);
	overrideReason: string;
	cannotEditAgreement: boolean;

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
				const colorItemName = this.option?.colorItems?.find(item => item.colorItemId === this.color.colorItemId)?.name;

				if (monotonyOptions.colorSchemeNames.some(names =>
					names.colorSchemeColorItemName === colorItemName
					&& names.colorSchemeColorName === this.color.name))
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
			select(fromRoot.canEditAgreementOrSpec)
		).subscribe(canEditAgreement =>
		{
			this.canEditAgreement = canEditAgreement;
			this.cannotEditAgreement = !canEditAgreement;
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
		if (this.cannotEditAgreement)
		{
			return 'AGREEMENT LOCKED'
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
		else if (this.canEditAgreement)
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
				body = `This will override the Monotony Conflict and the Cut-off`;
			}
			else if (this.monotonyConflict.monotonyConflict)
			{
				body = `This will override the Monotony Conflict`;
			}
			else
			{
				body = `This will override the Cut-off`;
			}

			const confirm = this.modalService.open(ModalOverrideSaveComponent);

			confirm.componentInstance.title = 'Warning';
			confirm.componentInstance.body = body;
			confirm.componentInstance.defaultOption = 'Cancel';

			return confirm.result.then((result) =>
			{
				if (result !== 'Close')
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
		this.toggled.emit({option: this.option, color: this.color});
	}
}
