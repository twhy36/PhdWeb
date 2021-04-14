import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

import { bind } from '../../../../shared/classes/decorators.class';

import { ITreeOption, ITreeOptionCategory, SearchOption, ITreeOptionSubCategory } from '../../../../shared/models/option.model';
import { PhdApiDto } from '../../../../shared/models/api-dtos.model';

import { TreeService } from '../../../../core/services/tree.service';
import { MessageService } from 'primeng/api';

@Component({
	selector: 'option-rule',
	templateUrl: './option-rule.component.html',
	styleUrls: ['./option-rule.component.scss']
})
export class OptionRuleComponent implements OnInit
{
	@Input() id: number;
	@Input() isReadOnly: boolean;
	@Input() rules: Array<PhdApiDto.IChoiceOptionRule> = [];
	@Input() selectedItems: Array<ITreeOption> = [];
	@Input() isLoading = true;

	@Output() cancelRule = new EventEmitter();
	@Output() deleteRule = new EventEmitter<PhdApiDto.IChoiceOptionRule>();
	@Output() saveRule = new EventEmitter<{ choiceId: number, selectedItems: Array<PhdApiDto.IChoiceOptionRule>, callback: Function }>();

	private _options: Array<ITreeOption> = [];
	options: Observable<Array<ITreeOption>> = this._treeService.currentTreeOptions;
	optionsList: Array<ITreeOptionCategory> = [];

	showSearchResults = false;
	searchResultsCount = 0;

	keyword = '';

	selectedRuleId = 0;

	constructor(
		private _treeService: TreeService,
		private _msgService: MessageService
	) { }

	ngOnInit(): void
	{
		this.getOptions();
	}

	getOptions()
	{
		this.options.subscribe(options =>
		{
			this._options = options;

			if (options)
			{
				// copy options and add a new sort.
				const opt = Array.from(options).sort((a, b) =>
				{
					const col1a = a.categoryName;
					const col1b = b.categoryName;

					const col2a = a.subCategoryName;
					const col2b = b.subCategoryName;

					const col3a = a.id;
					const col3b = b.id;

					const col4a = a.optionHeaderName;
					const col4b = b.optionHeaderName;

					if (col1a < col1b) { return -1; }
					if (col1a > col1b) { return 1; }
					if (col2a < col2b) { return -1; }
					if (col2a > col2b) { return 1; }
					if (col3a < col3b) { return -1; }
					if (col3a > col3b) { return 1; }
					if (col4a < col4b) { return -1; }
					if (col4a > col4b) { return 1; }

					return 0;
				});

				// get distinct categoryNames
				const optCategories = this.distinctByProperty(opt, 'categoryName');

				const optCatList: ITreeOptionCategory[] = [];

				// loop through distinct categoryName list
				for (let x = 0; x < optCategories.length; x++)
				{
					const option = optCategories[x];

					const newOpt = {
						label: option.categoryName,
						matched: true,
						open: true,
						subCategories: []
					} as ITreeOptionCategory;

					// get a list of options matching the categoryName
					let subOpt = opt.filter(o => o.categoryName === option.categoryName);

					// get distinct subCategoryNames
					subOpt = this.distinctByProperty(subOpt, 'subCategoryName');

					// loop through distinct subCategoryNames list
					subOpt.forEach(subOption =>
					{
						const newSubOpt = {
							label: subOption.subCategoryName,
							matched: true,
							open: true,
							optionItems: []
						} as ITreeOptionSubCategory;

						// get options that match catName and subCatName
						const optItemList = opt.filter(o => o.categoryName === option.categoryName && o.subCategoryName === subOption.subCategoryName);

						optItemList.forEach(item =>
						{
							newSubOpt.optionItems.push(new SearchOption(item));
						});

						// sort options by name
						if (optItemList.length > 0)
						{
							newSubOpt.optionItems.sort((a, b) =>
							{
								return a.treeOption.optionHeaderName < b.treeOption.optionHeaderName ? -1 : 1;
							});
						}

						newOpt.subCategories.push(newSubOpt);
					});

					optCatList.push(newOpt);
				}

				this.optionsList = optCatList;
			}
			else
			{
				this.optionsList = [];
			}
		});
	}

