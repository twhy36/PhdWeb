import { Component, Input, OnInit, EventEmitter, Output, SimpleChanges, OnChanges } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

import * as _ from 'lodash';

import { finalize, combineLatest } from 'rxjs/operators';

import { NgbModal, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../../../../core/components/confirm-modal/confirm-modal.component';
import { MessageService } from 'primeng/api';

import { DTChoice, IDTPoint, DTree, IDTChoice } from '../../../../shared/models/tree.model';
import { TreeService } from '../../../../core/services/tree.service';
import { PhdApiDto, PhdEntityDto } from '../../../../shared/models/api-dtos.model';
import { ITreeOption, OptionImage, IOptionRuleChoice, IOptionRuleChoiceGroup } from '../../../../shared/models/option.model';

import { cloneDeep } from "lodash";
import { IdentityService, Permission } from 'phd-common';
import { getMaxSortOrderChoice } from '../../../../shared/classes/utils.class';

@Component({
	selector: 'option-side-panel',
	templateUrl: './option-side-panel.component.html',
	styleUrls: ['./option-side-panel.component.scss']
})
export class OptionSidePanelComponent implements OnInit, OnChanges
{
	constructor(
		private _treeService: TreeService,
		private _msgService: MessageService,
		private _modalService: NgbModal,
		private _identityService: IdentityService
	) { }

	@Input() currentTab: string;
	@Input() option: ITreeOption;
	@Input() options: Array<ITreeOption>;
	@Input() sidePanelOpen = false;
	@Input() isReadOnly = false;
	@Input() currentTree: DTree;
	@Input() isSaving = false;
	@Input() selectedMarket: string;
	@Input() canEdit = false;

	@Output() hasChanges = new EventEmitter<boolean>();
	@Output() sidePanelClose = new EventEmitter();
	@Output() isBaseHouseChange = new EventEmitter<{ option: ITreeOption, isBaseHouse: boolean }>();
	@Output() updateTreeChoiceOptionRules = new EventEmitter<{ choices: Array<PhdApiDto.IOptionChoiceRuleChoice>, hasRules: boolean }>();

	optionDetailsForm: FormGroup;

	optionRule: PhdApiDto.IOptionChoiceRule;
	optionRuleSelectedChoices: Array<PhdApiDto.IOptionChoiceRuleChoice> = [];
	optionChoiceList: Array<IDTPoint> = [];
	choiceSearchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];

	isLoadingChoiceRules = true;
	isLoadingReplaceRules = true;

	optionsImageList: Array<OptionImage> = [];
	origOptionsImageList: Array<OptionImage> = [];
	optionImagesLoaded = false;
	hasImages: boolean;
	imageCount: number;
	dragEnable = false;
	dragHasChanged = false;
	lockedFromChanges = false;
	canEditImages = false;
	canCreateAlternateMapping: boolean = false;
	versionId: number = 0;

	ngOnInit(): void
	{
		this.versionId = this.currentTree.version.id;
		this.optionRule = this.blankRule;

		this.getRules();
		this.getImages();
		this.createForm();
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes.selectedMarket)
		{
			this._identityService.hasClaimWithPermission('TreeImages', Permission.Edit).pipe(
				combineLatest(this._identityService.hasMarket(this.selectedMarket))
			).subscribe(([hasTreeImagesClaim, hasMarket]) =>
			{
				this.canEditImages = hasMarket && hasTreeImagesClaim;
				this.canCreateAlternateMapping = true; // ToDo: Feature Switch at a later time. Setting to True for now for future stories.
			});
		}
	}

	async onNavChange($event: NgbNavChangeEvent)
	{
		if (this.optionRuleSelectedChoices.length > 0 || this.dragHasChanged)
		{
			if (!await this.confirmNavAway())
			{
				// cancel tab change
				return;
			}
		}

		this.optionRuleSelectedChoices = [];

		this.resetImageSort();

		this.currentTab = $event.activeId;
	}

	get sidePanelHasChanges(): boolean
	{
		const b = this.optionRuleSelectedChoices.length > 0;

		this.hasChanges.emit(b);

		return b;
	}

	get blankRule(): PhdApiDto.IOptionChoiceRule
	{
		return {
			id: 0,
			integrationKey: this.option.id.toString(),
			planOptionId: 0,
			treeVersionId: this.versionId,
			choices: [],
			replaceRules: []
		} as PhdApiDto.IOptionChoiceRule;
	}

	get optionDescription(): string
	{
		const description = this.option.optionDescription;

		return description || 'No Description';
	}

	getRules()
	{
		this.isLoadingChoiceRules = true;

		if (this.optionRule.id === 0)
		{
			// get saved Option Choice Rules.
			this._treeService.getOptionChoiceRules(this.versionId, this.option.id.toString()).pipe(
				finalize(() =>
				{
					this.isLoadingChoiceRules = false;
				}))
				.subscribe(rule =>
				{
					this.optionRule = rule || this.blankRule;				
				});
		}
	}

	get choiceRulesMessage()
	{
		let message = '';

		if (this.option.baseHouse)
		{
			message = 'Unable to set Choice Rules as this option has been flagged as Included in Base House';
		}
		else if (this.option.optionRuleMappingCount === 0 && (this.isReadOnly || !this.canEdit))
		{
			message = 'No Choice Rules records found.';
		}

		return message;
	}

	get replaceOptionsMessage()
	{
		let message = '';

		if (this.option.optionRuleMappingCount === 0 && !this.isReadOnly && this.canEdit)
		{
			message = 'Must have Choice Rules set before Replace Rules can be added';
		}
		else if (this.option.optionRuleMappingCount === 0 && (this.isReadOnly || !this.canEdit))
		{
			message = 'No Replace Rules records found.';
		}

		return message;
	}

	get optionImagesMessage()
	{
		let message = '';

		if (this.option.treeLevelImageCount === 0 && (this.isReadOnly || !this.canEditImages))
		{
			message = 'There are no images added to selected option.';
		}

		return message;
	}

	onIsBaseHouseChanged()
	{
		const isBaseHouse = this.optionDetailsForm.get('isBaseHouse').value as boolean;

		this.isBaseHouseChange.emit({ option: this.option, isBaseHouse: isBaseHouse });
	}

	onCancelRule()
	{
		this.optionRuleSelectedChoices = [];
	}

	/**
	 * Checks the mappings for all the groups to make sure they all end on the same choice or the choices fall under the same Point.
	 * @param optionRuleChoices
	 * @param isDelete
	 */
	checkMappingRules(optionRuleChoices: IOptionRuleChoice[] = [], isDelete: boolean = false) : boolean
	{
		let isValid = true;

		// group all the choices by their mappedIndex
		const groupChoicesByIndex = _.groupBy(this.optionRule.choices, c => c.mappingIndex);

		// add the results into a easy to handle array
		const groupChoices: IOptionRuleChoice[][] = _.map(groupChoicesByIndex, (ruleChoices) => ruleChoices);

		// will hold each groups max choice id
		let maxChoiceIds: number[] = [];

		// if there is a new mapping, there will not be a record yet so we need to include its maxChoice
		if (!isDelete && optionRuleChoices.length && !this.optionRule.choices.some(c => c.mappingIndex === optionRuleChoices[0].mappingIndex))
		{
			let newMaxChoice = getMaxSortOrderChoice(this.currentTree, optionRuleChoices.map(c => c.choiceId));

			maxChoiceIds.push(newMaxChoice);
		}

		groupChoices.forEach(choiceList =>
		{
			let choiceIdList = choiceList.map(c => c.choiceId);

			// preexisting rules that need to be updated by either adding/deleting choices
			if (optionRuleChoices.length && choiceList[0].mappingIndex === optionRuleChoices[0].mappingIndex)
			{
				if (isDelete)
				{
					// remove each choice from the main list
					optionRuleChoices.forEach(choice =>
					{
						const index = choiceIdList.findIndex(c => c === choice.choiceId);

						// remove choiceId from array
						choiceIdList.splice(index, 1);
					});
				}
				else
				{
					choiceIdList = choiceIdList.concat(optionRuleChoices.map(x => x.choiceId));
				}
			}

			if (choiceIdList.length)
			{
				// get the last choice for each group.
				let maxChoiceId = getMaxSortOrderChoice(this.currentTree, choiceIdList);

				maxChoiceIds.push(maxChoiceId);
			}
		});

		let filteredChoices: IDTChoice[] = [];

		if (maxChoiceIds.length)
		{
			const subGroups = _.flatMap(this.currentTree.version.groups, g => g.subGroups);
			const points = _.flatMap(subGroups, sg => sg.points);
			const choices = _.flatMap(points, p => p.choices);

			// need a full choice record so we can get the point info
			filteredChoices = choices.filter(c => maxChoiceIds.find(x => x === c.id));
		}

		// max choices must be the same or found on the same point.
		if (!maxChoiceIds.every((val, index, arr) => val === arr[0]) && !filteredChoices.every((val, index, arr) => val.parent.id === arr[0].parent.id))
		{
			isValid = false;

			this._msgService.add({ severity: 'error', summary: `All the option's mappings must end in the same choice or on the same pick 1 decision point.` });
		}

		return isValid;
	}

	async onSaveOptionChoiceRule(params: { selectedItems: DTChoice[], callback: Function, mappingIndex: number })
	{
		// check for choices, if none then just add, else we need to do some checks.
		if (this.optionRule.choices.length > 0)
		{
			let selectedItemList = params.selectedItems.map(choice =>
			{
				return {
					choiceId: choice.id,
					mustHave: true,
					pointId: choice.parent.id,
					mappingIndex: params.mappingIndex
				} as PhdApiDto.IOptionChoiceRuleChoice;
			});

			if (this.checkMappingRules(selectedItemList))
			{
				// make sure the list is only for choices with the same mappingIndex.
				let choiceIdList = this.optionRule.choices.filter(c => c.mustHave && c.mappingIndex === params.mappingIndex).map(c => c.choiceId);

				if (choiceIdList.length)
				{
					let newChoiceIdList = choiceIdList.concat(params.selectedItems.map(c => c.id));

					let currentMaxChoiceId = getMaxSortOrderChoice(this.currentTree, choiceIdList);
					let newMaxChoiceId = getMaxSortOrderChoice(this.currentTree, newChoiceIdList);

					let maxChoice = this.optionRule.choices.find(c => c.choiceId === currentMaxChoiceId);

					// check for Attribute Reassignments
					this._treeService.hasAttributeReassignment([maxChoice.id]).subscribe(async hasAttributeReassignment =>
					{
						let deleteAttributeReassignments = hasAttributeReassignment && currentMaxChoiceId !== newMaxChoiceId && await this.confirmAttributeReassignment([maxChoice.label]);

						// if no reassignments proceed or the order doesn't change or show prompt asking if they'd like to continue
						if (!hasAttributeReassignment || currentMaxChoiceId === newMaxChoiceId || deleteAttributeReassignments)
						{
							let assocId = deleteAttributeReassignments ? this.optionRule.choices.find(x => x.choiceId === currentMaxChoiceId).id : null;

							this.saveOptionChoiceRule(params.selectedItems, params.callback, params.mappingIndex, assocId);
						}
					});
				}
				else
				{
					this.saveOptionChoiceRule(params.selectedItems, params.callback, params.mappingIndex);
				}
			}
		}
		else
		{
			this.saveOptionChoiceRule(params.selectedItems, params.callback, params.mappingIndex);
		}
	}

	saveOptionChoiceRule(selectedItems: DTChoice[], callback: Function, mappingIndex: number, assocId?:number)
	{
		this.isSaving = true;

		const optionChoiceRule = {
			id: this.optionRule.id,
			integrationKey: this.optionRule.integrationKey,
			planOptionId: this.optionRule.planOptionId,
			treeVersionId: this.optionRule.treeVersionId,
			choices: [] as PhdApiDto.IOptionChoiceRuleChoice[],
			replaceRules: this.optionRule.replaceRules
		} as PhdApiDto.IOptionChoiceRule;

		// add new choices to the main list
		selectedItems.forEach(choice =>
		{
			const newChoice: PhdApiDto.IOptionChoiceRuleChoice = {
				choiceId: choice.id,
				id: 0,
				label: choice.label,
				mustHave: true,
				optionRuleId: this.optionRule.id,
				pointId: choice.parent.id,
				pointLabel: choice.parent.label,
				treeVersionId: this.optionRule.treeVersionId,
				mappingIndex: mappingIndex
			};

			optionChoiceRule.choices.push(newChoice);
		});

		this._treeService.saveOptionChoiceRules(optionChoiceRule, assocId || 0)
			.pipe(finalize(() => this.isSaving = false))
			.subscribe(optionRule =>
			{
				if (optionRule != null)
				{
					this.optionRule.id = optionRule.id;
					this.optionRule.integrationKey = optionRule.integrationKey;
					this.optionRule.planOptionId = optionRule.planOptionId;
					this.optionRule.treeVersionId = optionRule.treeVersionId;
					this.optionRule.choices = optionRule.choices;
					this.optionRule.replaceRules = optionRule.replaceRules;

					this.onUpdateTreeChoiceOptionRules(optionRule.choices, true);

					const groupChoicesByIndex = _.groupBy(this.optionRule.choices, c => c.mappingIndex);
					const groupChoiceSize = _.size(groupChoicesByIndex);

					this.option.optionRuleMappingCount = groupChoiceSize;

					callback(true);
				}
				else
				{
					callback(false);
				}
			}, (error) => callback(false));
	}
	
	async onDeleteOptionChoiceRule(params: { optionRuleChoices: IOptionRuleChoice[], mappingIndex: number, displayIndex: number, callback: Function })
	{
		// if deleting a full mapping we need to make sure this is what they want before continuing, else lets check the mappingRules
		let confirmDelete = params.displayIndex !== null ? await this.confirmMappingDelete(params.displayIndex + 1) : this.checkMappingRules(params.optionRuleChoices, true);

		// They said YES!!!!!!!!
		if (confirmDelete)
		{
			// get a list of Ids to check for any reassignment records
			let optionRuleChoiceIds = params.optionRuleChoices.map(x => x.id);

			// check for Attribute Reassignments
			this._treeService.hasAttributeReassignment(optionRuleChoiceIds).subscribe(async hasAttributeReassignment =>
			{
				let optionRuleChoiceLabels = params.optionRuleChoices.map(x => x.label);

				// if no reassignments proceed, else show prompt asking if they'd like to continue
				if (!hasAttributeReassignment || (hasAttributeReassignment && await this.confirmAttributeReassignment(optionRuleChoiceLabels)))
				{
					this.deleteOptionChoiceRule(params.optionRuleChoices, params.mappingIndex, params.callback);
				}
			});
		}
	}
	
	deleteOptionChoiceRule(optionRuleChoices: IOptionRuleChoice[], mappingIndex: number, callback: Function)
	{
		this.isSaving = true;

		let firstChoice = optionRuleChoices[0];
		let deleteChoiceMethod = mappingIndex === null ?
			this._treeService.deleteOptionChoiceRuleChoice(firstChoice.id) :
			this._treeService.deleteDPChoiceOptionRuleAssocs(firstChoice.optionRuleId, mappingIndex);

		// delete choice
		deleteChoiceMethod
			.pipe(finalize(() => this.isSaving = false))
			.subscribe(response =>
			{
				// filter by id for the one choice that needs to go bye bye, or if multiple choices then by mappingIndex.
				const choicesToRemove = mappingIndex === null ? this.optionRule.choices.filter(x => x.id === firstChoice.id) : this.optionRule.choices.filter(x => x.mappingIndex === mappingIndex);

				this.onUpdateTreeChoiceOptionRules(choicesToRemove, false);

				choicesToRemove.forEach(choiceAssoc =>
				{
					const index = this.optionRule.choices.findIndex(c => c.id === choiceAssoc.id);

					// remove choice from array
					this.optionRule.choices.splice(index, 1);
				});

				const groupChoicesByIndex = _.groupBy(this.optionRule.choices, c => c.mappingIndex);
				const groupChoiceSize = _.size(groupChoicesByIndex);

				this.option.optionRuleMappingCount = groupChoiceSize;

				// if the count is 0 then we have no option mappings, and no rule.
				if (this.option.optionRuleMappingCount === 0)
				{
					//  no more choices, no more option rule or replace
					this.optionRule = this.blankRule;
				}

				callback(true);
			}, (error) => callback(false));
	}

	private onUpdateTreeChoiceOptionRules(choices: Array<PhdApiDto.IOptionChoiceRuleChoice>, hasRules: boolean)
	{
		this.updateTreeChoiceOptionRules.emit({ choices: choices, hasRules: hasRules });
	}

	updateOptionChoiceRuleMustHave(optionRuleChoiceGroup: IOptionRuleChoiceGroup)
	{
		this.isSaving = true;

		const optChoices: Array<PhdApiDto.IOptionChoiceRuleChoice> = [];

		optionRuleChoiceGroup.choices.forEach(rule =>
		{
			rule.mustHave = !rule.mustHave;

			const choiceRule = {
				id: rule.id,
				mustHave: rule.mustHave
			} as PhdApiDto.IOptionChoiceRuleChoice;

			optChoices.push(choiceRule);
		});

		// save option choice rule choices.
		this._treeService.saveOptionChoiceRuleChoice(this.versionId, optChoices)
			.pipe(finalize(() => this.isSaving = false))
			.subscribe(response =>
			{
				// nothing to see here
			});
	}

	async onUpdateOptionChoiceRuleMustHave(params: { optionRuleChoiceGroup: IOptionRuleChoiceGroup })
	{
		const hasMustHave = params.optionRuleChoiceGroup.choices.some(c => c.mustHave === false);
		const choiceIdList = this.optionRule.choices.filter(c => c.mustHave).map(c => c.choiceId);
		const currentMaxChoiceId = getMaxSortOrderChoice(this.currentTree, choiceIdList);
		const maxChoice = params.optionRuleChoiceGroup.choices.find(c => c.choiceId === currentMaxChoiceId);

		if (!hasMustHave && maxChoice)
		{
			// check for Attribute Reassignments
			this._treeService.hasAttributeReassignment([maxChoice.id]).subscribe(async hasAttributeReassignment =>
			{
				let canToggle = !hasAttributeReassignment || await this.confirmAttributeReassignment([maxChoice.label])

				if (canToggle)
				{
					// update the flag and remove any reassignments if found
					this.updateOptionChoiceRuleMustHave(params.optionRuleChoiceGroup);
				}
			});
		}
		else
		{
			this.updateOptionChoiceRuleMustHave(params.optionRuleChoiceGroup);
		}
	}

	onSaveReplaceOption(params: { option: ITreeOption, callback: Function })
	{
		const dto = {
			id: 0,
			planOptionId: 0,
			optionKey: params.option.id,
			label: params.option.optionHeaderName,
			optionRuleId: this.optionRule.id,
			treeVersionId: this.optionRule.treeVersionId,
		} as PhdApiDto.IOptionReplace;

		// save replace option
		this._treeService.saveReplaceOption(this.versionId, dto).subscribe(replaceOption =>
		{
			if (replaceOption != null)
			{
				const optionReplace: PhdApiDto.IOptionReplace = {
					id: replaceOption.id,
					label: replaceOption.label,
					optionKey: replaceOption.optionKey,
					optionRuleId: replaceOption.optionRuleId,
					planOptionId: replaceOption.planOptionId,
					treeVersionId: replaceOption.treeVersionId
				};

				// add option to replaceRules array
				this.optionRule.replaceRules.push(optionReplace);
			}

			params.callback(params.option);
		});
	}

	onDeleteReplaceOption(params: { rule: PhdApiDto.IOptionReplace, callback: Function })
	{
		this._treeService.deleteOptionRuleReplace(params.rule.id).subscribe(response =>
		{
			const index = this.optionRule.replaceRules.indexOf(params.rule);
			this.optionRule.replaceRules.splice(index, 1);
			params.callback(params.rule);
		});
	}

	getImages()
	{
		this.optionImagesLoaded = false;
		this.optionsImageList = [];
		this.origOptionsImageList = [];

		this._treeService.getOptionImages(this.versionId, this.optionRule.integrationKey)
			.pipe(finalize(() => this.optionImagesLoaded = true))
			.subscribe(optionImages =>
			{
				if (optionImages != null)
				{
					optionImages.forEach(image =>
					{
						const optionImage = new OptionImage(image);

						this.optionsImageList.push(optionImage);
					});

					// update the flag and count for the image indicator
					this.setImageInfo();

					this.origOptionsImageList = cloneDeep(this.optionsImageList);
				}
			});
	}

	editImageSort()
	{
		this.dragEnable = true;
	}

	async cancelImageSort()
	{
		if (!this.dragHasChanged || await this.confirmNavAway())
		{
			this.resetImageSort();
		}
	}

	resetImageSort()
	{
		this.dragEnable = false;

		if (this.dragHasChanged)
		{
			this.optionsImageList = this.origOptionsImageList;
			this.dragHasChanged = false;
		}
	}

	onDragHasChanged()
	{
		this.dragHasChanged = true;
	}

	saveImageSort()
	{
		this.dragEnable = false;
		this.lockedFromChanges = false;

		if (this.dragHasChanged)
		{
			this.dragHasChanged = false;
			this.isSaving = true;

			const imagesArr = this.optionsImageList.map(g =>
			{
				return {
					optionImageId: g.optionImageId,
					dTreeVersionID: g.dTreeVersionId,
					sortKey: g.sortKey
				} as PhdEntityDto.IOptionImageDto;
			});

			this._treeService.saveOptionImageSortOrder(imagesArr)
				.pipe(finalize(() => this.isSaving = false))
				.subscribe(response =>
				{
					this._msgService.add({ severity: 'success', summary: 'Sort Saved!' });

					this.origOptionsImageList = cloneDeep(this.optionsImageList);
				},
				(error) =>
				{
					this._msgService.add({ severity: 'error', summary: 'Error Saving Sort.' });
				});
		}
		else
		{
			this._msgService.add({ severity: 'info', summary: 'Sort was not saved. No changes were made.' });
		}
	}

	onEditImage(image: OptionImage)
	{
		const imageToggle = !image.hideImage;
		const imageDto: PhdEntityDto.IOptionImageDto = {
			optionImageId: image.optionImageId,
			hideImage: imageToggle
		} as PhdEntityDto.IOptionImageDto;

		this._treeService.patchOptionImage(imageDto).subscribe(response =>
		{
			image.hideImage = imageToggle;

			// update the flag and count for the image indicator
			this.setImageInfo();
		});
	}

	onDeleteImage(image: OptionImage)
	{
		this._treeService.deleteOptionImage(image.optionImageId).subscribe(response =>
		{
			const index = this.optionsImageList.indexOf(image);

			this.optionsImageList.splice(index, 1);

			// update the flag and count for the image indicator
			this.setImageInfo();
		});
	}

	onSaveImage(params: { imageUrls: string[], callback: Function })
	{
		this.isSaving = true;
		this.optionImagesLoaded = false;

		let imageUrls = params.imageUrls;
		let optionImages = [];

		let sort = 0;

		if (this.optionsImageList.length > 0)
		{
			sort = Math.max.apply(Math, this.optionsImageList.map(s => s.sortKey)) + 1;
		}

		imageUrls.forEach(imageUrl =>
		{
			const optionImage = {
				imageURL: imageUrl,
				dTreeVersionID: this.versionId,
				sortKey: sort,
				hideImage: false
			} as PhdEntityDto.IOptionImageDto;

			optionImages.push(optionImage);

			sort++;
		});

		this._treeService.saveOptionImages(optionImages, this.option.id.toString())
			.pipe(finalize(() =>
			{
				this.isSaving = false;

				params.callback(true);
			}))
			.subscribe(newImages =>
			{
				this.optionImagesLoaded = true;

				newImages.map(newImage =>
				{
					let image = new OptionImage(newImage);

					this.optionsImageList.push(image);
				});

				this.setImageInfo();
			});
	}

	addAlternateMapping()
	{

	}

	onSaveAttributeReassignment(params: { attributeReassignments: PhdApiDto.IAttributeReassignmentDto[], callback: Function })
	{
		this.isSaving = true;

		this._treeService.saveAttributeReassignments(params.attributeReassignments)
			.pipe(finalize(() => this.isSaving = false))
			.subscribe(attributeReassignments =>
			{
				if (attributeReassignments.length)
				{
					params.callback(true, attributeReassignments);
				}
				else
				{
					params.callback(false);
				}
			}, (error) => params.callback(false));
	}

	onDeleteAttributeReassignment(params: { attributeReassignmentIds: number[], callback: Function })
	{
		this.isSaving = true;

		// delete choice
		this._treeService.deleteAttributeReassignment(params.attributeReassignmentIds)
			.pipe(finalize(() => this.isSaving = false))
			.subscribe(response =>
			{
				params.callback(true, params.attributeReassignmentIds);
			}, (error) => params.callback(false));
	}

	private setImageInfo()
	{
		const imgCount = this.optionsImageList.filter(x => x.hideImage === false).length;

		// update the count for the image indicator
		this.option.treeLevelImageCount = imgCount;
	}

	async onCloseClick()
	{
		if (this.optionRuleSelectedChoices.length > 0 || this.dragHasChanged)
		{
			if (!await this.confirmNavAway())
			{
				// cancel close
				return;
			}
		}

		this.sidePanelClose.emit();
	}

	private createForm()
	{
		const isBaseHouse: boolean = this.option.baseHouse;

		this.optionDetailsForm = new FormGroup({
			'isBaseHouse': new FormControl({ value: isBaseHouse, disabled: this.isReadOnly })
		});
	}

	private confirmNavAway(): Promise<boolean>
	{
		const confirmMessage = `If you continue you will lose your changes.<br><br>Do you want to continue?`;
		const confirmTitle = `Warning!`;
		const confirmDefaultOption = `Cancel`;

		return this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption);
	}

	private confirmAttributeReassignment(attributeGroupLabels: string[]): Promise<boolean>
	{
		let confirmMessage = `You are about to delete the Attribute Group Re-Assignment:<br><br>`;

		attributeGroupLabels.forEach(label => confirmMessage += `${label}<br>`);

		confirmMessage += `<br>Do you want to continue?`;

		const confirmTitle = `Warning!`;
		const confirmDefaultOption = `Cancel`;

		return this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption);
	}

	private confirmMappingDelete(displayIndex: number): Promise<boolean>
	{
		let confirmMessage = `You are about to delete Mapping ${displayIndex}.<br>`;

		confirmMessage += `<br>Do you want to continue?`;

		const confirmTitle = `Warning!`;
		const confirmDefaultOption = `Cancel`;

		return this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption);
	}

	private showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		return confirm.result.then((result) =>
		{
			return result === 'Continue';
		});
	}
}
