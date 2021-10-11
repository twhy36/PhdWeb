import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { MessageService } from 'primeng/api';

import { AttributeGroupMarket, isAttributeGroup } from '../../../../../shared/models/attribute-group-market.model';
import { LocationGroupMarket, isLocationGroup } from '../../../../../shared/models/location-group-market.model';
import { isOptionMarketImage, Option, OptionMarketImage } from '../../../../../shared/models/option.model';
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

	@Output() onDataChange = new EventEmitter();

	optionAssociations: Option;
	canAssociate: boolean = false;
	isSaving: boolean = false;

	selectedAttributes: AttributeGroupMarket[] = [];
	selectedLocations: LocationGroupMarket[] = [];
	selectedOptionMarketImages: OptionMarketImage[] = [];

	origSelectedAttributes: AttributeGroupMarket[] = [];
	origSelectedLocations: LocationGroupMarket[] = [];
	origSelectedOptionMarketImages: OptionMarketImage[] = [];

	constructor(private _divOptService: DivisionalOptionService, private _msgService: MessageService) { }

	ngOnInit()
	{
		this.getOptionGroups();
	}

	isItemSelected(item: AttributeGroupMarket | LocationGroupMarket | OptionMarketImage): boolean
	{
		let isSelected = false;

		// instanceof not working in this instance so using isAttributeGroup instead
		if (isAttributeGroup(item))
		{
			isSelected = this.selectedAttributes.some(s => s.id === item.id);;
		}
		else if (isLocationGroup(item))
		{
			isSelected = this.selectedLocations.some(s => s.id === item.id);;
		}
		else if (isOptionMarketImage(item))
		{
			isSelected = this.selectedOptionMarketImages.some(s => s.id === item.id);
		}

		return isSelected;
	}

	setItemSelected(item: AttributeGroupMarket | LocationGroupMarket | OptionMarketImage, isSelected: boolean): void
	{
		let selectedItems = [];

		// instanceof not working in this instance so using isAttributeGroup instead
		if (isAttributeGroup(item))
		{
			selectedItems = this.selectedAttributes;
			item = item as AttributeGroupMarket;
		}
		else if (isLocationGroup(item))
		{
			this.selectedLocations = [];
			selectedItems = this.selectedLocations;
			item = item as LocationGroupMarket;
		}
		else if (isOptionMarketImage(item))
		{
			selectedItems = this.selectedOptionMarketImages;
			item = item as OptionMarketImage;
		}

		let index = selectedItems.findIndex(s => s.id === item.id);

		if (isSelected && index < 0)
		{
			selectedItems.push(item);
		}
		else if (!isSelected && index >= 0)
		{
			selectedItems.splice(index, 1);

			selectedItems = [...selectedItems];
		}

		this.canAssociate = !isEqual(this.selectedAttributes, this.origSelectedAttributes) || !isEqual(this.selectedLocations, this.origSelectedLocations) || !isEqual(this.selectedOptionMarketImages, this.origSelectedOptionMarketImages);
	}

	getOptionGroups()
	{
		this._divOptService.getAssociationsForCommunity(this.option, this.community.id).subscribe(option =>
		{
			if (option)
			{
				this.optionAssociations = option[0];

				this.optionAssociations.attributeGroups.forEach(group =>
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

				this.optionAssociations.attributeGroups = orderBy(this.optionAssociations.attributeGroups, 'sortOrder');

				this.optionAssociations.locationGroups.forEach(group =>
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

				this.optionAssociations.optionMarketImages.forEach(image =>
				{
					if (image.optionCommunityImages.length)
					{
						image.optionCommunityImages.forEach(commImage =>
						{
							if (commImage.optionCommunityId)
							{
								this.selectedOptionMarketImages.push(image);
								this.origSelectedOptionMarketImages.push(image);
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

		this._msgService.add({ severity: 'info', summary: 'Associations', detail: `Saving selected associations!` });

		this._divOptService.associateItemsToCommunity(this.option.id, this.community.id, this.selectedAttributes, this.selectedLocations, this.selectedOptionMarketImages)
			.pipe(finalize(() =>
			{
				this.canAssociate = false;
				this.isSaving = false;

				this.onDataChange.emit();
			}))
			.subscribe(response =>
			{
				this._msgService.add({ severity: 'success', summary: 'Associations', detail: `Updated successfully!` });
			},
			(error) =>
			{
				this._msgService.add({ severity: 'error', summary: 'Associations', detail: `An error has occured!` });
			});
	}

	onLoadImageError(event: any)
	{
		event.srcElement.src = 'assets/pultegroup_logo.jpg';
	}
}
