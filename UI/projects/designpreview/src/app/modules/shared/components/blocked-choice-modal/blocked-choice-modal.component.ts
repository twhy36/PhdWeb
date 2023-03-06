import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { select, Store } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import _ from 'lodash';
import { Choice, DecisionPoint, TreeVersion, UnsubscribeOnDestroy } from 'phd-common';
import { AdobeService } from '../../../core/services/adobe.service';
import { BlockedByItemList } from '../../models/blocked-by.model';

@Component({
	selector: 'blocked-choice-modal',
	templateUrl: './blocked-choice-modal.component.html',
	styleUrls: ['./blocked-choice-modal.component.scss']
})
export class BlockedChoiceModalComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Input() disabledByList: { pointDisabledByList: BlockedByItemList, choiceDisabledByList: BlockedByItemList }
		= { pointDisabledByList: null, choiceDisabledByList: null };
	@Input() choiceLabel: string;

	@Output() closeModal = new EventEmitter();
	@Output() blockedItemClick = new EventEmitter();

	tree: TreeVersion;
	points: DecisionPoint[];
	hiddenChoices: Choice[];
	choices: Choice[];

	constructor(private adobeService: AdobeService,
				private store: Store<fromRoot.State>) 
	{
		super();
				 }

	ngOnInit(): void
	{
		const modalText =
			this.choiceLabel
			+ ' Blocked by: '
			+ this.disabledByList?.pointDisabledByList?.andChoices?.map(c => c.label)?.join(', ')
			+ this.disabledByList?.pointDisabledByList?.andPoints?.map(p => p.label)?.join(', ')
			+ this.disabledByList?.pointDisabledByList?.orChoices?.map(c => c.label)?.join(', ')
			+ this.disabledByList?.pointDisabledByList?.orPoints?.map(p => p.label)?.join(', ');
		+ ' AND '
			+ this.disabledByList?.choiceDisabledByList?.andChoices?.map(c => c.label)?.join(', ')
			+ this.disabledByList?.choiceDisabledByList?.andPoints?.map(p => p.label)?.join(', ')
			+ this.disabledByList?.choiceDisabledByList?.orChoices?.map(c => c.label)?.join(', ')
			+ this.disabledByList?.choiceDisabledByList?.orPoints?.map(p => p.label)?.join(', ');

		this.adobeService.setAlertEvent(modalText, 'Blocked Choice Alert');

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state?.scenario),
		).subscribe((scenario) => 
		{
			if (scenario && scenario.tree?.treeVersion) 
			{
				// check for unfiltered tree 
				this.tree = scenario.tree.treeVersion;
				this.points = _.flatMap(this.tree.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || [];
				this.choices = _.flatMap(this.points, p => p.choices) || [];

				this.hiddenChoices = _.flatMap(this.points, c => _.flatMap(c.choices)).filter(choice => choice.isHiddenFromBuyerView) || [];
			}

		});

	}

	closeClicked()
	{
		this.closeModal.emit();
	}

	onBlockedItemClick(pointId: number)
	{
		this.blockedItemClick.emit(pointId);
	}

	get pointDisabledByMustHaveRules()
	{
		return {
			andPoints: this.disabledByList?.pointDisabledByList?.andPoints.filter(r => r.ruleType === 1),
			andChoices: this.disabledByList?.pointDisabledByList?.andChoices.filter(r => r.ruleType === 1 && this.choices?.find(c => c.id === r.choiceId).quantity === 0),
			orPoints: this.disabledByList?.pointDisabledByList?.orPoints.filter(r => r.ruleType === 1),
			orChoices: this.disabledByList?.pointDisabledByList?.orChoices.filter(r => r.ruleType === 1)
		};
	}

	get choiceDisabledByMustHaveRules()
	{
		return {
			andPoints: this.disabledByList?.choiceDisabledByList?.andPoints.filter(r => r.ruleType === 1),
			andChoices: this.disabledByList?.choiceDisabledByList?.andChoices.filter(r => r.ruleType === 1 && this.choices?.find(c => c.id === r.choiceId).quantity === 0),
			orPoints: this.disabledByList?.choiceDisabledByList?.orPoints.filter(r => r.ruleType === 1),
			orChoices: this.disabledByList?.choiceDisabledByList?.orChoices.filter(r => r.ruleType === 1)
		};
	}

	get pointDisabledByMustNotHaveRules()
	{
		return {
			andPoints: this.disabledByList?.pointDisabledByList?.andPoints.filter(r => r.ruleType === 2),
			andChoices: this.disabledByList?.pointDisabledByList?.andChoices.filter(r => r.ruleType === 2),
			orPoints: this.disabledByList?.pointDisabledByList?.orPoints.filter(r => r.ruleType === 2),
			orChoices: this.disabledByList?.pointDisabledByList?.orChoices.filter(r => r.ruleType === 2)
		};
	}

	get choiceDisabledByMustNotHaveRules()
	{
		return {
			andPoints: this.disabledByList?.choiceDisabledByList?.andPoints.filter(r => r.ruleType === 2),
			andChoices: this.disabledByList?.choiceDisabledByList?.andChoices.filter(r => r.ruleType === 2),
			orPoints: this.disabledByList?.choiceDisabledByList?.orPoints.filter(r => r.ruleType === 2),
			orChoices: this.disabledByList?.choiceDisabledByList?.orChoices.filter(r => r.ruleType === 2)
		};
	}

	disabledByRulesExist(mustHave: boolean)
	{
		const disabledRules = mustHave
			? { point: this.pointDisabledByMustHaveRules, choice: this.choiceDisabledByMustHaveRules} 
			: { point: this.pointDisabledByMustNotHaveRules, choice: this.choiceDisabledByMustNotHaveRules };

		return disabledRules?.point?.andPoints?.length || disabledRules?.point?.andChoices?.length
			|| disabledRules?.point?.orPoints?.length || disabledRules?.point?.orChoices?.length
			|| disabledRules?.choice?.andPoints?.length || disabledRules?.choice?.andChoices?.length
			|| disabledRules?.choice?.orPoints?.length || disabledRules?.choice?.orChoices?.length
	}
}
