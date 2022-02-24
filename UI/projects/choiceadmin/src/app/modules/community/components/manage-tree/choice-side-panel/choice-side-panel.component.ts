import { Component, Input, OnInit, ViewChild, EventEmitter, Output } from '@angular/core';
import { FormGroup, FormControl, Validators, ValidatorFn, AbstractControl } from '@angular/forms';

import { finalize, combineLatest } from 'rxjs/operators';

import * as _ from 'lodash';

import { MessageService } from 'primeng/api';

import { NgbTabChangeEvent, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { TreeService } from '../../../../core/services/tree.service';

import { PhdApiDto, PhdEntityDto } from '../../../../shared/models/api-dtos.model';
import { ITreeOption } from '../../../../shared/models/option.model';
import { DTChoice, DTAttributeGroupCollection } from '../../../../shared/models/tree.model';
import { IChoiceImageAssoc } from '../../../../shared/models/choice.model';
import { IRule, IRuleItem, RuleType } from '../../../../shared/models/rule.model';

import { AssociateAttributeGroupComponent } from '../associate-attribute-groups/associate-attribute-groups.component';
import { AssociateLocationGroupComponent } from '../associate-location-groups/associate-location-groups.component';
import { SidePanelComponent } from '../../../../shared/components/side-panel/side-panel.component';
import { ConfirmModalComponent } from '../../../../core/components/confirm-modal/confirm-modal.component';
import { IFinancialMarket } from '../../../../shared/models/financial-market.model';
import { Permission } from 'phd-common';
import { cloneDeep } from 'lodash';

@Component({
	selector: 'choice-side-panel',
	templateUrl: './choice-side-panel.component.html',
	styleUrls: ['./choice-side-panel.component.scss']
})
export class ChoiceSidePanelComponent implements OnInit
{
	Permission = Permission;

	constructor(
		private _treeService: TreeService,
		private _modalService: NgbModal,
		private _msgService: MessageService
	) { }

	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@ViewChild(AssociateAttributeGroupComponent)
	private assocAttributeGroup: AssociateAttributeGroupComponent;

	@ViewChild(AssociateLocationGroupComponent)
	private assocLocationGroup: AssociateLocationGroupComponent;

	@Input() currentTab: string;
	@Input() choice: DTChoice;
	@Input() sidePanelOpen = false;
	@Input() isReadOnly = false;
	@Input() versionId = 0;
	@Input() isSaving = false;
	@Input() groupsInMarket: DTAttributeGroupCollection;
	@Input() communityId = 0;
	@Input() selectedMarket: IFinancialMarket;
	@Input() canEditTree = false;

	@Output() hasChanges = new EventEmitter<boolean>();
	@Output() sidePanelClose = new EventEmitter();
	@Output() onChoiceDetailsChange = new EventEmitter<{ choice: DTChoice, isDecisionDefault: boolean, description: string, maxQuantity: number }>();

	choiceDetailsForm: FormGroup;
	useMaxQuantity: boolean = false;
	isDefault: boolean = false;
	maxQuantity: number;
	description: string;

	choiceRules: Array<IRule> = [];
	choiceSelectedItems: Array<IRuleItem> = [];
	choiceCurrentRule: IRule;
	choiceSearchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];
	choiceRulesMessage = '';
	originalSelectedItems: IRuleItem[] = [];
	dependentChoiceIds: Array<number> = [];
	choiceImageList: Array<IChoiceImageAssoc> = [];
	origChoiceImageList: Array<IChoiceImageAssoc> = [];
	choiceImagesLoaded = false;
	dragEnable = false;
	dragHasChanged = false;
	lockedFromChanges = false;

	optionRules: Array<PhdApiDto.IChoiceOptionRule> = [];
	optionSelectedItems: Array<ITreeOption> = [];
	optionRulesMessage = '';

	imageUrl = '';

	isLoadingChoiceRules = true;
	isLoadingOptionRules = true;

	ngOnInit(): void
	{
		this.getChoiceRules();
		this.getOptionRules();
		this.getImages();
		this.createChoiceDetailsForm();
	}

	async onNavChange($event: NgbTabChangeEvent)
	{
		$event.preventDefault();

		if (this.choiceSelectedItems.length > 0 || this.optionSelectedItems.length > 0 || (this.assocAttributeGroup && this.assocAttributeGroup.isDirty) || (this.assocLocationGroup && this.assocLocationGroup.isDirty) || !this.canSave)
		{
			if (!await this.confirmNavAway())
			{
				// cancel tab change
				return;
			}
		}

		this.choiceSelectedItems = [];
		this.choiceCurrentRule = this.blankRule;
		this.optionSelectedItems = [];

		this.onChoiceDetailsReset();
		this.updateAttributeGroupsOrder();

		this.currentTab = $event.nextId;
	}

	get sidePanelHasChanges(): boolean
	{
		const b = this.optionSelectedItems.length > 0 || this.choiceSelectedItems.length > 0;

		this.hasChanges.emit(b);

		return b;
	}

	get blankRule()
	{
		return {
			id: 0,
			parentId: 0,
			typeId: 1,
			treeVersionId: this.versionId,
			ruleItems: [],
		} as IRule;
	}

	get disableDefault()
	{
		const choices = this.choice.parent.choices;

		return choices.some((val) =>
		{
			return this.choice.id !== val.id && val.isDecisionDefault === true;
		});
	}

	get choiceImageUrl()
	{
		return this.choice.imagePath;
	}

	getImages()
	{
		this.choiceImagesLoaded = false;
		this.choiceImageList = [];
		this.origChoiceImageList = [];

		this._treeService.getChoiceImages(this.choice.id)
			.pipe(finalize(() => this.choiceImagesLoaded = true))
			.subscribe(choiceImages =>
			{
				if (choiceImages != null)
				{
					choiceImages.forEach(image =>
					{
						const choiceImage = image as IChoiceImageAssoc;

						this.choiceImageList.push(choiceImage);
					});

					// update the flag and count for the image indicator
					this.setImageInfo();

					this.origChoiceImageList = _.cloneDeep(this.choiceImageList);
				}
			});
	}

	saveImageSort()
	{
		this.dragEnable = false;
		this.lockedFromChanges = false;

		if (this.dragHasChanged)
		{
			this.dragHasChanged = false;
			this.isSaving = true;

			const imagesArr = this.choiceImageList.map(g =>
			{
				return {
					dpChoiceId: g.dpChoiceId,
					dpChoiceImageAssocId: g.dpChoiceImageAssocId,
					imageUrl: g.imageUrl,
					sortKey: g.sortKey
				} as IChoiceImageAssoc
			});

			this._treeService.saveChoiceImageSortOrder(imagesArr, this.versionId)
				.pipe(finalize(() => this.isSaving = false))
				.subscribe(response =>
				{
					this._msgService.add({ severity: 'success', summary: 'Sort Saved!' });

					this.origChoiceImageList = cloneDeep(this.choiceImageList);
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
			this.choiceImageList = this.origChoiceImageList;
			this.dragHasChanged = false;
		}
	}

	onDragHasChanged()
	{
		this.dragHasChanged = true;
	}

	set choiceImageUrl(imgUrl: string)
	{
		this.choice.imagePath = imgUrl;
	}

	private setImageInfo()
	{
		const imgCount = this.choiceImageList.length;

		// update the flag and count for the image indicator
		this.choice.hasImage = imgCount > 0;
		this.choice.imageCount = imgCount;
	}

	getChoiceRules()
	{
		this.isLoadingChoiceRules = true;

		this.choiceRules = [];

		this._treeService.getDPChoiceChoiceRules(this.choice.id)
			.pipe(
				combineLatest(this._treeService.getPointChoiceDependent(this.versionId, 0, this.choice.id)),
				finalize(() => this.isLoadingChoiceRules = false))
			.subscribe(([rules, dependent]) =>
			{
				if (rules != null && rules.length > 0)
				{
					const mappedRules = rules.map(rule =>
					{
						return this.mapChoiceRuleToRule(rule);
					});

					this.choiceRules = mappedRules;
				}
				else
				{
					this.setChoiceMessage();
				}

				this.dependentChoiceIds = dependent ? dependent.choiceDependentIds : [];
			});
	}

	getOptionRules()
	{
		this.isLoadingOptionRules = true;

		this.optionRules = [];

		// get option rules.
		this._treeService.getChoiceOptionRules(this.versionId, this.choice.id)
			.pipe(finalize(() => this.isLoadingOptionRules = false))
			.subscribe(rules =>
			{
				if (rules.length > 0)
				{
					this._treeService.currentTreeOptions.subscribe(options =>
					{
						if (options && options.length > 0)
						{
							rules.forEach(optionRule =>
							{
								// find option so we can get the header name
								const option = options.find(x => x.id === optionRule.integrationKey);

								if (option != null)
								{
									optionRule.label = option.optionHeaderName;
								}
							});

							this.optionRules = rules;
						}
						else
						{
							this.optionRules = [];
						}
					});
				}
				else
				{
					this.setOptionMessage();
				}
			});
	}

	setChoiceMessage()
	{
		let message = '';

		if (this.choiceRules.length === 0 && (this.isReadOnly || !this.canEditTree))
		{
			message = 'No Choice Rules records found.';
		}

		this.choiceRulesMessage = message;
	}

	setOptionMessage()
	{
		let message = '';

		if (this.optionRules.length === 0)
		{
			message = 'No Option Rules records found.';
		}

		this.optionRulesMessage = message;
	}

	onCancelRule(ruleType: RuleType)
	{
		this.choiceCurrentRule.ruleItems = this.originalSelectedItems;

		this.choiceSelectedItems = [];
		this.choiceCurrentRule = this.blankRule;

		this.originalSelectedItems = [];
	}

	onDeleteRule(params: { rule: IRule, ruleType: RuleType })
	{
		this._treeService.hasAttributeReassignmentByChoice(this.choice.id, params.rule.ruleItems.map(c => c.itemId), params.ruleType).subscribe(async choiceIds =>
		{
			// look to see if the requirement is met elsewhere. Filter out the rule we're playing with. Then look to see if the removed item matches any other in other rules.
			let hasDup = this.choiceRules.filter(x => x.id != params.rule.id).some(x => x.ruleItems.findIndex(y => choiceIds.findIndex(z => z === y.itemId) > -1) > -1);

			if (choiceIds.length > 0 && !hasDup && await this.confirmAttributeReassignment(params.rule.ruleItems.filter(c => choiceIds.findIndex(x => x === c.itemId) !== -1).map(c => c.label)))
			{
				this.deleteRule(params.rule);
			}
			else if (choiceIds.length === 0 || hasDup)
			{
				this.deleteRule(params.rule, false);
			}
		});
	}

	deleteRule(rule: IRule, deleteAttributeReassignments: boolean = true)
	{
		this.isSaving = true;

		this._treeService.deleteDPChoiceDPChoiceRuleAssocs(rule.id, deleteAttributeReassignments)
			.pipe(finalize(() => this.isSaving = false))
			.subscribe(response =>
			{
				const index = this.choiceRules.indexOf(rule);

				this.choiceRules.splice(index, 1);

				this.choice.hasChoiceRules = this.choiceRules.length > 0;
			});
	}

	onEditRule(params: { rule: IRule, ruleType: RuleType })
	{
		const ruleItems = params.rule.ruleItems;

		this.choiceSelectedItems = ruleItems;
		this.choiceCurrentRule = params.rule;

		this.originalSelectedItems = _.cloneDeep(ruleItems);
	}

	onSaveRule(params: { currentRule: IRule, selectedItems: IRuleItem[], ruleType: RuleType, rules: IRule[], callback: Function })
	{
		let removedItems = this.originalSelectedItems.filter(x => params.selectedItems.findIndex(y => y.itemId === x.itemId) === -1);

		// check for any related Attribute Reassignments before saving
		this._treeService.hasAttributeReassignmentByChoice(this.choice.id, removedItems.map(c => c.itemId), 'choice').subscribe(async choiceIds =>
		{
			let filteredRemovedItems = removedItems.filter(x => choiceIds.findIndex(y => y === x.itemId) > -1);

			// look to see if the requirement is met elsewhere. Filter out the rule we're playing with. Then look to see if the removed item matches any other in other rules.
			let hasDup = params.rules.filter(x => x.id != params.currentRule.id).some(x => x.ruleItems.findIndex(y => filteredRemovedItems.findIndex(z => z.itemId === y.itemId) > -1) > -1);

			if (choiceIds.length > 0 && !hasDup && await this.confirmAttributeReassignment(removedItems.filter(c => choiceIds.findIndex(x => x === c.itemId) !== -1).map(c => c.label)))
			{
				this.saveRule(params.currentRule, params.selectedItems, params.ruleType, params.rules, params.callback, true);
			}
			else if (choiceIds.length === 0 || hasDup)
			{
				this.saveRule(params.currentRule, params.selectedItems, params.ruleType, params.rules, params.callback);
			}
		});
	}

	saveRule(currentRule: IRule, selectedItems: IRuleItem[], ruleType: RuleType, rules: IRule[], callback: Function, deleteAttributeReassignments: boolean = false)
	{
		this.isSaving = true;

		const items = selectedItems.map(item =>
		{
			return {
				id: item.id,
				itemId: item.itemId,
				label: item.label,
				typeId: item.typeId,
				treeVersionId: this.versionId
			} as PhdApiDto.IRuleItemDto;
		});

		const choiceRule = {
			id: currentRule.id,
			choiceId: this.choice.id,
			choiceRuleId: selectedItems[0].typeId,
			treeVersionId: currentRule.treeVersionId,
			ruleItems: items
		} as PhdApiDto.IDPChoiceRule;

		const obs = this._treeService.saveDPChoiceChoiceRule(choiceRule, deleteAttributeReassignments);

		if (obs)
		{
			obs
				.pipe(finalize(() =>
				{
					this.isSaving = false;
					this.choiceSelectedItems = [];
					this.choiceCurrentRule = this.blankRule;
				}))
				.subscribe(retRule =>
				{
					const rule = this.mapChoiceRuleToRule(retRule);
					const idList = rules.map(x => x.id);
					const index = idList.indexOf(rule.id);

					if (index > -1)
					{
						rules.splice(index, 1, rule);
					}
					else
					{
						rules.push(rule);
					}

					this.choice.hasChoiceRules = rules.length > 0;

					callback(true);
				}, (error) => callback(false));
		}
		else
		{
			this.isSaving = false;

			callback(false);
		}
	}

	onUpdateMustHave(params: { rule: IRule, ruleType: RuleType })
	{
		this.isSaving = true;

		const mustHave = params.rule.typeId === 1 ? 2 : 1;

		const choiceRule = {
			id: params.rule.id,
			choiceRuleId: mustHave,
			treeVersionId: params.rule.treeVersionId
		} as PhdApiDto.IDPChoiceRule;

		const obs = this._treeService.saveDPChoiceChoiceRule(choiceRule);

		if (obs)
		{
			obs
				.pipe(finalize(() => { this.isSaving = false; }))
				.subscribe(retRule =>
				{
					params.rule.typeId = mustHave;
					params.rule.ruleItems.map(item => item.typeId = mustHave);
				});
		}
		else
		{
			this.isSaving = false;
		}
	}

	get choiceImagesMessage()
	{
		let message = '';

		if (!this.choice.hasImage && this.isReadOnly)
		{
			message = 'There are no images added to selected choice.';
		}

		return message;
	}

	onSaveImage(params: { imageUrls: string[], callback: Function })
	{
		if (this.choiceImageList.length + params.imageUrls.length <= 10)
		{
			this.isSaving = true;
			let imgUrls = params.imageUrls;
			let choiceImages = [];

			let sort = 0;


			if (this.choiceImageList.length > 0)
			{
				sort = Math.max.apply(Math, this.choiceImageList.map(s => s.sortKey)) + 1;
			}

			imgUrls.forEach(imageUrl =>
			{
				const choiceImage =
					{
						dpChoiceID: this.choice.id,
						imagePath: imageUrl,
						dpChoiceSortOrder: sort,
					} as PhdEntityDto.IDPChoiceDto;

				choiceImages.push(choiceImage);

				sort++;
			});

			this._treeService.saveChoiceImages(choiceImages, this.versionId)
				.pipe(finalize(() =>
				{
					this.isSaving = false;
				}))
				.subscribe(newImages =>
				{
					newImages.map(newImage =>
					{
						this.choiceImageList.push(newImage as IChoiceImageAssoc);
					});

					this.setImageInfo();
				});
		}
		else
		{
			this._msgService.add({ severity: 'error', summary: 'Unable to attach more than 10 images.' });
		}
	}

	onDeleteImage(choice: IChoiceImageAssoc)
	{
		this._treeService.deleteChoiceImage(choice.dpChoiceImageAssocId, choice.dpChoiceId).subscribe(response =>
		{
			this._msgService.add({ severity: 'success', summary: 'Image Deleted!' });

			const index = this.choiceImageList.indexOf(choice);

			this.choiceImageList.splice(index, 1);

			// update the flag and count for the image indicator
			this.setImageInfo();
		},
		(error) =>
		{
			this._msgService.add({ severity: 'error', summary: 'Error deleting image.' });
		});
	}

	async onCloseClick()
	{
		if (this.optionSelectedItems.length > 0 || this.choiceSelectedItems.length > 0 || (this.assocAttributeGroup && this.assocAttributeGroup.isDirty) || (this.assocLocationGroup && this.assocLocationGroup.isDirty))
		{
			if (!await this.confirmNavAway())
			{
				// cancel close
				return;
			}
		}

		this.updateAttributeGroupsOrder();
		this.sidePanelClose.emit();
	}

	private createChoiceDetailsForm()
	{
		this.isDefault = this.choice.isDecisionDefault;
		this.maxQuantity = this.choice.maxQuantity;
		this.useMaxQuantity = this.maxQuantity != null;
		this.description = this.choice.description;

		this.choiceDetailsForm = new FormGroup({
			'isDecisionDefault': new FormControl({ value: this.isDefault, disabled: this.disableDefault || this.isReadOnly || !this.canEditTree }),
			'useMaxQuantity': new FormControl({ value: this.useMaxQuantity, disabled: !this.isDefault || this.isReadOnly || !this.canEditTree }),
			'maxQuantity': new FormControl({ value: this.maxQuantity, disabled: !this.isDefault || (this.isDefault && !this.useMaxQuantity) || this.isReadOnly || !this.canEditTree }, [Validators.min(1), Validators.max(999999), this.numberValidator()]),
			'description': new FormControl({ value: this.description, disabled: this.isReadOnly || !this.canEditTree }, [Validators.maxLength(2000)])
		});
	}

	numberValidator(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			const val: string = control.value;

			// allow numbers >= 1
			const exp = new RegExp(/^\d*[1-9]\d*$/);
			let isValid = val ? exp.test(val) : true;

			return isValid ? null : { numberValidator: true }
		};
	}

	onDefaultChanged()
	{
		const isDefault = this.choiceDetailsForm.get('isDecisionDefault').value as boolean;
		const useMaxQuantity = this.choiceDetailsForm.get('useMaxQuantity');

		if (isDefault)
		{
			useMaxQuantity.enable();
		}
		else
		{
			useMaxQuantity.setValue(null);
			useMaxQuantity.disable();
		}

		// update any changes to maxQuantity
		this.onUseMaxQuantityChanged();
	}

	onUseMaxQuantityChanged()
	{
		const useMaxQuantity = this.choiceDetailsForm.get('useMaxQuantity').value as boolean;
		const maxQuantity = this.choiceDetailsForm.get('maxQuantity');

		useMaxQuantity ? maxQuantity.enable() : maxQuantity.disable();

		if (!useMaxQuantity)
		{
			maxQuantity.setValue(null);
		}
	}

	onChoiceDetailsReset()
	{
		this.isDefault = this.choice.isDecisionDefault;
		this.maxQuantity = this.choice.maxQuantity;
		this.useMaxQuantity = this.maxQuantity != null;
		this.description = this.choice.description;

		this.choiceDetailsForm.reset({
			'isDecisionDefault': this.isDefault,
			'useMaxQuantity': this.useMaxQuantity,
			'maxQuantity': this.maxQuantity,
			'description': this.description
		});

		this.onDefaultChanged();
	}

	onCancelClick()
	{
		this.onChoiceDetailsReset();
	}

	saveChoiceDetails()
	{
		const decisionDefault = this.choiceDetailsForm.get('isDecisionDefault').value as boolean;
		const useMaxQuantity = this.choiceDetailsForm.get('useMaxQuantity').value as boolean;
		const maxQuantity = this.choiceDetailsForm.get('maxQuantity');
		const description = this.choiceDetailsForm.get('description');

		if (useMaxQuantity && maxQuantity.value == null)
		{
			//If they activate the max quantity field, but neglect to enter in a max quantity, the field will default to 1 (after clicking the "Save" button)
			maxQuantity.setValue(1);
		}

		this.onChoiceDetailsChange.emit({ choice: this.choice, isDecisionDefault: decisionDefault, description: description.value, maxQuantity: maxQuantity.value });
	}

	saveClick()
	{
		if (this.currentTab == 'details')
		{
			this.saveChoiceDetails();
		}
	}

	get canSave(): boolean
	{
		let canSave = this.choiceDetailsForm.pristine || !this.choiceDetailsForm.valid || this.isSaving;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !canSave;
		}

		return canSave;
	}

	private mapChoiceRuleToRule(rule: PhdApiDto.IDPChoiceRule): IRule
	{
		return {
			id: rule.id,
			parentId: rule.choiceId,
			typeId: rule.choiceRuleId,
			treeVersionId: rule.treeVersionId,
			ruleItems: rule.ruleItems.map(item =>
			{
				return {
					id: item.id,
					itemId: item.itemId,
					label: item.label,
					treeVersionId: rule.treeVersionId,
					typeId: rule.choiceRuleId
				} as IRuleItem;
			})
		} as IRule;
	}

	private confirmNavAway(): Promise<boolean>
	{
		const confirmMessage = `If you continue you will lose your changes.<br><br>Do you want to continue?`;
		const confirmTitle = `Warning!`;
		const confirmDefaultOption = `Cancel`;

		return this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption);
	}

	private confirmAttributeReassignment(labelList: string[]): Promise<boolean>
	{
		let labels = labelList.map(l => `${l}`).join('<br>');
		const confirmMessage = `You are about to delete the Attribute Group Re-Assignment:<br><br>${labels}<br><br>Do you want to continue?`;
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

	private updateAttributeGroupsOrder()
	{
		if (this.assocAttributeGroup && this.assocAttributeGroup.hasAssociatedGroupOrderChanged)
		{
			this.assocAttributeGroup.updateChoiceGroupAssocs();
		}
	}
}
