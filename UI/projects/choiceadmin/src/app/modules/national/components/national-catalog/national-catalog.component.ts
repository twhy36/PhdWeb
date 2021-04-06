import { Component, Input, Output, EventEmitter, OnInit, ViewChild } from '@angular/core';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { MessageService } from 'primeng/api';

import { NationalCatalogReactivateComponent } from '../national-catalog-reactivate/national-catalog-reactivate.component';
import { ConfirmModalComponent } from '../../../core/components/confirm-modal/confirm-modal.component';

import { NationalService } from '../../../core/services/national.service';
import { UiUtilsService } from '../../../core/services/ui-utils.service';

import { DGroup, ICatalogGroupDto } from '../../../shared/models/group.model';
import { DSubGroup, ICatalogSubGroupDto } from '../../../shared/models/subgroup.model';
import { DPoint, ICatalogPointDto } from '../../../shared/models/point.model';
import { CatalogItem } from '../../../shared/models/catalog-item.model';
import { NationalCatalog } from '../../../shared/models/national-catalog.model';
import { Permission } from 'phd-common/models';
import { TreeToggleComponent } from '../../../shared/components/tree-toggle/tree-toggle.component';

@Component({
	selector: 'national-catalog',
	templateUrl: './national-catalog.component.html',
	styleUrls: ['./national-catalog.component.scss']
})
export class NationalCatalogComponent implements OnInit
{
	Permission = Permission;
	
	@ViewChild(NationalCatalogReactivateComponent)
	private natCatReactivateSidePanel: NationalCatalogReactivateComponent;

	@ViewChild(TreeToggleComponent)
	private treeToggle: TreeToggleComponent;

	sidePanelOpen: boolean = false;
	reactivateSidePanelOpen: boolean = false;

	catalogItem: CatalogItem;
	workingItem: WorkingItem;

	selectedItem: DGroup | DSubGroup | DPoint;

	inactiveItems: Array<DGroup | DSubGroup | DPoint> = [];
	itemType: string = '';

	@Input() searchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point'];
	@Input() selectedSearchFilter: string = 'All';
	@Output() onClearFilter = new EventEmitter();
	@Output() onKeywordSearch = new EventEmitter();
	keyword: string = '';
	isDirty: boolean = false;

	dragEnable: boolean = false;
    canSort = false;
    dragHasChanged: boolean = false;
    confirmedCancelSort: boolean = false;

    lockedFromChanges: boolean = false;

	get openGroups(): boolean
	{
		return this.treeToggle.openGroups;
	}

	get openSubGroups(): boolean
	{
		return this.treeToggle.openSubGroups;
	}

	private _nationalCatalog: NationalCatalog;

	get nationalCatalog(): NationalCatalog
	{
		return this._nationalCatalog;
	}

	set nationalCatalog(nc: NationalCatalog)
	{
		this._nationalCatalog = nc;
	}
	
	get groups(): DGroup[]
	{
        return this.nationalCatalog ? this.nationalCatalog.groups : [];
	}
	
	constructor(private _natService: NationalService, private _modalService: NgbModal, private _msgService: MessageService, private _uiUtils: UiUtilsService) { }

	ngOnInit()
	{
        this.getNationalCatalog();
    }

    getNationalCatalog()
    {
        this._natService.getNationalCatalog().subscribe((data) =>
        {
            this.nationalCatalog = data;
        });
    }
	
