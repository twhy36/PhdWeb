import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { select, Store } from '@ngrx/store';

import _ from 'lodash';
import { Choice, DecisionPoint, SubGroup, TreeVersion, UnsubscribeOnDestroy } from 'phd-common';

import { ChoiceExt } from '../../models/choice-ext.model';
import { AdobeService } from '../../../core/services/adobe.service';
import * as fromFavorite from '../../../ngrx-store/favorite/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as NavActions from '../../../ngrx-store/nav/actions';

@Component({
	selector: 'blocked-choice-modal',
	templateUrl: './blocked-choice-modal.component.html',
	styleUrls: ['./blocked-choice-modal.component.scss']
})
export class BlockedChoiceModalComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() choice: ChoiceExt;
	@Input() point: DecisionPoint
	@Input() isNoThanksCard: boolean = false;

	@Output() closeModal = new EventEmitter();
	@Output() blockedItemClick = new EventEmitter();

	choices: Choice[];
	errors: Array<{ errorType: ErrorTypeEnum, disabledBy }> = []; // DP to DP, then DP to Choice, then Choice to Choice
	hasRequiredChoice: boolean = false;
	hiddenChoices: Choice[];
	modalTitle: string = 'Disabled due to';
	myFavoriteId: number;
	points: DecisionPoint[];
	subGroups: SubGroup[];

	constructor(private adobeService: AdobeService, private store: Store<fromRoot.State>, private router: Router) 
	{
		super();
	}

	ngOnInit(): void
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state?.scenario),
		).subscribe((scenario) => 
		{
			if (scenario && scenario.tree?.treeVersion) 
			{
				this.subGroups = _.flatMap(scenario.tree.treeVersion.groups, g => g.subGroups) || [];
				this.points = _.flatMap(this.subGroups, sg => sg.points) || [];
				this.choices = _.flatMap(this.points, p => p.choices) || [];

				this.hiddenChoices = _.flatMap(this.points, c => _.flatMap(c.choices)).filter(choice => choice.isHiddenFromBuyerView) || [];
			}

		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromFavorite.currentMyFavorite),
		).subscribe((fav =>
		{
			this.myFavoriteId = fav.id;
		}));

		this.hasRequiredChoice = this.point?.choices.find(c => c.isRequired)?.isRequired ?? false;

		this.modalTitle = this.point?.disabledBy[0]?.rules[0].ruleType === 1 || this.choice?.disabledBy[0]?.rules[0].ruleType === 1 ? 'Before this can be selected' : 'Disabled due to';

		if (this.point && !!this.point.disabledBy.length)
		{
			// break out decision point to dp rules from dp to choice rules
			const dp2dp = this.point.disabledBy.map(db => { return { rules: db.rules.filter(r => r.points.length > 0) } });
			const dp2c = this.point.disabledBy.map(db => { return { rules: db.rules.filter(r => r.choices.length > 0) } });

			if (dp2dp.filter(r => r.rules.length).length > 0)
			{
				this.errors.push({ errorType: ErrorTypeEnum.DP2DP, disabledBy: dp2dp });
			}

			if (dp2c.filter(r => r.rules.length > 0).length > 0)
			{
				this.errors.push({ errorType: ErrorTypeEnum.DP2C, disabledBy: dp2c });
			}
		}

		if (this.choice && !!this.choice.disabledBy.length)
		{
			this.errors.push({ errorType: ErrorTypeEnum.C2C, disabledBy: this.choice.disabledBy });

			// Prevent other disabled messages from duplicating choices
			const disabledChoices = _.flatMap(this.choice.disabledBy, d => _.flatMap(d.rules, r => r.choices));
			this.choice.disabledByReplaceRules = this.choice.disabledByReplaceRules.filter(ch => !disabledChoices.includes(ch));
		}

		this.filterErrorRules();
		this.handleAdobeAlert();
	}

	/**
	 * Splits the rules for an error into groups of Must Have and Must Not Have, for easier template rendering.
	 */
	filterErrorRules()
	{
		this.errors.forEach(e =>
		{
			e.disabledBy.forEach(d =>
			{
				d.mustHaves = d.rules.filter(r => r.ruleType === 1);
				d.anyMultipleMustHaves = d.mustHaves.some(mh => (mh.choices && mh.choices.length > 1) || (mh.points && mh.points.length > 1));
				d.mustNotHaves = d.rules.filter(r => r.ruleType === 2);
			});
		});
	}

	closeClicked()
	{
		this.closeModal.emit();
	}

	handleDisabledPointClick(pointId: number)
	{
		this.handleBlockedItemClick(pointId);
	}

	handleDisabledChoiceClick(choiceId: number)
	{
		if (!this.checkHiddenFromBuyerView(choiceId))
		{
			const point = this.points.find(p => p.choices.filter(c => c.id === choiceId).length > 0);
			this.handleBlockedItemClick(point.id);
		}
	}

	checkHiddenFromBuyerView(choiceId: number)
	{
		const point = this.points.find(p => p.choices.filter(c => c.id === choiceId).length > 0);
		const choice = point.choices.find(c => c.id === choiceId);

		if (choice.isHiddenFromBuyerView || point.isHiddenFromBuyerView)
		{
			return true;
		}
	}

	private handleBlockedItemClick(pointId: number)
	{
		this.blockedItemClick.emit(pointId);
		if (!this.hiddenChoices.some(choice => choice.id === this.choice.id))
		{
			const subGroup = this.subGroups.find(sg => !!sg.points.find(p => p.id === pointId))
	
			this.store.dispatch(new NavActions.SetSelectedSubgroup(subGroup.id, pointId, null));
			this.router.navigate(['favorites', 'my-favorites', this.myFavoriteId, subGroup.subGroupCatalogId], { queryParamsHandling: 'merge' })
	
			//Scroll to selected blocked point if same blocked point selected and change event not triggered
			if (this.point.id && this.point.id === pointId)
			{
				const decisionBarElement = <HTMLElement>document.getElementById('decision-bar-' + pointId?.toString());
				if (decisionBarElement)
				{
					decisionBarElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
				}
			}
		}
	}

	private handleAdobeAlert()
	{
		let alertText = (this.choice?.label ?? 'No Thanks!') + ' Blocked by: ';
		this.errors.forEach((error, i) => 
		{
			if (i > 0)
			{
				alertText += ' AND '
			}
			error.disabledBy.forEach((r, di) =>
			{
				if (di > 0)
				{
					alertText += ' OR ';
				}

				if (r.mustHaves?.length > 0)
				{
					r.mustHaves.forEach((mh, mhi) =>
					{
						if (mhi > 0)
						{
							alertText += ' OR ';
						}
						mh.points?.forEach((p, pi) =>
						{
							if (pi > 0)
							{
								alertText += ' and ';
							}
							alertText += this.getPointLabel(p);
						});
						mh.choices?.forEach((c, ci) =>
						{
							if (ci > 0)
							{
								alertText += ' and ';
							}
							alertText += this.getChoiceLabel(c);
						});
					});
				}

				if (r.mustNotHaves?.length > 0)
				{
					r.mustNotHaves.forEach((mh, mhi) =>
					{
						if (mhi > 0)
						{
							alertText += ' OR ';
						}
						mh.points?.forEach((p, pi) =>
						{
							if (pi > 0)
							{
								alertText += ' and ';
							}
							alertText += this.getPointLabel(p);
						});
						mh.choices?.forEach((c, ci) =>
						{
							if (ci > 0)
							{
								alertText += ' and ';
							}
							alertText += this.getChoiceLabel(c);
						});
					});
				}
			});
		});
		this.adobeService.setAlertEvent(alertText, 'Blocked Choice Alert');
	}

	private getChoiceLabel(choiceId: number)
	{
		return this.choices.find(c => c.id === choiceId).label;
	}

	private getPointLabel(pointId: number)
	{
		return this.points.find(p => p.id === pointId).label;
	}
}

export enum ErrorTypeEnum
{
	C2C,
	DP2C,
	DP2DP
}