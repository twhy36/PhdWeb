import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';

import { Message } from 'primeng/api';
import { unionBy } from "lodash";

import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { SidePanelComponent } from '../../../../../shared/components/side-panel/side-panel.component';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { Attribute } from '../../../../../shared/models/attribute.model';
import { SearchBarComponent } from '../../../../../shared/components/search-bar/search-bar.component';

@Component({
	selector: 'associate-attributes-side-panel',
	templateUrl: './associate-attributes-side-panel.component.html',
	styleUrls: ['./associate-attributes-side-panel.component.scss']
})
export class AssociateAttributesSidePanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;

	@Input() attributeGroup$: Observable<AttributeGroupMarket>;
	@Input() attributes: Array<Attribute>;
	@Input() callback?: (attr: Array<Attribute>) => void;

	groupId: number = 0;
	isSaving: boolean = false;
	errors: Array<Message> = [];

	searchFilters = [
		{ name: 'All', field: '' },
		{ name: 'Name', field: 'name' },
		{ name: 'SKU', field: 'sku' },
		{ name: 'Manufacturer', field: 'manufacturer' },
		{ name: 'Search Tags', field: 'tagsString' }
	];
	selectedSearchFilter: string = 'All';

	get filterNames(): Array<string>
	{
		return this.searchFilters.map(f => f.name);
	}

	allAttributesInMarket: Array<Attribute> = [];
	attributesInMarket: Array<Attribute> = [];
	filteredAttributes: Array<Attribute> = [];
	selectedAttributes: Array<Attribute> = [];

	get sidePanelHeader(): string
	{
		return 'Associate Attributes to Group';
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = this.selectedAttributes.length === 0 || this.isSaving;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !saveDisabled;
		}

		return saveDisabled;
	}

	constructor(private _modalService: NgbModal, private route: ActivatedRoute, private _attrService: AttributeService) { super(); }

	ngOnInit()
	{
		this.attributeGroup$.subscribe(g =>
		{
			this.groupId = g.id;

			this.filterAssociatedAttributes();
		});

		this.route.parent.paramMap.pipe(
			this.takeUntilDestroyed(),
			filter(p => p.get('marketId') && p.get('marketId') != '0'),
			map(p => +p.get('marketId')),
			distinctUntilChanged(),
			switchMap(marketId => this._attrService.getAttributesByMarketId(marketId, true))
		).subscribe(data =>
		{
			this.allAttributesInMarket = data;

			this.filterAssociatedAttributes();
		});
	}

	onCloseSidePanel(status: boolean)
	{
		this.searchBar.selectedSearchFilter = "All";
		this.searchBar.reset();
		this.errors = [];
		this.sidePanel.isDirty = false;

		this.onSidePanelClose.emit(status);
	}

	toggleSidePanel()
	{
		if (this.selectedAttributes.length > 0)
		{
			this.sidePanel.setIsDirty();
		}

		this.sidePanel.toggleSidePanel();
	}

	filterAssociatedAttributes()
	{
		this.attributesInMarket = this.groupId ? this.allAttributesInMarket.filter(attr => !this.attributes.some(x => x.id === attr.id)) : this.allAttributesInMarket;
	}

	saveAndClose()
	{
		this.errors = [];
		this.isSaving = true;
		let newlySelectedAttributes = this.selectedAttributes.filter(s => this.attributes.findIndex(x => x.id === s.id) < 0);
		let attributeIds = newlySelectedAttributes.map(att => att.id);

		this._attrService.updateAttributeAssociations(this.groupId, attributeIds, false).subscribe(group =>
		{
			if (this.callback)
			{
				this.callback(this.attributes.concat(newlySelectedAttributes));
			}

			this.isSaving = false;
			this.sidePanel.isDirty = false;
			this.sidePanel.toggleSidePanel();
		},
		error =>
		{
			this.isSaving = false;
			this.errors = [];
			this.errors.push({ severity: 'error', detail: 'Failed to associate attribute(s).' });
		});
	}

	clearFilter()
	{
		this.filteredAttributes = [];
		this.selectedAttributes = [];
	}

	keywordSearch(event: any)
	{
		if (this.selectedAttributes.length > 0)
		{
			let msgBody = `You are about to start a new search. If you continue you will lose your changes.<br><br> `;
			msgBody += `Do you wish to continue?`;

			let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

			confirm.componentInstance.title = 'Warning!';
			confirm.componentInstance.body = msgBody;
			confirm.componentInstance.defaultOption = 'Cancel';

			confirm.result.then((result) =>
			{
				if (result == 'Continue')
				{
					this.startSearch(event['searchFilter'], event['keyword']);
				}
			},
			(reason) =>
			{

			});
		}
		else
		{
			this.startSearch(event['searchFilter'], event['keyword']);
		}
	}

	private startSearch(searchFilter: string, keyword: string)
	{
		keyword = keyword || '';

		this.selectedSearchFilter = searchFilter;
		this.filterAttributes(searchFilter, keyword);

		this.errors = [];

		if (this.filteredAttributes.length === 0)
		{
			this.selectedAttributes = [];

			this.errors.push({ severity: 'error', detail: 'No results found.' });
		}
	}

	private filterAttributes(filter: string, keyword: string)
	{
		let searchFilter = this.searchFilters.find(f => f.name === filter);

		if (searchFilter)
		{
			this.filteredAttributes = [];

			let filteredResults = this.filterByKeyword(searchFilter, keyword);

			this.filteredAttributes = unionBy(this.filteredAttributes, filteredResults, 'id');
		}
		else
		{
			this.clearFilter();
		}
	}

	private filterByKeyword(searchFilter: any, keyword: string): Array<Attribute>
	{
		let results = [];

		if (searchFilter.name !== 'All')
		{
			results = this.attributesInMarket.filter(attr => this.searchBar.wildcardMatch(attr[searchFilter.field], keyword));
		}
		else if (searchFilter.name === 'All')
		{
			results = this.attributesInMarket.filter(attr =>
			{
				let fields = this.searchFilters.map(f => f.field);

				return fields.some(f => this.searchBar.wildcardMatch(attr[f], keyword));
			});
		}

		return results;
	}

	isAttributeSelected(attr: Attribute): boolean
	{
		return this.selectedAttributes.some(s => s.id === attr.id);
	}

	areAllAttributesSelected(): boolean
	{
		return this.filteredAttributes.length > 0 && this.selectedAttributes.length === this.filteredAttributes.length;
	}

	setAttributeSelected(attr: Attribute, isSelected: boolean): void
	{
		let index = this.selectedAttributes.findIndex(s => s.id === attr.id);

		if (isSelected && index < 0)
		{
			this.selectedAttributes.push(attr);
		}
		else if (!isSelected && index >= 0)
		{
			this.selectedAttributes.splice(index, 1);

			this.selectedAttributes = [...this.selectedAttributes];
		}
	}

	toggleAllAttributes(isSelected: boolean): void
	{
		if (isSelected)
		{
			this.selectedAttributes = this.filteredAttributes.slice();
		}
		else
		{
			this.selectedAttributes = [];
		}
	}

}
