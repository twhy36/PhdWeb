import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from 'primeng/api';
import { isEqual, differenceBy } from "lodash";

import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { LocationService } from '../../../../../core/services/location.service';
import { SidePanelComponent } from '../../../../../shared/components/side-panel/side-panel.component';
import { Option, OptionMarketImage } from '../../../../../shared/models/option.model';
import { IFinancialCommunity } from '../../../../../shared/models/financial-community.model';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { DivisionalOptionService } from '../../../../../core/services/divisional-option.service';

@Component({
	selector: 'associate-communities-side-panel',
	templateUrl: './associate-communities-side-panel.component.html',
	styleUrls: ['./associate-communities-side-panel.component.scss']
})
export class AssociateCommunitiesSidePanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;

	@Input() option: Option;
	@Input() callback: () => void;
	@Input() groups: Array<AttributeGroupMarket | LocationGroupMarket>;
	@Input() images: Array<OptionMarketImage>;

	isSaving: boolean = false;
	errors: Array<Message> = [];

	communities: Array<IFinancialCommunity> = [];
	selectedCommunities: Array<IFinancialCommunity> = [];
	origSelectedCommunities: Array<IFinancialCommunity> = [];

	public AssociatingType = AssociatingType;
	associatingType: AssociatingType;

	get saveDisabled(): boolean
	{
		// Need to sort the arrays in order to properly compare
		const sortedSelectedCommunities = this.selectedCommunities.sort((a, b) => { return a.id - b.id; });
		const sortedOrigCommunities = this.origSelectedCommunities.sort((a, b) => { return a.id - b.id; });

		const saveDisabled = this.isSaving || isEqual(sortedSelectedCommunities, sortedOrigCommunities);

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !saveDisabled;
		}

		return saveDisabled;
	}

	constructor(private _attrService: AttributeService,
		private _divOptService: DivisionalOptionService,
		private _locService: LocationService) { super(); }

	ngOnInit()
	{
		this.option.communities$.subscribe(communities =>
		{
			this.communities = communities;

			if (this.groups && this.groups.length)
			{
				this.associatingType = this.groups[0] instanceof AttributeGroupMarket ? AssociatingType.AttributeGroups : AssociatingType.LocationGroups;
				this.selectCommunities();
			}

			if (this.images && this.images.length) {
				this.associatingType = this.images[0] instanceof OptionMarketImage ? AssociatingType.OptionImages : null/* TODO: ChoiceImages */;
				this.selectCommunities();
			}
		});
	}

	selectCommunities()
	{
		// Select the communities if all groups or images are associated
		this.communities.forEach(community =>
		{
			if (this.groups) {
				const nonAssociatedGroups = this.groups.filter(group => {
					const groups = this.associatingType == AssociatingType.AttributeGroups
						? community.attributeGroupCommunities.filter(attr => attr.attributeGroupMarketId === group.id)
						: community.locationGroupCommunities.filter(loc => loc.locationGroupMarketId === group.id);
					return !groups || !groups.length;
				});

				if (!nonAssociatedGroups || !nonAssociatedGroups.length) {
					this.setOriginallySelectedCommunity(community);
				}
			}

			if (this.images) {
				const nonAssociatedImages = this.images.filter(image => {
					const optionCommunityIds = image.optionCommunityImages ? image.optionCommunityImages.map(oci => oci.optionCommunityId) : [];
					const images = this.associatingType == AssociatingType.OptionImages
						? community.optionCommunities.filter(oc => optionCommunityIds.includes(oc.id))
						: community.optionCommunities.filter(oc => optionCommunityIds.includes(oc.id))/* TODO: ChoiceImages */;
					return !images || !images.length;
				});

				if (!nonAssociatedImages || !nonAssociatedImages.length) {
					this.setOriginallySelectedCommunity(community);
				}
			}
		});
	}

	setOriginallySelectedCommunity(community: IFinancialCommunity) {
		if (!this.origSelectedCommunities.includes(community)) {
			this.origSelectedCommunities.push(community);
			this.setCommunitySelected(community, true);
		}
	}

	onCloseSidePanel(status: boolean)
	{
		if (this.callback)
		{
			this.callback();
		}

		this.sidePanel.isDirty = false;
		this.onSidePanelClose.emit(status);
	}

	toggleSidePanel()
	{
		if (this.callback)
		{
			this.callback();
		}

		this.sidePanel.toggleSidePanel();
	}

	saveAndClose()
	{
		this.isSaving = true;

		const newlySelectedCommunities = differenceBy(this.selectedCommunities, this.origSelectedCommunities, 'id');
		const associatedCommunityIds = newlySelectedCommunities.map(c => c.id);

		const deSelectedCommunities = differenceBy(this.origSelectedCommunities, this.selectedCommunities, 'id');
		const disassociatedCommunityIds = deSelectedCommunities.map(c => c.id);

		let saveAssocs: Observable<any>;

		switch (this.associatingType) {
			case AssociatingType.AttributeGroups:
				saveAssocs = this.saveAttributeGroupsAssocs(associatedCommunityIds, disassociatedCommunityIds);
				break;
			case AssociatingType.LocationGroups:
				saveAssocs = this.saveLocationGroupsAssocs(associatedCommunityIds, disassociatedCommunityIds);
				break;
			case AssociatingType.OptionImages:
				saveAssocs = this.saveOptionImageAssocs(associatedCommunityIds, disassociatedCommunityIds);
				break;
			default:
				break;
		}

		saveAssocs.subscribe(data =>
		{
			if (this.callback)
			{
				this.callback();
			}
			this.errors = [{ severity: 'success', detail: `Communities associated.` }];
			this.isSaving = false;
			this.sidePanel.isDirty = false;

			this.sidePanel.toggleSidePanel();
		},
			error =>
			{
				this.isSaving = false;
				this.displayErrorMessage('Failed to associate communities.');
			});
	}

	saveAttributeGroupsAssocs(associatedCommunityIds: number[], disassociatedCommunityIds: number[]): Observable<any>
	{
		const attrGroups = this.groups as AttributeGroupMarket[];

		return this._attrService.updateAttributeGroupsCommunitiesAssocs(this.option.id,
			associatedCommunityIds, disassociatedCommunityIds, attrGroups);
	}

	saveLocationGroupsAssocs(associatedCommunityIds: number[], disassociatedCommunityIds: number[]): Observable<any>
	{
		const locGroups = this.groups as LocationGroupMarket[];

		return this._locService.updateLocationGroupsCommunitiesAssocs(this.option.id,
			associatedCommunityIds, disassociatedCommunityIds, locGroups);
	}

	saveOptionImageAssocs(associatedCommunityIds: number[], disassociatedCommunityIds: number[]): Observable<any> {
		const optionImages = this.images as OptionMarketImage[];

		return this._divOptService.updateOptionMarketImagesCommunitiesAssocs(this.option.id,
			associatedCommunityIds, disassociatedCommunityIds, optionImages);
	}

	displayErrorMessage(message: string)
	{
		if (message)
		{
			this.errors = [];
			this.errors.push({ severity: 'error', detail: message });
		}
	}

	isCommunitySelected(community: IFinancialCommunity): boolean
	{
		return this.selectedCommunities.some(s => s.id === community.id);
	}

	areAllCommunitiesSelected(): boolean
	{
		return this.communities.length > 0 && this.selectedCommunities.length === this.communities.length;
	}

	setCommunitySelected(community: IFinancialCommunity, isSelected: boolean): void
	{
		let index = this.selectedCommunities.findIndex(s => s.id === community.id);

		if (isSelected && index < 0)
		{
			this.selectedCommunities.push(community);
		}
		else if (!isSelected && index >= 0)
		{
			this.selectedCommunities.splice(index, 1);
			this.selectedCommunities = [...this.selectedCommunities];
		}
	}

	toggleAllCommunities(isSelected: boolean): void
	{
		if (isSelected)
		{
			this.selectedCommunities = this.communities.slice();
		}
		else
		{
			this.selectedCommunities = [];
		}
	}

	getLocationGroupName(community: IFinancialCommunity): string
	{
		if (this.associatingType === AssociatingType.LocationGroups)
		{
			return community.locationGroupCommunities && community.locationGroupCommunities.length
				? ': ' + community.locationGroupCommunities[0].locationGroupName
				: '';
		}

		return '';
	}
}

export enum AssociatingType {
	AttributeGroups,
	LocationGroups,
	OptionImages
}
