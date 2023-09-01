import { Component, Input, OnInit } from '@angular/core';
import {
	DecisionPoint,
	Group,
	JobChoice,
	SubGroup,
	UnsubscribeOnDestroy,
} from 'phd-common';
import { BuildMode } from '../../../shared/models/build-mode.model';
import { ChoiceCustom } from '../../../shared/components/decision-point-summary/decision-point-summary.component';
import { isChoiceAttributesComplete } from '../../../shared/classes/utils.class';
import { Store, select } from '@ngrx/store';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';

@Component({
	selector: 'summary-row',
	templateUrl: './summary-row.component.html',
	styleUrls: ['./summary-row.component.scss'],
	// eslint-disable-next-line indent
})
export class SummaryRowComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() decisionPoint: DecisionPoint;
	@Input() group: Group;
	@Input() subGroup: SubGroup;
	@Input() contractedOptionsPage: boolean = false;

	includeContractedOptions: boolean;
	salesChoices: JobChoice[];
	isDesignComplete: boolean;
	isReadOnly: boolean;
	choicesCustom: ChoiceCustom[];
	noChoicesSelectedInDecisionPoint: boolean;
	isPresale: boolean;
	isPresalePricingEnabled: boolean;

	constructor(private store: Store<fromRoot.State>) 
	{
		super();
	}

	ngOnInit(): void 
	{
		this.store
			.pipe(this.takeUntilDestroyed(), select(fromFavorite.favoriteState))
			.subscribe((fav) => 
			{
				this.salesChoices = fav?.salesChoices;
				this.includeContractedOptions = fav?.includeContractedOptions;
			});

		this.store
			.pipe(this.takeUntilDestroyed(), select((state) => state.salesAgreement))
			.subscribe((sag) => 
			{
				this.isDesignComplete = sag?.isDesignComplete ?? false;
			});

		this.setPointChoices();
		const choices = this.decisionPoint.choices.filter((c) => c.quantity > 0);
		const favoriteChoices = choices.filter((c) => !this.salesChoices || this.salesChoices.findIndex((sc) => sc.divChoiceCatalogId === c.divChoiceCatalogId) === -1);
		this.store.pipe(
			this.takeUntilDestroyed(),
			select((state) => state.scenario)
		)
			.subscribe((scenarioState) => 
			{
				this.isPresale = scenarioState.buildMode === BuildMode.Presale;
				this.isPresalePricingEnabled = scenarioState.presalePricingEnabled;
				this.isReadOnly = scenarioState.buildMode === BuildMode.BuyerPreview || !favoriteChoices || favoriteChoices.length < 1;
			});
	}

	setPointChoices()
	{
		const choices =
			this.includeContractedOptions || this.contractedOptionsPage
				? this.decisionPoint.choices
				: this.decisionPoint.choices.filter(
					(c) =>
						!this.salesChoices ||
							this.salesChoices.findIndex(
								(sc) =>
									sc.divChoiceCatalogId ===
									c.divChoiceCatalogId
							) === -1
				  );
		this.choicesCustom = choices
			.filter((c) => c.quantity > 0)
			.map((c) => new ChoiceCustom(c));
	}

	isChoiceComplete(choice: ChoiceCustom): boolean
	{
		return isChoiceAttributesComplete(choice) || this.isDesignComplete;
	}

	hasSelectedChoices(choices: ChoiceCustom[]): boolean
	{
		return choices.some((c) => c.quantity > 0);
	}

	toggleCollapsedAttribute(choice: ChoiceCustom): void
	{
		choice.showAttributes = !choice.showAttributes;
	}
}
