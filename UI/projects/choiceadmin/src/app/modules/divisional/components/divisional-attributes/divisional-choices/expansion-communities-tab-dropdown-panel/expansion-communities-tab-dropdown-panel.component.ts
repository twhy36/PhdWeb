import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { cloneDeep, isEqual } from 'lodash';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { combineLatest, finalize, map, switchMap } from 'rxjs/operators';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { DivisionalService } from '../../../../../core/services/divisional.service';
import { LocationService } from '../../../../../core/services/location.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { AttributeGroupCommunity } from '../../../../../shared/models/attribute-group-community.model';
import { AttributeGroupMarket, isAttributeGroup } from '../../../../../shared/models/attribute-group-market.model';
import { DivChoiceCatalogAttributeGroupMarket, DivChoiceCatalogLocationGroupMarket, DivChoiceCatalogMarketImage, DivisionalChoice, isDivChoiceCatalogAttributeGroupMarket, isDivChoiceCatalogLocationGroupMarket, isDivChoiceCatalogMarketImage } from '../../../../../shared/models/divisional-catalog.model';
import { IFinancialCommunity } from '../../../../../shared/models/financial-community.model';
import { LocationGroupCommunity } from '../../../../../shared/models/location-group-community.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';

@Component({
	selector: 'expansion-communities-tab-dropdown-panel',
	templateUrl: './expansion-communities-tab-dropdown-panel.component.html',
	styleUrls: ['./expansion-communities-tab-dropdown-panel.component.scss']
})
export class ExpansionCommunitiesTabDropdownPanelComponent implements OnInit
{
	@Input() community: IFinancialCommunity;
	@Input() choice: DivisionalChoice;
	@Input() isReadOnly: boolean;

	@Output() onDataChange = new EventEmitter();

	choiceAssociations: DivisionalChoice;
	canAssociate: boolean = false;
	isSaving: boolean = false;

	selectedImages: DivChoiceCatalogMarketImage[] = [];
	selectedAttributeGroups: DivChoiceCatalogAttributeGroupMarket[] = [];
	selectedLocationGroups: DivChoiceCatalogLocationGroupMarket[] = [];

	origSelectedImages: DivChoiceCatalogMarketImage[] = [];
	origSelectedAttributeGroups: DivChoiceCatalogAttributeGroupMarket[] = [];
	origSelectedLocationGroups: DivChoiceCatalogLocationGroupMarket[] = [];

	defaultSrc: string = 'assets/pultegroup_logo.jpg';

	constructor(private _attrService: AttributeService,
		private cd: ChangeDetectorRef,
		private _divService: DivisionalService,
		private _locService: LocationService,
		private _msgService: MessageService,
		private _orgService: OrganizationService) { }

	ngOnInit()
	{
		// Update the community with its org ID
		this._orgService.getOrgsForCommunities(this.community.marketId, [this.community.id])
			.pipe(finalize(() =>
			{
				this.getAssociations();
			}))
			.subscribe(orgs =>
			{
				this.community.orgId = orgs.find(o => o.financialCommunityId === this.community.id)?.orgId;
			});
	}

	/**
	 * Whether an attribute group, location group, or image is selected.
	 * @param item The item to check if it is selected.
	 */
	isItemSelected(item: DivChoiceCatalogAttributeGroupMarket | DivChoiceCatalogLocationGroupMarket | DivChoiceCatalogMarketImage): boolean
	{
		let isSelected = false;

		if (isDivChoiceCatalogAttributeGroupMarket(item))
		{
			isSelected = this.selectedAttributeGroups.some(s => s.attributeGroupMarketId === item.attributeGroupMarketId);
		}
		else if (isDivChoiceCatalogLocationGroupMarket(item))
		{
			isSelected = this.selectedLocationGroups.some(s => s.locationGroupMarketId === item.locationGroupMarketId);
		}
		else if (isDivChoiceCatalogMarketImage(item))
		{
			isSelected = this.selectedImages.some(s => s.divChoiceCatalogMarketImageId === item.divChoiceCatalogMarketImageId);
		}

		return isSelected;
	}

