import { Component, OnInit, ViewChild } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import { DivisionalAttributeTemplateComponent } from '../../divisional-attribute-template/divisional-attribute-template.component';
import { DivChoicesPanelComponent } from '../div-choices-panel/div-choices-panel.component';
import { DivisionalAttributesComponent } from '../../divisional-attributes/divisional-attributes.component';

import { UiUtilsService } from '../../../../../core/services/ui-utils.service';

import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { Option } from '../../../../../shared/models/option.model';
import { IFinancialCommunity } from '../../../../../shared/models/financial-community.model';
import { DivChoiceCatalogAttributeGroupCommunity, DivChoiceCatalogCommunityImage, DivChoiceCatalogLocationGroupCommunity, DivChoiceCatalogMarketImage, DivisionalChoice } from '../../../../../shared/models/divisional-catalog.model';

@Component({
	selector: 'div-choices-container',
	templateUrl: './div-choices-container.component.html',
	styleUrls: ['./div-choices-container.component.scss']
})
export class DivChoicesContainerComponent implements OnInit
{
	@ViewChild(DivChoicesPanelComponent)
	private _choicesPanel: DivChoicesPanelComponent;

	sidePanelOpen: boolean = false;
	choice: DivisionalChoice = null;
	currentTab: string = '';
	isReadOnly: boolean = false;

	attrGroupSidePanelOpen: boolean = false;
	associatedAttributeGroups$: ReplaySubject<Array<AttributeGroupMarket>>;

	callback: (grp: Array<AttributeGroupMarket | LocationGroupMarket>) => void;

	locGroupSidePanelOpen: boolean = false;
	associatedLocationGroups$: ReplaySubject<Array<LocationGroupMarket>>;

	communities$: ReplaySubject<Array<IFinancialCommunity>>;
	communityCallback: (community: Array<IFinancialCommunity>) => void;
	associateCommunityCallback: () => void;

	associateCommunitySidePanelOpen: boolean = false;
	selectedGroups: Array<AttributeGroupMarket | LocationGroupMarket>;
	selectedImages: Array<DivChoiceCatalogMarketImage>;
	communityImages: Array<DivChoiceCatalogCommunityImage>
	communityGroups: Array<DivChoiceCatalogAttributeGroupCommunity | DivChoiceCatalogLocationGroupCommunity>;
	selectedMarketId: number;

	constructor(private _uiUtils: UiUtilsService, private _divAttrComp: DivisionalAttributesComponent) { }

	ngOnInit()
	{
		this.associatedAttributeGroups$ = new ReplaySubject<Array<AttributeGroupMarket>>(1);
		this.associatedLocationGroups$ = new ReplaySubject<Array<LocationGroupMarket>>(1);
		this.communities$ = new ReplaySubject<Array<IFinancialCommunity>>(1);
	}

	onAttrGroupSidePanelClose(status: boolean)
	{
		this._divAttrComp.sidePanelOpen = status;
		this.attrGroupSidePanelOpen = status;

		this._choicesPanel.performChangeDetection();
	}

	onAssociateAttributeGroups(event: { choice: DivisionalChoice, groups: Array<AttributeGroupMarket>, callback: any })
	{
		this._divAttrComp.sidePanelOpen = true;
		this.attrGroupSidePanelOpen = true;
		this.choice = event.choice;
		this.callback = event.callback;

		this.associatedAttributeGroups$.next(event.groups);
	}

	onLocGroupSidePanelClose(status: boolean)
	{
		this._divAttrComp.sidePanelOpen = status;
		this.locGroupSidePanelOpen = status;

		this._choicesPanel.performChangeDetection();
	}

	onAssociateLocationGroups(event: { choice: DivisionalChoice, groups: Array<LocationGroupMarket>, callback: any })
	{
		this._divAttrComp.sidePanelOpen = true;
		this.locGroupSidePanelOpen = true;
		this.choice = event.choice;
		this.callback = event.callback;

		this.associatedLocationGroups$.next(event.groups);
	}

	onAssociateAttributeGroupsToCommunities(event: { choice: DivisionalChoice, groups: Array<AttributeGroupMarket>, communityGroups: Array<DivChoiceCatalogAttributeGroupCommunity>, marketId: number, callback: any })
	{
		this._divAttrComp.sidePanelOpen = true;
		this.associateCommunitySidePanelOpen = true;
		this.choice = event.choice;
		this.selectedGroups = event.groups;
		this.communityGroups = event.communityGroups;
		this.selectedMarketId = event.marketId;
		this.associateCommunityCallback = event.callback;
	}

	onAssociateLocationGroupsToCommunities(event: { choice: DivisionalChoice, groups: Array<LocationGroupMarket>, communityGroups: Array<DivChoiceCatalogLocationGroupCommunity>, marketId: number, callback: any })
	{
		this._divAttrComp.sidePanelOpen = true;
		this.associateCommunitySidePanelOpen = true;
		this.choice = event.choice;
		this.selectedGroups = event.groups;
		this.communityGroups = event.communityGroups;
		this.selectedMarketId = event.marketId;
		this.associateCommunityCallback = event.callback;
	}

	onAssociateImagesToCommunities(event: { choice: DivisionalChoice, marketImages: Array<DivChoiceCatalogMarketImage>, communityImages: Array<DivChoiceCatalogCommunityImage>, marketId: number, callback: any }) {
		this._divAttrComp.sidePanelOpen = true;
		this.associateCommunitySidePanelOpen = true;
		this.choice = event.choice;
		this.selectedImages = event.marketImages;
		this.communityImages = event.communityImages;
		this.selectedMarketId = event.marketId;
		this.associateCommunityCallback = event.callback;
	}

	onOptionUpdate()
	{
		this._choicesPanel.performChangeDetection();
	}

	onAssociateCommunitySidePanelClose(status: boolean)
	{
		this._divAttrComp.sidePanelOpen = status;
		this.associateCommunitySidePanelOpen = status;

		this._choicesPanel.performChangeDetection();
	}
}