    addCatalogItem(event: any, parent?: DGroup | DSubGroup)
    {
        this.sidePanelOpen = false;
        this.catalogItem = null;

        let catItem = new CatalogItem();

        var maxOrder = 0;

        if (parent instanceof DGroup)
        {
			maxOrder = Math.max.apply(Math, parent.children.map(x => x.sortOrder));
			catItem.item = new DSubGroup({ dGroupCatalogID: parent.id, dSubGroupCatalogID: 0, points: [], dSubGroupLabel: '', dSubGroupSortOrder: 0, isActive: true, hasInactivePoints: false, isFloorplanSubgroup: false, subGroupTypeId: 1 });
			catItem.item.parent = parent;
            catItem.itemType = 'SubGroup';
        }
        else if (parent instanceof DSubGroup)
        {
            maxOrder = Math.max.apply(Math, parent.children.map(x => x.sortOrder));

			catItem.item = new DPoint({ dPointCatalogID: 0, dPointDescription: '', dPointLabel: '', dPointSortOrder: 0, dSubGroupCatalogID: parent.id, isActive: true });
			catItem.item.parent = parent;
            catItem.showDescription = true;
            catItem.itemType = 'Point';
        }
        else
        {
            maxOrder = Math.max.apply(Math, this.nationalCatalog.groups.map(x => x.sortOrder));

			catItem.item = new DGroup({ dGroupCatalogID: 0, dGroupLabel: '', dGroupSortOrder: 0, subGroups: [], isActive: true, hasInactiveSubGroups: false, dGroupImagePath: null });

            catItem.itemType = 'Group';
		}

		let sortOrder = isFinite(maxOrder) ? maxOrder : 0;

		catItem.item.sortOrder = (sortOrder + 1);
		
        this.catalogItem = catItem;

		this.openSidePanel(event, '', catItem.itemType);
	}
	
    editCatalogItem(event: any, item: DGroup | DSubGroup | DPoint)
	{
        this.sidePanelOpen = false;

        let catItem = new CatalogItem();

		catItem.item = item;

        if (item instanceof DPoint)
        {
            catItem.showDescription = true;
            catItem.itemType = 'Point';
        }
        else if (item instanceof DSubGroup)
        {
            catItem.itemType = 'SubGroup';
        }
        else
        {
            catItem.itemType = 'Group';
        }

        this.catalogItem = catItem;

		this.openSidePanel(event, '', '', true);
    }

    onSaveCatalogItem(catItem: CatalogItem)
    {
		if (catItem.item instanceof DGroup)
		{
			this.saveGroup(catItem.item);
		}
		else if (catItem.item instanceof DSubGroup)
		{
			this.saveSubGroup(catItem.item);
		}
		else if (catItem.item instanceof DPoint)
		{
			this.savePoint(catItem.item);
		}
	}

	saveGroup(group: DGroup)
	{
		let groupDto = {
			dGroupCatalogID: group.id,
			dGroupLabel: group.label
		} as ICatalogGroupDto;

		if (group.id === 0)
		{
			groupDto.dGroupSortOrder = group.sortOrder;
			groupDto.isActive = group.dto.isActive;

			this._natService.addGroupCatalog(groupDto).subscribe(dto =>
			{
				group.dto.dGroupCatalogID = dto.dGroupCatalogID;

				this.nationalCatalog.groups.push(group);
				
				this.toggleSidePanel();

				this._msgService.add({ severity: 'success', summary: 'Group', detail: `Added successfully!` });
			});
		}
		else
		{
			this._natService.updateGroupCatalog(groupDto).subscribe(dto =>
			{
				this.toggleSidePanel();

				this._msgService.add({ severity: 'success', summary: 'Group', detail: `Updated successfully!` });
			});
		}
	}

	saveSubGroup(subGroup: DSubGroup)
	{
		let subgroupDto = {
			dSubGroupCatalogID: subGroup.id,
			dSubGroupLabel: subGroup.label
		} as ICatalogSubGroupDto;

		if (subGroup.id === 0)
		{
			subgroupDto.dSubGroupSortOrder = subGroup.sortOrder;
			subgroupDto.isActive = subGroup.dto.isActive;
			subgroupDto.dGroupCatalogID = subGroup.dto.dGroupCatalogID;
			subgroupDto.subGroupTypeId = subGroup.dto.subGroupTypeId;

			this._natService.addSubGroupCatalog(subgroupDto).subscribe(dto =>
			{
				subGroup.dto.dSubGroupCatalogID = dto.dSubGroupCatalogID;

				subGroup.parent.children.push(subGroup);

				this.toggleSidePanel();

				this._msgService.add({ severity: 'success', summary: 'SubGroup', detail: `Added successfully!` });
			});
		}
		else
		{
			this._natService.updateSubGroupCatalog(subgroupDto).subscribe(dto =>
			{
				this.toggleSidePanel();

				this._msgService.add({ severity: 'success', summary: 'SubGroup', detail: `Updated successfully!` });
			});
		}
	}

