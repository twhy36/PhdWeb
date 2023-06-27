import { Component, Input, Output, EventEmitter } from '@angular/core';

import { of } from 'rxjs';
import { finalize, take } from 'rxjs/operators';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { MessageService } from 'primeng/api';

import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { Option } from '../../../../../shared/models/option.model';

import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';

import { LocationService } from '../../../../../core/services/location.service';
import { Constants } from 'phd-common';

@Component({
	selector: 'expansion-location-groups-tab-panel',
	templateUrl: './expansion-location-groups-tab-panel.component.html',
	styleUrls: ['./expansion-location-groups-tab-panel.component.scss']
})
export class ExpansionLocationGroupsTabPanelComponent
{
	@Input() option: Option;
	@Input() groups: Array<LocationGroupMarket>;
	@Input() isReadOnly: boolean;

	@Output() onAssociate = new EventEmitter<{ option: Option, groups: Array<LocationGroupMarket>, callback: (grp: Array<LocationGroupMarket>) => void }>();
	@Output() onDisassociate = new EventEmitter();
	@Output() onAssociateToCommunities = new EventEmitter<{ option: Option, groups: Array<LocationGroupMarket>, callback: () => void }>();

	selectedGroups: Array<LocationGroupMarket> = [];
	isSaving: boolean = false;

	get saveDisabled(): boolean
	{
		return this.selectedGroups.length === 0 || this.isSaving;
	}

	constructor(private _modalService: NgbModal, private _locService: LocationService, private _msgService: MessageService) { }

	onAddGroup()
	{
		let cb = (grp: Array<LocationGroupMarket>) =>
		{
			this.option.hasAttributeLocationAssoc = true;
			this.option.locationGroups$ = of(grp);
		};

		this.onAssociate.emit({ option: this.option, groups: this.groups, callback: cb });
	}

	async createMsgModal()
	{
		let singlePlural = this.selectedGroups.length > 1 ? `these Location Groups` : `this Location Group`;
		let msgBody = `Are you sure you want to <span class="font-weight-bold text-danger">remove</span> ${singlePlural}?<br><br> `;

		msgBody += `<div class="phd-modal-item-list">`;

		this.selectedGroups.forEach(group =>
		{
			msgBody += `<span class="font-weight-bold">${group.locationGroupName}</span>`;
		});

		msgBody += `</div><br>${Constants.DO_YOU_WISH_TO_CONTINUE}`;

		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = Constants.WARNING;
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = Constants.CONTINUE;

		confirm.result.then((result) =>
		{
			if (result == Constants.CONTINUE)
			{
				this.removeGroups();
			}
		},
			(reason) =>
			{

			});
	}

	isGroupSelected(group: LocationGroupMarket): boolean
	{
		return this.selectedGroups.some(s => s.id === group.id);
	}

	areAllGroupsSelected(): boolean
	{
		return this.groups.length > 0 && this.selectedGroups.length === this.groups.length;
	}

	setGroupSelected(group: LocationGroupMarket, isSelected: boolean): void
	{
		let index = this.selectedGroups.findIndex(s => s.id === group.id);

		if (isSelected && index < 0)
		{
			this.selectedGroups.push(group);
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

	removeGroups()
	{
		this.isSaving = true;
		let groupIds = this.selectedGroups.map(x => x.id);

		this._locService.removeLocationGroupFromOption(this.option.id, groupIds).pipe(
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
					this.option.attributeGroups$.pipe(take(1)).subscribe(g =>
					{
						// check to see if there are associations still attached to the option.
						this.option.hasAttributeLocationAssoc = g.length > 0;
					});
				}

				this.selectedGroups = [];
				this.onDisassociate.emit();
				this._msgService.add({ severity: 'success', summary: 'Location Groups', detail: `Location Group(s) removed successfully!` });
			},
				(error) =>
				{
					this._msgService.clear();
					this._msgService.add({ severity: 'error', summary: 'Location Groups', detail: `An error has occured!` });
				});
	}

	onAssociateCommunities()
	{
		let cb = () =>
		{
			this.toggleAllGroups(false);
		};

		this.onAssociateToCommunities.emit({ option: this.option, groups: this.selectedGroups, callback: cb });
	}
}
