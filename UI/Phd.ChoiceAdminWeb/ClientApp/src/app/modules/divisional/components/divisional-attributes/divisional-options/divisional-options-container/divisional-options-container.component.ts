import { Component, OnInit, ViewChild } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import { DivisionalAttributeTemplateComponent } from '../../divisional-attribute-template/divisional-attribute-template.component';
import { DivisionalOptionsPanelComponent } from '../divisional-options-panel/divisional-options-panel.component';
import { DivisionalOptionsSidePanelComponent } from '../divisional-options-side-panel/divisional-options-side-panel.component';
import { DivisionalAttributesComponent } from '../../divisional-attributes/divisional-attributes.component';

import { UiUtilsService } from '../../../../../core/services/ui-utils.service';

import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { LocationGroupMarket } from '../../../../../shared/models/location-group-market.model';
import { Option } from '../../../../../shared/models/option.model';
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

	@ViewChild(DivisionalOptionsSidePanelComponent)
	private _optionSidePanel: DivisionalOptionsSidePanelComponent;

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

	constructor(private _uiUtils: UiUtilsService, private _divAttrComp: DivisionalAttributesComponent) { }

	ngOnInit() {
		this.associatedAttributeGroups$ = new ReplaySubject<Array<AttributeGroupMarket>>(1);
		this.associatedLocationGroups$ = new ReplaySubject<Array<LocationGroupMarket>>(1);
		this.communities$ = new ReplaySubject<Array<IFinancialCommunity>>(1);
	}

	onSidePanelClose(status: boolean)
	{
		this._divAttrComp.sidePanelOpen = status;
		this.sidePanelOpen = status;
		this._uiUtils.clearHighlightParentRow();
		this._uiUtils.scrollToId('divisionalOptionsPanel');
		this._optionPanel.selectedOption = null;
		this._optionPanel.performChangeDetection();
	}
	
	onSidePanelOpen(params: { event: any, option: Option, currentTab?: string, isReadOnly?: boolean })
	{
		this._divAttrComp.sidePanelOpen = true;
		this.sidePanelOpen = true;
		this.option = params.option;
		this.currentTab = params.currentTab;
		this.isReadOnly = params.isReadOnly;

		this._uiUtils.highlightParentRow(params.event);
		this._uiUtils.scrollToSelectedRow();
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

	onAssociateAttributeGroupsToCommunities(event: { option: Option, groups: Array<AttributeGroupMarket>, callback: any }) {
		this._divAttrComp.sidePanelOpen = true;
		this.associateCommunitySidePanelOpen = true;
		this.option = event.option;
		this.selectedGroups = event.groups;
		this.associateCommunityCallback = event.callback;
	}

	onAssociateLocationGroupsToCommunities(event: { option: Option, groups: Array<LocationGroupMarket>, callback: any }) {
		this._divAttrComp.sidePanelOpen = true;
		this.associateCommunitySidePanelOpen = true;
		this.option = event.option;
		this.selectedGroups = event.groups;
		this.associateCommunityCallback = event.callback;
	}

	onOptionUpdate()
	{
		this._optionPanel.performChangeDetection();
	}

	onAssociateCommunitySidePanelClose(status: boolean) {
		this._divAttrComp.sidePanelOpen = status;
		this.associateCommunitySidePanelOpen = status;
		this._optionPanel.performChangeDetection();
	}
}
