import { Component, Input, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';

import { ReplaySubject, BehaviorSubject } from 'rxjs';

import { DTChoice } from '../../../../shared/models/tree.model';
import { AttributeGroupMarket } from '../../../../shared/models/attribute-group-market.model';
import { AttributeGroupCommunity } from '../../../../shared/models/attribute-group-community.model';
import { AttributeGroupActionPanelComponent } from '../../../../shared/components/attribute-group-action-panel/attribute-group-action-panel.component';

import { AttributeService } from '../../../../core/services/attribute.service';
import { ActionButton } from '../../../../shared/models/action-button.model';
import { PhdApiDto } from '../../../../shared/models/api-dtos.model';

import { unionBy, cloneDeep, orderBy, maxBy } from "lodash";
import { MessageService } from 'primeng/api';
import { UiUtilsService } from '../../../../core/services/ui-utils.service';
import { Constants } from 'phd-common';

@Component({
	selector: 'associate-attribute-groups',
	templateUrl: './associate-attribute-groups.component.html',
	styleUrls: ['./associate-attribute-groups.component.scss']
})
export class AssociateAttributeGroupComponent implements OnInit
{
	@ViewChild('addGroups')
	private addGroups: AttributeGroupActionPanelComponent;

	@ViewChild('removeGroups')
	private removeGroups: AttributeGroupActionPanelComponent;

	@Input() choice: DTChoice;
	@Input() groupsInMarket: Array<AttributeGroupMarket> = [];
	@Input() isReadOnly: boolean = true;
	@Input() communityId = 0;
	@Input() optionRules: Array<PhdApiDto.IChoiceOptionRule> = [];

	availableGroups: BehaviorSubject<Array<AttributeGroupMarket>>;

	currentAssociatedGroups: Array<AttributeGroupCommunity>;
	associatedGroups: ReplaySubject<Array<AttributeGroupCommunity>>;
	isLoading = new BehaviorSubject<boolean>(false);

	hasGroupAssociated: boolean = false;
	hasAssociatedGroupOrderChanged: boolean = false;

	get isDirty()
	{
		return this.addGroups && this.addGroups.selectedGroups.length > 0
			|| this.removeGroups && this.removeGroups.selectedGroups.length > 0;
	}

	addAssocButtons: Array<ActionButton> = [
		{ text: Constants.ASSOCIATE, class: 'btn btn-primary', action: this.saveAssociation.bind(this), disabled: true },
		{ text: Constants.CANCEL, class: 'btn btn-secondary', action: this.cancelAssociation.bind(this), disabled: false }
	];

	removeAssocButtons: Array<ActionButton> = [
		{ text: Constants.REMOVE, class: 'btn btn-primary', action: this.removeAssociation.bind(this), disabled: true },
		{ text: Constants.CANCEL, class: 'btn btn-secondary', action: this.cancelRemoveAssociation.bind(this), disabled: false }
	];

	constructor(private cd: ChangeDetectorRef, private _uiUtilsService: UiUtilsService, private _msgService: MessageService, private _attrService: AttributeService) { }

	ngOnInit(): void
	{
		this.availableGroups = new BehaviorSubject<Array<AttributeGroupMarket>>(this.groupsInMarket);
		this.associatedGroups = new ReplaySubject<Array<AttributeGroupCommunity>>(1);

		this.associatedGroups.subscribe(group =>
		{
			if (group)
			{
				if (this.groupsInMarket)
				{
					var availGrps = group.length > 0 ? this.groupsInMarket.filter(g => !group.find(grp => grp.attributeGroupMarketId === g.id)) : this.groupsInMarket;

					this.availableGroups.next(availGrps);
				}

				this.hasGroupAssociated = group.length > 0;

				// only update the choice if attributes are tied to the choice and not a option
				if (!this.optionRules || this.optionRules.length === 0)
				{
					this.choice.hasAttributes = group.length > 0;
				}

				this.cd.detectChanges();
			}
		});

		if (this.optionRules && this.optionRules.length)
		{
			let optionKeys = this.optionRules.map(r => r.integrationKey);

			this.checkOptionAttributeGroups(optionKeys);
		}
		else
		{
			this.getAssociatedGroups();
		}
	}

	isLoadingChange(value: boolean)
	{
		this.isLoading.next(value);
	}

	checkOptionAttributeGroups(optionKeys: Array<string>)
	{
		this.isLoading.next(true);

		this._attrService.checkOptionAttributeGroups(this.choice.id, this.choice.treeVersionId, this.communityId, optionKeys).subscribe(groups =>
		{
			this.currentAssociatedGroups = groups as Array<AttributeGroupCommunity>;
			this.associatedGroups.next(this.currentAssociatedGroups);

			if (!this.currentAssociatedGroups.length)
			{
				this.isLoading.next(false);
			}
		},
			error =>
			{
				this._msgService.add({
					id: 'toast-attributes-choice',
					key: 'toast-attributes-choice',
					severity: 'danger',
					summary: 'Error',
					detail: `Unable to load associated attribute group(s).`
				});

				this.isLoading.next(false);
			});
	}

	getAssociatedGroups()
	{
		this.isLoading.next(true);

		this._attrService.getChoiceAttributeGroups(this.choice.id, this.choice.treeVersionId).subscribe(groups =>
		{
			this.currentAssociatedGroups = groups as Array<AttributeGroupCommunity>;
			this.associatedGroups.next(this.currentAssociatedGroups);

			if (!this.currentAssociatedGroups.length)
			{
				this.isLoading.next(false);
			}
		},
			error =>
			{
				this._msgService.add({
					id: 'toast-attributes-choice',
					key: 'toast-attributes-choice',
					severity: 'danger',
					summary: 'Error',
					detail: `Unable to load associated attribute group(s).`
				});

				this.isLoading.next(false);
			});
	}

	saveAssociation()
	{
		this.isLoading.next(true);
		let selectGroupMarketIds = this.addGroups.selectedGroups.map(g => g.id);

		const lastGroup = this.currentAssociatedGroups.length ? maxBy(this.currentAssociatedGroups, 'sortOrder') : null;
		const sortOrder = lastGroup ? lastGroup.sortOrder + 1 : 0;

		this._attrService
			.addChoiceAttributeGroupAssocs(this.choice.id, this.choice.treeVersionId, this.communityId, sortOrder, selectGroupMarketIds)
			.subscribe(groups =>
			{
				let attributeGroups = groups as Array<AttributeGroupCommunity>;

				if (attributeGroups.length > 0)
				{
					this.currentAssociatedGroups = unionBy(this.currentAssociatedGroups, attributeGroups, 'id');
					this.associatedGroups.next(this.currentAssociatedGroups);
				}

				this.addGroups.selectedGroups = [];

				this._msgService.add({
					id: 'toast-attributes-choice',
					key: 'toast-attributes-choice',
					severity: 'success',
					summary: 'Success',
					detail: `Attribute group(s) associated.`
				});

				this.isLoading.next(false);
			},
				error =>
				{
					this._msgService.add({
						id: 'toast-attributes-choice',
						key: 'toast-attributes-choice',
						severity: 'danger',
						summary: 'Error',
						detail: `Failed to associate attribute group(s).`
					});
					this.isLoading.next(false);
				});
	}

	async cancelAssociation()
	{
		if (this.addGroups.selectedGroups.length > 0)
		{
			if (!await this._uiUtilsService.confirmCancellation())
			{
				return;
			}
			else
			{
				this.addGroups.reset();
			}
		}
		else
		{
			this.addGroups.reset();
		}
	}

	async removeAssociation()
	{
		let selectGroupIds = this.removeGroups.selectedGroups.map(g => g.id);

		if (selectGroupIds.length)
		{
			let groupMessage = selectGroupIds.length > 1 ? 'groups' : 'group';
			let message = `You are about to delete the attribute ${groupMessage}.`;

			if (!await this._uiUtilsService.showConfirmation(message))
			{
				return;
			}
			else
			{
				this.isLoading.next(true);

				this._attrService
					.removeChoiceAttributeGroupAssocs(this.choice.id, this.choice.treeVersionId, selectGroupIds)
					.subscribe(groups =>
					{
						let groupIds = groups as Array<number>;

						if (groupIds.length > 0)
						{
							this.currentAssociatedGroups = this.currentAssociatedGroups.filter(g => !groupIds.find(id => id === g.id));
							this.associatedGroups.next(this.currentAssociatedGroups);
						}

						if (this.removeGroups)
						{
							this.removeGroups.selectedGroups = [];
						}

						this._msgService.add({
							id: 'toast-attributes-choice',
							key: 'toast-attributes-choice',
							severity: 'success',
							summary: 'Success',
							detail: `Attribute group(s) removed.`
						});

						this.isLoading.next(false);
					},
						error =>
						{
							this._msgService.add({
								id: 'toast-attributes-choice',
								key: 'toast-attributes-choice',
								severity: 'danger',
								summary: 'Error',
								detail: `Failed to remove attribute group(s).`
							});

							this.isLoading.next(false);
						});
			}
		}
	}

	async cancelRemoveAssociation()
	{
		if (this.removeGroups.selectedGroups.length > 0)
		{
			if (!await this._uiUtilsService.confirmCancellation())
			{
				return;
			}
			else
			{
				this.removeGroups.reset();
			}
		}
		else
		{
			this.removeGroups.reset();
		}
	}

	displayErrorMessage(message: string)
	{
		if (message)
		{
			this._msgService.add({
				id: 'toast-attributes-choice',
				key: 'toast-attributes-choice',
				severity: 'error',
				summary: 'Error',
				detail: message
			});
		}
	}

	onChangeAssociatedGroupOrder(event: any)
	{
		if (event.dragIndex !== event.dropIndex)
		{
			this.currentAssociatedGroups = orderBy(this.currentAssociatedGroups, ['sortOrder', 'groupName']);

			let index = 0;
			this.currentAssociatedGroups = this.currentAssociatedGroups.map<AttributeGroupCommunity>(g =>
			{
				let newGroup = cloneDeep(g);

				if (index === event.dragIndex)
				{
					newGroup.sortOrder = this.currentAssociatedGroups[event.dropIndex].sortOrder;
				}

				if (event.dragIndex > event.dropIndex && index >= event.dropIndex && index < event.dragIndex)
				{
					newGroup.sortOrder = g.sortOrder + 1;
				}

				if (event.dragIndex < event.dropIndex && index > event.dragIndex && index <= event.dropIndex)
				{
					newGroup.sortOrder = g.sortOrder - 1;
				}

				++index;
				return newGroup;
			});

			this.associatedGroups.next(this.currentAssociatedGroups);
			this.hasAssociatedGroupOrderChanged = true;
		}
	}

	updateChoiceGroupAssocs()
	{
		let groupOrders = this.currentAssociatedGroups.map(g =>
		{
			return {
				attributeGroupId: g.id,
				sortOrder: g.sortOrder
			};
		});
		this._attrService.updateChoiceAttributeGroupAssocs(this.choice.id, this.choice.treeVersionId, groupOrders).subscribe();
		this.hasAssociatedGroupOrderChanged = false;
	}
}
