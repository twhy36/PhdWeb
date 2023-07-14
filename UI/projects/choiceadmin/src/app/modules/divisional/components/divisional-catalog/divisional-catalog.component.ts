import { Component, OnInit, ViewChild } from '@angular/core';

import { Observable, of } from 'rxjs';
import { flatMap, tap, map, finalize } from 'rxjs/operators';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ConfirmModalComponent } from '../../../core/components/confirm-modal/confirm-modal.component';
import { DivisionalCatalogReactivateComponent } from './divisional-catalog-reactivate/divisional-catalog-reactivate.component';

import { MessageService } from 'primeng/api';

import { OrganizationService } from '../../../core/services/organization.service';
import { UiUtilsService } from '../../../core/services/ui-utils.service';
import { DivisionalService } from '../../../core/services/divisional.service';

import { IFinancialMarket } from '../../../shared/models/financial-market.model';
import { DivisionalCatalog, IDivSortList } from '../../../shared/models/divisional-catalog.model';
import { DivDGroup } from '../../../shared/models/group.model';
import { DivDChoice, IDivCatalogChoiceDto } from '../../../shared/models/choice.model';
import { DivDPoint, IDivCatalogPointDto } from '../../../shared/models/point.model';
import { DivDSubGroup } from '../../../shared/models/subgroup.model';
import { PhdEntityDto } from '../../../shared/models/api-dtos.model';
import { Constants, Permission } from 'phd-common';
import { PointSidePanelComponent } from './point-side-panel/point-side-panel.component';
import { TreeToggleComponent } from '../../../shared/components/tree-toggle/tree-toggle.component';
import { Router } from '@angular/router';

@Component({
	selector: 'divisional-catalog',
	templateUrl: './divisional-catalog.component.html',
	styleUrls: ['./divisional-catalog.component.scss']
})
export class DivisionalCatalogComponent implements OnInit
{
	Permission = Permission;

	@ViewChild(DivisionalCatalogReactivateComponent)
	private divCatReactivateSidePanel: DivisionalCatalogReactivateComponent;

	@ViewChild(PointSidePanelComponent)
	private pointSidePanel: PointSidePanelComponent;

	@ViewChild(TreeToggleComponent)
	private treeToggle: TreeToggleComponent;

	sidePanelOpenPoint: boolean = false;
	sidePanelOpenChoice: boolean = false;

	reactivateSidePanelOpen: boolean = false;
	inactiveItems: Array<DivDPoint | DivDChoice> = [];
	itemType: string = '';
	workingItem: DivDSubGroup | DivDPoint;
	dragHasChanged: boolean = false;
	confirmedCancelSort: boolean = false;

	searchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];
	selectedSearchFilter: string = 'All';
	keyword: string = '';

	lockedFromChanges: boolean = false;
	dragEnable: boolean = false;
	canSort = false;

	selectedMarket: IFinancialMarket;
	markets: Array<IFinancialMarket>;
	marketsLoaded: boolean = false;

	catalogItem: DivDPoint | DivDChoice;

	msgModal: MessageModal = null;

	isSaving: boolean = false;

	private _divisionalCatalog: DivisionalCatalog;

	get divisionalCatalog(): DivisionalCatalog
	{
		return this._divisionalCatalog;
	}

	set divisionalCatalog(dc: DivisionalCatalog)
	{
		this._divisionalCatalog = dc;
	}

	get groups(): DivDGroup[]
	{
		return this.divisionalCatalog ? this.divisionalCatalog.groups : [];
	}

	get marketDefaultText()
	{
		return this.marketsLoaded ? 'Select a Market' : 'Loading...';
	}

	get openGroups(): boolean
	{
		return this.treeToggle.openGroups;
	}

	get openSubGroups(): boolean
	{
		return this.treeToggle.openSubGroups;
	}

	get openPoints(): boolean
	{
		return this.treeToggle.openPoints;
	}

	ngOnInit()
	{
		this._orgService.getMarkets().subscribe(markets =>
		{
			const storedMarket = this._orgService.currentFinancialMarket;

			this.markets = markets;

			// check for stored market.  If found try to set the current market to that value.
			if (storedMarket != null)
			{
				this.selectedMarket = markets.find(x => x.number === storedMarket);

				this.getDivisionalCatalog();
			}

			this.marketsLoaded = true;
		});
	}

	constructor(private router: Router, private _modalService: NgbModal, private _msgService: MessageService, private _uiUtils: UiUtilsService, private _orgService: OrganizationService, private _divService: DivisionalService) { }

	getDivisionalCatalog()
	{
		this._divService.getDivisionalCatalog(this.selectedMarket.id).subscribe(catalog =>
		{
			this.divisionalCatalog = catalog;
		});
	}

	onChangeMarket()
	{
		// set local storage 
		this._orgService.currentFinancialMarket = this.selectedMarket.number;

		this.getDivisionalCatalog();
	}

	addFlooringItem(event: any, parent: DivDSubGroup, newSidePanel: boolean = true)
	{
		this._orgService.getInternalOrgs().pipe(
			flatMap(orgs =>
			{
				let org = orgs.find(o => o.edhMarketId === this.selectedMarket.id);

				if (org)
				{
					return of(org);
				}
				else
				{
					return this._orgService.createInternalOrg(this.selectedMarket);
				}
			})).subscribe(org =>
			{
				this.catalogItem = new DivDPoint({
					dPointLabel: '',
					dPointDescription: '',
					dSubGroupCatalogID: parent.id,
					hasInactiveChoices: false,
					choices: [],
					divDpointCatalogID: 0,
					divDPointSortOrder: 0,
					dPointPickTypeID: 1,
					dPointPickType: null,
					orgID: org.orgID,
					isQuickQuoteItem: false,
					isStructuralItem: false,
					isHiddenFromBuyerView: false,
					isActive: true,
					dPointTypeId: 3,
					cutOffDays: null,
					dPointCatalogID: parent.children[0].dto.dPointCatalogID,
					dPointSortOrder: 0,
					edhConstructionStageId: null
				});

				this.catalogItem.parent = parent;

				if (newSidePanel)
				{
					this.openSidePanel(event, 'point');
				}
				else
				{
					this.pointSidePanel.newForm(this.catalogItem);
				}
			}, error =>
			{
				this.closeSidePanels(false);

				this._msgService.add({ severity: 'error', summary: 'Error', detail: error.message });

				console.log(error);
			});
	}

	addItem(event: any, parent: DivDPoint)
	{
		this.sidePanelOpenPoint = false;
		this.sidePanelOpenChoice = false;

		var maxOrder = Math.max.apply(Math, parent.children.map(x => x.sortOrder));
		let sortOrder = isFinite(maxOrder) ? maxOrder : 0;

		this.catalogItem = new DivDChoice({
			choiceLabel: '',
			divChoiceCatalogID: null,
			divChoiceSortOrder: sortOrder,
			divDpointCatalogID: parent.id,
			dPointCatalogID: parent.dto.dPointCatalogID,
			isActive: true,
			isDecisionDefault: false,
			isInUse: false,
			isHiddenFromBuyerView: false,
			priceHiddenFromBuyerView: false
		});

		this.catalogItem.parent = parent;

		this.openSidePanel(event, 'choice');
	}

	editItem(event: any, item: DivDPoint | DivDChoice)
	{
		this.sidePanelOpenPoint = false;
		this.sidePanelOpenChoice = false;

		this.catalogItem = item;

		this.openSidePanel(event, item instanceof DivDPoint ? 'point' : 'choice');
	}

	onSaveCatalogItem(params: { item: DivDPoint | DivDChoice | DivDChoice[], addAnother: boolean })
	{
		this.isSaving = true;

		let item = params.item;
		let addAnother = params.addAnother;

		if (item instanceof DivDPoint)
		{
			this.savePoint(item, addAnother);
		}
		else if (item instanceof DivDChoice)
		{
			this.saveChoice(item);
		}
		else if (Array.isArray(item))
		{
			this.addChoices(item);
		}
	}

	savePoint(point: DivDPoint, addAnother: boolean)
	{
		if (point.dto.dPointPickTypeID === 0)
		{
			point.dto.dPointPickTypeID = 1; // default to Pick 1
		}

		this.saveDivPointCatalog(point)
			.pipe(finalize(() => this.isSaving = false))
			.subscribe(results =>
			{
				if (results && point.id == 0)
				{
					point.dto.divDpointCatalogID = results.divDpointCatalogID;
					point.dto.dPointPickTypeID = results.dPointPickTypeID;
					point.dto.dPointPickType = results.dPointPickType;
				}

				if (point.isFlooring)
				{
					let subGroup = point.parent;

					if (subGroup.children.findIndex(x => x.id === point.id) === -1)
					{
						let newPoint = new DivDPoint(point.dto);

						newPoint.parent = subGroup;

						// add the new point to the subGroup
						subGroup.children.push(newPoint);

						// resort
						subGroup.children.sort(function (a, b) { return a.sortOrder - b.sortOrder; });
					}
				}

				if (point.isFlooring && addAnother)
				{
					this.addFlooringItem(null, point.parent, false);
				}
				else
				{
					this.closeSidePanels(false);
				}

				this._msgService.add({ severity: 'success', summary: 'Decision Point', detail: `Updated successfully!` });
			});
	}

	/**
	 * Saves the divPointCatalog, either updating or creating a new record when id is 0
	 * @param point
	 */
	private saveDivPointCatalog(point: DivDPoint): Observable<IDivCatalogPointDto>
	{
		return of(point).pipe(
			flatMap(p =>
			{
				if (p.id == 0)
				{
					return this._orgService.getInternalOrgs().pipe(
						flatMap(orgs =>
						{
							let org = orgs.find(o => o.edhMarketId === this.selectedMarket.id);

							if (org)
							{
								return of(org);
							}
							else
							{
								return this._orgService.createInternalOrg(this.selectedMarket);
							}
						}),
						tap(org =>
						{
							point.dto.orgID = org.orgID;
						})
					);
				}
				else
				{
					return of(null);
				}
			}),
			flatMap(p => this._divService.saveDivPointCatalog(point.dto))
		);
	}

	saveChoice(choice: DivDChoice)
	{
		this._divService.updateDivChoiceCatalog(choice.dto)
			.pipe(finalize(() => this.isSaving = false))
			.subscribe(results =>
			{
				if (results && choice.id == 0)
				{
					choice.dto.divChoiceCatalogID = results.divChoiceCatalogID;
				}

				this.closeSidePanels(false);

				this._msgService.add({ severity: 'success', summary: 'Choice', detail: `Updated successfully!` });
			});
	}

	async addChoices(choices: DivDChoice[])
	{
		const point = choices[0].parent;

		this._orgService.getInternalOrgs().pipe(
			flatMap(internalOrgs =>
			{
				let org = internalOrgs.find(o => o.edhMarketId === this.selectedMarket.id);

				if (org)
				{
					return of(org);
				}
				else
				{
					return this._orgService.createInternalOrg(this.selectedMarket);
				}
			}),
			flatMap(org =>
			{
				if (point.id == 0 || point.id == null)
				{
					point.dto.orgID = org.orgID;
					point.dto.dPointPickTypeID = 1; // default to Pick 1

					// add point if not found in DivDPointCatalog
					return this._divService.addDivPointCatalog(point.dto).pipe(
						tap(pointDto =>
						{
							point.dto.divDpointCatalogID = pointDto.divDpointCatalogID;
							point.dto.dPointPickTypeID = pointDto.dPointPickTypeID;
							point.dto.dPointPickType = pointDto.dPointPickType;
						})
					);
				}
				else
				{
					return of(null);
				}
			}),
			map(n =>
			{
				// add divDpointCatalogID to choices
				let dtos = choices.map(choice =>
				{
					choice.dto.divDpointCatalogID = point.id;

					return choice.dto;
				});

				return dtos;
			}),
			flatMap(dtos => this._divService.addDivChoiceCatalog(dtos)),
			finalize(() => this.isSaving = false)
		).subscribe(results =>
		{
			results.forEach(dto =>
			{
				let choice = new DivDChoice(dto);

				choice.parent = point;

				point.children.push(choice);
			});

			// resort
			point.children.sort(function (a, b) { return a.sortOrder - b.sortOrder; });

			this.closeSidePanels(false);

			this._msgService.add({ severity: 'success', summary: 'Choices', detail: `Added successfully!` });
		});
	}

	reactivateItem(event: any, itemType: string, parent: DivDSubGroup | DivDPoint)
	{
		let parentId = parent.id;
		this.reactivateSidePanelOpen = false;

		this._divService.getInactiveItems(itemType, parentId, this.selectedMarket.orgId).subscribe((data) =>
		{
			this.inactiveItems = data;
			this.itemType = itemType;
			this.workingItem = parent;

			this.openSidePanel(event, 'reactivate');
		});
	}

	onSaveReactivateItems(inactiveItems: Array<DivDPoint | DivDChoice>)
	{
		let itemType = this.itemType;
		let workingItem: DivDSubGroup | DivDPoint;

		this._divService.reactivateCatalogItem(inactiveItems, itemType).subscribe(async (reactivatedItems) =>
		{
			// check to see if there are remaining inactive items.
			const hasRemainingItems = this.divCatReactivateSidePanel.hasRemainingItems;

			if (itemType == 'Point')
			{
				let pointItems = inactiveItems as Array<DivDPoint>;
				let divPointIds = pointItems.map(x => x.id);

				let pointDtos = await this._divService.checkDivPointHasInactiveChildren(divPointIds).toPromise();

				pointItems = pointItems.map(p =>
				{
					let dto = pointDtos != null ? pointDtos.find(x => x.divDpointCatalogID == p.id) : null;

					// update sort order of reactivated decision points
					const reactivatedItem = (reactivatedItems as Array<PhdEntityDto.IDPointDto>).find(i => i.divDPointCatalogID === p.id);

					if (reactivatedItem)
					{
						p.sortOrder = reactivatedItem.dPointSortOrder;
					}

					p.hasInactiveChildren = dto != null ? dto.hasInactiveChoices : false;
					p.parent = this.workingItem as DivDSubGroup;

					return p;
				});

				workingItem = this.workingItem as DivDSubGroup;
				workingItem.children.push(...pointItems); // Add items to the main list
				workingItem.children.sort((l, r) => l.sortOrder < r.sortOrder ? -1 : 1); // resort
				workingItem.hasInactiveChildren = hasRemainingItems; // update hasInactiveChildren
			}
			else if (itemType == 'Choice')
			{
				let choiceItems = inactiveItems as Array<DivDChoice>;

				choiceItems = choiceItems.map(x =>
				{
					x.parent = this.workingItem as DivDPoint;

					return x;
				});

				workingItem = this.workingItem as DivDPoint;
				workingItem.children.push(...choiceItems); // Add items to the main list
				workingItem.children.sort((l, r) => l.sortOrder < r.sortOrder ? -1 : 1); // resort
				workingItem.hasInactiveChildren = hasRemainingItems; // update hasInactiveChildren
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

	openSidePanel(event: any, panelType?: string)
	{
		if (panelType == 'reactivate')
		{
			this.reactivateSidePanelOpen = true;
		}
		else if (panelType == 'point')
		{
			this.sidePanelOpenPoint = true;
		}
		else if (panelType == 'choice')
		{
			this.sidePanelOpenChoice = true;
		}

		this._uiUtils.highlightParentRow(event);
		this._uiUtils.scrollToSelectedRow();
	}

	onSidePanelClose(status: boolean)
	{
		this.closeSidePanels(status);
	}

	closeSidePanels(status: boolean)
	{
		this.sidePanelOpenPoint = status;
		this.sidePanelOpenChoice = status;
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

	choiceTrashToolTip(choice: DivDChoice)
	{
		return choice.isInUse ? 'Inactivate Choice' : 'Delete Choice';
	}

	async createMsgModal(item: DivDPoint | DivDChoice)
	{
		let newMessage = new MessageModal();

		// Points get inactivated so default to true, choices we must check to see if they're being used.
		let isInUse = item instanceof DivDChoice ? item.isInUse : true;

		let msgResult = '';

		if (item instanceof DivDPoint)
		{
			msgResult += `following Decision Point and its related Choices.`;
		}
		else if (item instanceof DivDChoice)
		{
			msgResult += `Choice:`;
		}
		else
		{
			throw Error("Invalid Item");
		}

		newMessage.msgAction = isInUse ? 'inactivate' : 'delete';
		newMessage.msgResult = msgResult;
		newMessage.msgSubject = item.label;

		this.msgModal = newMessage;

		let msgBody = `You are about to <span class="font-weight-bold text-danger">${newMessage.msgAction}</span> the ${newMessage.msgResult}<br><br> `;
		msgBody += `<span class="font-weight-bold">${newMessage.msgSubject}</span><br><br>${Constants.DO_YOU_WISH_TO_CONTINUE}`;

		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = Constants.WARNING;
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = Constants.CONTINUE;

		confirm.result.then((result) =>
		{
			if (result == Constants.CONTINUE)
			{
				this.deleteCatalogItem(item, isInUse);
			}
		}, (reason) =>
		{

		});
	}

	deleteCatalogItem(item: DivDPoint | DivDChoice, isInUse: boolean)
	{
		if (item instanceof DivDPoint)
		{
			// update point isActive flag
			item.dto.isActive = false;

			if (item.dto.dPointPickTypeID === null || item.dto.dPointPickTypeID === 0)
			{
				item.dto.dPointPickTypeID = 1; // default to Pick 1	
			}

			// update point setting active status to false.  All choices under the point should be flagged as inactive as well
			this.saveDivPointCatalog(item).subscribe(results =>
			{
				// update the item with its new id
				item.dto.divDpointCatalogID = results.divDpointCatalogID;

				// remove point from subGroup point list
				this.removeItem(item);

				// update subGroups inactive children flag
				item.parent.hasInactiveChildren = true;

				this._msgService.add({ severity: 'success', summary: 'Decision Point', detail: `Updated successfully!` });
			});
		}
		else if (item instanceof DivDChoice)
		{
			if (isInUse)
			{
				// update point isActive flag
				item.dto.isActive = false;

				// update choice setting active status to false.
				this._divService.updateDivChoiceCatalog({ divChoiceCatalogID: item.id, isActive: item.dto.isActive } as IDivCatalogChoiceDto).subscribe(results =>
				{
					// update Points inactive children flag
					item.parent.hasInactiveChildren = true;

					// remove choice from points choice list
					this.removeItem(item);

					this._msgService.add({ severity: 'success', summary: 'Choice', detail: `Updated successfully!` });
				});
			}
			else
			{
				// delete choice
				this._divService.deleteDivChoiceCatalog(item.id).subscribe(response =>
				{
					// remove choice from points choice list
					this.removeItem(item);

					this._msgService.add({ severity: 'success', summary: 'Choice', detail: `Deleted successfully!` });
				});
			}
		}
	}

	removeItem(item: any)
	{
		let childList = item.parent.children;
		let itemToRemove = childList.find(x => x.id == item.id);
		let index = childList.indexOf(itemToRemove);

		// remove item from parent list
		childList.splice(index, 1);
	}

	keywordSearch = () =>
	{
		//reset everything to unmatched.
		this.resetAllMatchValues(false);
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
			const isFilteredChoice = this.isFiltered('Choice');

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
								// filtered by point or all and label matches keyword
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

								if (dp.choices != null)
								{
									dp.choices.forEach(ch =>
									{
										if (isFilteredChoice && this.isMatch(ch.label, this.keyword))
										{
											// show choice
											ch.matched = true;

											// show point
											dp.matched = true;
											dp.open = true;

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
											ch.matched = false;
										}
									});
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

	private resetAllMatchValues(value: boolean)
	{
		this.groups.forEach(gp =>
		{
			gp.matched = value;

			if (gp.subGroups != null)
			{
				gp.subGroups.forEach(sg =>
				{
					sg.matched = value;

					if (sg.points != null)
					{
						sg.points.forEach(dp =>
						{
							dp.matched = value;

							if (dp.choices != null)
							{
								dp.choices.forEach(c =>
								{
									c.matched = value;
								});
							}
						});
					}
				});
			}
		});
	}

	editSort()
	{
		this.dragEnable = true;
		this.dragHasChanged = false;
		this.lockedFromChanges = true;
	}

	async cancelSortNavAway(): Promise<boolean>
	{
		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = Constants.WARNING;
		confirm.componentInstance.body = Constants.LOSE_CHANGES;
		confirm.componentInstance.defaultOption = Constants.CANCEL;

		let canCancel = await confirm.result.then((result) =>
		{
			return result == Constants.CONTINUE;
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
				this.getDivisionalCatalog();

				this.dragHasChanged = false;
			}

			this.lockedFromChanges = false;
		}
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
				let sortList = this.getSortList();

				this._divService.saveDivisionalSort(sortList, this.selectedMarket.orgId).subscribe(sortList =>
				{
					if (sortList)
					{
						this.sortUpdateRecords(sortList);

						this._msgService.add({ severity: 'success', summary: 'Sort', detail: `Sort Saved!` });
					}
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

	sortUpdateRecords(sortList: IDivSortList)
	{
		this.groups.forEach(group =>
		{
			group.subGroups.forEach(subGroup =>
			{
				if (subGroup.points.length > 0)
				{
					let pointSortChanged = subGroup.points.find(x => x.sortChanged == true);

					if (pointSortChanged)
					{
						subGroup.points.forEach(point =>
						{
							let updatedPoint = subGroup.isFlooring ?
								sortList.pointList.find(x => x.divDpointCatalogID == point.dto.divDpointCatalogID) :
								sortList.pointList.find(x => x.dPointCatalogID == point.dto.dPointCatalogID);

							// update ids for points newly added to the catalog.
							if (updatedPoint)
							{
								point.dto.divDpointCatalogID = updatedPoint.divDpointCatalogID;
								point.dto.dPointPickTypeID = updatedPoint.dPointPickTypeID;
								point.dto.dPointPickType = updatedPoint.dPointPickType;
								point.dto.orgID = updatedPoint.orgID;
							}

							// reset sort falg
							point.sortChanged = false;
						});
					}

					subGroup.points.forEach(point =>
					{
						if (point.choices.length > 0)
						{
							point.choices.forEach(choice =>
							{
								// reset sort flag
								choice.sortChanged = false;
							});
						}
					});
				}
			});
		});
	}

	getSortList = (): IDivSortList =>
	{
		var sortList: IDivSortList = { pointList: [], choiceList: [] } as IDivSortList;

		this.groups.forEach(group =>
		{
			group.subGroups.forEach(subGroup =>
			{
				if (subGroup.points.length > 0)
				{
					let pointSortChanged = subGroup.points.find(x => x.sortChanged == true);

					if (pointSortChanged)
					{
						let pointItems = this.mapPointToDto(subGroup.points);

						pointItems.forEach(pointItem =>
						{
							sortList.pointList.push(pointItem);
						});
					}

					subGroup.points.forEach(point =>
					{
						if (point.choices.length > 0)
						{
							let choiceSortChanged = point.choices.find(x => x.sortChanged == true);

							if (choiceSortChanged)
							{
								let choiceItems = this.mapChoiceToDto(point.choices);

								choiceItems.forEach(choiceItem =>
								{
									sortList.choiceList.push(choiceItem);
								});
							}
						}
					});
				}
			});
		});

		return sortList;
	}

	mapPointToDto = (points: Array<DivDPoint>): Array<IDivCatalogPointDto> =>
	{
		return points.map<IDivCatalogPointDto>(point =>
		{
			return {
				orgID: point.dto.orgID,
				divDpointCatalogID: point.dto.divDpointCatalogID,
				dPointPickTypeID: point.dto.dPointPickTypeID,
				dPointSortOrder: point.dto.divDPointSortOrder,
				dPointCatalogID: point.dto.dPointCatalogID,
				dSubGroupCatalogID: point.dto.dSubGroupCatalogID,
				dPointLabel: point.dto.dPointLabel,
				dPointDescription: point.dto.dPointDescription,
				isActive: point.dto.isActive,
				isQuickQuoteItem: point.dto.isQuickQuoteItem,
				isStructuralItem: point.dto.isStructuralItem,
				isHiddenFromBuyerView: point.dto.isHiddenFromBuyerView
			} as IDivCatalogPointDto;
		});
	}

	mapChoiceToDto = (choices: Array<DivDChoice>): Array<IDivCatalogChoiceDto> =>
	{
		return choices.map<IDivCatalogChoiceDto>(choice =>
		{
			return {
				divChoiceSortOrder: choice.dto.divChoiceSortOrder,
				divChoiceCatalogID: choice.dto.divChoiceCatalogID,
				isHiddenFromBuyerView: choice.dto.isHiddenFromBuyerView,
				priceHiddenFromBuyerView: choice.dto.priceHiddenFromBuyerView
			} as IDivCatalogChoiceDto;
		});
	}

	handleDrop(event: any, item: DivDPoint | DivDChoice)
	{
		if (event)
		{
			if (item instanceof DivDPoint)
			{
				let dragId = item.parent.isFlooring ? this.draggedItem.dto.divDpointCatalogID : this.draggedItem.dto.dPointCatalogID;
				let itemId = item.parent.isFlooring ? item.dto.divDpointCatalogID : item.dto.dPointCatalogID;

				if (this.canDrop(dragId, item) && dragId != itemId)
				{
					this.dragHasChanged = true;

					let parent = item.parent;

					let oldIndex = parent.children.findIndex(x => (item.parent.isFlooring ? x.dto.divDpointCatalogID : x.dto.dPointCatalogID) === dragId);
					let newIndex = parent.children.findIndex(x => (item.parent.isFlooring ? x.dto.divDpointCatalogID : x.dto.dPointCatalogID) === itemId);

					this.reSort(parent.children, oldIndex, newIndex);
				}
			}
			else if (item instanceof DivDChoice)
			{
				let divChoiceCatalogID = this.draggedItem.id;

				if (this.canDrop(divChoiceCatalogID, item) && item.id != divChoiceCatalogID)
				{
					this.dragHasChanged = true;

					let parent = item.parent;

					let oldIndex = parent.children.findIndex(x => x.id == divChoiceCatalogID);
					let newIndex = parent.children.findIndex(x => x.id == item.id);

					this.reSort(parent.children, oldIndex, newIndex);
				}
			}
		}
	}

	draggedItem: DivDPoint | DivDChoice;

	handleDragStart(event: any, item: DivDPoint | DivDChoice)
	{
		if (event)
		{
			this.draggedItem = item;
		}
	}

	handleDragEnter(event: any, item: DivDPoint | DivDChoice)
	{
		if (event)
		{
			let dragId = 0;

			if (item instanceof DivDPoint)
			{
				dragId = item.parent.isFlooring ? this.draggedItem.dto.divDpointCatalogID : this.draggedItem.dto.dPointCatalogID;
			}
			else if (item instanceof DivDChoice)
			{
				dragId = this.draggedItem.id;
			}

			if (!this.canDrop(dragId, item))
			{
				event[0].nativeElement.classList.remove('over');
			}
		}
	}

	canDrop(dragId: number, item: DivDPoint | DivDChoice)
	{
		let canDrop = false;

		if (item instanceof DivDPoint)
		{
			canDrop = item.parent.children.findIndex(x => (item.parent.isFlooring ? x.dto.divDpointCatalogID : x.dto.dPointCatalogID) === dragId) != -1;
		}
		else if (item instanceof DivDChoice)
		{
			canDrop = item.parent.children.findIndex(x => x.dto.divChoiceCatalogID == dragId) != -1;
		}

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

	getDragItem(item: DivDPoint | DivDChoice)
	{
		let id = 0;

		if (item instanceof DivDPoint)
		{
			id = item.parent.isFlooring ? item.dto.divDpointCatalogID : item.dto.dPointCatalogID;
		}
		else if (item instanceof DivDChoice)
		{
			id = item.id;
		}

		return id;
	}

	clearFilter()
	{
		this.keyword = '';
		this.resetAllMatchValues(true);
	}

	updateTree()
	{
		this.router.navigateByUrl('/divisional/divisional-catalog-wizard');
	}
}

class MessageModal
{
	msgAction: string;
	msgResult: string;
	msgSubject: string;
}
