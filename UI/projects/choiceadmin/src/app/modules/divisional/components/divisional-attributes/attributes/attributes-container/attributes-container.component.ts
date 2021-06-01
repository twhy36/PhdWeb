import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { filter, map, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

import { IdentityService, Permission } from 'phd-common';

import { DivisionalAttributesComponent } from '../../divisional-attributes/divisional-attributes.component';
import { DivisionalAttributeTemplateComponent } from '../../divisional-attribute-template/divisional-attribute-template.component';
import { AttributesPanelComponent } from '../attributes-panel/attributes-panel.component';

import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { ActionButton } from '../../../../../shared/models/action-button.model';
import { Attribute } from '../../../../../shared/models/attribute.model';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { OrganizationService } from '../../../../../core/services/organization.service';

@Component({
	selector: 'attributes-container',
	templateUrl: './attributes-container.component.html',
	styleUrls: ['./attributes-container.component.scss']
})
export class AttributesContainerComponent extends UnsubscribeOnDestroy implements OnInit
{
	Permission = Permission;

	@ViewChild(DivisionalAttributeTemplateComponent)
	private divisionAttributeTemplate: DivisionalAttributeTemplateComponent;

	@ViewChild(AttributesPanelComponent)
	private attributesPanel: AttributesPanelComponent;

	selectedAttribute: Attribute;
	activeAttributeGroups: Array<AttributeGroupMarket> = [];

	sidePanelOpen: boolean = false;
	isAddingAttribute: boolean = false;
	marketKey: string = "";
	isReadOnly: boolean;
	canEditImages: boolean;

	actionButtons: Array<ActionButton> = [
		{ text: 'Add Attribute', class: 'btn btn-primary', action: this.onAddSingleClicked.bind(this), disabled: false }
	];

	get existingAttributes(): Array<Attribute>
	{
		return (this.attributesPanel && this.attributesPanel.attributeList) ? this.attributesPanel.attributeList : [];
	}

	constructor(private route: ActivatedRoute, private _attrService: AttributeService, private _divAttrComp: DivisionalAttributesComponent, private _orgService: OrganizationService, private _identityService: IdentityService) { super(); }

	ngOnInit()
	{
		this.route.parent.paramMap.pipe(
			this.takeUntilDestroyed(),
			filter(p => p.get('marketId') && p.get('marketId') != '0'),
			map(p => +p.get('marketId')),
			distinctUntilChanged(),
			switchMap((marketId: number) =>
			{
				return forkJoin(
					this._attrService.getActiveAttributeGroupsByMarketId(marketId),
					this._identityService.hasClaimWithPermission('Attributes', Permission.Edit),
					this._identityService.hasClaimWithPermission('CatalogImages', Permission.Edit),
					this._identityService.hasMarket(marketId));
			})
		).subscribe(([data, hasAttributePermission, hasImagesPermission, hasMarket]) =>
		{
			this.activeAttributeGroups = data;

			this.isReadOnly = !hasAttributePermission || !hasMarket;
			this.canEditImages = <any>(hasImagesPermission && hasMarket);
		});

		this._orgService.currentFinancialMarket$.pipe(
			this.takeUntilDestroyed(),
			startWith(this._orgService.currentFinancialMarket)
		).subscribe(mkt => this.marketKey = mkt);
	}

	onAddSingleClicked(button: ActionButton)
	{
		this.sidePanelOpen = true;
		this.isAddingAttribute = true;
		this._divAttrComp.sidePanelOpen = true;
	}

	onSidePanelClose(status: boolean)
	{
		this.sidePanelOpen = status;
		this._divAttrComp.sidePanelOpen = status;

		if (!status)
		{
			this.selectedAttribute = null;
		}
	}

	onSaveAttribute(attribute: Attribute)
	{
		if (attribute)
		{
			this.attributesPanel.addAttribute(attribute);
		}
	}

	onEditAttribute(attribute: Attribute)
	{
		this.selectedAttribute = attribute;
		this.sidePanelOpen = true;
		this.isAddingAttribute = false;
		this._divAttrComp.sidePanelOpen = true;
	}
}