	savePoint(point: DPoint)
	{
		let pointDto = {
			dPointCatalogID: point.id,
			dPointLabel: point.label,
			dPointDescription: point.description
		} as ICatalogPointDto;

		if (point.id === 0)
		{
			pointDto.dPointSortOrder = point.sortOrder;
			pointDto.isActive = point.dto.isActive;
			pointDto.dSubGroupCatalogID = point.dto.dSubGroupCatalogID;

			this._natService.addPointCatalog(pointDto).subscribe(dto =>
			{
				point.dto.dPointCatalogID = dto.dPointCatalogID;

                point.parent.children.push(point);
                point.parent.children.sort((l, r) => l.label.toLowerCase() < r.label.toLowerCase() ? -1 : 1); // resort

				this.toggleSidePanel();

				this._msgService.add({ severity: 'success', summary: 'Decision Point', detail: `Added successfully!` });
			});
		}
		else
		{
			this._natService.updatePointCatalog(pointDto).subscribe(dto =>
			{
				this.toggleSidePanel();

				this._msgService.add({ severity: 'success', summary: 'Decision Point', detail: `Updated successfully!` });
			});
		}
	}

	onSidePanelClose(status: boolean)
	{
		this.closeSidePanels(status);
	}

	toggleSidePanel(status: boolean = false)
	{
		this.closeSidePanels(status);
	}

	closeSidePanels(status: boolean)
	{
		this.sidePanelOpen = status;
		this.reactivateSidePanelOpen = status;
		this._uiUtils.clearHighlightParentRow();
	}

	onReactivateSidePanelClose(status: boolean)
	{
		this.closeSidePanels(status);
	}

	toggleReactivateSidePanel(status: boolean = false)
	{
		this.closeSidePanels(status);
	}

	openSidePanel(event: any, panelType?: string, itemType?: string, isEdit?: boolean)
	{
		if (panelType == 'reactivate')
		{
			this.reactivateSidePanelOpen = true;
		}
		else
		{
			this.sidePanelOpen = true;
		}

		if (itemType != 'Group' || isEdit)
		{
			this._uiUtils.highlightParentRow(event);
			this._uiUtils.scrollToSelectedRow();
		}
	}

	msgModal: MessageModal = null;

	createMsgModal(item: DGroup | DSubGroup | DPoint, deleteContent: any)
	{
		this.workingItem = new WorkingItem(item);
		
		let newMessage = new MessageModal();

		this._natService.isNatCatItemInUse(item).subscribe((isInUse) =>
		{
			this.workingItem.isInUse = isInUse;

			let msgResult = '';

			if (item instanceof DGroup)
			{
				msgResult += ` Group and its related SubGroups and Decision Points: `;
			}
			else if (item instanceof DSubGroup)
			{
				msgResult += ` SubGroup and its related Decision Points:`;
			}
			else if (item instanceof DPoint)
			{
				msgResult += ` Decision Point:`;
			}
			else
			{
				throw Error("Invalid Item");
			}

			newMessage.msgAction = isInUse ? 'inactivate' : 'delete';
			newMessage.msgResult = msgResult;
			newMessage.msgSubject = item.label;

			this.msgModal = newMessage;

			let msgBody = `You are about to <span class="font-weight-bold text-danger">${newMessage.msgAction}</span> the following ${newMessage.msgResult}<br><br> `;
			msgBody += `<span class="font-weight-bold">${newMessage.msgSubject}</span><br><br>`;
			msgBody += `Do you wish to continue?`;
			
			let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

			confirm.componentInstance.title = 'Warning!';
			confirm.componentInstance.body = msgBody;
			confirm.componentInstance.defaultOption = 'Continue';

			confirm.result.then((result) =>
			{
				if (result == 'Continue')
				{
					this.deleteCatalogItem(newMessage.msgAction);
				}
				else
				{
					this.workingItem = null;
				}
			}, (reason) =>
			{

			});
		});
	}