	/**
	 * Toggles the selection state of an attribute group, location group, or image.
	 * @param item The item to toggle.
	 * @param isSelected The selection state.
	 */
	setItemSelected(item: DivChoiceCatalogAttributeGroupMarket | DivChoiceCatalogLocationGroupMarket | DivChoiceCatalogMarketImage, isSelected: boolean): void
	{
		let selectedItems = [];
		let index = 0;

		if (isAttributeGroup(item))
		{
			selectedItems = this.selectedAttributeGroups;
			index = selectedItems.findIndex(s => s.attributeGroupMarketId === (item as DivChoiceCatalogAttributeGroupMarket).attributeGroupMarketId);
		}
		else if (isDivChoiceCatalogLocationGroupMarket(item))
		{
			selectedItems = this.selectedLocationGroups;
			index = selectedItems.findIndex(s => s.locationGroupMarketId === (item as DivChoiceCatalogLocationGroupMarket).locationGroupMarketId);
		}
		else if (isDivChoiceCatalogMarketImage(item))
		{
			selectedItems = this.selectedImages;
			index = selectedItems.findIndex(s => s.divChoiceCatalogMarketImageId === (item as DivChoiceCatalogMarketImage).divChoiceCatalogMarketImageId);
		}

		if (isSelected && index < 0)
		{
			if (isDivChoiceCatalogLocationGroupMarket(item))
			{
				// Remove all other selections
				selectedItems = this.selectedLocationGroups = [];
			}

			selectedItems.push(item);
		}
		else if (!isSelected && index >= 0)
		{
			selectedItems.splice(index, 1);
			selectedItems = [...selectedItems];
		}

		this.canAssociate = !isEqual(this.selectedAttributeGroups, this.origSelectedAttributeGroups) || !isEqual(this.selectedLocationGroups, this.origSelectedLocationGroups) || !isEqual(this.selectedImages, this.origSelectedImages);
	}

	/**
	 * Gets the list of all of the market attribute groups, location groups, and images for this choice, and the ones already associated to this community.
	 */
	getAssociations()
	{
		if (this.community.orgId)
		{
			this.choiceAssociations = new DivisionalChoice();

			// Market observables
			const getMarketAttributeGroups$ = this._divService.getDivChoiceCatalogMarketAttributeGroups(this.choice.divChoiceCatalogId);
			const getMarketLocationGroups$ = this._divService.getDivChoiceCatalogMarketLocationGroups(this.choice.divChoiceCatalogId);
			const getMarketImages$ = this._divService.getDivChoiceCatalogMarketImages(this.choice.divChoiceCatalogId);

			// Community observables
			const getCommunityAttributeGroups$ = this._divService.getDivChoiceCatalogCommunityAttributeGroupsByDivChoiceCatalogId(this.choice.divChoiceCatalogId);
			const getCommunityLocationGroups$ = this._divService.getDivChoiceCatalogCommunityLocationGroupsByDivChoiceCatalogId(this.choice.divChoiceCatalogId);
			const getCommunityImages$ = this._divService.getDivChoiceCatalogCommunityImagesByOrgId(this.community.orgId);

			getMarketAttributeGroups$.pipe(
				combineLatest(getMarketLocationGroups$, getMarketImages$),
				switchMap(([divMarketAttrGroups, divMarketLocGroups, divMarketImages]) =>
				{
					// Get the group market IDs for the attribute and location groups associated with this choice
					const attributeIds = divMarketAttrGroups.map(g => g.attributeGroupMarketId);
					const locationIds = divMarketLocGroups.map(g => g.locationGroupMarketId);

					return (attributeIds && attributeIds.length
						// Query EDH to get the metadata for these groups
						? this._attrService.getAttributeGroupMarketForIds(attributeIds)
						: of([] as AttributeGroupMarket[])
					).pipe(
						// Get the community data, and get the EDH metadata for location groups
						combineLatest(getCommunityAttributeGroups$, getCommunityLocationGroups$, getCommunityImages$,
							(locationIds && locationIds.length
								? this._locService.getLocationGroupMarketForIds(locationIds)
								: of([] as LocationGroupMarket[]))
						)).pipe(
							map(([fullMarketAttrGroups, communityAttrGroups, communityLocGroups, communityImages, fullMarketLocGroups]) =>
							{
								// Merge the EDH metadata with the groups
								divMarketAttrGroups =
									divMarketAttrGroups.map(g =>
									{
										const agm = fullMarketAttrGroups.find(agm => agm.id === g.attributeGroupMarketId);

										if (agm)
										{
											g.id = g.attributeGroupMarketId;
											g.groupName = agm.groupName;
											g.groupLabel = agm.groupLabel;
											g.description = agm.description;
											g.attributeGroupMarketTags = agm.attributeGroupMarketTags;
										}

										return g;
									});

								divMarketLocGroups = divMarketLocGroups.map(g =>
								{
									const lgm = fullMarketLocGroups.find(lgm => lgm.id === g.locationGroupMarketId);

									if (lgm)
									{
										g.id = g.locationGroupMarketId;
										g.locationGroupName = lgm.locationGroupName;
										g.groupLabel = lgm.groupLabel;
										g.locationGroupDescription = lgm.locationGroupDescription;
										g.locationGroupMarketTags = lgm.locationGroupMarketTags;
									}

									return g;
								});

								// Return the normalized market data and the community data for further processing
								return { divMarketAttrGroups, divMarketLocGroups, divMarketImages, communityAttrGroups, communityLocGroups, communityImages };
							})
						);
				})
			).subscribe(data =>
			{
				// Assign the bindings to render the values
				this.choiceAssociations.divChoiceCatalogMarketImages = data.divMarketImages;
				this.choiceAssociations.divChoiceCatalogMarketAttributes = data.divMarketAttrGroups;
				this.choiceAssociations.divChoiceCatalogMarketLocations = data.divMarketLocGroups;

				// Set selections for each type
				data.divMarketImages.forEach(mImg =>
				{
					if (data.communityImages.findIndex(ci => ci.divChoiceCatalogMarketImageId === mImg.divChoiceCatalogMarketImageId) > -1)
					{
						this.selectedImages.push(mImg);
						this.origSelectedImages.push(mImg);
					}
				});

				data.divMarketAttrGroups.forEach(m =>
				{
					if (data.communityAttrGroups.findIndex(c => c.attributeGroupMarketId === m.attributeGroupMarketId && this.community.attributeGroupCommunities.map(a => a.id).includes(c.attributeGroupCommunityId)) > -1)
					{
						this.selectedAttributeGroups.push(m);
						this.origSelectedAttributeGroups.push(m);
					}
				});

				data.divMarketLocGroups.forEach(m =>
				{
					if (data.communityLocGroups.findIndex(c => c.locationGroupMarketId === m.locationGroupMarketId && this.community.locationGroupCommunities.map(l => l.id).includes(c.locationGroupCommunityId)) > -1)
					{
						this.selectedLocationGroups.push(m);
						this.origSelectedLocationGroups.push(m);
					}
				});

				// Force the tab to refresh the values sooner
				// Not sure why there seems to be a delay in rendering the values, but this helps it show up faster
				this.cd.detectChanges();
			});
		}
	}

