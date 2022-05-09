import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { MessageService } from 'primeng/api';

import { AttributeGroupMarket, isAttributeGroup } from '../../../../../shared/models/attribute-group-market.model';
import { LocationGroupMarket, isLocationGroup } from '../../../../../shared/models/location-group-market.model';
import { Option } from '../../../../../shared/models/option.model';
import { IFinancialCommunity } from '../../../../../shared/models/financial-community.model';

import { DivisionalOptionService } from '../../../../../core/services/divisional-option.service';

import { isEqual, orderBy } from 'lodash';

@Component({
	selector: 'expansion-associate-groups-tab-panel',
	templateUrl: './expansion-associate-groups-tab-panel.component.html',
	styleUrls: ['./expansion-associate-groups-tab-panel.component.scss']
})
export class ExpansionAssociateGroupsTabPanelComponent implements OnInit
{
	@Input() community: IFinancialCommunity;
	@Input() option: Option;
	@Input() isReadOnly: boolean;
	@Input() disableSaveBtn: boolean;

	@Output() onDataChange = new EventEmitter();
	@Output() disableSaveBtnChange = new EventEmitter<boolean>();

	optionGroups: Option;
	canAssociate: boolean = false;
	isSaving: boolean = false;

	selectedAttributes: AttributeGroupMarket[] = [];
	selectedLocations: LocationGroupMarket[] = [];

	origSelectedAttributes: AttributeGroupMarket[] = [];
	origSelectedLocations: LocationGroupMarket[] = [];

	get disableSaveButton(): boolean
	{
		return this.isReadOnly || !this.canAssociate || this.isSaving || this.disableSaveBtn;
	}

	constructor(private _divOptService: DivisionalOptionService, private _msgService: MessageService) { }

	ngOnInit()
	{
		this.getOptionGroups();
	}

	isGroupSelected(group: AttributeGroupMarket | LocationGroupMarket): boolean
	{
		let isSelected = false;

		// instanceof not working in this instance so using isAttributeGroup instead
		if (isAttributeGroup(group))
		{
			isSelected = this.selectedAttributes.some(s => s.id === group.id);;
		}
		else if (isLocationGroup(group))
		{
			isSelected = this.selectedLocations.some(s => s.id === group.id);;
		}

		return isSelected;
	}

	setGroupSelected(group: AttributeGroupMarket | LocationGroupMarket, isSelected: boolean): void
	{
		let selectedGroups = [];

		// instanceof not working in this instance so using isAttributeGroup instead
		if (isAttributeGroup(group))
		{
			selectedGroups = this.selectedAttributes;
			group = group as AttributeGroupMarket;
		}
		else if (isLocationGroup(group))
		{
			this.selectedLocations = [];
			selectedGroups = this.selectedLocations;
			group = group as LocationGroupMarket;
		}

		let index = selectedGroups.findIndex(s => s.id === group.id);

		if (isSelected && index < 0)
		{
			selectedGroups.push(group);
		}
		else if (!isSelected && index >= 0)
		{
			selectedGroups.splice(index, 1);
			selectedGroups = [...selectedGroups];
		}

		this.canAssociate = !isEqual(this.selectedAttributes, this.origSelectedAttributes) || !isEqual(this.selectedLocations, this.origSelectedLocations);
	}

	getOptionGroups()
	{
		this._divOptService.getGroupsForCommunity(this.option, this.community.id).subscribe(option =>
		{
			if (option)
			{
				this.optionGroups = option[0];

				this.optionGroups.attributeGroups.forEach(group =>
				{
					if (group.attributeGroupCommunities.length)
					{
						group.attributeGroupCommunities.forEach(cGroup =>
						{
							if (cGroup.optionCommunities.length)
							{
								this.selectedAttributes.push(group);
								this.origSelectedAttributes.push(group);
							}
						});
					}
				});

				this.optionGroups.attributeGroups = orderBy(this.optionGroups.attributeGroups, 'sortOrder');

				this.optionGroups.locationGroups.forEach(group =>
				{
					if (group.locationGroupCommunities.length)
					{
						group.locationGroupCommunities.forEach(cGroup =>
						{
							if (cGroup.optionCommunities.length)
							{
								this.selectedLocations.push(group);
								this.origSelectedLocations.push(group);
							}
						});
					}
				});

				this.onDataChange.emit();
			}
		});
	}

	associateGroups()
	{
		this.isSaving = true;

		// disable all other save buttons until this finishes
		this.disableSaveBtnChange.emit(true);

		this._msgService.add({ severity: 'info', summary: 'Groups', detail: `Saving selected groups!` });

		this._divOptService.associateGroupsToCommunity(this.option.id, this.community.id, this.selectedAttributes, this.selectedLocations)
			.pipe(finalize(() =>
			{
				this.canAssociate = false;
				this.isSaving = false;

				// enable other save buttons
				this.disableSaveBtnChange.emit(false);

				this.onDataChange.emit();
			}))
			.subscribe(response =>
			{
				this._msgService.add({ severity: 'success', summary: 'Groups', detail: `Updated successfully!` });
			},
			(error) =>
			{
				this._msgService.add({ severity: 'error', summary: 'Groups', detail: `An error has occured!` });
			});
	}
}
