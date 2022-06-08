import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, BehaviorSubject, of, EMPTY as empty, throwError as _throw } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { SidePanelComponent } from '../../../../../shared/components/side-panel/side-panel.component';
import { Attribute } from '../../../../../shared/models/attribute.model';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { MessageService } from 'primeng/api';
import { NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';

import { cloneDeep, differenceBy } from "lodash";
import { AttributeDetailsTabComponent } from '../attribute-details-tab/attribute-details-tab.component';
import { AttributeGroupsTabComponent } from '../attribute-groups-tab/attribute-groups-tab.component';

@Component({
	selector: 'attributes-side-panel',
	templateUrl: './attributes-side-panel.component.html',
	styleUrls: ['./attributes-side-panel.component.scss']
})
export class AttributesSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@ViewChild(AttributeDetailsTabComponent)
	private detailsTab: AttributeDetailsTabComponent;

	@ViewChild(AttributeGroupsTabComponent)
	private groupsTab: AttributeGroupsTabComponent;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;
	@Input() isAdd: boolean = false;
	@Input() isReadOnly: boolean;

	@Output() onSaveAttribute = new EventEmitter<Attribute>();

	@Input() selectedAttribute: Attribute;
	@Input() existingAttributes: Array<Attribute>;
	@Input() activeAttributeGroups: Array<AttributeGroupMarket>;

	isAddingAnother: boolean = false;
	isSaving: boolean = false;
	isSaving$: BehaviorSubject<boolean>;

	isAttributeChanged: boolean = false;
	isGroupSelectionChanged: boolean = false;
	isDetailsFormPristine: boolean = true;

	origSelectedGroups: Array<AttributeGroupMarket> = [];
	selectedGroups: Array<AttributeGroupMarket> = [];

	searchKeyword: string = '';
	searchFilter: string = '';
	searchSelectedAddGroup: Array<AttributeGroupMarket> = [];
	searchSelectedRemoveGroup: Array<AttributeGroupMarket> = [];

	get sidePanelHeader(): string
	{
		return this.isAdd ? 'Add Attribute' : 'Edit Attribute';
	}

	get saveDisabled(): boolean
	{
		let isGroupChangeValid = (this.selectedAttribute ? this.selectedAttribute.name : false) && this.isGroupSelectionChanged;

		if (this.detailsTab)
		{
			isGroupChangeValid = this.detailsTab.attributeForm.valid && this.isGroupSelectionChanged;
		}

		let saveDisabled = (!this.isAttributeChanged && !isGroupChangeValid) || this.isSaving;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !saveDisabled;
		}

		return saveDisabled;
	}

	constructor(private route: ActivatedRoute, private _attrService: AttributeService, private _msgService: MessageService) { }

	ngOnInit()
	{
		this.isSaving$ = new BehaviorSubject<boolean>(this.isSaving);

		if (!this.isAdd && this.selectedAttribute)
		{
			this.selectedAttribute.attributeGroups$.subscribe(groups =>
			{
				this.origSelectedGroups.push(...groups);
				this.selectedGroups.push(...groups);

				if (this.groupsTab)
				{
					this.groupsTab.onGroupSelectionChange();
				}
			});
		}
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);

		if (this.detailsTab)
		{
			this.detailsTab.imgUrl = '';
		}
	}

	toggleSidePanel()
	{
		if (!this.isDetailsFormPristine || this.isAttributeChanged || this.isGroupSelectionChanged)
		{
			this.sidePanel.setIsDirty();
		}

		this.sidePanel.toggleSidePanel();
	}

	save(): Observable<Attribute>
	{
		this.updateAttributeDetails();

		if (!this.selectedAttribute.name)
		{
			this._msgService.add({ severity: 'error', summary: 'Attribute', detail: `Attribute name is required` });

			return empty;
		}

		this.isSaving = true;
		this.isSaving$.next(this.isSaving);

		return (this.selectedAttribute.id ? this._attrService.updateAttribute(this.selectedAttribute) : this._attrService.addAttribute(this.selectedAttribute))
			.pipe(
				switchMap(attr =>
				{
					const addedGroupIds = differenceBy(this.selectedGroups, this.origSelectedGroups, 'id').map(g => g.id);
					const removedGroupIds = differenceBy(this.origSelectedGroups, this.selectedGroups, 'id').map(g => g.id);

					if (addedGroupIds.length || removedGroupIds.length)
					{
						return this._attrService.updateAssociationsByAttributeId(attr.id, addedGroupIds, removedGroupIds);
					}
					else
					{
						return of(attr);
					}
				}),
				map(attr =>
				{
					attr.tags = cloneDeep(this.selectedAttribute.tags);
					this.isSaving = false;
					this.isSaving$.next(this.isSaving);

					return attr;
				}), catchError(error =>
				{
					return _throw(error || 'Server error');
				}));
	}

	saveAndContinue()
	{
		this.isAddingAnother = true;
		this.save().subscribe(attr =>
		{
			this.onSaveComplete(attr);
		},
			error => this.handleSaveError()
		);
	}

	saveAndClose()
	{
		this.isAddingAnother = false;

		this.save().subscribe(attr =>
		{
			this.onSaveComplete(attr);
			this.sidePanel.isDirty = false;

			this.sidePanel.toggleSidePanel();
		},
			error => this.handleSaveError()
		);
	}

	onSaveComplete(attr: Attribute)
	{
		this.isAttributeChanged = false;
		this.isGroupSelectionChanged = false;
		this.isDetailsFormPristine = true;

		this.onSaveAttribute.emit(attr);
		this.handleSaveSuccess();
		this.resetTabs();
	}

	private handleSaveError()
	{
		this.isSaving = false;
		this.isSaving$.next(this.isSaving);
		this._msgService.add({ severity: 'error', summary: 'Attribute', detail: `failed to saved!` });
	}

	private handleSaveSuccess()
	{
		this._msgService.add({ severity: 'success', summary: 'Attribute', detail: `has been saved!` });
	}

	async beforeNavChange($event: NgbNavChangeEvent)
	{
		this.updateAttributeDetails();

		if ($event.nextId === 'details')
		{
			this.searchKeyword = this.groupsTab.addGroups.searchBar.keyword;
			this.searchFilter = this.groupsTab.addGroups.searchBar.selectedSearchFilter;
			this.searchSelectedAddGroup = this.groupsTab.addGroups.selectedGroups as AttributeGroupMarket[];
			this.searchSelectedRemoveGroup = this.groupsTab.removeGroups ? this.groupsTab.removeGroups.selectedGroups as AttributeGroupMarket[] : [];
		}
	}

	updateAttributeDetails()
	{
		if (this.detailsTab)
		{
			this.selectedAttribute = this.detailsTab.getFormData();
		}
	}

	onAttributeChanged()
	{
		this.isDetailsFormPristine = this.detailsTab ? this.detailsTab.attributeForm.pristine : this.isDetailsFormPristine;
		this.isAttributeChanged = this.detailsTab ? (!this.detailsTab.attributeForm.pristine && this.detailsTab.attributeForm.valid) : this.isAttributeChanged;
	}

	onGroupSelectionChanged()
	{
		const addedGroups = differenceBy(this.selectedGroups, this.origSelectedGroups, 'id');
		const removedGroups = differenceBy(this.origSelectedGroups, this.selectedGroups, 'id');
		this.isGroupSelectionChanged = (addedGroups != null && !!addedGroups.length) || (removedGroups != null && !!removedGroups.length);
	}

	resetTabs()
	{
		if (this.detailsTab)
		{
			this.detailsTab.reset();
			this.searchKeyword = '';
			this.searchFilter = '';
			this.searchSelectedAddGroup = [];
			this.searchSelectedRemoveGroup = [];
			this.selectedGroups = [];
		}

		if (this.groupsTab)
		{
			this.groupsTab.reset();
			this.selectedAttribute = null;
			this.selectedGroups = [];
		}
	}
}
