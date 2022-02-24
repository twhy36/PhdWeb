import { Component, Input, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';

import * as _ from 'lodash';

import { DTChoice, IDTGroup, IDTSubGroup, IDTPoint, IDTChoice } from '../../../../shared/models/tree.model';

import { TreeService } from '../../../../core/services/tree.service';
import { MessageService } from 'primeng/api';
import { bind } from '../../../../shared/classes/decorators.class';
import { ITreeOption, IOptionRuleChoice, IOptionRuleChoiceGroup } from '../../../../shared/models/option.model';
import { PhdApiDto } from '../../../../shared/models/api-dtos.model';

@Component({
	selector: 'option-choice-rule',
	templateUrl: './option-choice-rule.component.html',
	styleUrls: ['./option-choice-rule.component.scss']
})
export class OptionChoiceRuleComponent implements OnInit, OnDestroy
{
	@Input() option: ITreeOption;
	@Input() optionRule: PhdApiDto.IOptionChoiceRule;
	@Input() isReadOnly: boolean;
	@Input() canCreateAlternateMapping: boolean;

	@Output() deleteRule = new EventEmitter<{ optionRuleChoices: IOptionRuleChoice[], mappingIndex: number, displayIndex: number, callback: Function }>();
	@Output() saveRule = new EventEmitter<{ selectedItems: Array<DTChoice>, callback: Function, mappingIndex: number }>();
	@Output() updateMustHave = new EventEmitter<{ optionRuleChoiceGroup: IOptionRuleChoiceGroup }>();

	groups: Array<IDTGroup> = [];

	searchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];
	showSearchResults = false;
	showSearchFilter = false;
	searchResultsCount = 0;
	selectedSearchFilter = 'All';
	selectedChoices: Array<DTChoice> = [];

	keyword = '';

	selectedRuleId = 0;
	treeSubscription: Subscription;

	showNewRuleForm: boolean = false;
	currentMappingIndex: number = null;
	displayIndex: number = null;
	isNewMapping: boolean = false;
	isEditMapping: boolean = false;

	mappingGroupList: IMappingGroup[] = [];
	choiceList: BehaviorSubject<PhdApiDto.IOptionChoiceRuleChoice[]>

	get ruleFormHeaderText(): string
	{
		return this.isNewMapping ? 'Add New Mapping' : 'Edit Mapping';
	}

	get hideToggleAndDelete(): boolean
	{
		return this.isNewMapping || this.isEditMapping;
	}

	get showMappingTooltip(): boolean
	{
		const groupChoicesByIndex = _.groupBy(this.optionRule.choices, c => c.mappingIndex);
		const groupChoiceSize = _.size(groupChoicesByIndex);

		// only show message if adding/editing where an alternate mapping is in play.
		return this.canCreateAlternateMapping && this.showNewRuleForm && (this.isEditMapping && groupChoiceSize > 1 || this.isNewMapping && groupChoiceSize >= 1);
	}

	constructor(
		private _treeService: TreeService,
		private _msgService: MessageService
	) { }

	ngOnInit(): void
	{
		this.choiceList = new BehaviorSubject<PhdApiDto.IOptionChoiceRuleChoice[]>(this.optionRule.choices);

		this.treeSubscription = this._treeService.currentTree.subscribe(t =>
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
		});

		this.choiceList.subscribe(choiceList =>
		{
			this.mappingGroupList = this.getMappingGroupList(choiceList);
		});
	}

	ngOnDestroy(): void
	{
		if (this.treeSubscription)
		{
			this.treeSubscription.unsubscribe();
		}
	}

	getMappingGroupList(choiceList: PhdApiDto.IOptionChoiceRuleChoice[]): IMappingGroup[]
	{
		const mappingGroupList: IMappingGroup[] = [];
				
		if (this.optionRule.id !== 0 && choiceList.length)
		{
			const groupChoicesByIndex = _.groupBy(choiceList, c => c.mappingIndex);
			const groupChoiceSize = _.size(groupChoicesByIndex);

			// show form if only one Mapping Group found, else hide it.
			this.showNewRuleForm = groupChoiceSize === 1;

			// if working with only one record, then default the currentMappingIndex to that one records value.
			this.currentMappingIndex = groupChoiceSize === 1 ? choiceList[0].mappingIndex : 0;

			for (const index in groupChoicesByIndex)
			{
				if (groupChoicesByIndex.hasOwnProperty(index))
				{
					const choicesByIndex = groupChoicesByIndex[index] as PhdApiDto.IOptionChoiceRuleChoice[];

					// group choices by pointId
					const groupedChoices = _.groupBy(choicesByIndex, c => c.pointId);

					let optChoiceList: IOptionRuleChoiceGroup[] = [];

					for (const key in groupedChoices)
					{
						if (groupedChoices.hasOwnProperty(key))
						{
							const choices = groupedChoices[key] as Array<IOptionRuleChoice>;

							const newItem = {
								choices: choices,
								pointId: choices[0].pointId,
								pointLabel: choices[0].pointLabel
							} as IOptionRuleChoiceGroup;

							optChoiceList.push(newItem);
						}
					}

					mappingGroupList.push({ mappingIndex: parseInt(index), optionRuleChoiceGroups: optChoiceList } as IMappingGroup);
				}
			}
		}
		else
		{
			// auto display the choice selector component if no Rule is found.
			this.showNewRuleForm = true;
			this.isNewMapping = true;
			this.currentMappingIndex = null;
		}

		return mappingGroupList;
	}

	addMapping()
	{
		this.isNewMapping = true;
		this.showNewRuleForm = true;

		// find the largest mappingIndex and add 1 else default to 0
		this.currentMappingIndex = this.optionRule.choices.length ? _.max(this.optionRule.choices.map(x => x.mappingIndex)) + 1 : 0; 
	}

	editMapping(mappingGroup: IMappingGroup, displayIndex: number)
	{
		this.isEditMapping = true;
		this.showNewRuleForm = true;
		this.displayIndex = displayIndex; // used to display which mapping is being edited. 		

		let choiceList = this.optionRule.choices.filter(x => x.mappingIndex === mappingGroup.mappingIndex);

		this.mappingGroupList = this.getMappingGroupList(choiceList);
	}

	deleteMapping(mappingGroup: IMappingGroup, displayIndex: number)
	{
		let optionRuleChoices = this.optionRule.choices.filter(x => x.mappingIndex === mappingGroup.mappingIndex);

		this.deleteRule.emit({ optionRuleChoices: optionRuleChoices, mappingIndex: mappingGroup.mappingIndex, displayIndex: displayIndex, callback: this.onDeleteRuleCallback });
	}

	onAddItemClick(item: DTChoice)
	{
		this.addItem(item);
	}

	removeItemClick(item: DTChoice)
	{
		const index = this.selectedChoices.findIndex(c => c.id === item.id);

		this.selectedChoices.splice(index, 1);
	}

	resetRule()
	{
		this.showSearchResults = false;
		this.searchResultsCount = 0;
		this.keyword = '';
		this.selectedSearchFilter = 'All';
		this.selectedChoices = [];

		this.isNewMapping = false;
		this.isEditMapping = false;
		this.showNewRuleForm = false;
		this.displayIndex = null;

		// update choice list
		this.choiceList.next(this.optionRule.choices);
	}

	localCancelRule()
	{
		this.resetRule();
	}

	addItem(item: DTChoice)
	{
		const idList = this.selectedChoices.map(x => x.id);
		const index = idList.indexOf(item.id);

		if (index === -1)
		{
			// add choice to a list of choices to be added when the user clicks save
			this.selectedChoices.push(item);
		}
		else
		{
			// alert user that the item has already been added.
			this._msgService.add({ severity: 'info', summary: 'Item Alreaded Added', detail: `This item has already been added.` });
		}
	}

	localSaveRule()
	{
		this.saveRule.emit({ selectedItems: this.selectedChoices, callback: this.onSaveRuleCallback, mappingIndex: this.currentMappingIndex || 0 });
	}

	@bind
	private onSaveRuleCallback(success: boolean)
	{
		if (success)
		{
			this._msgService.add({ severity: 'success', summary: 'Mapping Saved', detail: `Mapping has been saved.` });
		}
		else
		{
			this._msgService.add({ severity: 'danger', summary: 'Error', detail: `Unable to save Mapping.` });
		}

		this.resetRule();
	}

	localDeleteRule(choice: IOptionRuleChoice)
	{
		this.deleteRule.emit({ optionRuleChoices: [choice], mappingIndex: null, displayIndex: null, callback: this.onDeleteRuleCallback });
	}

	@bind
	private onDeleteRuleCallback(success: boolean)
	{
		if (success)
		{
			this._msgService.add({ severity: 'success', summary: 'Mapping Deleted', detail: `Mapping has been deleted.` });
		}
		else
		{
			this._msgService.add({ severity: 'danger', summary: 'Error', detail: `Unable to delete Mapping.` });
		}

		this.resetRule();
	}

	toggleMustHave(optionRuleChoiceGroup: IOptionRuleChoiceGroup)
	{
		this.updateMustHave.emit({ optionRuleChoiceGroup: optionRuleChoiceGroup });
	}

	keywordSearch(event: any)
	{
		this.selectedSearchFilter = event['searchFilter'];
		this.keyword = event['keyword'] || '';

		// reset everything to unmatched.
		this._resetAllMatchValues(false);

		this.searchResultsCount = this._mainSearch(this.groups, false);

		this.showSearchResults = true;
	}

	clearFilter()
	{
		this.showSearchResults = false;
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
							const cnt = this._mainSearch(i.subGroups, false);
							// match and expand group to show everything in it if match count > 0
							i.matched = cnt > 0;
							i.open = cnt > 0;
							count += cnt;
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
							const cnt = this._mainSearch(i.points, false);
							// match and expand subgroup to show everything in it if match count > 0
							i.matched = cnt > 0;
							i.open = cnt > 0;
							count += cnt;
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
							const cnt = this._mainSearch(i.choices, false);
							// match and expand decision point to show everything in it if match count > 0
							i.matched = cnt > 0;
							i.open = cnt > 0;
							count += cnt;
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
}

interface IMappingGroup
{
	mappingIndex: number;
	optionRuleChoiceGroups: IOptionRuleChoiceGroup[];
}
