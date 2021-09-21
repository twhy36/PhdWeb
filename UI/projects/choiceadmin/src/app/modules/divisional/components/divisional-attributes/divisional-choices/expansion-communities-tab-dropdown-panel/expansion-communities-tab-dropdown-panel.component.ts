import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { isEqual } from 'lodash';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { DivisionalService } from '../../../../../core/services/divisional.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { isAttributeGroup } from '../../../../../shared/models/attribute-group-market.model';
import { DivChoiceCatalogAttributeGroupCommunity, DivChoiceCatalogAttributeGroupMarket, DivChoiceCatalogMarketImage, DivisionalChoice, isDivChoiceCatalogAttributeGroupMarket, isDivChoiceCatalogMarketImage } from '../../../../../shared/models/divisional-catalog.model';
import { IFinancialCommunity } from '../../../../../shared/models/financial-community.model';

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

	origSelectedImages: DivChoiceCatalogMarketImage[] = [];
	origSelectedAttributeGroups: DivChoiceCatalogAttributeGroupMarket[] = [];

	constructor(private _attrService: AttributeService,
		private _divService: DivisionalService,
		private _msgService: MessageService,
		private _orgService: OrganizationService) { }

	ngOnInit(): void
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

	isItemSelected(item: DivChoiceCatalogAttributeGroupMarket | DivChoiceCatalogMarketImage): boolean
	{
		let isSelected = false;

		if (isDivChoiceCatalogAttributeGroupMarket(item))
		{
			isSelected = this.selectedAttributeGroups.some(s => s.attributeGroupMarketId == s.attributeGroupMarketId);
		}
		else if (isDivChoiceCatalogMarketImage(item))
		{
			isSelected = this.selectedImages.some(s => s.divChoiceCatalogMarketImageID === item.divChoiceCatalogMarketImageID);
		}

		return isSelected;
	}

	setItemSelected(item: DivChoiceCatalogAttributeGroupMarket | DivChoiceCatalogMarketImage, isSelected: boolean): void
	{
		let selectedItems = [];
		let index = 0;

		if (isAttributeGroup(item))
		{
			selectedItems = this.selectedAttributeGroups;
			index = selectedItems.findIndex(s => s.attributeGroupMarketId === (item as DivChoiceCatalogAttributeGroupMarket).attributeGroupMarketId);
		}
		else if (isDivChoiceCatalogMarketImage(item))
		{
			selectedItems = this.selectedImages;
			index = selectedItems.findIndex(s => s.divChoiceCatalogMarketImageID === (item as DivChoiceCatalogMarketImage).divChoiceCatalogMarketImageID);
		}

		if (isSelected && index < 0)
		{
			selectedItems.push(item);
		}
		else if (!isSelected && index >= 0)
		{
			selectedItems.splice(index, 1);
			selectedItems = [...selectedItems];
		}

		this.canAssociate = !isEqual(this.selectedImages, this.origSelectedImages);
	}

	getAssociations()
	{
		if (this.community.orgId)
		{
			this.choiceAssociations = new DivisionalChoice();

			forkJoin(this._divService.getDivChoiceCatalogMarketImages(this.choice.divChoiceCatalogId),
				this._divService.getDivChoiceCatalogCommunityImagesByOrgId(this.community.orgId),
				this._divService.getDivChoiceCatalogMarketAttributeGroups(this.choice.divChoiceCatalogId),
				this._divService.getDivChoiceCatalogCommunityAttributeGroupsByOrgId(this.community.orgId))
				.subscribe(([marketImages, communityImages, marketAttrGroups, communityAttrGroups]) =>
				{
					// Assign values from EDH for missing properties to each group
					if (marketAttrGroups && marketAttrGroups.length)
					{
						this._attrService.getAttributeGroupMarketForIds(marketAttrGroups.map(g => g.attributeGroupMarketId))
							.pipe(finalize(() =>
							{
								// Force the table to update with the added labels, etc.
								//this.cd.detectChanges();
								this.choiceAssociations.divChoiceCatalogMarketAttributes = marketAttrGroups;

								marketAttrGroups.forEach(m =>
								{
									if (communityAttrGroups.findIndex(c => c.attributeGroupMarketId === m.attributeGroupMarketId) > -1)
									{
										this.selectedAttributeGroups.push(m);
										this.origSelectedAttributeGroups.push(m);
									}
								});
							}))
							.subscribe(attributeGroupMarkets =>
							{
								// Convert the groups to an AttributeGroupMarket type
								marketAttrGroups = marketAttrGroups.map(g =>
								{
									const agm = attributeGroupMarkets.find(agm => agm.id === g.attributeGroupMarketId);

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
							});
					}

					this.choiceAssociations.divChoiceCatalogMarketImages = marketImages;

					marketImages.forEach(mImg =>
					{
						if (communityImages.findIndex(ci => ci.divChoiceCatalogMarketImageID === mImg.divChoiceCatalogMarketImageID) > -1)
						{
							this.selectedImages.push(mImg);
							this.origSelectedImages.push(mImg);
						}
					});
				});
		}
	}

	associateItems()
	{
		this.isSaving = true;

		this._msgService.add({ severity: 'info', summary: 'Associations', detail: `Saving selected associations!` });

		this._divService.associateChoiceItemsToCommunity(this.choice.divChoiceCatalogId, this.community.marketId, this.community.orgId, this.selectedAttributeGroups, this.selectedImages)
			.pipe(finalize(() =>
			{
				this.canAssociate = false;
				this.isSaving = false;

				this.onDataChange.emit();
			}))
			.subscribe(() =>
			{
				this._msgService.add({ severity: 'success', summary: 'Associations', detail: `Updated successfully!` });
			}, () =>
			{
				this._msgService.add({ severity: 'error', summary: 'Associations', detail: `An error has occured!` });
			});
	}

	onLoadImageError(event: any)
	{
		event.srcElement.src = 'assets/pultegroup_logo.jpg';
	}
}
