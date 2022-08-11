import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { IRule, IRuleItem, RuleType } from '../../../../shared/models/rule.model';
import { DTChoice, DTPoint, IDTGroup, IDTSubGroup, IDTPoint, IDTChoice } from '../../../../shared/models/tree.model';
import { LoadingService } from '../../../../core/services/loading.service';

import { TreeService } from '../../../../core/services/tree.service';
import { ConfirmModalComponent } from '../../../../core/components/confirm-modal/confirm-modal.component';

import { MessageService } from 'primeng/api';
import { bind } from '../../../../shared/classes/decorators.class';
import * as _ from 'lodash';

@Component({
	selector: 'rule-component',
	templateUrl: './rule.component.html',
	styleUrls: ['./rule.component.scss']
})
export class RuleComponent implements OnInit
{
	@Input() id: number;
	@Input() ruleType: RuleType;
	@Input() versionId: number;
	@Input() title: string;
	@Input() searchFilters: Array<string>;
	@Input() isReadOnly: boolean;
	@Input() currentRule: IRule;
	@Input() rules: Array<IRule> = []; // This set of rules is specific to points or choices, whichever is being viewed
	@Input() allRules: Array<IRule> = []; // This set of rules contains both points and choices
	@Input() selectedItems: Array<IRuleItem> = [];
	@Input() blankRule: IRule;
	@Input() isLoading = true;
	@Input() dependentIds: Array<number> = [];

	@Output() cancelRule = new EventEmitter<RuleType>();
	@Output() deleteRule = new EventEmitter<{ rule: IRule, ruleType: RuleType }>();
	@Output() editRule = new EventEmitter<{ rule: IRule, ruleType: RuleType }>();
	@Output() saveRule = new EventEmitter<{
		currentRule: IRule,
		selectedItems: Array<IRuleItem>,
		ruleType: RuleType,
		rules: Array<IRule>,
		callback: Function
	}>();
	@Output() updateMustHave = new EventEmitter<{ rule: IRule, ruleType: RuleType }>();

	groups: Array<IDTGroup> = [];

	showSearchResults = false;
	showSearchFilter = false;
	searchResultsCount = 0;

	selectedSearchFilter = 'All';
	keyword = '';

	selectedRuleId = 0;

	constructor(
		private _treeService: TreeService,
		private _msgService: MessageService,
		private _modalService: NgbModal,
		private _loadingService: LoadingService
	) { }

	ngOnInit(): void
	{
		this._treeService.currentTree.subscribe(t =>
		{
			if (t)
			{
				this.groups = t.version.groups.map(g =>
				{
					const group = Object.assign({}, g);

					group.subGroups = g.subGroups.map(s =>
					{
						const subGroup = Object.assign({}, s);

						subGroup.points = s.points.map(p =>
						{
							const point = Object.assign({}, p);

							point.choices = p.choices.map(c =>
							{
								const choice = Object.assign({}, c);

								return choice;
							});

							return point;
						});

						return subGroup;
					});

					return group;
				});
			}
			else
			{
				this.groups = [];
			}
		});

		if (this.blankRule)
		{
			this.currentRule = this.blankRule;
		}
	}

	isPointDisabled(point: DTPoint)
	{
		return this.id === point.id
			|| this.selectedItems.some(i => i.itemId === point.id)
			|| _.flatMap(this.allRules, r => r.ruleItems).some(ri => ri.itemId === point.id
				|| point.choices.some(c => c.id === ri.itemId));
	}

	isChoiceDisabled(point: DTPoint, choice: DTChoice)
	{
		return this.id == point.id
			|| this.id == choice.id
			|| _.flatMap(this.allRules, r => r.ruleItems).some(ri => ri.itemId === point.id || ri.itemId === choice.id);
	}