	deleteCatalogItem(action: string)
	{
		if (this.workingItem != null)
		{
			try
			{
				let itemType = this.workingItem.itemType;
				let actionSummary = action == 'delete' ? 'Delete' : 'Inactivate';
				let actionDetail = `${actionSummary.toLocaleLowerCase()}d`; // convert action to deleted and inactivated				

				this._natService.removeCatalogItem(this.workingItem.item, this.workingItem.isInUse, itemType).subscribe(() =>
				{
					let fullItemType = itemType == 'Point' ? 'Decision Point' : itemType;

					this.deleteClientSideItem(action, this.workingItem.item);

					this._msgService.add({
						severity: 'success',
						summary: actionSummary,
						detail: `${fullItemType} ${this.workingItem.item.label} has been ${actionDetail}`
					});
					
					this.workingItem = null;					
				});
			}
			catch (e)
			{

			}
		}
	}

	deleteClientSideItem(action: string, item: DGroup | DSubGroup | DPoint)
	{
		let itemToRemove;
		let index = 0;
		let parent: any[];

		if (item instanceof DGroup)
		{
			parent = this.groups;

			if (action == 'inactivate')
			{
				this.nationalCatalog.hasInactiveGroups = true;
			}
		}
		else if (item instanceof DSubGroup || item instanceof DPoint)
		{
			parent = item.parent.children;

			if (action == 'inactivate')
			{
				item.parent.hasInactiveChildren = true;
			}
		}

		itemToRemove = parent.find(x => x.id == item.id);
		index = parent.indexOf(itemToRemove);
		
		parent.splice(index, 1);
	}

	reactivateItem(event: any, itemType: string, parent: DGroup | DSubGroup)
	{
		let parentId = parent != null ? parent.id : null;
		this.reactivateSidePanelOpen = false;
		
		this._natService.getInactiveItems(itemType, parentId).subscribe((data) =>
		{
			this.inactiveItems = data;
			this.itemType = itemType;
			this.workingItem = new WorkingItem(parent);

			this.openSidePanel(event, 'reactivate', itemType);
		});
	}

	onSaveReactivateItems(inactiveItems: Array<DGroup | DSubGroup | DPoint>)
	{
		let itemType = this.itemType;
		let workingItem: DGroup | DSubGroup;

		this._natService.reactivateCatalogItem(inactiveItems, itemType).subscribe(() =>
		{
			// check to see if there are remaining inactive items.
			const hasRemainingItems = this.natCatReactivateSidePanel.hasRemainingItems;

			if (itemType == 'Group')
			{
				let groupItems = inactiveItems as Array<DGroup>;

				groupItems = groupItems.map(x =>
				{
					// assumption that if it was inactivated, it was used so it will have inactive children.
					x.hasInactiveChildren = true;

					return x;
				});

				this.nationalCatalog.groups.push(...groupItems);
				this.nationalCatalog.groups.sort((l, r) => l.sortOrder < r.sortOrder ? -1 : 1);
				this.nationalCatalog.hasInactiveGroups = hasRemainingItems;
			}
			else if (itemType == 'SubGroup')
			{
				let subGroupItems = inactiveItems as Array<DSubGroup>;

				subGroupItems = subGroupItems.map(x =>
				{
					// assumption that if it was inactivated, it was used so it will have inactive children.
					x.hasInactiveChildren = true;
					x.parent = this.workingItem.item as DGroup;

					return x;
				});

				workingItem = this.workingItem.item as DGroup;
				workingItem.children.push(...subGroupItems);
				workingItem.children.sort((l, r) => l.sortOrder < r.sortOrder ? -1 : 1);
				workingItem.hasInactiveChildren = hasRemainingItems;
			}
			else if (itemType == 'Point')
			{
				let pointItems = inactiveItems as Array<DPoint>;

				pointItems = pointItems.map(x =>
				{
					x.parent = this.workingItem.item as DSubGroup;

					return x;
				});

				workingItem = this.workingItem.item as DSubGroup;
				workingItem.children.push(...pointItems);
				workingItem.children.sort((l, r) => l.sortOrder < r.sortOrder ? -1 : 1);
				workingItem.hasInactiveChildren = hasRemainingItems;
            }

            if (itemType == 'Point')
            {
                itemType = 'Decision Point';
            }

			this._msgService.add({ severity: 'success', summary: 'Reactivate', detail: `${itemType}(s) have been reactivated` });

			this.workingItem = null;
			this.toggleReactivateSidePanel();
		});
	}
		
