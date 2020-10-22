import { Component, OnInit, ViewChild } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import { DivisionalAttributesComponent } from '../../divisional-attributes/divisional-attributes.component';
import { DivisionalAttributeTemplateComponent } from '../../divisional-attribute-template/divisional-attribute-template.component';
import { DivisionalAttributeActionsComponent } from '../../divisional-attribute-actions/divisional-attribute-actions.component';
import { AttributeGroupsPanelComponent } from '../attribute-groups-panel/attribute-groups-panel.component';
import { AttributeGroupsSidePanelComponent } from '../attribute-groups-side-panel/attribute-groups-side-panel.component';
import { ActionButton } from '../../../../../shared/models/action-button.model';

import { Attribute } from '../../../../../shared/models/attribute.model';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { startWith } from 'rxjs/operators';
import { Permission } from 'phd-common/models';

@Component({
    selector: 'attribute-groups-container',
    templateUrl: './attribute-groups-container.component.html',
    styleUrls: ['./attribute-groups-container.component.scss']
})
export class AttributeGroupsContainerComponent extends UnsubscribeOnDestroy implements OnInit
{
	Permission = Permission;

    @ViewChild(DivisionalAttributeTemplateComponent)
	private divisionAttributeTemplate: DivisionalAttributeTemplateComponent;

	@ViewChild(AttributeGroupsPanelComponent)
	private attributeGroupPanel: AttributeGroupsPanelComponent;

	private selectedAttributeGroup: AttributeGroupMarket;

	sidePanelOpen: boolean = false;
	associateSidePanelOpen: boolean = false;
    actionButtons: Array<ActionButton> = [
		{ text: 'Add Group', class: 'btn btn-primary', action: this.onAddSingleClicked.bind(this), disabled: false }
	];

	attributeGroup$: ReplaySubject<AttributeGroupMarket>;
	attributes: Array<Attribute>;
	callback?: (attr: Array<Attribute>) => void;
	marketKey: string = "";

	get existingAttributeGroups(): Array<AttributeGroupMarket> {
		return (this.attributeGroupPanel && this.attributeGroupPanel.attributeGroupList) ? this.attributeGroupPanel.attributeGroupList : [];
	}
	
	constructor(private _divAttrComp: DivisionalAttributesComponent, private _orgService: OrganizationService) { super(); }

	ngOnInit() {
		this.attributeGroup$ = new ReplaySubject<AttributeGroupMarket>(1);

		this._orgService.currentFinancialMarket$.pipe(
			this.takeUntilDestroyed(),
			startWith(this._orgService.currentFinancialMarket)
		).subscribe(mkt => this.marketKey = mkt);
	}

	onEditAttributeGroup(attributeGroup: AttributeGroupMarket) {
		this.selectedAttributeGroup = attributeGroup;
		this.sidePanelOpen = true;
		this._divAttrComp.sidePanelOpen = true;
	}

    onAddSingleClicked(button: ActionButton) {
		this.sidePanelOpen = true;
		this._divAttrComp.sidePanelOpen = true;
    }

    onSidePanelClose(status: boolean) {
		this.sidePanelOpen = status;
		this._divAttrComp.sidePanelOpen = status;

		// set selected attribute group to null when closing the attribute group side panel
		if (!status) {
			this.selectedAttributeGroup = null;
		}
	}

	onAssociateSidePanelClose(status: boolean) {
		this._divAttrComp.sidePanelOpen = status;
		this.associateSidePanelOpen = status;
	}

	onSaveAttributeGroup(attributeGroup: AttributeGroupMarket) {
		if (attributeGroup) {
			this.attributeGroupPanel.addAttributeGroup(attributeGroup);
		}
	}

    onAssociateAttributes(event: { group: AttributeGroupMarket, attributes: Array<Attribute>, callback: any }) {
		this._divAttrComp.sidePanelOpen = true;
        this.attributes = event.attributes;
		this.callback = event.callback;
		this.attributeGroup$.next(event.group);
		this.associateSidePanelOpen = true;
	}
}