	/**
	 * Handles the click event on the Save button to update the associations between this community and the attribute groups, location groups, and images.
	 */
	associateItems()
	{
		this.isSaving = true;

		this._msgService.add({ severity: 'info', summary: 'Associations', detail: `Saving selected associations!` });

		this._divService.associateChoiceItemsToCommunity(this.choice.divChoiceCatalogId, this.community.marketId, this.community.orgId, this.community.id, this.selectedAttributeGroups, this.selectedLocationGroups, this.selectedImages)
			.pipe(finalize(() =>
			{
				this.canAssociate = false;
				this.isSaving = false;

				this.onDataChange.emit();

				// Update the original arrays for comparison
				this.origSelectedAttributeGroups = cloneDeep(this.selectedAttributeGroups);
				this.origSelectedLocationGroups = cloneDeep(this.selectedLocationGroups);
				this.origSelectedImages = cloneDeep(this.selectedImages);
			}))
			.subscribe(response =>
			{
				this._msgService.add({ severity: 'success', summary: 'Associations', detail: `Updated successfully!` });

				// Update the group communities data in case the dropdown is reopened
				if (response.attributeGroupCommunities)
				{
					response.attributeGroupCommunities.map(acg =>
					{
						if (!this.community.attributeGroupCommunities.find(c => c.id === acg.attributeGroupCommunityId))
						{
							this.community.attributeGroupCommunities.push({
								id: acg.attributeGroupCommunityId,
								attributeGroupMarketId: acg.attributeGroupMarketId
							} as AttributeGroupCommunity);
						}
					});
				}

				this.choiceAssociations.divChoiceCatalogMarketAttributes.map(m =>
				{
					if (!this.selectedAttributeGroups.map(x => x.id).includes(m.attributeGroupMarketId))
					{
						const idx = this.community.attributeGroupCommunities.findIndex(acg => acg.attributeGroupMarketId === m.attributeGroupMarketId);

						if (idx > -1)
						{
							this.community.attributeGroupCommunities.splice(idx, 1);
						}
					}
				});

				if (response.locationGroupCommunities)
				{
					response.locationGroupCommunities.map(lcg =>
					{
						if (!this.community.locationGroupCommunities.find(c => c.id === lcg.locationGroupCommunityId))
						{
							this.community.locationGroupCommunities.push({
								id: lcg.locationGroupCommunityId,
								locationGroupMarketId: lcg.locationGroupMarketId
							} as LocationGroupCommunity);
						}
					});
				}

				this.choiceAssociations.divChoiceCatalogMarketLocations.map(m =>
				{
					if (!this.selectedLocationGroups.map(x => x.id).includes(m.locationGroupMarketId))
					{
						const idx = this.community.locationGroupCommunities.findIndex(lcg => lcg.locationGroupMarketId === m.locationGroupMarketId);

						if (idx > -1)
						{
							this.community.locationGroupCommunities.splice(idx, 1);
						}
					}
				});

			}, () =>
			{
				this._msgService.add({ severity: 'error', summary: 'Associations', detail: `An error has occured!` });
			});
	}

	onLoadImageError(event: any)
	{
		if (!(event.srcElement.src as string).includes(this.defaultSrc))
		{
			event.srcElement.src = this.defaultSrc;
		}
	}
}