	onEditSort()
	{
		this.canSort = true;
	}
	
    editSort()
    {
        this.dragEnable = true;
        this.dragHasChanged = false;
        this.lockedFromChanges = true;
    }

    saveSort()
    {
        this.dragEnable = false;
        this.lockedFromChanges = false;

        if (this.dragHasChanged)
        {
            this.dragHasChanged = false;

            try
            {
                this._natService.saveNationalCatalogSortOrder(this.groups).subscribe(() =>
                {
                    this._msgService.add({ severity: 'success', summary: 'Sort', detail: `Sort Saved!` });
                });
            }
            catch (error)
            {
                this._msgService.add({ severity: 'error', summary: 'Sort', detail: `Error Saving Sort.` });
            }
        }
        else
        {
            this._msgService.add({ severity: 'info', summary: 'Sort', detail: `Sort was not saved. No changes were made.` });
        }
    }

    async cancelSortNavAway(): Promise<boolean>
    {
        let msgBody = `If you continue you will lose your changes.<br><br> `;
        msgBody += `Do you wish to continue?`;

        let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

        confirm.componentInstance.title = 'Warning!';
        confirm.componentInstance.body = msgBody;
        confirm.componentInstance.defaultOption = 'Cancel';

        let canCancel = await confirm.result.then((result) =>
        {
            return result == 'Continue';
        });

        return canCancel;
    }

    async cancelSort()
    {
        if (!this.dragHasChanged || await this.cancelSortNavAway())
        {
            this.dragEnable = false;

            // revert back to origianl array if things were changed but not saved.
            if (this.dragHasChanged)
            {
                this.getNationalCatalog();

                this.dragHasChanged = false;
            }

            this.lockedFromChanges = false;
        }
    }

    handleDrop(event: any, item: any)
    {
        if (event)
        {
            let dragId = this.draggedItem.id;

            if (this.canDrop(dragId, item) && item.id != dragId)
            {
                this.dragHasChanged = true;

                let parent = item instanceof DGroup ? this.nationalCatalog : item.parent;

                let oldIndex = parent.children.findIndex(x => x.id == dragId);
                let newIndex = parent.children.findIndex(x => x.id == item.id);

                this.reSort(parent.children, oldIndex, newIndex);
            }  
        }
    }

    draggedItem: DGroup | DSubGroup | DPoint;

    handleDragStart(event: any, item: DGroup | DSubGroup | DPoint)
    {
        if (event)
        {
            this.draggedItem = item;
        }
    }

    handleDragEnter(event: any, item: DGroup | DSubGroup | DPoint)
    {
        if (event)
        {
            let dragId = this.draggedItem.id;

            if (!this.canDrop(dragId, item))
            {
                event[0].nativeElement.classList.remove('over');
            }
        }
    }

    canDrop(dragId: number, item: any)
    {
        let parent = item instanceof DGroup ? this.nationalCatalog : item.parent;

        let canDrop = parent.children.findIndex(x => x.id == dragId) != -1;

        return canDrop;
    }

    reSort(itemList: any, oldIndex: number, newIndex: number, sortName?: string)
    {
        sortName = sortName != null ? sortName : 'sortOrder';

        if (newIndex >= itemList.length)
        {
            var k = newIndex - itemList.length;

            while ((k--) + 1)
            {
                itemList.push(undefined);
            }
        }

        //reorder items in array
        itemList.splice(newIndex, 0, itemList.splice(oldIndex, 1)[0]);

        let counter = 1;

        itemList.forEach(item =>
        {
            // update sortOrder
            item[sortName] = counter++;
            item.sortChanged = true;
        });

        // resort using new sortOrders
        itemList.sort((left: any, right: any) =>
        {
            return left[sortName] === right[sortName] ? 0 : (left[sortName] < right[sortName] ? -1 : 1);
        });
    }
	
