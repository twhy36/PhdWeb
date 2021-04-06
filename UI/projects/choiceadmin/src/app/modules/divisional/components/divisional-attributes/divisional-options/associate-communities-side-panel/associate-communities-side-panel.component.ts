import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

import { Message } from 'primeng/api';
import { isEqual, differenceBy } from "lodash";

import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { LocationService } from '../../../../../core/services/location.service';
import { SidePanelComponent } from '../../../../../shared/components/side-panel/side-panel.component';
import { Option } from '../../../../../shared/models/option.model';
import { IFinancialCommunity } from '../../../../../shared/models/financial-community.model';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';

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

	isSaving: boolean = false;
	errors: Array<Message> = [];

	communities: Array<IFinancialCommunity> = [];
	selectedCommunities: Array<IFinancialCommunity> = [];
	origSelectedCommunities: Array<IFinancialCommunity> = [];
	isAssociatingAttributeGroups: boolean;

	get saveDisabled(): boolean
	{
		let saveDisabled = this.isSaving || isEqual(this.selectedCommunities, this.origSelectedCommunities);

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !saveDisabled;
		}

		return saveDisabled;
	}

	constructor(private _attrService: AttributeService, private _locService: LocationService) { super(); }

	ngOnInit()
	{
		this.option.communities$.subscribe(communities =>
		{
			this.communities = communities;

			if (this.groups.length)
			{
				this.isAssociatingAttributeGroups = this.groups[0] instanceof AttributeGroupMarket;
				this.selectCommunities();
			}
		});
	}

	selectCommunities()
	{
		// Select the communities if all groups are associated
		this.communities.forEach(community =>
		{
			const nonAssociatedGroups = this.groups.filter(group =>
			{
				const groups = this.isAssociatingAttributeGroups
					? community.attributeGroupCommunities.filter(attr => attr.attributeGroupMarketId === group.id)
					: community.locationGroupCommunities.filter(loc => loc.locationGroupMarketId === group.id);
				return !groups || !groups.length;
			});

			if (!nonAssociatedGroups || !nonAssociatedGroups.length)
			{
				this.origSelectedCommunities.push(community);
				this.setCommunitySelected(community, true);
			}
		});
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

	toggleSidePanel(status: boolean)
	{
		if (this.callback)
		{
			this.callback();
		}
		this.sidePanel.toggleSidePanel(status);
	}

	saveAndClose()
	{
		this.isSaving = true;

		const newlySelectedCommunities = differenceBy(this.selectedCommunities, this.origSelectedCommunities, 'id');
		const associatedCommunityIds = newlySelectedCommunities.map(c => c.id);

		const deSelectedCommunities = differenceBy(this.origSelectedCommunities, this.selectedCommunities, 'id');
		const disassociatedCommunityIds = deSelectedCommunities.map(c => c.id);

		const saveAssocs = this.isAssociatingAttributeGroups
			? this.saveAttributeGroupsAssocs(associatedCommunityIds, disassociatedCommunityIds)
			: this.saveLocationGroupsAssocs(associatedCommunityIds, disassociatedCommunityIds);

		saveAssocs.subscribe(data =>
		{
			if (this.callback)
			{
				this.callback();
			}
			this.errors = [{ severity: 'success', detail: `Communities associated.` }];
			this.isSaving = false;
			this.sidePanel.isDirty = false;
			this.sidePanel.toggleSidePanel(false);
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
		} else if (!isSelected && index >= 0)
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
		} else
		{
			this.selectedCommunities = [];
		}
	}

	getLocationGroupName(community: IFinancialCommunity): string
	{
		if (!this.isAssociatingAttributeGroups)
		{
			return community.locationGroupCommunities && community.locationGroupCommunities.length
				? ': ' + community.locationGroupCommunities[0].locationGroupName
				: '';
		}
		return '';
	}
}