	/**
	 * Adds a decision point or choice to the list of rules
	 * @param id - the id of the decision point or choice that we are creating the rule for
	 * @param ruleType - "point" is point-to-point rule, "choice" is point-to-choice or choice-to-choice rule
	 * @param item - the decision point or choice to add to the rule
	 */
	onAddItemClick(id: number, ruleType: string, item: DTPoint | DTChoice)
	{
		// only add items if:
		// 1 - ruletype is point and selected item's id is not the same as this decision point's id
		// 2 - ruletype is choice and selected item's id is not the same as this choice's id and the selected item is a choice
		if ((ruleType === 'point' && id !== item.id) ||
			(ruleType === 'choice' && (id !== item.id && id !== item.parent.id) && item.parent instanceof DTPoint))
		{
			this.addItem(item);
		}
	}

	resetRule()
	{
		this.showSearchResults = false;
		this.searchResultsCount = 0;
		this.keyword = '';
		this.selectedSearchFilter = 'All';
	}

	localCancelRule()
	{
		this.resetRule();
		this.cancelRule.emit(this.ruleType);
	}

	addItem(item: DTChoice | DTPoint)
	{
		const selectedItems = this.selectedItems;

		const idList = selectedItems.map(x => x.itemId);
		const index = idList.indexOf(item.id);

		if (index === -1)
		{
			const newItem = {
				itemId: item.id,
				label: item.label,
				typeId: this.currentRule.typeId,
				id: 0,
				treeVersionId: item.treeVersionId
			} as IRuleItem;

			selectedItems.push(newItem);
		}
		else
		{
			// alert user that the item has already been added.
			this._msgService.add({ severity: 'info', summary: 'Item Alreaded Added', detail: `This item has already been added.` });
		}
	}

	removeItem(item: IRuleItem)
	{
		const selectedItems = this.selectedItems;
		const idList = selectedItems.map(x => x.itemId);
		const index = idList.indexOf(item.itemId);

		selectedItems.splice(index, 1);
	}

	async localSaveRule()
	{
		const circularReferenceItems = this.dependentIds.length
			? this.selectedItems.filter(x => this.dependentIds.find(id => id === x.itemId))
			: [];

		if (circularReferenceItems.length)
		{
			const message = this.buildCircularReferenceWarningMessage(circularReferenceItems);

			if (!await this.displayWarningMessage(message))
			{
				return;
			}
		}

		let dupes = this.isDuplicateRuleList(this.selectedItems, this.rules);
		if (dupes.length > 0)
		{
			this._loadingService.isSaving$.next(false);
			let error = this.generateDuplicateRuleError(dupes);
			if (!await this.displayWarningMessage(error))
			{
				return;
			}
		}

		this.selectedItems.map(item =>
		{
			item.typeId = item.typeId == null ? 1 : item.typeId;
			return item;
		});

		this.saveRule.emit({
			currentRule: this.currentRule,
			selectedItems: this.selectedItems,
			ruleType: this.ruleType,
			rules: this.rules,
			callback: this.onSaveRuleCallback
		});
	}

	private generateDuplicateRuleError(dupes: IRuleItem[]): string {
		let error = 'Rule already exists: ';
		dupes.map(d => error += d.label + ', ');
		error = error.substring(0, error.length - 2);
		error += ' with type ' + (dupes[0].typeId === 1 ? 'MUST HAVE.' : 'MUST NOT HAVE.');
		return error;
	}

	private isDuplicateRuleList(ruleToBeAdded: IRuleItem[], ruleObject: IRule[]): IRuleItem[]
	{
		let selectedRules = this.cloneTrimAndSortRuleList(ruleToBeAdded);

		for (let existingRule of ruleObject)
		{
			let currentRules = this.cloneTrimAndSortRuleList(existingRule.ruleItems);
			if (_.isEqual(selectedRules, currentRules))
			{
				return selectedRules;
			}
		}

		return [];
	}