	keywordSearch = () =>
	{
		//reset everything to unmatched.
		this.resetAllMatchValues(false);

		this.onKeywordSearch.emit({ searchFilter: this.selectedSearchFilter, keyword: this.keyword });
		let matchCount = 0;

		matchCount = this.mainSearch();

		if (matchCount === 0)
		{
			this._msgService.add({ severity: 'error', summary: 'Search Results', detail: `No results found. Please try another search.` });
		}
	}

	private mainSearch = (): number =>
	{
		let count = 0;

		if (this.groups != null)
		{
			const isFilteredGroup = this.isFiltered('Group');
			const isFilteredSubGroup = this.isFiltered('SubGroup');
			const isFilteredPoint = this.isFiltered('Decision Point');

			this.groups.forEach(gp =>
			{
				// filtered by group or all and label matches keyword
				if (isFilteredGroup && this.isMatch(gp.label, this.keyword))
				{
					// show group
					gp.matched = true;
					gp.open = false;

					count++;
				}
				else
				{
					gp.matched = false;
				}

				if (gp.subGroups != null)
				{
					gp.subGroups.forEach(sg =>
					{
						// filtered by subGroup or all and label matches keyword
						if (isFilteredSubGroup && this.isMatch(sg.label, this.keyword))
						{
							// show subgroup
							sg.matched = true;
							sg.open = false;

							// show group
							gp.matched = true;
							gp.open = true;

							count++;
						}
						else
						{
							sg.matched = false;
						}

						if (sg.points != null)
						{
							sg.points.forEach(dp =>
							{
								// filtered by point or all and label matches keyword.
								if (isFilteredPoint && this.isMatch(dp.label, this.keyword))
								{
									// show point
									dp.matched = true;

									// show subgroup
									sg.matched = true;
									sg.open = true;

									// show group
									gp.matched = true;
									gp.open = true;

									count++;
								}
								else
								{
									dp.matched = false;
								}
							});
						}
					});
				}
			});
		}

		return count;
	}

	private isMatch = (label: string, keyword: string): boolean =>
	{
		return label.toLowerCase().indexOf(keyword.toLowerCase()) >= 0;
	}

	private isFiltered = (filterType: string) =>
	{
		let filtered = false;

		if (this.selectedSearchFilter === filterType || this.selectedSearchFilter === 'All')
		{
			filtered = true;
		}

		return filtered;
	}

	private resetAllMatchValues = (value: boolean) =>
	{
		this.groups.forEach(gp =>
		{
			gp.matched = value;

			this.treeToggle.toggleGroups();
			this.treeToggle.toggleSubGroups();

			if (gp.subGroups != null)
			{
				gp.subGroups.forEach(sg =>
				{
					sg.matched = value;

					this.treeToggle.toggleSubGroups();

					if (sg.points != null)
					{
						sg.points.forEach(dp =>
						{
							dp.matched = value;
						});
					}
				});
			}
		});
	}

	clearFilter()
	{
		this.keyword = '';
		this.resetAllMatchValues(true);
		this.onClearFilter.emit();
	}

	onSearchFilterChanged(searchFilter: string)
	{
		this.selectedSearchFilter = searchFilter;
		this.isDirty = true;
	}

	onKeywordUp()
	{
		if (!this.isDirty) {
			this.isDirty = true;
		}
	}

	reset()
	{
		this.clearFilter();
		this.isDirty = false;
	}
}

class MessageModal
{
	msgAction: string;
	msgResult: string;
	msgSubject: string;
}

class WorkingItem
{
	item: DGroup | DSubGroup | DPoint;
	isInUse: boolean = false;

	get itemType(): string
	{
		let itemType = '';

		if (this.item instanceof DGroup)
		{
			itemType += 'Group';
		}
		else if (this.item instanceof DSubGroup)
		{
			itemType += 'SubGroup';
		}
		else if (this.item instanceof DPoint)
		{
			itemType += 'Point';
		}

		return itemType;
	}

	constructor(item?: DGroup | DSubGroup | DPoint)
	{
		if (item != null)
		{
			this.item = item;
		}
	}
}
