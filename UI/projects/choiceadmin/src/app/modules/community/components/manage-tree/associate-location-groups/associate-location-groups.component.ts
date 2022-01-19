import { Component, Input, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';

import { ReplaySubject, BehaviorSubject } from 'rxjs';

import { unionBy } from "lodash";
import { MessageService } from 'primeng/api';

import { DTChoice } from '../../../../shared/models/tree.model';
import { LocationGroupMarket } from '../../../../shared/models/location-group-market.model';
import { LocationGroupCommunity } from '../../../../shared/models/location-group-community.model';
import { ActionButton } from '../../../../shared/models/action-button.model';
import { PhdApiDto } from '../../../../shared/models/api-dtos.model';

import { AttributeGroupActionPanelComponent } from '../../../../shared/components/attribute-group-action-panel/attribute-group-action-panel.component';

import { LocationService } from '../../../../core/services/location.service';
import { UiUtilsService } from '../../../../core/services/ui-utils.service';

@Component({
	selector: 'associate-location-groups',
	templateUrl: './associate-location-groups.component.html',
	styleUrls: ['./associate-location-groups.component.scss']
})
export class AssociateLocationGroupComponent implements OnInit
{
	@ViewChild('addGroups')
	private addGroups: AttributeGroupActionPanelComponent;

	@ViewChild('removeGroups')
	private removeGroups: AttributeGroupActionPanelComponent;

	@Input() choice: DTChoice;
	@Input() groupsInMarket: Array<LocationGroupMarket> = [];
	@Input() divGroupsInMarket: Array<LocationGroupMarket> = [];
	@Input() isReadOnly: boolean = true;
	@Input() communityId = 0;
	@Input() optionRules: Array<PhdApiDto.IChoiceOptionRule> = [];

	availableGroups: BehaviorSubject<Array<LocationGroupMarket>>;

	currentAssociatedGroups: Array<LocationGroupCommunity>;
	associatedGroups: ReplaySubject<Array<LocationGroupCommunity>>;
	isLoading = new BehaviorSubject<boolean>(false);

	hasGroupAssociated: boolean = false;

	get isDirty()
	{
		return this.addGroups && this.addGroups.selectedGroups.length > 0 || this.removeGroups && this.removeGroups.selectedGroups.length > 0;
	}

	addAssocButtons: Array<ActionButton> = [
		{ text: 'Associate', class: 'btn btn-primary', action: this.saveAssociation.bind(this), disabled: true },
		{ text: 'Cancel', class: 'btn btn-secondary', action: this.cancelAssociation.bind(this), disabled: false }
	];

	removeAssocButtons: Array<ActionButton> = [
		{ text: 'Remove', class: 'btn btn-primary', action: this.removeAssociation.bind(this), disabled: true },
		{ text: 'Cancel', class: 'btn btn-secondary', action: this.cancelRemoveAssociation.bind(this), disabled: false }
	];

	constructor(private cd: ChangeDetectorRef, private _uiUtilsService: UiUtilsService, private _msgService: MessageService, private _locService: LocationService) { }

	ngOnInit(): void
	{
		this.availableGroups = new BehaviorSubject<Array<LocationGroupMarket>>(this.groupsInMarket);
		this.associatedGroups = new ReplaySubject<Array<LocationGroupCommunity>>(1);

		this.associatedGroups.subscribe(group =>
		{
			if (group)
			{
				if (this.groupsInMarket)
				{
					var availGrps = group.length > 0 ? this.groupsInMarket.filter(g => !group.find(grp => grp.locationGroupMarketId === g.id)) : this.groupsInMarket;

					this.availableGroups.next(availGrps);
				}

				this.hasGroupAssociated = this.divGroupsInMarket.length > 0 || group.length > 0;

				// only update the choice if locations are tied to the choice and not a option
				if (!this.optionRules || this.optionRules.length === 0)
				{
					this.choice.hasLocations = group.length > 0;
				}

				this.cd.detectChanges();
			}
		});

		if (this.optionRules && this.optionRules.length)
		{
			let optionKeys = this.optionRules.map(r => r.integrationKey);

			this.checkOptionLocationGroups(optionKeys);
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

	checkOptionLocationGroups(optionKeys: Array<string>)
	{
		this.isLoading.next(true);

		this._locService.checkOptionLocationGroups(this.choice.id, this.choice.treeVersionId, this.communityId, optionKeys).subscribe(groups =>
		{
			this.currentAssociatedGroups = groups as Array<LocationGroupCommunity>;
			this.associatedGroups.next(this.currentAssociatedGroups);

			if (!this.currentAssociatedGroups.length)
			{
				this.isLoading.next(false);
			}
		},
		error =>
		{
			this._msgService.add({
				id: 'toast-locations-choice',
				key: 'toast-locations-choice',
				severity: 'danger',
				summary: 'Error',
				detail: `Unable to load associated location group(s).`
			});

			this.isLoading.next(false);
		});
	}

	getAssociatedGroups()
	{
		this.isLoading.next(true);

		this._locService.getChoiceLocationGroups(this.choice.id, this.choice.treeVersionId).subscribe(groups =>
		{
			this.currentAssociatedGroups = groups as Array<LocationGroupCommunity>;
			this.associatedGroups.next(this.currentAssociatedGroups);

			if (!this.currentAssociatedGroups.length)
			{
				this.isLoading.next(false);
			}
		},
		error =>
		{
			this._msgService.add({
				id: 'toast-locations-choice',
				key: 'toast-locations-choice',
				severity: 'danger',
				summary: 'Error',
				detail: `Unable to load associated location group(s).`
			});

			this.isLoading.next(false);
		});
	}

	saveAssociation()
	{
		this.isLoading.next(true);

		let selectGroupMarketIds = this.addGroups.selectedGroups.map(g => g.id);

		this._locService
			.addChoiceLocationGroupAssocs(this.choice.id, this.choice.treeVersionId, this.communityId, selectGroupMarketIds)
			.subscribe(groups =>
			{
				let locationGroups = groups as Array<LocationGroupCommunity>;

				if (locationGroups.length > 0)
				{
					this.currentAssociatedGroups = unionBy(this.currentAssociatedGroups, locationGroups, 'id');
					this.associatedGroups.next(this.currentAssociatedGroups);
				}

				this.addGroups.selectedGroups = [];
				this.addGroups.searchBar.clearFilter();
				this.addGroups.clearFilter();

				this._msgService.add({
					id: 'toast-locations-choice',
					key: 'toast-locations-choice',
					severity: 'success',
					summary: 'Success',
					detail: `Location group(s) associated.`
				});

				this.isLoading.next(false);
			},
			error =>
			{
				this._msgService.add({
					id: 'toast-locations-choice',
					key: 'toast-locations-choice',
					severity: 'danger',
					summary: 'Error',
					detail: `Failed to associate location group(s).`
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
			let message = `You are about to delete the location group.`;

			if (!await this._uiUtilsService.showConfirmation(message))
			{
				return;
			}
			else
			{
				this.isLoading.next(true);
				this._locService
					.removeChoiceLocationGroupAssocs(this.choice.id, this.choice.treeVersionId, selectGroupIds)
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
							id: 'toast-locations-choice',
							key: 'toast-locations-choice',
							severity: 'success',
							summary: 'Success',
							detail: `Location group(s) removed.`
						});

						this.isLoading.next(false);
					},
					error =>
					{
						this._msgService.add({
							id: 'toast-locations-choice',
							key: 'toast-locations-choice',
							severity: 'danger',
							summary: 'Error',
							detail: `Failed to remove location group(s).`
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
				id: 'toast-locations-choice',
				key: 'toast-locations-choice',
				severity: 'danger',
				summary: 'Error',
				detail: message
			});
		}
	}

}