	private distinctByProperty(list: any, prop: string): Array<any>
	{
		return list.reduce((a, b) =>
		{
			if (a.length === 0 || a.slice(-1)[0][prop] !== b[prop])
			{
				a.push(b);
			}

			return a;
		}, []);
	}
	get disableSaveButton()
	{
		return this.selectedItems.length === 0;
	}

	onAddItemClick(item: ITreeOption)
	{
		this.addItem(item);
	}

	resetRule()
	{
		this.showSearchResults = false;
		this.searchResultsCount = 0;
		this.keyword = '';
	}

	localCancelRule()
	{
		this.resetRule();
		this.cancelRule.emit();
	}

	private addItem(item: ITreeOption)
	{
		const selectedItems = this.selectedItems;

		const selectedItemsFound = selectedItems.find(x => x.id === item.id);
		const choiceOptionsListFound = this.rules.find(x => x.integrationKey === item.id);

		if (selectedItemsFound == null && choiceOptionsListFound == null)
		{
			selectedItems.push(item);
		}
		else
		{
			this._msgService.add({ severity: 'info', summary: 'Item Alreaded Added', detail: `This item has already been added.` });
		}
	}

	removeItem(id: string)
	{
		const selectedItems = this.selectedItems;
		const idList = selectedItems.map(x => x.id);
		const index = idList.indexOf(id);

		selectedItems.splice(index, 1);
	}

	localSaveRule()
	{
		const optionsToAdd = this.selectedItems.map(option =>
		{
			return {
				integrationKey: option.id.toString(),
				label: option.optionHeaderName
			} as PhdApiDto.IChoiceOptionRule;
		});

		this.saveRule.emit({ choiceId: this.id, selectedItems: optionsToAdd, callback: this.onSaveRuleCallback });
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

	localDeleteRule(option: PhdApiDto.IChoiceOptionRule)
	{
		this.deleteRule.emit(option);
	}

	keywordSearch()
	{
		// reset everything to unmatched.
		this._resetAllMatchValues(false);

		this.searchResultsCount = this._mainSearch(this.optionsList, false);

		this.showSearchResults = true;
	}

	private _mainSearch(items: Array<ITreeOptionCategory>, inheritMatch: boolean): number
	{
		let count = 0;
		const isNotFiltered = this.keyword.length === 0;

		if (items)
		{
			items.forEach(cat =>
			{
				if (cat.subCategories.length > 0)
				{
					cat.subCategories.forEach(subCat =>
					{
						if (subCat.optionItems.length > 0)
						{
							subCat.optionItems.forEach(option =>
							{
								const numberMatch = this._isMatch(option.treeOption.id, this.keyword);
								const textMatch = this._isMatch(option.treeOption.optionHeaderName, this.keyword);

								if (isNotFiltered || numberMatch || textMatch)
								{
									count++;
									option.matched = true;

									subCat.matched = true;
									subCat.open = true;

									cat.matched = true;
									cat.open = true;
								}
								else
								{
									option.matched = false;
								}
							});
						}
					});
				}
			});
		}

		return count;
	}

	private _isMatch(label: string, keyword: string): boolean
	{
		return label.toLowerCase().indexOf(keyword.toLowerCase()) >= 0;
	}

	private _resetAllMatchValues(value: boolean)
	{
		this.showSearchResults = false;
		this.searchResultsCount = 0;

		this.optionsList.forEach(oc =>
		{
			oc.matched = value;

			if (oc.subCategories != null)
			{
				oc.subCategories.forEach(sc =>
				{
					sc.matched = value;

					if (sc.optionItems != null)
					{
						sc.optionItems.forEach(oi =>
						{
							oi.matched = value;
						});
					}
				});
			}
		});
	}
}
