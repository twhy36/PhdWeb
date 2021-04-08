import { Component, Input, OnInit, OnDestroy, Output, EventEmitter, ViewChild } from '@angular/core';

import { finalize } from 'rxjs/operators';

import * as _ from "lodash";

import { AttributeService } from '../../../../core/services/attribute.service';
import { MessageService, Message } from 'primeng/api';

import { AttributeGroupCommunity } from '../../../../shared/models/attribute-group-community.model';
import { DTChoice, IDTGroup, IDTSubGroup, IDTPoint, IDTChoice, AttributeReassignment, DTree } from '../../../../shared/models/tree.model';
import { Subscription } from 'rxjs';
import { TreeService } from '../../../../core/services/tree.service';
import { PhdApiDto, PhdEntityDto } from '../../../../shared/models/api-dtos.model';
import { ITreeOption } from '../../../../shared/models/option.model';
import { bind } from '../../../../shared/classes/decorators.class';
import { ChoiceSelectorComponent } from '../../../../shared/components/choice-selector/choice-selector.component';
import { getMaxSortOrderChoice } from '../../../../shared/classes/utils.class';

@Component({
	selector: 'option-attributes-panel',
	templateUrl: './option-attributes-panel.component.html',
	styleUrls: ['./option-attributes-panel.component.scss']
})
export class OptionAttributesPanelComponent implements OnInit, OnDestroy
{
	@Input() option: ITreeOption;
	@Input() optionRule: PhdApiDto.IOptionChoiceRule;
	@Input() isReadOnly: boolean;
	@Input() currentTree: DTree;

	@Output() saveAttributeReassignment = new EventEmitter<{ attributeReassignment: PhdApiDto.IAttributeReassignmentDto, callback: Function }>();
	@Output() deleteAttributeReassignment = new EventEmitter<{ attributeReassignmentId: number, callback: Function }>();

	@ViewChild(ChoiceSelectorComponent) choiceSelector: ChoiceSelectorComponent;

	optionAttributeMessage: string = '';
	attributeGroups: Array<AttributeGroupCommunity>;
	selectedGroup: AttributeGroupCommunity;
	attributesLoaded: boolean = false;

	treeVersionId: number;
	groups: Array<IDTGroup> = [];

	searchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];
	showSearchResults = false;
	showSearchFilter = false;
	searchResultsCount = 0;
	selectedChoices: Array<DTChoice> = [];

	keyword = '';
	treeSubscription: Subscription;

	selectedAttributeReassignment: AttributeReassignment;

	originalChoice: PhdApiDto.IOptionChoiceRuleChoice;

	constructor(private _msgService: MessageService, private _attrService: AttributeService, private _treeService: TreeService) { }

	get showAttributeReassignment(): boolean
	{
		// To allow Attribute Reassignment the Option must be mapped to a choice, there must be a choice to choice or point to choice rule between the mapped choice and the rule, and the option must have attributes.
		return this.selectedGroup && this.groups && this.groups.length > 0 && (this.optionRule && this.optionRule.choices.length > 0);
	}

	ngOnInit(): void
	{
		this.treeVersionId = this.currentTree.version.id;

		this.getAssociatedAttributeGroups();
	}

	setGroups(choice: PhdEntityDto.IDPChoiceDto)
	{
		let pointToChoices: PhdEntityDto.IDPointRuleAssoc_DPChoiceAssocDto[] = choice.dPointRuleAssoc_DPChoiceAssoc || [];
		let choiceToChoices: PhdEntityDto.IDPChoiceRule_DPChoiceAssocDto[] = choice.dpChoiceRule_DPChoiceAssoc || [];

		// points in point to choice rules featuring the option mapped choice
		let points: number[] = _.flatMap(pointToChoices, p => p.dPoint_DPointRuleAssoc.dPointID);

		// choices in the choice to choice rules featuring the option mapped choice
		let choices: number[] = _.flatMap(choiceToChoices, c => c.dpChoice_DPChoiceRuleAssoc.dpChoiceID)

		// find groups that appear in the point and choice rules
		let filteredGroups = this.currentTree.version.groups.filter(g => g.subGroups.some(sg => sg.points.some(p => (points.findIndex(x => x === p.id) > -1 || p.choices.some(c => choices.findIndex(x => x === c.id) > -1)))));

		this.groups = filteredGroups.map(g =>
		{
			// find subGroups that appear in the point and choice rules
			let filteredSubGroups = g.subGroups.filter(sg => sg.points.some(p => (points.findIndex(x => x === p.id) > -1 || p.choices.some(c => choices.findIndex(x => x === c.id) > -1))));

			if (filteredSubGroups.length)
			{
				const group = Object.assign({}, g);

				group.subGroups = filteredSubGroups.map(s =>
				{
					// find points that appear in the point and choice rules
					let filteredPoints = s.points.filter(p => (points.findIndex(x => x === p.id) > -1 || p.choices.some(c => choices.findIndex(x => x === c.id) > -1)));

					if (filteredPoints.length)
					{
						const subGroup = Object.assign({}, s);

						subGroup.points = filteredPoints.map(p =>
						{
							// find choices that appear in the point and choice rules
							let filteredChoices = p.choices.filter(c => points.findIndex(x => x === c.parent.id) > -1 || choices.findIndex(x => x === c.id) > -1);

							if (filteredChoices.length)
							{
								const point = Object.assign({}, p);

								point.choices = filteredChoices.map(c =>
								{
									const choice = Object.assign({}, c);

									return choice;
								});

								return point;
							}
						});

						return subGroup;
					}
				});

				return group;
			}
		});
	}

	ngOnDestroy(): void
	{
		if (this.treeSubscription)
		{
			this.treeSubscription.unsubscribe();
		}
	}

	getAssociatedAttributeGroups()
	{
		this._attrService.getOptionCommunityAttributeGroups(this.option.optionCommunityId)
			.pipe(finalize(() => this.attributesLoaded = true))
			.subscribe(groups =>
			{
				this.attributeGroups = groups as Array<AttributeGroupCommunity>;

				if (this.attributeGroups && this.attributeGroups.length)
				{
					this.selectedGroup = this.attributeGroups[0];

					if (this.optionRule && this.optionRule.choices.length > 0)
					{
						this.getChoiceRules();
						this.getAttributeReassignment();
					}
				}
				else
				{
					this.optionAttributeMessage = `No Attributes Found.`;
				}
			},
			error =>
			{
				this.optionAttributeMessage = `Unable to load attribute group(s).`;
			});
	}

	getChoiceRules()
	{
		const maxSortOrderChoice = getMaxSortOrderChoice(this.currentTree, this.optionRule.choices.filter(c => c.mustHave).map(c => c.choiceId));

		this.originalChoice = this.optionRule.choices.find(c => c.choiceId === maxSortOrderChoice);

		this._treeService.getChoiceRulesByChoiceId(this.originalChoice.choiceId)
			.subscribe(choice =>
			{
				if (choice)
				{
					this.setGroups(choice);
				}
			},
			error =>
			{

			});
	}

	getAttributeReassignment()
	{
		this.selectedAttributeReassignment = null;

		this._treeService.getAttributeReassignment(this.treeVersionId, this.optionRule.id, this.selectedGroup.id)
			.subscribe(attributeReassignment =>
			{
				if (attributeReassignment)
				{
					attributeReassignment.attributeGroupLabel = this.selectedGroup.groupName;

					this.selectedAttributeReassignment = attributeReassignment;
				}
			},
			error =>
			{

			});
	}

	onChangeAttributeGroup()
	{
		this.resetRule();
		this.getAttributeReassignment();
	}

	keywordSearch(event: any)
	{
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

	onAddItemClick(item: DTChoice)
	{
		this.addItem(item);
	}

	removeItemClick(item: DTChoice)
	{
		const index = this.selectedChoices.findIndex(c => c.id === item.id);

		this.selectedChoices.splice(index, 1);
	}

	addItem(item: DTChoice)
	{
		const idList = this.selectedChoices.map(x => x.id);
		const index = idList.indexOf(item.id);

		if (index === -1)
		{
			// only allowing one selected choice here.
			this.selectedChoices = [item];
		}
		else
		{
			// alert user that the item has already been added.
			this._msgService.add({
				severity: 'info',
				summary: 'Item Alreaded Added',
				detail: `This item has already been added.`
			});
		}
	}

	removeChoiceClick(item: DTChoice)
	{
		const index = this.selectedChoices.findIndex(c => c.id === item.id);

		this.selectedChoices.splice(index, 1);
	}

	removeChoice(attributeReassignmentId: number)
	{
		this.deleteAttributeReassignment.emit({ attributeReassignmentId: attributeReassignmentId, callback: this.onDeleteAttributeReassignment });
	}

	cancelClick()
	{
		this.resetRule();
	}

	saveClick()
	{
		let choice = this.selectedChoices[0];

		let attributeReassignment = {
			attributeReassignmentId: 0,
			attributeGroupId: this.selectedGroup.id,
			toChoiceId: choice.id,
			dpChoiceOptionRuleAssocID: this.originalChoice.id,
			treeVersionId: choice.treeVersionId
		} as PhdApiDto.IAttributeReassignmentDto;

		this.saveAttributeReassignment.emit({ attributeReassignment: attributeReassignment, callback: this.onSaveAttributeReassignmentCallback });
	}

	@bind
	private onSaveAttributeReassignmentCallback(success: boolean, attributeReassignment: AttributeReassignment)
	{
		let message: Message = {};

		if (success)
		{
			let choice = this.selectedChoices[0];

			attributeReassignment.attributeGroupLabel = this.selectedGroup.groupName;
			attributeReassignment.dPointLabel = choice.parent.label;
			attributeReassignment.choiceLabel = choice.label;

			this.selectedAttributeReassignment = attributeReassignment;

			message.severity = 'success';
			message.summary = 'Attribute Reassignment Saved';
			message.detail = 'Attribute Reassignment has been saved.';
		}
		else
		{
			message.severity = 'danger';
			message.summary = 'Error';
			message.detail = 'Unable to save Attribute Reassignment.';
		}

		this._msgService.add(message);

		this.resetRule();
	}

	@bind
	private onDeleteAttributeReassignment(success: boolean)
	{
		let message: Message = {};

		if (success)
		{
			message.severity = 'success';
			message.summary = 'Attribute Reassignment Deleted';
			message.detail = 'Attribute Reassignment has been deleted.';
		}
		else
		{
			message.severity = 'danger';
			message.summary = 'Error';
			message.detail = 'Unable to delete Attribute Reassignment.';
		}

		this._msgService.add(message);

		this.resetRule();

		this.selectedAttributeReassignment = null;
	}

	resetRule()
	{
		this.showSearchResults = false;
		this.searchResultsCount = 0;
		this.keyword = '';
		this.selectedChoices = [];

		if (this.choiceSelector)
		{
			this.choiceSelector.reset();
		}
	}
}