	private cloneTrimAndSortRuleList(ruleList: IRuleItem[]): any[]
	{
		// only itemId and typeId matter when checking for duplicate choice to choice rules
		const trimmedList = [];
		ruleList.map(r =>
		{
			trimmedList.push({
				'label': r.label,
				'itemId': r.itemId,
				'typeId': r.typeId
			});
		});
		trimmedList.sort((r1, r2) =>
		{
			if (r1.itemId > r2.itemId)
			{
				return 1;
			}
			else if (r1.itemId < r2.itemId)
			{
				return -1;
			}
			else
			{
				return 0;
			}
		});

		return trimmedList;
	}

	@bind
	private onSaveRuleCallback(success: boolean)
	{
		if (success)
		{
			this._msgService.add({ severity: 'success', summary: 'Rule Saved', detail: `Rule has been saved.` });
		}
		else
		{
			this._msgService.add({ severity: 'danger', summary: 'Error', detail: `Unable to save Rule.` });
		}

		this.resetRule();
	}

	localEditRule(rule: IRule)
	{
		this.editRule.emit({ rule: rule, ruleType: this.ruleType });
	}

	localDeleteRule(rule: IRule)
	{
		this.deleteRule.emit({ rule: rule, ruleType: this.ruleType });
	}

	toggleMustHave(rule: IRule)
	{
		this.updateMustHave.emit({ rule: rule, ruleType: this.ruleType });
	}

	keywordSearch(event: any)
	{
		this.keyword = event['keyword'].trim() || '';
		this.selectedSearchFilter = event['searchFilter'];

		// reset everything to unmatched.
		this._resetAllMatchValues(false);

		this.searchResultsCount = this._mainSearch(this.groups, false);

		this.showSearchResults = true;
	}

	isGroupInterface(arg: any): arg is IDTGroup
	{
		return arg.groupCatalogId !== undefined;
	}

	isSubGroupInterface(arg: any): arg is IDTSubGroup
	{
		return arg.subGroupCatalogId !== undefined;
	}

	isPointInterface(arg: any): arg is IDTPoint
	{
		return arg.divPointCatalogId !== undefined;
	}

	isChoiceInterface(arg: any): arg is IDTChoice
	{
		return arg.divChoiceCatalogId !== undefined;
	}

	// recursively searches groups/subgroups/points/choices
	private _mainSearch = (items: Array<IDTGroup | IDTSubGroup | IDTPoint | IDTChoice>, inheritMatch: boolean): number =>
	{
		let count = 0;
		const isFilteredGroup = this._isFiltered('Group');
		const isFilteredSubGroup = this._isFiltered('SubGroup');
		const isFilteredPoint = this._isFiltered('Decision Point');
		const isFilteredChoice = this._isFiltered('Choice');
		const isNotFiltered = !(isFilteredGroup || isFilteredSubGroup || isFilteredPoint || isFilteredChoice);

		if (items != null)
		{
			items.forEach(i =>
			{
				if (this.isGroupInterface(i))
				{
					if (i.subGroups.length > 0)
					{
						// check for match if no filter has been selected OR filter by group has been selected
						if ((isNotFiltered || isFilteredGroup) && this._isMatch(i.label, this.keyword))
						{
							count++;
							i.matched = true;
							// expand group to show everything in it
							i.open = true;
							// match found so show everything under this group by setting 2nd parm to true (inheritMatch)
							count += this._mainSearch(i.subGroups, true);
						}
						else
						{
							// check for a match in subgroups
							const c = this._mainSearch(i.subGroups, false);
							// match and expand group to show everything in it if match count > 0
							i.matched = c > 0;
							i.open = c > 0;
							count += c;
						}
					}
					else
					{
						// the group does not have any subgroups so set matched to false
						i.matched = false;
					}
				}
				else if (this.isSubGroupInterface(i))
				{
					if (i.points.length > 0)
					{
						// check for match if no filter has been selected OR filter by subgroup has been selected
						// automatically set subgroup matched to true if the group matches (inheritMatch is true)
						if (((isNotFiltered || isFilteredSubGroup) && this._isMatch(i.label, this.keyword)) || inheritMatch)
						{
							count++;
							i.matched = true;
							// expand subgroup to show everything in it
							i.open = true;
							// show everything under this subgroup by setting 2nd parm to true (inheritMatch)
							count += this._mainSearch(i.points, true);
						}
						else
						{
							// check for a match in decision points
							const c = this._mainSearch(i.points, false);
							// match and expand subgroup to show everything in it if match count > 0
							i.matched = c > 0;
							i.open = c > 0;
							count += c;
						}
					}
					else
					{
						// the subgroup does not have any decision points so set matched to false
						i.matched = false;
					}
				}
				else if (this.isPointInterface(i))
				{
					if (i.choices.length > 0)
					{
						// check for match if no filter has been selected OR filter by decision point has been selected
						// automatically set decision point matched to true if the subgroup matches (inheritMatch is true)
						if (((isNotFiltered || isFilteredPoint) && this._isMatch(i.label, this.keyword)) || inheritMatch)
						{
							count++;
							i.matched = true;
							// expand decision point to show everything in it
							i.open = true;
							// show everything under this decision point by setting 2nd parm to true (inheritMatch)
							count += this._mainSearch(i.choices, true);
						}
						else
						{
							// check for a match in choices
							const c = this._mainSearch(i.choices, false);
							// match and expand decision point to show everything in it if match count > 0
							i.matched = c > 0;
							i.open = c > 0;
							count += c;
						}
					}
					else
					{
						// the decision point does not have any choices so set matched to false
						i.matched = false;
					}
				}
				else if (this.isChoiceInterface(i))
				{
					// check for match if no filter has been selected OR filter by choice has been selected
					// automatically set choice matched to true if the decision point matches (inheritMatch is true)
					if (((isNotFiltered || isFilteredChoice) && this._isMatch(i.label, this.keyword)) || inheritMatch)
					{
						count++;
						i.matched = true;
					}
					else
					{
						// choice does not match
						i.matched = false;
					}
				}
			});
		}

		return count;
	}

