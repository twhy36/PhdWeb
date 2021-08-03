import { Component, OnInit, ViewChild } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import { DivisionalAttributeTemplateComponent } from '../../divisional-attribute-template/divisional-attribute-template.component';
import { DivisionalOptionsPanelComponent } from '../divisional-options-panel/divisional-options-panel.component';
import { DivisionalAttributesComponent } from '../../divisional-attributes/divisional-attributes.component';

import { UiUtilsService } from '../../../../../core/services/ui-utils.service';

import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { Option, OptionMarketImage } from '../../../../../shared/models/option.model';
import { IFinancialCommunity } from '../../../../../shared/models/financial-community.model';

@Component({
	selector: 'divisional-options-container',
	templateUrl: './divisional-options-container.component.html',
	styleUrls: ['./divisional-options-container.component.scss']
})
export class DivisionalOptionsContainerComponent implements OnInit
{
	@ViewChild(DivisionalAttributeTemplateComponent)
	private divisionAttributeTemplate: DivisionalAttributeTemplateComponent;

	@ViewChild(DivisionalOptionsPanelComponent)
	private _optionPanel: DivisionalOptionsPanelComponent;

	sidePanelOpen: boolean = false;
	option: Option = null;
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
	selectedImages: Array<OptionMarketImage>;

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

		this._optionPanel.performChangeDetection();
	}

	onAssociateAttributeGroups(event: { option: Option, groups: Array<AttributeGroupMarket>, callback: any })
	{
		this._divAttrComp.sidePanelOpen = true;
		this.attrGroupSidePanelOpen = true;
		this.option = event.option;
		this.callback = event.callback;

		this.associatedAttributeGroups$.next(event.groups);
	}

	onLocGroupSidePanelClose(status: boolean)
	{
		this._divAttrComp.sidePanelOpen = status;
		this.locGroupSidePanelOpen = status;

		this._optionPanel.performChangeDetection();
	}

	onAssociateLocationGroups(event: { option: Option, groups: Array<LocationGroupMarket>, callback: any })
	{
		this._divAttrComp.sidePanelOpen = true;
		this.locGroupSidePanelOpen = true;
		this.option = event.option;
		this.callback = event.callback;

		this.associatedLocationGroups$.next(event.groups);
	}

	onAssociateAttributeGroupsToCommunities(event: { option: Option, groups: Array<AttributeGroupMarket>, callback: any })
	{
		this._divAttrComp.sidePanelOpen = true;
		this.associateCommunitySidePanelOpen = true;
		this.option = event.option;
		this.selectedGroups = event.groups;
		this.associateCommunityCallback = event.callback;
	}

	onAssociateLocationGroupsToCommunities(event: { option: Option, groups: Array<LocationGroupMarket>, callback: any })
	{
		this._divAttrComp.sidePanelOpen = true;
		this.associateCommunitySidePanelOpen = true;
		this.option = event.option;
		this.selectedGroups = event.groups;
		this.associateCommunityCallback = event.callback;
	}

	onAssociateOptionImagesToCommunities(event: { option: Option, images: Array<OptionMarketImage>, callback: any }) {
		this._divAttrComp.sidePanelOpen = true;
		this.associateCommunitySidePanelOpen = true;
		this.option = event.option;
		this.selectedImages = event.images;
		this.associateCommunityCallback = event.callback;
	}

	onOptionUpdate()
	{
		this._optionPanel.performChangeDetection();
	}

	onAssociateCommunitySidePanelClose(status: boolean)
	{
		this._divAttrComp.sidePanelOpen = status;
		this.associateCommunitySidePanelOpen = status;

		this._optionPanel.performChangeDetection();
	}
}
