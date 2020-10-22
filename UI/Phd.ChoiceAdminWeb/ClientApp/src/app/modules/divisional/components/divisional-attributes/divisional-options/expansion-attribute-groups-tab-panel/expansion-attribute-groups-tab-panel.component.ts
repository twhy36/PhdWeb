import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { of } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { orderBy, cloneDeep } from "lodash";

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MessageService } from 'primeng/api';
import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';

import { AttributeService } from '../../../../../core/services/attribute.service';
import { DivisionalOptionService } from '../../../../../core/services/divisional-option.service';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { Option } from '../../../../../shared/models/option.model';

@Component({
	selector: 'expansion-attribute-groups-tab-panel',
	templateUrl: './expansion-attribute-groups-tab-panel.component.html',
	styleUrls: ['./expansion-attribute-groups-tab-panel.component.scss']
})
export class ExpansionAttributeGroupsTabPanelComponent implements OnInit
{
	@Input() option: Option;
	@Input() groups: Array<AttributeGroupMarket>;
	@Input() isReadOnly: boolean;

	@Output() onAssociate = new EventEmitter<{ option: Option, groups: Array<AttributeGroupMarket>, callback: (grp: Array<AttributeGroupMarket>) => void }>();
	@Output() onDisassociate = new EventEmitter();
	@Output() onAssociateToCommunities = new EventEmitter<{ option: Option, groups: Array<AttributeGroupMarket>, callback: () => void }>();

	selectedGroups: Array<AttributeGroupMarket> = [];
	isSaving: boolean = false;
	originalGroups: Array<AttributeGroupMarket>;

	get saveDisabled(): boolean
	{
		return !this.selectedGroups.length || this.isSaving;
	}

	constructor(private _modalService: NgbModal,
		private _msgService: MessageService,
		private _attrService: AttributeService,
		private _divOptService: DivisionalOptionService) { }

	ngOnInit() {
		this.originalGroups = cloneDeep(this.groups);
	}

	onAddGroup()
	{
		let cb = (grp: Array<AttributeGroupMarket>) =>
		{
			this.option.hasAttributeLocationAssoc = true;
			this.option.attributeGroups$ = of(grp);
		};

		this.onAssociate.emit({ option: this.option, groups: this.groups, callback: cb });
	}

	onRemoveGroups()
	{
		let singlePlural = this.selectedGroups.length > 1 ? `these Attribute Groups` : `this Attribute Group`;
		let msgBody = `Are you sure you want to <span class="font-weight-bold text-danger">remove</span> ${singlePlural}?<br><br> `;

		msgBody += `<div class="phd-modal-item-list">`;

		this.selectedGroups.forEach(group =>
		{
			msgBody += `<span class="font-weight-bold">${group.groupName}</span>`;
		});

		msgBody += `</div>`;
		msgBody += `<br>Do you wish to continue?`;

		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Continue';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this.removeGroups();
			}
		}, (reason) =>
		{

		});
	}

	removeGroups()
	{
		this.isSaving = true;
		let groupOrders = this.selectedGroups.map(g => {
			return {
				attributeGroupId: g.id,
				sortOrder: g.sortOrder
			};
		});

		this._attrService.removeAttributeGroupFromOption(this.option.id, groupOrders).pipe(
			finalize(() =>
			{
				this.isSaving = false;
			}))
			.subscribe(option =>
			{
				this.selectedGroups.forEach(group =>
				{
					const index = this.groups.indexOf(group);

					this.groups.splice(index, 1);
				});

				if (this.groups.length === 0)
				{
					this.option.locationGroups$.pipe(take(1)).subscribe(g =>
					{
						// check to see if there are associations still attached to the option.
						this.option.hasAttributeLocationAssoc = g.length > 0;
					});
				}

				this.originalGroups = cloneDeep(this.groups);
				this.selectedGroups = [];
				this.onDisassociate.emit();
				this._msgService.add({ severity: 'success', summary: 'Attribute Groups', detail: `Attribute Group(s) removed successfully!` });
			},
			error =>
			{
				this._msgService.clear();
				this._msgService.add({ severity: 'error', summary: 'Attribute Groups', detail: `An error has occured!` });
			});
	}

	isGroupSelected(group: AttributeGroupMarket): boolean
	{
		return this.selectedGroups.some(s => s.id === group.id);
	}

	areAllGroupsSelected(): boolean
	{
		return this.groups.length && this.selectedGroups.length === this.groups.length;
	}

	setGroupSelected(group: AttributeGroupMarket, isSelected: boolean): void
	{
		let index = this.selectedGroups.findIndex(s => s.id === group.id);

		if (isSelected && index < 0)
		{
			this.selectedGroups.push(group);
			this.selectedGroups = orderBy(this.selectedGroups, [attr => attr.groupName.toLowerCase()])
		}
		else if (!isSelected && index >= 0)
		{
			this.selectedGroups.splice(index, 1);
			this.selectedGroups = [...this.selectedGroups];
		}
	}

	toggleAllGroups(isSelected: boolean): void
	{
		if (isSelected)
		{
			this.selectedGroups = this.groups.slice();
		}
		else
		{
			this.selectedGroups = [];
		}
	}

	onAssociateCommunities()
	{
		let cb = () =>
		{
			this.toggleAllGroups(false);
		};

		this.onAssociateToCommunities.emit({ option: this.option, groups: this.selectedGroups, callback: cb });
	}

	onChangeOptionAttributeGroupOrder(event: any) {
		if (event.dragIndex !== event.dropIndex) {
			this.isSaving = true;
			let index = 0;

			this.groups = this.originalGroups.map(g => {
				let newGroup = cloneDeep(g);

				if (index === event.dragIndex) {
					newGroup.sortOrder = this.originalGroups[event.dropIndex].sortOrder;
				}

				if (event.dragIndex > event.dropIndex && index >= event.dropIndex && index < event.dragIndex) {
					newGroup.sortOrder = g.sortOrder + 1;
				}

				if (event.dragIndex < event.dropIndex && index > event.dragIndex && index <= event.dropIndex) {
					newGroup.sortOrder = g.sortOrder - 1;
				}

				++index;
				return newGroup;
			});

			this.groups = orderBy(this.groups, 'sortOrder');
			this.originalGroups = cloneDeep(this.groups);

			this._divOptService.updateOptionAttributeGroupAssocs(this.option.id, this.groups).subscribe(result => {
				this.isSaving = false;
			});
		}
	}
}
