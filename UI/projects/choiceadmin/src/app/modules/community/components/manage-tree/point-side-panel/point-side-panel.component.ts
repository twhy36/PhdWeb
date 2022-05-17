import { Component, Input, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';

import { finalize, combineLatest } from 'rxjs/operators';
import { Observable } from 'rxjs';

import * as _ from 'lodash';

import { NgbNavChangeEvent, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ConfirmModalComponent } from '../../../../core/components/confirm-modal/confirm-modal.component';
import { SidePanelComponent } from '../../../../shared/components/side-panel/side-panel.component';

import { TreeService } from '../../../../core/services/tree.service';
import { DivisionalService } from '../../../../core/services/divisional.service';

import { DTPoint, DTSubGroup } from '../../../../shared/models/tree.model';
import { IRule, IRuleItem, RuleType } from '../../../../shared/models/rule.model';
import { PhdApiDto } from '../../../../shared/models/api-dtos.model';
import { IDPointPickType } from '../../../../shared/models/point.model';

@Component({
	selector: 'point-side-panel',
	templateUrl: './point-side-panel.component.html',
	styleUrls: ['./point-side-panel.component.scss']
})
export class PointSidePanelComponent implements OnInit
{
	constructor(
		private _treeService: TreeService,
		private _modalService: NgbModal,
		private _divService: DivisionalService
	) { }

	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Input() currentTab: string;
	@Input() point: DTPoint;
	@Input() sidePanelOpen = false;
	@Input() isReadOnly = false;
	@Input() versionId = 0;
	@Input() isSaving = false;

	@Output() hasChanges = new EventEmitter<boolean>();
	@Output() sidePanelClose = new EventEmitter<boolean>();
	@Output() onPointDetailsChange = new EventEmitter<{ point: DTPoint, pickType: IDPointPickType }>();

	choiceRules: Array<IRule> = [];
	pointRules: Array<IRule> = [];

	pointSelectedItems: Array<IRuleItem> = [];
	choiceSelectedItems: Array<IRuleItem> = [];
	originalSelectedItems: IRuleItem[] = [];

	pointCurrentRule: IRule;
	choiceCurrentRule: IRule;

	pointSearchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point'];
	choiceSearchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];

	pointRulesMessage = '';
	choiceRulesMessage = '';

	isLoadingPointRules = true;
	isLoadingChoiceRules = true;

	pointForm: FormGroup;

	pickTypes: Array<IDPointPickType> = [];
	dependentPointIds: Array<number> = [];
	dependentChoiceIds: Array<number> = [];

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

	get sidePanelHasChanges(): boolean
	{
		const b = this.pointSelectedItems.length > 0 || this.choiceSelectedItems.length > 0;

		this.hasChanges.emit(b);

		return b;
	}

	get canSave(): boolean
	{
		let canSave = this.pointForm.pristine || !this.pointForm.valid || this.isSaving;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !canSave;
		}

		return canSave;
	}

	get allRules(): IRule[]
	{
		return this.choiceRules.concat(this.pointRules)
	}

	ngOnInit(): void
	{
		this.getPointRules();
		this.getChoiceRules();
		this.createPointDetailsForm();
	}

	createPointDetailsForm()
	{
		let item = this.point;

		this._divService.getPointPickTypes().subscribe(pickTypes =>
		{
			this.pickTypes = pickTypes.filter(pt => !(<DTSubGroup>item.parent).isFloorplanSubgroup || pt.dPointPickTypeID < 5);
		});

		let pointPickType: number = item.dto.pointPickTypeId == 0 ? null : item.dto.pointPickTypeId;

		this.pointForm = new FormGroup({
			'pointPickType': new FormControl({ value: pointPickType, disabled: this.isReadOnly }, [Validators.required]),
			'quickQuoteCheck': new FormControl({ value: item.isQuickQuoteItem, disabled: this.isReadOnly }),
			'structCheck': new FormControl({ value: item.isStructuralItem, disabled: this.isReadOnly })
		});
	}

	savePoint()
	{
		this.isSaving = true;

		const pointPickType = this.pointForm.get('pointPickType').value;

		let pickType = this.pickTypes.find(x => x.dPointPickTypeID == pointPickType);
		this.point.isQuickQuoteItem = this.pointForm.get('quickQuoteCheck').value;
		this.point.isStructuralItem = this.pointForm.get('structCheck').value;

		this.onPointDetailsChange.emit({ point: this.point, pickType: pickType });
	}

	async onNavChange($event: NgbNavChangeEvent)
	{
		$event.preventDefault();

		if (this.pointSelectedItems.length > 0 || this.choiceSelectedItems.length > 0 || !this.canSave)
		{
			if (!await this.confirmNavAway())
			{
				// cancel tab change
				return;
			}
		}

		this.choiceSelectedItems = [];
		this.choiceCurrentRule = this.blankRule;
		this.pointSelectedItems = [];
		this.pointCurrentRule = this.blankRule;
		this.onPointDetailsReset();

		this.currentTab = $event.nextId;
	}

	getPointRules()
	{
		this.isLoadingPointRules = true;

		this.pointRules = [];

		this._treeService.getDPointPointRules(this.point.id)
			.pipe(
				combineLatest(this._treeService.getPointChoiceDependent(this.versionId, this.point.id, 0)),
				finalize(() => this.isLoadingPointRules = false))
			.subscribe(([rules, dependent]) =>
			{

				if (rules != null && rules.length > 0)
				{
					const mappedRules = rules.map(rule =>
					{
						return this.mapPointRuleToRule(rule);
					});

					this.pointRules = mappedRules;
				}
				else
				{
					this.setPointMessage();
				}

				this.dependentPointIds = dependent ? dependent.pointDependentIds : [];
				this.dependentChoiceIds = dependent ? dependent.choiceDependentIds : [];
			});
	}

	getChoiceRules()
	{
		this.isLoadingChoiceRules = true;

		this.choiceRules = [];

		this._treeService.getDPointChoiceRules(this.point.id)
			.pipe(finalize(() => this.isLoadingChoiceRules = false))
			.subscribe(rules =>
			{
				if (rules != null && rules.length > 0)
				{
					const mappedRules = rules.map(rule =>
					{
						return this.mapPointRuleToRule(rule);
					});

					this.choiceRules = mappedRules;
				}
				else
				{
					this.setChoiceMessage();
				}
			});
	}

	setPointMessage()
	{
		let message = '';

		if (this.point.choices.length === 0 && !this.isReadOnly)
		{
			message = 'Decision Point has no Choices, unable to add Point Rule.';
		}
		else if (this.pointRules.length === 0 && this.isReadOnly)
		{
			message = 'No Decision Point Rules records found.';
		}

		this.pointRulesMessage = message;
	}

	setChoiceMessage()
	{
		let message = '';

		if (this.point.choices.length === 0 && !this.isReadOnly)
		{
			message = 'Decision Point has no Choices, unable to add Choice Rule.';
		}
		else if (this.choiceRules.length === 0 && this.isReadOnly)
		{
			message = 'No Decision Point Rules records found.';
		}

		this.choiceRulesMessage = message;
	}

	onCancelRule(ruleType: RuleType)
	{
		if (ruleType === 'choice')
		{
			this.choiceCurrentRule.ruleItems = this.originalSelectedItems;

			this.choiceSelectedItems = [];
			this.choiceCurrentRule = this.blankRule;
		}
		else
		{
			this.pointCurrentRule.ruleItems = this.originalSelectedItems;

			this.pointSelectedItems = [];
			this.pointCurrentRule = this.blankRule;
		}

		this.originalSelectedItems = [];
	}

	async onDeleteRule(params: { rule: IRule, ruleType: RuleType })
	{
		if (params.ruleType === 'choice')
		{
			this._treeService.hasAttributeReassignmentByChoice(this.point.id, params.rule.ruleItems.map(c => c.itemId), 'point').subscribe(async choiceIds =>
			{
				// look to see if the requirement is met elsewhere. Filter out the rule we're playing with. Then look to see if the removed item matches any other in other rules.
				let hasDup = this.choiceRules.filter(x => x.id != params.rule.id).some(x => x.ruleItems.findIndex(y => choiceIds.findIndex(z => z === y.itemId) > -1) > -1);

				if (choiceIds.length > 0 && !hasDup && await this.confirmAttributeReassignment(params.rule.ruleItems.filter(c => choiceIds.findIndex(x => x === c.itemId) !== -1).map(c => c.label)))
				{
					this.deleteRule(params.rule, params.ruleType);
				}
				else if (choiceIds.length === 0 || hasDup)
				{
					this.deleteRule(params.rule, params.ruleType, false);
				}
			});
		}
		else
		{
			this.deleteRule(params.rule, params.ruleType, false);
		}
	}

	deleteRule(rule: IRule, ruleType: RuleType, deleteAttributeReassignments: boolean = true)
	{
		this.isSaving = true;

		this._treeService.deleteDPointDPointRuleAssocs(rule.id, deleteAttributeReassignments)
			.pipe(finalize(() => this.isSaving = false))
			.subscribe(response =>
			{
				if (ruleType === 'choice')
				{
					const index = this.choiceRules.indexOf(rule);

					this.choiceRules.splice(index, 1);

					this.point.hasPointToChoiceRules = this.choiceRules.length > 0;
				}
				else
				{
					const index = this.pointRules.indexOf(rule);

					this.pointRules.splice(index, 1);

					this.point.hasPointToPointRules = this.pointRules.length > 0;
				}
			});
	}

	onEditRule(params: { rule: IRule, ruleType: RuleType })
	{
		const ruleItems = params.rule.ruleItems;

		if (params.ruleType === 'choice')
		{
			this.choiceSelectedItems = ruleItems;
			this.choiceCurrentRule = params.rule;
		}
		else
		{
			this.pointSelectedItems = ruleItems;
			this.pointCurrentRule = params.rule;
		}

		this.originalSelectedItems = _.cloneDeep(ruleItems);
	}

	onSaveRule(params: { currentRule: IRule, selectedItems: IRuleItem[], ruleType: RuleType, rules: IRule[], callback: Function })
	{
		if (params.ruleType === 'choice')
		{
			let removedItems = this.originalSelectedItems.filter(x => params.selectedItems.findIndex(y => y.itemId === x.itemId) === -1);

			// check for any related Attribute Reassignments before saving
			this._treeService.hasAttributeReassignmentByChoice(this.point.id, removedItems.map(c => c.itemId), 'point').subscribe(async choiceIds =>
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
		else
		{
			this.saveRule(params.currentRule, params.selectedItems, params.ruleType, params.rules, params.callback);
		}
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

		const pointRule = {
			id: currentRule.id,
			pointId: this.point.id,
			pointRuleId: selectedItems[0].typeId,
			treeVersionId: currentRule.treeVersionId,
			ruleItems: items
		} as PhdApiDto.IDPointRule;

		let obs: Observable<PhdApiDto.IDPointRule>;

		if (ruleType === 'choice')
		{
			obs = this._treeService.saveDPointChoiceRule(pointRule, deleteAttributeReassignments);
		}
		else if (ruleType === 'point')
		{
			obs = this._treeService.saveDPointPointRule(pointRule);
		}

		if (obs)
		{
			obs
				.pipe(finalize(() =>
				{
					this.isSaving = false;

					if (ruleType === 'choice')
					{
						this.choiceSelectedItems = [];
						this.choiceCurrentRule = this.blankRule;
					}
					else
					{
						this.pointSelectedItems = [];
						this.pointCurrentRule = this.blankRule;
					}
				}))
				.subscribe(retRule =>
				{
					const rule = this.mapPointRuleToRule(retRule);
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

					if (ruleType === 'choice')
					{
						this.point.hasPointToChoiceRules = rules.length > 0;
					}
					else
					{
						this.point.hasPointToPointRules = rules.length > 0;
					}

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

		const pointRule = {
			id: params.rule.id,
			pointRuleId: mustHave,
			treeVersionId: params.rule.treeVersionId
		} as PhdApiDto.IDPointRule;

		let obs: Observable<PhdApiDto.IDPointRule>;

		if (params.ruleType === 'choice')
		{
			obs = this._treeService.saveDPointChoiceRule(pointRule);
		}
		else if (params.ruleType === 'point')
		{
			obs = this._treeService.saveDPointPointRule(pointRule);
		}

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

	onPointDetailsReset()
	{
		let pointPickType: number = this.point.dto.pointPickTypeId == 0 ? null : this.point.dto.pointPickTypeId;

		this.pointForm.reset({
			'pointPickType': pointPickType,
			'quickQuoteCheck': this.point.isQuickQuoteItem,
			'structCheck': this.point.isStructuralItem 
		});
	}

	onCancelClick()
	{
		this.onPointDetailsReset();
	}

	async onCloseClick(status: boolean)
	{
		if ((this.pointSelectedItems.length > 0 || this.choiceSelectedItems.length > 0) &&
			(status !== false))
		{
			this.sidePanel.showNavAway();
		}
		else
		{
			this.sidePanelClose.emit(status);
		}
	}

	private mapPointRuleToRule(rule: PhdApiDto.IDPointRule): IRule
	{
		return {
			id: rule.id,
			parentId: rule.pointId,
			typeId: rule.pointRuleId,
			treeVersionId: rule.treeVersionId,
			ruleItems: rule.ruleItems.map(item =>
			{
				return {
					id: item.id,
					itemId: item.itemId,
					label: item.label,
					treeVersionId: rule.treeVersionId,
					typeId: rule.pointRuleId
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
}
