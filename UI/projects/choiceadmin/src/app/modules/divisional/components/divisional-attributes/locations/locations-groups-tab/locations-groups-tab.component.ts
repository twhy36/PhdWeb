import { Component, OnInit, Input, Output, ViewChild, EventEmitter } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ReplaySubject, BehaviorSubject } from 'rxjs';

import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { ActionButton } from '../../../../../shared/models/action-button.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { AttributeGroupActionPanelComponent } from '../../../../../shared/components/attribute-group-action-panel/attribute-group-action-panel.component';

import { UiUtilsService } from '../../../../../core/services/ui-utils.service';
import { remove } from "lodash";

@Component({
	selector: 'locations-groups-tab',
	templateUrl: './locations-groups-tab.component.html',
	styleUrls: ['./locations-groups-tab.component.scss']
})
export class LocationsGroupsTabComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild('addGroups')
	addGroups: AttributeGroupActionPanelComponent;

	@ViewChild('removeGroups')
	removeGroups: AttributeGroupActionPanelComponent;

	@Input() selectedGroups: Array<LocationGroupMarket> = [];
	@Input() activeLocationGroups: Array<LocationGroupMarket>;
	@Input() searchKeyword: string;
	@Input() searchFilter: string;
	@Input() searchSelectedAddGroup: Array<LocationGroupMarket>;
	@Input() searchSelectedRemoveGroup: Array<LocationGroupMarket>;
	@Input() isSaving: boolean;

	@Output() groupSelectionChanged = new EventEmitter<void>();

	availableGroups$: BehaviorSubject<Array<LocationGroupMarket>>;
	selectedGroups$: ReplaySubject<Array<LocationGroupMarket>>;

	addAssocButtons: Array<ActionButton> = [
		{ text: 'Associate', class: 'btn btn-primary', action: this.saveSelection.bind(this), disabled: true },
		{ text: 'Cancel', class: 'btn btn-secondary', action: this.cancelSelection.bind(this), disabled: false }
	];

	removeAssocButtons: Array<ActionButton> = [
		{ text: 'Remove', class: 'btn btn-primary', action: this.removeSelection.bind(this), disabled: true },
		{ text: 'Cancel', class: 'btn btn-secondary', action: this.cancelRemoveSelection.bind(this), disabled: false }
	];

	constructor(private _msgService: MessageService, private _uiUtilsService: UiUtilsService,)
	{
		super();
	}

	ngOnInit()
	{
		this.availableGroups$ = new BehaviorSubject<Array<LocationGroupMarket>>(this.activeLocationGroups);

		this.selectedGroups$ = new ReplaySubject<Array<LocationGroupMarket>>(1);
		this.onGroupSelectionChange();
	}

	reset()
	{
		if (this.addGroups)
		{
			this.addGroups.reset();
		}

		if (this.removeGroups)
		{
			this.removeGroups.reset();
		}
	}

	onGroupSelectionChange()
	{
		this.selectedGroups$.next(this.selectedGroups);

		const availableGroups = this.activeLocationGroups.filter(group => this.selectedGroups.findIndex(g => g.id === group.id) === -1);

		this.availableGroups$.next(availableGroups);

		this.groupSelectionChanged.emit();
	}

	saveSelection()
	{
		const newGroups = this.addGroups.selectedGroups as LocationGroupMarket[];

		this.selectedGroups.push(...newGroups);

		this.onGroupSelectionChange();

		this.addGroups.selectedGroups = [];
	}

	async cancelSelection()
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

	async removeSelection()
	{
		const removedGroups = this.removeGroups.selectedGroups as LocationGroupMarket[];

		remove(this.selectedGroups, g => removedGroups.findIndex(group => group.id === g.id) !== -1);

		this.onGroupSelectionChange();

		this.removeGroups.selectedGroups = [];
	}

	async cancelRemoveSelection()
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
			this._msgService.add({ severity: 'error', summary: 'Location', detail: message });
		}
	}
}
