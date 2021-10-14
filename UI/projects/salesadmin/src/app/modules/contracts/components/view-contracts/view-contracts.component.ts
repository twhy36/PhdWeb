import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { distinctUntilChanged, filter, tap } from 'rxjs/operators';
import { cloneDeep } from "lodash";

import * as moment from 'moment';

import { ContractTemplate } from '../../../shared/models/contracts.model';
import { ContractService } from '../../../core/services/contract.service';
import { MessageService } from 'primeng/api';
import { OrganizationService } from '../../../core/services/organization.service';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { ViewContractsSidePanelComponent } from '../view-contracts-side-panel/view-contracts-side-panel.component';
import { ConfirmModalComponent, PhdTableComponent } from 'phd-common';
import { FinancialMarket } from '../../../shared/models/financialMarket.model';

@Component({
	selector: 'view-contracts',
	templateUrl: './view-contracts.component.html',
	styleUrls: ['./view-contracts.component.scss']
})
export class ViewContractsComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(ViewContractsSidePanelComponent)
	private sidePanel: ViewContractsSidePanelComponent;

	private _selected: ContractTemplate;
	currentMarket: FinancialMarket;
	sidePanelOpen: boolean = false;
	currentMktId: number;
	draggedTemplate: ContractTemplate;
	filteredContractTemplates: Array<ContractTemplate>;
	allTemplates: Array<ContractTemplate>;
	templatesWithUpdatedAddendum: Array<ContractTemplate> = [];
	isSorting: boolean = false;
	canSort: boolean = false;
	canManageDocument: boolean = true;
	dragHasChanged: boolean = false;
	canEdit: boolean = false;

	searchFilter: string = 'displayName';
	keyword: string;

	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	get selected(): ContractTemplate
	{
		return this._selected;
	}

	set selected(item: ContractTemplate)
	{
		this._selected = item;
	}

	constructor(
		private _contractService: ContractService,
		private _msgService: MessageService,
		private _orgService: OrganizationService,
		private _modalService: NgbModal,
		private _route: ActivatedRoute
	) { super() }

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return this.sidePanelOpen ? !this.sidePanel.viewContractsForm.dirty : true
	}

	ngOnInit(): void
	{
		this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			distinctUntilChanged(),
			filter(mkt => mkt != null),
			tap(mkt =>
			{
				this.currentMktId = mkt.id;
				this.onSidePanelClose(false);
				this.isSorting = false;
				this.canManageDocument = true;
			}),
		).subscribe(() => this.updateTemplates());

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	updateTemplates(): void
	{
		this._contractService.getDraftOrInUseContractTemplates(this.currentMktId).subscribe(templates =>
			{
				this.allTemplates = templates;
				this.allTemplates.forEach(template =>
					{
						template.application = this.getApplication(template);
					})
				this.getTemplatesToBedisplayed();
				this.resetSearchBar();
		});
	}

	getTemplatesToBedisplayed()
	{
		this.filteredContractTemplates = this.allTemplates.filter(t => t.parentTemplateId === null);
		let childTemplates = this.allTemplates.filter(t => t.parentTemplateId !== null);

		for (let childTemplate of childTemplates)
		{
			let parentTemplate = this.filteredContractTemplates.find(t => t.templateId === childTemplate.parentTemplateId);

			if (parentTemplate)
			{
				this.filteredContractTemplates.find(t => t.templateId === childTemplate.parentTemplateId).childContractTemplate = childTemplate;
			}
			else
			{
				this.filteredContractTemplates.push(childTemplate);
			}
		}
	}

	keywordSearch(event: any)
	{
		this.keyword = event['keyword'];
		this.filterTemplates(this.searchFilter, this.keyword);
	}

	filterTemplates(filter: string, keyword: string)
	{
		let searchFilter = filter;

		if (searchFilter && this.keyword)
		{
			this.getTemplatesToBedisplayed();
			this.filteredContractTemplates = this.filteredContractTemplates.filter(template => this.searchBar.wildcardMatch(template[searchFilter], keyword));

			if (this.filteredContractTemplates.length === 0)
			{
				this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
			}
		}
		else
		{
			this.clearFilter();
		}
	}

	clearFilter()
	{
		this.getTemplatesToBedisplayed();
	}

	resetSearchBar()
	{
		this.keyword = '';

		if (this.searchBar)
		{
			this.searchBar.clearFilter();
		}
	}

	editTemplate(dto: ContractTemplate)
	{
		this.selected = dto;
		this.sidePanelOpen = true;
	}

	deleteDraft(dto: ContractTemplate)
	{
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};

		let msgBody = `Are you sure you want to delete this Contract Document?`;

		let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this._contractService.deleteTemplate(dto)
					.subscribe(data =>
					{
						if (dto.parentTemplateId === null)
						{
							this.filteredContractTemplates = this.filteredContractTemplates.filter(t => t.templateId !== dto.templateId);
						}
						else
						{
							let index = this.filteredContractTemplates.findIndex(t => t.templateId === dto.parentTemplateId);

							if (index >= 0)
							{
								this.filteredContractTemplates[index].childContractTemplate = undefined;
							}
							else
							{
								this.filteredContractTemplates = this.filteredContractTemplates.filter(t => t.templateId !== dto.templateId);
							}
						}

						this._msgService.add({ severity: 'success', summary: 'Contract Document', detail: `has been deleted!` });
					})
			}
		}, (reason) =>
		{

		});
	}

	editDraft(dto: ContractTemplate)
	{
		this.selected = dto.childContractTemplate;
		this.sidePanelOpen = true;
	}

	addDocument()
	{
		this.selected = null;
		this.sidePanelOpen = true;
	}

	newDraft(dto: ContractTemplate)
	{
		this.selected = { ...dto, templateId: null, parentTemplateId: dto.templateId, status: "Draft", version: dto.version + 1, effectiveDate: null, expirationDate: null, dto: dto }
		this.sidePanelOpen = true;
	}

	addendumOrder()
	{
		this.filteredContractTemplates = this.allTemplates.filter(t => t.templateTypeId === 2);
		let templateIdsWithParent = this.filteredContractTemplates.filter(t => t.parentTemplateId !== null).map(t => t.parentTemplateId);

		for (let templateId of templateIdsWithParent)
		{
			this.filteredContractTemplates = this.filteredContractTemplates.filter(t => t.templateId !== templateId);
		}

		this.isSorting = true;
		this.canManageDocument = false;
	}

	cancelSort()
	{
		this.filteredContractTemplates = this.allTemplates;
		this.isSorting = false;
		this.canManageDocument = true;
	}

	onSidePanelClose(status: boolean)
	{
		this.sidePanelOpen = status;
	}

	save(contractTemplateDto: ContractTemplate)
	{
		if (contractTemplateDto.templateTypeId != 1)
		{
			contractTemplateDto.displayOrder = this.allTemplates.filter(t => t.templateTypeId !== 1).length > 0 ? this.allTemplates.filter(t => t.templateTypeId !== 1).length + 3 : 3;
		}
		else
		{
			contractTemplateDto.displayOrder = 1;
		}

		contractTemplateDto.marketId = this.currentMktId;

		if (this.selected)
		{
			if (this.selected.status === 'In Use')
			{
				contractTemplateDto.documentName = this.selected.documentName;
				contractTemplateDto.displayName = this.selected.displayName;
				contractTemplateDto.isPhd = contractTemplateDto.isPhd ?? this.selected.isPhd;
				contractTemplateDto.isTho = contractTemplateDto.isTho ?? this.selected.isTho;
				contractTemplateDto.effectiveDate = new Date(this.selected.effectiveDate).toJSON();
			}
		}

		this._contractService.saveDocument(contractTemplateDto)
			.subscribe(newDto =>
			{
				this.updateTemplates();
				newDto.assignedCommunityIds = contractTemplateDto.assignedCommunityIds;
				newDto.application = this.getApplication(newDto);

				if (!this.selected)
				{
					const newTemplate = new ContractTemplate(newDto);

					this.filteredContractTemplates = [...this.filteredContractTemplates, newTemplate];

					this.allTemplates.indexOf(newTemplate) === -1 ? this.allTemplates = [...this.allTemplates, newTemplate] : null;
				}
				else
				{
					const updatedTemplate = new ContractTemplate(newDto);

					this.filteredContractTemplates = this.filteredContractTemplates.filter(t => t.templateId !== newDto.templateId);

					if (newDto.parentTemplateId !== null)
					{
						let effectiveDate = newDto.effectiveDate !== null ? moment.utc(newDto.effectiveDate).format('L') : null;
						let currDate = moment.utc(new Date()).format('L');

						if (effectiveDate !== null && (effectiveDate === currDate || effectiveDate < currDate))
						{
							let index = this.filteredContractTemplates.findIndex(t => t.templateId === newDto.parentTemplateId);

							this.filteredContractTemplates[index] = updatedTemplate;
						}
						else if (newDto.status === 'In Use' || !this.filteredContractTemplates.find(t => t.templateId === newDto.parentTemplateId))
						{
							this.filteredContractTemplates = [...this.filteredContractTemplates, updatedTemplate];
						}
						else
						{
							this.filteredContractTemplates.find(t => t.templateId === newDto.parentTemplateId).childContractTemplate = updatedTemplate;
						}
					}
					else
					{
						let childTemplate = this.allTemplates.find(t => t.parentTemplateId === updatedTemplate.templateId);

						if (childTemplate !== null)
						{
							updatedTemplate.childContractTemplate = childTemplate;
						}

						this.filteredContractTemplates = [...this.filteredContractTemplates, updatedTemplate];
					}

					this.allTemplates = [...this.allTemplates, updatedTemplate];
				}

				this.sort();
				this.onSidePanelClose(false);

				this._msgService.add({ severity: 'success', summary: 'Contract Document', detail: `has been saved!` });
			},
			error =>
			{
				this._msgService.add({ severity: 'error', summary: 'Error', detail: error.message });
			});
	}

	previewFile(templateId: number)
	{
		this._contractService.getTemplateUrl(templateId)
			.subscribe(data =>
			{
				var el = document.createElement("a");

				el.href = data;

				el.dispatchEvent(new MouseEvent("click"));

				this._msgService.add({ severity: 'success', summary: 'Document', detail: `has been downloaded` });
			},
			error =>
			{
				this._msgService.add({ severity: 'info', summary: `Document not found` });
			});
	}

	sort()
	{
		this.filteredContractTemplates.sort((a, b) =>
		{
			const strA = a.documentName.toUpperCase();
			const strB = b.documentName.toUpperCase();

			return strA < strB ? -1 : strA > strB ? 1 : 0;
		})
	}

	updateAddendumOrder(itemList: Array<ContractTemplate>, oldIndex: number, newIndex: number)
	{
		if (newIndex > oldIndex)
		{
			let dispOrderForOldIndex = itemList[newIndex].displayOrder;
			let num = newIndex - oldIndex;

			for (let n = num; n >= 1; n--)
			{
				itemList[oldIndex + n].displayOrder = itemList[oldIndex + n - 1].displayOrder;

				this.trackUpdatedTemplates(itemList[oldIndex + n]);
			}

			itemList[oldIndex].displayOrder = dispOrderForOldIndex;

			this.trackUpdatedTemplates(itemList[oldIndex]);
		}

		else if (oldIndex > newIndex)
		{
			let dispOrderForOldIndex = itemList[newIndex].displayOrder;
			let num = oldIndex - newIndex;

			for (let n = 1; n <= num; n++)
			{
				itemList[newIndex + n - 1].displayOrder = itemList[newIndex + n].displayOrder;

				this.trackUpdatedTemplates(itemList[newIndex + n - 1]);
			}

			itemList[oldIndex].displayOrder = dispOrderForOldIndex;

			this.trackUpdatedTemplates(itemList[oldIndex]);
		}
	}

	trackUpdatedTemplates(template: ContractTemplate)
	{
		this.templatesWithUpdatedAddendum = this.templatesWithUpdatedAddendum.filter(t => t.templateId !== template.templateId);
		this.templatesWithUpdatedAddendum.push(template);
	}

	saveSort()
	{
		if (this.templatesWithUpdatedAddendum.length !== 0)
		{
			this._contractService.updateAddendumOrder(this.templatesWithUpdatedAddendum)
				.subscribe(data =>
				{
					this.filteredContractTemplates = this.allTemplates;
					this.isSorting = false;
					this.canManageDocument = true;
					this.templatesWithUpdatedAddendum = [];

					this._msgService.add({ severity: 'success', summary: 'Sort', detail: `Sort saved!` });
				});
		}
	}

	showTooltip(event: any, tooltipText: string, tableComponent: PhdTableComponent): void
	{
		tableComponent.showTooltip(event, tooltipText);
	}

	hideTooltip(tableComponent: PhdTableComponent): void
	{
		tableComponent.hideTooltip();
	}

	onRowReorder(event: any)
	{
		if (event.dragIndex !== event.dropIndex)
		{
			let parent = this.filteredContractTemplates;

			this.updateSort(parent, event.dragIndex, event.dropIndex);
			this.updateAddendumOrder(parent, event.dragIndex, event.dropIndex);

			this.filteredContractTemplates = cloneDeep(parent);
		}
	}

	private updateSort(itemList: any, oldIndex: number, newIndex: number)
	{
		let sortName = 'sortOrder';

		// reorder items in array
		itemList.splice(newIndex, 0, itemList.splice(oldIndex, 1)[0]);

		let counter = 0;

		itemList.forEach(item =>
		{
			// update sortOrder
			item[sortName] = counter++;
		});

		// resort using new sortOrders
		itemList.sort((left: any, right: any) =>
		{
			return left[sortName] === right[sortName] ? 0 : (left[sortName] < right[sortName] ? -1 : 1);
		});
	}

	private getApplication(dto: ContractTemplate)
	{
		if (dto.isPhd && dto.isTho)
			return 'PHD+THO';
		else if (dto.isPhd)
			return 'PHD';
		else if (dto.isTho)
			return 'THO';
		else
			return null;
	}
}