	private _isMatch = (label: string, keyword: string): boolean =>
	{
		return label.toLowerCase().indexOf(keyword.toLowerCase()) >= 0;
	}

	private _isFiltered(filterType: string)
	{
		let filtered = false;

		if (this.selectedSearchFilter === filterType || this.selectedSearchFilter === 'All')
		{
			filtered = true;
		}

		return filtered;
	}

	private _resetAllMatchValues(value: boolean)
	{
		this.showSearchResults = false;
		this.searchResultsCount = 0;

		this.groups.forEach(gp =>
		{
			gp.matched = value;

			if (gp.subGroups != null)
			{
				gp.subGroups.forEach(sg =>
				{
					sg.matched = value;

					if (sg.points != null)
					{
						sg.points.forEach(dp =>
						{
							dp.matched = value;
						});
					}
				});
			}
		});
	}

	private buildCircularReferenceWarningMessage(items: IRuleItem[]): string
	{
		const points = _.flatMap(this.groups, g => _.flatMap(g.subGroups, sg => sg.points));
		const choices = _.flatMap(this.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, pt => pt.choices)));

		const messages = items.map(item =>
		{
			let message = '';

			if (this.ruleType === 'point')
			{
				const point = points.find(pt => pt.id === item.itemId);

				if (point)
				{
					message = point.label;
				}
			}
			else if (this.ruleType === 'choice')
			{
				const choice = choices.find(c => c.id === item.itemId);

				if (choice)
				{
					const point = points.find(pt => pt.id === choice.parent.id);

					message = point ? `${point.label} - ${choice.label}` : choice.label;
				}
			}

			return message;
		});

		const warningMessage = `Rule will create a circular reference: <br><br>Adjust the rule on: ${messages.join(', ')}<br><br>`;

		return warningMessage;
	}

	private displayWarningMessage(message: string): Promise<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = `Warning!`;
		confirm.componentInstance.body = message;
		confirm.componentInstance.defaultOption = '';

		return confirm.result.then((result) =>
		{
			return false;
		});
	}

	clearFilter()
	{
		this.showSearchResults = false;
	}
}
