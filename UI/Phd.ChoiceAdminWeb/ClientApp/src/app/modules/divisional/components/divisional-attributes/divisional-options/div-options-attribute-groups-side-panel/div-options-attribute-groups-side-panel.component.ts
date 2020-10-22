import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, ReplaySubject } from 'rxjs';
import { filter, map, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Message } from 'primeng/api';
import { maxBy } from "lodash";

import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { SidePanelComponent } from '../../../../../shared/components/side-panel/side-panel.component';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { Option } from '../../../../../shared/models/option.model';
import { AttributeGroupActionPanelComponent } from '../../../../../shared/components/attribute-group-action-panel/attribute-group-action-panel.component';

@Component({
	selector: 'div-options-attribute-groups-side-panel',
	templateUrl: './div-options-attribute-groups-side-panel.component.html',
	styleUrls: ['./div-options-attribute-groups-side-panel.component.scss']
})
export class DivOptionsAttributeGroupsSidePanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@ViewChild(AttributeGroupActionPanelComponent)
	private addGroupsPanel: AttributeGroupActionPanelComponent;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;

	@Output() onSaveAssociation = new EventEmitter();
	@Input() associatedGroups$: Observable<Array<AttributeGroupMarket>>;
	@Input() option: Option;
	@Input() callback: (grp: Array<AttributeGroupMarket>) => void;
	
	associatedGroups: Array<AttributeGroupMarket>;
	isSaving: boolean = false;

	allAttrGroupsInMarket: Array<AttributeGroupMarket> = [];
	attrGroupsInMarket$: ReplaySubject<Array<AttributeGroupMarket>>;
	errors: Array<Message> = [];

	get sidePanelHeader(): string
	{
		return 'Associate Attribute Groups';
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = this.isSaving || !this.addGroupsPanel || !this.addGroupsPanel.selectedGroups.length;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !saveDisabled;
		}

		return saveDisabled;
	}

	constructor(private _modalService: NgbModal, private route: ActivatedRoute, private _attrService: AttributeService) { super(); }

	ngOnInit()
	{
		this.attrGroupsInMarket$ = new ReplaySubject<Array<AttributeGroupMarket>>(1);

		this.associatedGroups$.subscribe(grps =>
		{
			this.associatedGroups = grps;
			this.filterAssociatedAttributeGroups();
		});

		this.route.parent.paramMap.pipe(
			this.takeUntilDestroyed(),
			filter(p => p.get('marketId') && p.get('marketId') != '0'),
			map(p => +p.get('marketId')),
			distinctUntilChanged(),
			switchMap(marketId => this._attrService.getAttributeGroupsByMarketId(marketId, true, null, null, null, null, true))
		).subscribe(data =>
		{
			this.allAttrGroupsInMarket = data;
			this.filterAssociatedAttributeGroups();
		});
	}

	onCloseSidePanel(status: boolean)
	{
		this.addGroupsPanel.reset();
		this.sidePanel.isDirty = false;
		this.onSidePanelClose.emit(status);
	}

	toggleSidePanel(status: boolean)
	{
		if (this.addGroupsPanel.selectedGroups.length)
		{
			this.sidePanel.setIsDirty();
		}

		this.sidePanel.toggleSidePanel(status);
	}

	filterAssociatedAttributeGroups()
	{
		let groups = this.option ? this.allAttrGroupsInMarket.filter(grp => !this.associatedGroups.some(x => x.id === grp.id)) : this.allAttrGroupsInMarket;

		this.attrGroupsInMarket$.next(groups);
	}

	saveAndClose()
	{
		this.isSaving = true;

		const lastGroup = this.associatedGroups.length ? maxBy(this.associatedGroups, 'sortOrder') : null;
		let sortOrder = lastGroup ? lastGroup.sortOrder + 1 : 0;

		let groupOrders = this.addGroupsPanel.selectedGroups.map(g => {
			return {
				attributeGroupId: g.id,
				sortOrder: sortOrder++
			};
		});
		this._attrService.updateAttributeGroupOptionMarketAssocs(this.option.id, groupOrders).subscribe(option =>
		{
			if (this.callback)
			{
				this.callback(this.associatedGroups.concat(this.addGroupsPanel.selectedGroups as AttributeGroupMarket[]));
			}

			this.errors = [];
			this.errors.push({ severity: 'success', detail: `Attribute group(s) associated.` });

			this.isSaving = false;
			this.sidePanel.isDirty = false;
			this.sidePanel.toggleSidePanel(false);
		},
		error =>
		{
			this.isSaving = false;
			this.displayErrorMessage('Failed to associate attribute group(s).');
		});
	}

	displayErrorMessage(message: string)
	{
		if (message)
		{
			this.errors = [];
			this.errors.push({ severity: 'error', detail: message });
		}
	}
}
