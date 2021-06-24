import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

import { Observable, of, from as fromPromise, Subscription, forkJoin, throwError } from 'rxjs';
import { combineLatest, switchMap, distinctUntilChanged, map, finalize, catchError } from 'rxjs/operators';

import { MessageService } from 'primeng/api';

import * as moment from 'moment';

import { ChoiceSidePanelComponent } from './choice-side-panel/choice-side-panel.component';
import { PointSidePanelComponent } from './point-side-panel/point-side-panel.component';
import { ConfirmModalComponent } from '../../../core/components/confirm-modal/confirm-modal.component';
import { TreeTableComponent } from './';

import { ComponentCanNavAway } from '../../../shared/classes/component-can-nav-away.class';

import { IFinancialCommunity } from '../../../shared/models/financial-community.model';
import { IFinancialMarket } from '../../../shared/models/financial-market.model';
import { IPlan } from '../../../shared/models/plan.model';
import
	{
		DTree,
		DTPoint,
		DTChoice,
		DTSubGroup,
		IItemAdd,
		DTVersion,
		IDTPoint,
		IDTChoice,
		DTreeVersionDropDown,
		IDTSubGroup,
		DTAttributeGroupCollection,
        ITreeSortList
	} from '../../../shared/models/tree.model';
import { PhdApiDto, PhdEntityDto } from '../../../shared/models/api-dtos.model';
import { Permission, IdentityService } from 'phd-common';
import { IDPointPickType } from '../../../shared/models/point.model';

import { OrganizationService } from '../../../core/services/organization.service';
import { PlanService } from '../../../core/services/plan.service';
import { TreeService } from '../../../core/services/tree.service';
import { SettingsService } from '../../../core/services/settings.service';
import { AttributeService } from '../../../core/services/attribute.service';
import { LocationService } from '../../../core/services/location.service';
import { ITreeOption } from '../../../shared/models/option.model';
import { TreeToggleComponent } from '../../../shared/components/tree-toggle/tree-toggle.component';
import { ModalService } from '../../../core/services/modal.service';
import { ModalRef } from '../../../shared/classes/modal.class';

@Component({
	selector: 'manage-tree',
	templateUrl: './manage-tree.component.html',
	styleUrls: ['./manage-tree.component.scss']
})
export class ManageTreeComponent extends ComponentCanNavAway implements OnInit, OnDestroy
{
	@ViewChild(TreeTableComponent)
	treeTable: TreeTableComponent;

	@ViewChild(ChoiceSidePanelComponent)
	choiceSidePanel: ChoiceSidePanelComponent;

	@ViewChild(PointSidePanelComponent)
	pointSidePanel: PointSidePanelComponent;

	@ViewChild(TreeToggleComponent)
	private treeToggle: TreeToggleComponent;

	@ViewChild('newTree') newTree: any;

	markets: Array<IFinancialMarket>;
	communities: Array<IFinancialCommunity>;
	plans: Array<IPlan>;
	treeVersions: Array<DTreeVersionDropDown>;
	treeVersion: Observable<DTree> = this._treeService.currentTree;
	currentTree: DTree;
	groupsInMarket: DTAttributeGroupCollection = new DTAttributeGroupCollection();
	noVersions: boolean = false;

	selectedMarket: IFinancialMarket = null;
	selectedCommunity: IFinancialCommunity = null;
	selectedPlan: IPlan = null;
	selectedTreeVersion: DTreeVersionDropDown = null;
	selectedPoint: DTPoint;
	selectedChoice: DTChoice;

	marketsLoaded = false;
	communitiesLoading = false;
	plansLoading = false;
	treeVersionsLoading = false;
	addItemIsLoading = false;
	choiceDetailsSaving = false;
	pointDetailsSaving = false;
	treeDetailsSaving = false;
	addItemIsSaving = false;
	isDeletingTree = false;

	currentTab = '';
	showTreeDetails = false;
	treeDetailsTitle = '';
	showAddItem = false;
	itemParent: any;
	unusedItems: Array<IItemAdd> = [];

	searchString = '';
	searchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];
	currentSearchFilter = 'All';
	showSearchFilter = false;

	dragEnable = false;
	dragHasChanged = false;
	sidePanelHasChanges = false;

	lockedFromChanges = false;
	canEdit = false;
	canPublish = false;
	currentTreeOptions: Array<ITreeOption>;
	showMessages = false;
	activePlans: Array<IPlan>;
	inactivePlans: Array<IPlan>;
	private _routeSub: Subscription;
	private _treeVersionSub: Subscription;
	private _treeOptionSub: Subscription;

	modalReference: ModalRef;

	get openGroups(): boolean
	{
		return this.treeToggle ? this.treeToggle.openGroups : true;
	}

	get openSubGroups(): boolean
	{
		return this.treeToggle ? this.treeToggle.openSubGroups : true;
	}

	get openPoints(): boolean
	{
		return this.treeToggle ? this.treeToggle.openPoints : true;
	}

	constructor(
		private _orgService: OrganizationService,
		private _planService: PlanService,
		private _treeService: TreeService,
		private _identityService: IdentityService,
		private _settingsService: SettingsService,
		private _modalService: ModalService,
		private _msgService: MessageService,
		private _activedRoute: ActivatedRoute,
		private _router: Router,
		private _location: Location,
		private _attributeService: AttributeService,
		private _locationService: LocationService
	) { super(); }

	ngOnInit()
	{
		this._routeSub = this._activedRoute.paramMap
			.pipe(
				distinctUntilChanged()
			)
			.subscribe(params =>
			{
				if (params && params.get('treeVersionId'))
				{
					const treeVersionId = parseInt(params.get('treeVersionId'), 10);

					// we need to load the tree first so we can get ids for the dropdowns
					this._treeService.getTreeByVersionId(treeVersionId).subscribe(tree =>
					{
						if (tree)
						{
							this.getMarkets(tree.marketId, tree.commId, tree.planKey, tree.version.id);
						}
					});
				}
				else
				{
					this._treeService.currentTreeVersionId$.next(null);

					this.getMarkets();
				}
			});

		this._treeVersionSub = this.treeVersion.subscribe(currentTree =>
		{
			this.currentTree = currentTree;
		});

		this._treeOptionSub = this._treeService.currentTreeOptions.subscribe(options => { this.currentTreeOptions = options; });
	}

	ngOnDestroy()
	{
		if (this._routeSub)
		{
			this._routeSub.unsubscribe();
		}

		if (this._treeVersionSub)
		{
			this._treeVersionSub.unsubscribe();
		}

		if (this._treeOptionSub)
		{
			this._treeOptionSub.unsubscribe();
		}
	}

	getMarkets(marketId?: number, commId?: number, planKey?: string, treeVersionId?: number)
	{
		this._orgService.getMarkets().pipe(
			finalize(() => { this.marketsLoaded = true; })
		).subscribe(markets =>
		{
			this.markets = markets;

			const storedMarket = this._orgService.currentFinancialMarket;

			if (marketId || storedMarket)
			{
				const market = markets.find(x => (marketId ? x.id === marketId : x.number === storedMarket));
				this.selectedMarket = market ? market : null;

				if (this.selectedMarket)
				{
					// set local storage
					this._orgService.currentFinancialMarket = this.selectedMarket.number;

					this.checkCanEdit(this.selectedMarket.number);

					this.getCommunities(commId, planKey, treeVersionId);

					this.getAttributeGroups();
				}
			}
		});
	}

	getCommunities(commId: number, planKey: string, treeVersionId: number)
	{
		// get communities
		this._orgService.getCommunities(this.selectedMarket.id).subscribe(comms =>
		{
			this.communities = comms;

			const storedCommunity = this._orgService.currentFinancialCommunity;

			if (commId || storedCommunity)
			{
				// try to find a match for the stored community.
				const community = this.communities.find(x => (commId ? x.id === commId : x.number === storedCommunity));

				this.selectedCommunity = community ? community : null;

				if (this.selectedCommunity)
				{
					// set local storage
					this._orgService.currentFinancialCommunity = this.selectedCommunity.number;

					this.getPlans(planKey, treeVersionId);
				}
			}
		});
	}

	getPlans(planKey: string, treeVersionId: number)
	{
		// get community plans
		this.plansLoading = true;

		this._planService.getCommunityPlans(this.selectedCommunity.id)
			.pipe(finalize(() => { this.plansLoading = false; }))
			.subscribe(plans =>
			{
				this.plans = plans;
				this.sortPlans(plans);
				// check for stored plan
				const storedPlan = this._planService.currentPlan;
				const planToFind = planKey ? planKey : storedPlan;

				if (planToFind)
				{
					const plan = this.plans.find(x => x.financialPlanIntegrationKey === planToFind);

					this.selectedPlan = plan ? plan : null;

					if (this.selectedPlan)
					{
						// set local storage.
						this._planService.currentPlan = this.selectedPlan.financialPlanIntegrationKey;

						this.getTreeVersions(treeVersionId);
					}
					else
					{
						this.clearTreeVersions();
					}
				}
				else
				{
					this.clearTreeVersions();
				}
			});
	}

	sortPlans(plans: IPlan[])
	{
		this.activePlans = plans.filter(plan => plan.isActive);
		this.inactivePlans = plans.filter(plan => !plan.isActive);
	}

	getTreeVersions(treeVersionId: number)
	{
		// get tree versions
		this.treeVersionsLoading = true;

		this._treeService.getTreeVersions(this.selectedCommunity.id, this.selectedPlan.financialPlanIntegrationKey)
			.pipe(finalize(() => { this.treeVersionsLoading = false; }))
			.subscribe(treeVersions =>
			{
				this.treeVersions = treeVersions;

				if (treeVersionId)
				{
					const treeVersion = this.treeVersions.find(x => x.id === treeVersionId);

					this.selectedTreeVersion = treeVersion ? treeVersion : null;

					if (this.selectedTreeVersion.id != treeVersionId)
					{
						this.noVersions = true;
					}
				}
			});
	}

	getAttributeGroups()
	{
		const attrGroups = this._attributeService.getAttributeGroupsByMarketId(this.selectedMarket.id, true, null, null, null, null, true);
		const locGroups = this._locationService.getLocationGroupsByMarketId(this.selectedMarket.id, true, null, null, null, null, true);

		forkJoin(attrGroups, locGroups).subscribe(([attr, loc]) =>
		{
			this.groupsInMarket.attributeGroups = attr;
			this.groupsInMarket.locationGroups = loc;
		});
	}

	get treeOptionRouteLink(): string
	{
		return `/community/tree-options/${this.currentTree.version.id}`;
	}

	get isTreeInvalid(): boolean
	{
		return this.pointsWithNoChoices.length > 0;
	}

	get pointsWithNoChoicesMessage(): string
	{
		const cnt = this.pointsWithNoChoices.length;
		return cnt > 0 ? `${cnt} Decision Point${cnt > 1 ? 's have' : ' has'} no choices associated.` : '';

	}

	get pointsWithNoChoices(): Array<IDTPoint>
	{
		if (this.currentTree)
		{
			const pts: Array<IDTPoint> = [];
			this.currentTree.version
				.groups.forEach(g => g
					.subGroups.forEach(sg => sg
						.points.forEach(p =>
						{
							if (p.choices.length === 0) { pts.push(p); }
						})
					)
				);

			return pts;
		}
		else
		{
			return [];
		}
	}

	get isReadOnly(): boolean
	{
		return !this.currentTree || this.currentTree.version.isReadOnly;
	}

	get hasDraft(): boolean
	{
		const v = this.treeVersions && this.treeVersions.some(o =>
		{
			return o.effectiveDate == null || moment.utc().isBefore(o.effectiveDate);
		});

		return v;
	}

	get isDraft(): boolean
	{
		return this.selectedTreeVersion && (this.selectedTreeVersion.effectiveDate == null || moment.utc().isBefore(this.selectedTreeVersion.effectiveDate));
	}

	get titleAddon(): string
	{
		return this.isDraft ? ' - Draft' : '';
	}

	get disableNewTree(): boolean
	{
		return (this.selectedPlan == null || this.hasDraft || this.treeVersionsLoading);
	}

	get marketDefaultText()
	{
		return this.marketsLoaded ? 'Select a Market' : 'Loading...';
	}

	get communityDefaultText()
	{
		return this.communitiesLoading ? 'Loading...' : 'Select a Community';
	}

	get planDefaultText()
	{
		return this.plansLoading ? 'Loading...' : 'Select a Plan';
	}

	get treeVersionDefaultText()
	{
		return this.treeVersionsLoading ? 'Loading...' : 'Select a Tree Version';
	}

	get hasChanges()
	{
		return this.dragHasChanged || this.sidePanelHasChanges;
	}

	get disableButtons()
	{
		return this._treeService.treeVersionIsLoading;
	}

	onHasChanges(value: boolean)
	{
		this.sidePanelHasChanges = value;
	}

	canNavAway(): boolean
	{
		return !this.hasChanges;
	}

	canDeactivate(): Observable<boolean> | boolean
	{
		if (!this.hasChanges)
		{
			return true;
		}

		// if changes then confirm
		return this.confirm('Discard changes?', 'Warning!', 'Cancel');
	}

	private confirm(msg: string, title: string, defaultOption: string): Observable<boolean>
	{
		return fromPromise(this.showConfirmModal(msg, title, defaultOption));
	}

	onMessageClick()
	{
		this.showMessages = true;
	}

	onMessagesSidePanelClose()
	{
		this.showMessages = false;
	}

	onPointMessageClick(point: IDTPoint)
	{
		// scroll to point
		this.treeTable.scrollToPoint(point);
		this.showMessages = false;
	}

	onEditSortClick()
	{
		this.dragEnable = true;
		this.dragHasChanged = false;
		this.lockedFromChanges = true;
	}

	async onCancelSortClick()
	{
		const confirmMessage = `If you continue you will lose your changes.<br><br>Do you wish to continue?`;
		const confirmTitle = `Warning!`;
		const confirmDefaultOption = `Cancel`;

		if (!this.dragHasChanged || await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption))
		{
			this.dragEnable = false;

			// revert back to original array if things were changed but not saved.
			if (this.dragHasChanged)
			{
				this._treeService.currentTreeVersionId$.next(this.currentTree.version.id);

				this.dragHasChanged = false;
			}

			this.lockedFromChanges = false;
		}
	}

	onDragHasChanged()
	{
		this.dragHasChanged = true;
	}

	onSaveSortClick()
	{
		if (this.dragHasChanged)
		{
			try
			{
				const sortList = this.getSortList();

				this._treeService.saveTreeSort(this.currentTree.version.id, sortList).pipe(
					finalize(() =>
					{
						this.dragEnable = false;
						this.lockedFromChanges = false;
						this.dragHasChanged = false;
					})
				).subscribe(response =>
				{
					if (sortList)
					{
						this.resetSort();

						this._msgService.add({ severity: 'success', summary: 'Sort', detail: `Sort Saved!` });
					}
				});
			}
			catch (error)
			{
				this._msgService.add({ severity: 'error', summary: `Error Saving Sort.` });
			}
		}
		else
		{
			this._msgService.add({ severity: 'info', summary: `Sort was not saved. No changes were made.` });
		}
	}

	resetSort()
	{
		this.currentTree.version.groups.forEach(group =>
		{
			group.subGroups.forEach(subGroup =>
			{
				subGroup.points.forEach(point =>
				{
					if (point.sortChanged)
					{
						// reset sort flag
						point.sortChanged = false;
					}

					point.choices.forEach(choice =>
					{
						if (choice.sortChanged)
						{
							// reset sort flag
							choice.sortChanged = false;
						}
					});
				});
			});
		});
	}

	onChangeMarket()
	{
		this.checkCanEdit(this.selectedMarket.number);

		this.communitiesLoading = true;
		// set local storage
		this._orgService.currentFinancialMarket = this.selectedMarket.number;
		this._orgService.getCommunities(this.selectedMarket.id).pipe(
			finalize(() => { this.communitiesLoading = false; })
		).subscribe(comms =>
		{
			this.communities = comms;
			this.selectedPlan = null;
			this.plans = [];
			this.clearTreeVersions();
		});

		this.getAttributeGroups();
	}

	onChangeCommunity()
	{
		this.plansLoading = true;
		// set local storage
		this._orgService.currentFinancialCommunity = this.selectedCommunity.number;
		this._planService.getCommunityPlans(this.selectedCommunity.id)
			.pipe(
				finalize(() => { this.plansLoading = false; })
			)
			.subscribe(plans =>
			{
				this.selectedPlan = null;
				this.plans = plans;
				this.sortPlans(plans);
				this.clearTreeVersions();
			});
	}

	onChangePlan()
	{
		this.selectedTreeVersion = null;

		if (this.selectedPlan)
		{
			// set local storage
			this._planService.currentPlan = this.selectedPlan.financialPlanIntegrationKey;

			this._treeService.getTreeVersions(this.selectedCommunity.id, this.selectedPlan.financialPlanIntegrationKey)
				.pipe(finalize(() => { this.treeVersionsLoading = false; }))
				.subscribe(treeVersions =>
				{
					this.treeVersions = treeVersions;
					this._treeService.currentTreeVersionId$.next(null);
				});
		}
		else
		{
			// set local storage
			this._planService.currentPlan = null;

			this.clearTreeVersions();
		}
		this.updateUrl();
	}

	onChangeTreeVersion()
	{
		if (this.selectedTreeVersion != null)
		{
			// updating tree service's treeVersionId$ will kick off a GET of the treeVersion
			this._treeService.currentTreeVersionId$.next(this.selectedTreeVersion.id);

			this._treeService.clearCurrentTree();
			this.updateUrl(this.selectedTreeVersion.id);
		}
		else
		{
			this.clearTreeVersions();
			this.isDeletingTree = false;
			this.lockedFromChanges = false;
			this.updateUrl();
		}
	}

	updateUrl(treeVersionId?: number)
	{
		let urlRoute = treeVersionId ? `/community/tree/${treeVersionId}` : `/community/tree`;

		const url = this._router.createUrlTree([urlRoute]).toString();

		this._location.go(url);
	}

	async onDeleteDraftClicked()
	{
		if (!this.isReadOnly)
		{
			const confirmMessage = 'Are you sure you want to permanently delete this draft?';
			const confirmTitle = 'Warning!';
			const confirmDefaultOption = 'Cancel';

			if (await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption))
			{
				try
				{
					this._msgService.add({ severity: 'info', summary: 'Deleting Draft...' });
					this.treeVersionsLoading = true;
					this.treeVersions = [];
					this.isDeletingTree = true;
					this.lockedFromChanges = true;

					this._treeService.deleteDraftTreeVersion(this.currentTree.version.id)
						.pipe(finalize(() => { this.treeVersionsLoading = false }))
						.subscribe(response =>
						{
							this._msgService.add({ severity: 'success', summary: `Draft has been deleted!` })

							this.onChangePlan();

							this._treeService.currentTreeVersionId$.next(null);

							this.onChangeTreeVersion();
						},
						(error) =>
						{
							this._msgService.add({ severity: 'danger', summary: 'Error', detail: `Failed to delete draft.` });
						});
				}
				catch (ex)
				{
					this.treeVersionsLoading = false;
					this.isDeletingTree = false;
					this.lockedFromChanges = false;

					this._msgService.clear();
					this._msgService.add({ severity: 'error', summary: 'Error', detail: `Failed to delete draft: ${ex}` });

					// AppInsights.trackException(ex);
				}
			}
		}
	}

	onDetailsClicked()
	{
		this.treeDetailsTitle = 'Decision Tree Details';
		this.showTreeDetails = true;
	}

	onPublishClicked()
	{
		const inactiveOptions = this.currentTreeOptions.filter(option => !option.isActive);

		if (inactiveOptions.length > 0)
		{
			const inactiveOptionText = '<ul>' + inactiveOptions.map(option => '<li>' + option.id + '</li>').join('') + '</ul>';

			this.showConfirmModal('<span class="font-weight-bold text-primary">Warning:</span> The following inactive options are mapped to choices. Please adjust your mapping/rules, remove any images, and then publish. </br> ' + inactiveOptionText, 'Inactive Options', '', { hide: true, text: '' }, { hide: true, text: '' })
		}
		else
		{
			this.treeDetailsTitle = 'Publish Decision Tree';
			this.showTreeDetails = true;
		}
	}

	onPreviewTreeClicked()
	{
		const path = `preview/${this.currentTree.version.id}`;

		const ref = window.open('', "preview", '', true);

		if (!ref.location.href.endsWith(path)) // just opened
		{
			const dtUrl = this._settingsService.getSettings().designToolUrl;

			ref.location.href = `${dtUrl}${path}`;
		}
		else
		{ // was already opened -- we refresh it
			ref.location.reload(true);
		}

		ref.focus();
	}

	onOptionsClicked()
	{
		this._msgService.add({ severity: 'info', summary: 'Options Page Not Implemented' });
	}

	onNewTree()
	{
		this.modalReference = this._modalService.open(this.newTree, { size: 'md', windowClass: 'phd-new-tree', keyboard: false });
	}

	onCreateNewTree(params: { treeVersionId: number })
	{
		this._msgService.add({ severity: 'info', summary: 'Loading...' });
		this.treeVersionsLoading = true;
		this.treeVersions = [];
		this.noVersions = true;

		const commId = this.selectedCommunity.id;
		const planKey = this.selectedPlan.financialPlanIntegrationKey;
		const treeVersionId = params.treeVersionId;
		const newType = treeVersionId === 0 ? 'Catalog' : 'Published';

		this._treeService.getNewTree(commId, planKey, newType, treeVersionId)
			.pipe(
				switchMap(tree =>
				{
					// getNewTree will set tree to null if there are no groups found in the tree
					if (tree == null)
					{
						return of<number>(null);
					}
					else
					{
						return this._treeService.getTreeVersions(this.selectedCommunity.id, this.selectedPlan.financialPlanIntegrationKey)
							.pipe(map(treeVersions =>
							{
								this.treeVersions = treeVersions;

								const treeVersion = this.treeVersions.find(x => x.id === tree.version.id);

								this.selectedTreeVersion = treeVersion ? treeVersion : null;

								this.onChangeTreeVersion();
								return tree.version.id;
							}));
					}
				})
			)
			.subscribe(versionId =>
			{
				if (versionId)
				{
					this._treeService.currentTreeVersionId$.next(versionId);
					this.treeVersionsLoading = false;
					this.noVersions = false;
					this.updateUrl(versionId);
					this.dragEnable = false;
				}
				else
				{
					this._msgService.add({ severity: 'error', summary: 'Catalog Not Found' });
				}
			});
	}

	onSearchFilterClick(searchFilter: string)
	{
		this.currentSearchFilter = searchFilter;
		this.showSearchFilter = false;
	}

	onSearchClick()
	{
		this.resetAllMatchValues(false);
		let matchCount = 0;

		matchCount = this.mainSearch();

		if (matchCount === 0)
		{
			this._msgService.add({ severity: 'error', summary: 'No Results Found', detail: `Please try another search.` });
		}
	}

	onClearFilterClick()
	{
		this.searchString = '';
		this.resetAllMatchValues(true);
	}

	onChoiceSelected(params: { item: DTChoice, tab: string })
	{
		this.currentTab = params.tab;
		this.selectedChoice = params.item;
	}

	onPointSelected(params: { item: DTPoint, tab: string })
	{
		this.currentTab = params.tab;
		this.selectedPoint = params.item;
	}

	async onDeleteChoice(choice: DTChoice)
	{
		this._treeService.hasAttributeReassignmentsByChoiceId(choice.id).subscribe(async hasReassignments =>
		{
			await this.deleteChoice(choice, hasReassignments);
		});
	}

	async deleteChoice(choice: DTChoice, hasReassignments: boolean = false)
	{
		const confirmTitle = 'Warning!';
		const confirmDefaultOption = 'Cancel';
		let confirmMessage = `You are about to <span class="font-weight-bold text-danger">delete</span> the Choice:<br><br><span class="font-weight-bold">${choice.label}</span>`;

		if (hasReassignments)
		{
			confirmMessage += `<br><br>Delete includes the removal of<br>`;
			confirmMessage += `<span class="ml-3 font-weight-bold"> - Attribute Reassignments</span>`;
		}

		confirmMessage += `<br><br>Do you wish to continue?`;

		if (await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption))
		{
			const id = choice.id;
			const versionId = choice.treeVersionId;

			this._msgService.add({ severity: 'info', summary: 'Deleting Choice...' });

			// delete choice
			this._treeService.deleteChoiceFromTree(versionId, id)
				.pipe(catchError((err) => {
					this._msgService.add({ severity: 'error', summary: 'Error', detail: `Unable to Delete Choice.` });
					return throwError(err);
				}))
				.subscribe(deletedRules => {
					this.updateDPointRulesStatus(deletedRules.points);
					this.updateOptionRulesStatus(deletedRules.integrationKeys);

					const point = choice.parent;

					// remove choice from DTPoint choice list
					const index = point.choices.indexOf(choice);
					point.choices.splice(index, 1);

					// update points hasUnusedChoices flag
					this.checkUnusedChoices(point);

					this._msgService.add({ severity: 'success', summary: 'Choice Deleted' });
				});
		}
	}

	async onDeletePoint(point: DTPoint)
	{
		this._treeService.hasAttributeReassignmentsByChoiceIds(point.choices.map(c => c.id)).subscribe(async hasReassignments =>
		{
			await this.deletePoint(point, hasReassignments);
		});
	}

	async deletePoint(point: DTPoint, hasReassignments: boolean = false)
	{
		const confirmTitle = 'Warning!';
		const confirmDefaultOption = 'Cancel';
		let confirmMessage = `You are about to <span class="font-weight-bold text-danger">delete</span> the following Decision Point and its related Choices:<br><br><span class="font-weight-bold">${point.label}</span>`;

		if (hasReassignments)
		{
			confirmMessage += `<br><br>Delete includes the removal of<br>`;
			confirmMessage += `<span class="ml-3 font-weight-bold"> - Attribute Reassignments</span>`;
		}

		confirmMessage += `<br><br>Do you wish to continue?`;

		if (await this.showConfirmModal(confirmMessage, confirmTitle, confirmDefaultOption))
		{
			const id = point.id;
			const versionId = point.treeVersionId;

			this._msgService.add({ severity: 'info', summary: 'Deleting Decision Point...' });

			// delete point
			this._treeService.deletePointFromTree(versionId, id).pipe(
				catchError((err) => {
					this._msgService.add({ severity: 'error', summary: 'Error', detail: `Unable to Delete Decision Point.` });
					return throwError(err);
				})
			).subscribe(deletedRules => {
				this.updateDPointRulesStatus(deletedRules.points);
				this.updateOptionRulesStatus(deletedRules.integrationKeys);

				const subGroup = point.parent;

				// remove point from DTSubGroup point list
				const index = subGroup.points.indexOf(point);
				subGroup.points.splice(index, 1);

				// update subGroups hasUnusedPoints flag
				this.checkUnusedPoints(subGroup);

				this._msgService.add({ severity: 'success', summary: 'Decision Point Deleted' });
			});
		}
	}

	onAddItem(item: DTPoint | DTSubGroup)
	{
		this.itemParent = item;
		this.addItemIsLoading = true;
		this.showAddItem = true;

		if (item instanceof DTPoint)
		{
			this._treeService.getUnusedDivChoices(item.id).pipe(
				finalize(() => this.addItemIsLoading = false)
			).subscribe(choices =>
			{
				if (choices)
				{
					this.unusedItems = choices.map(c =>
					{
						return {
							text: c.choiceLabel,
							id: c.divChoiceCatalogID,
							isDefault: c.isDecisionDefault,
							isSelected: false
						} as IItemAdd;
					});
				}
			});
		}
		else
		{
			this._treeService.getUnusedDivPoints(this.currentTree.marketId, item.id).pipe(
				finalize(() => this.addItemIsLoading = false)
			).subscribe(points =>
			{
				if (points)
				{
					this.unusedItems = points.map(p =>
					{
						return {
							text: p.dPointLabel,
							id: p.divDpointCatalogID,
							isDefault: false,
							isSelected: false
						} as IItemAdd;
					});
				}
			});
		}
	}

	onAddItemSave(params: { parent: DTPoint | DTSubGroup, items: Array<IItemAdd> })
	{
		this.addItemIsSaving = true;

		const parentId = params.parent.id;
		const ids = params.items.map(i => i.id);

		// save choices to tree
		this._treeService.saveItemsToTree(parentId, ids, params.parent)
			.pipe(finalize(() =>
			{
				this.addItemIsSaving = false;
				this.unusedItems = [];
				this.itemParent = null;
				this.showAddItem = false;
				this.sidePanelHasChanges = false;
			}))
			.subscribe(response =>
			{
				if (params.parent instanceof DTPoint)
				{
					// update points hasUnusedChoices flag
					this.checkUnusedChoices(params.parent);
				}
				else
				{
					// update subGroups hasUnusedPoints flag
					this.checkUnusedPoints(params.parent);
				}
			});
	}

	onTreeDetailsSave(params: { treeVersion: DTVersion, canUnpublishTree: boolean })
	{
		try
		{
			this.treeDetailsSaving = true;
			const v = params.treeVersion.dto;

			v.name = params.treeVersion.name;
			v.description = params.treeVersion.description;
			v.publishStartDate = params.treeVersion.publishStartDate.clone().utc().format(); // automatically formats to ISO 8601

			if (params.canUnpublishTree)
			{
				v.publishEndDate = params.treeVersion.publishEndDate.clone().utc().format(); // automatically formats to ISO 8601
			}

			this._treeService.saveTreeVersion(v)
				.pipe(finalize(() => { this.treeDetailsSaving = false; }))
				.subscribe(dto =>
				{
					params.treeVersion.dto = dto;

					this.onTreeDetailsSidePanelClose();

					this._msgService.add({ severity: 'success', summary: `Version has been saved` });

					const ddVersion = this.treeVersions.find(version => version.id === params.treeVersion.id);

					if (ddVersion != null)
					{
						ddVersion.name = this.currentTree.version.name;
						ddVersion.effectiveDate = params.treeVersion.publishStartDate.local();

						if (params.treeVersion.publishEndDate != null)
						{
							ddVersion.endDate = params.treeVersion.publishEndDate.local();
						}
					}

					// look for the last published tree
					const currentIndex = this.treeVersions.indexOf(ddVersion);
					const prevPublished = this.treeVersions[currentIndex + 1];

					if (prevPublished != null)
					{
						// find its endDate
						this._treeService.getTreeEndDate(prevPublished.id).subscribe(endDate =>
						{
							if (endDate != null)
							{
								// update tree Dropdown with the date
								prevPublished.endDate = moment.utc(endDate).local();
							}
						});
					}
				},
					(err) =>
					{
						this._msgService.add({ severity: 'error', summary: 'Error', detail: `Save failed. ${err}` });
					});
		}
		catch (err)
		{
			this._msgService.add({ severity: 'error', summary: 'Error', detail: `Save failed. ${err}` });
		}
	}

	onChoiceSidePanelClose()
	{
		this.selectedChoice = null;
		this.sidePanelHasChanges = false;
	}

	onPointSidePanelClose()
	{
		this.selectedPoint = null;
		this.sidePanelHasChanges = false;
	}

	onAddItemSidePanelClose()
	{
		this.unusedItems = [];
		this.showAddItem = false;
		this.sidePanelHasChanges = false;
	}

	onTreeDetailsSidePanelClose()
	{
		this.showTreeDetails = false;
		this.sidePanelHasChanges = false;
	}

	onPointDetailsChange(params: { point: DTPoint, pickType: IDPointPickType })
	{
		this.pointDetailsSaving = true;

		const { point, pickType } = params;
		const pointDto: PhdEntityDto.IDPointDto = { dPointPickTypeID: pickType.dPointPickTypeID, isQuickQuoteItem: point.isQuickQuoteItem, isStructuralItem: point.isStructuralItem } as PhdEntityDto.IDPointDto;

		this._treeService.patchPoint(point.id, pointDto)
			.pipe(finalize(() => this.pointDetailsSaving = false))
			.subscribe(() =>
			{
				point.dto.pointPickTypeLabel = pickType.dPointPickTypeLabel;
				point.dto.pointPickTypeId = pickType.dPointPickTypeID;

				point.pointPickTypeId = pickType.dPointPickTypeID;
				point.pointPickTypeLabel = pickType.dPointPickTypeLabel;

				this.pointSidePanel.onPointDetailsReset();

				this._msgService.add({ severity: 'success', summary: 'Decision Point Saved', detail: `Decision Point has been saved.` });
			},
				(error) =>
				{
					this._msgService.add({ severity: 'danger', summary: 'Error', detail: `Unable to save Decision Point.` });
				});
	}

	onChoiceDetailsChange(params: { choice: DTChoice, isDecisionDefault: boolean, description: string, maxQuantity?: number })
	{
		this.choiceDetailsSaving = true;

		// patch choice
		const choiceDto = {
			dpChoiceID: params.choice.id,
			isDecisionDefault: params.isDecisionDefault,
			maxQuantity: params.maxQuantity,
			dpChoiceDescription: params.description
		} as PhdEntityDto.IDPChoiceDto;

		this._treeService.patchChoice(params.choice.id, choiceDto).pipe(
			finalize(() => this.choiceDetailsSaving = false)
		).subscribe(r =>
		{
			params.choice.isDecisionDefault = params.isDecisionDefault;
			params.choice.maxQuantity = params.maxQuantity;
			params.choice.description = params.description;

			params.choice.dto.isDecisionDefault = params.isDecisionDefault;
			params.choice.dto.choiceMaxQuantity = params.maxQuantity;
			params.choice.dto.description = params.description;

			this.choiceSidePanel.onChoiceDetailsReset();

			this._msgService.add({ severity: 'success', summary: 'Choice Details Saved.' });
		},
			error =>
			{
				this._msgService.add({ severity: 'error', summary: 'Issue saving Choice Details.' });
			});
	}

	toggleInteractiveFloorplan(subGroup: IDTSubGroup)
	{
		this._treeService.toggleInteractiveFloor(subGroup.id, subGroup.useInteractiveFloorplan).subscribe();
	}

	private updateDPointRulesStatus(deletedPoints: Array<PhdApiDto.IDTreePointDto>)
	{
		if (deletedPoints.length > 0)
		{
			this.currentTree.version.groups.forEach(group =>
			{
				group.subGroups.forEach(subGroup =>
				{
					subGroup.points.forEach(point =>
					{
						deletedPoints.forEach(delPoint =>
						{
							if (delPoint.id === point.id)
							{
								point.hasPointToChoiceRules = delPoint.hasPointToChoiceRules;
								point.hasPointToPointRules = delPoint.hasPointToPointRules;

								point.choices.forEach(choice =>
								{
									delPoint.choices.forEach(delChoice =>
									{
										if (delChoice.id === choice.id)
										{
											choice.hasChoiceRules = delChoice.hasChoiceRules;
											choice.hasOptionRules = delChoice.hasOptionRules;
										}
									});
								});
							}
						});
					});
				});
			});
		}
	}

	private updateOptionRulesStatus(integrationKeys: Array<string>)
	{
		// just in case options have not finished loading
		this._treeService.currentTreeOptions.subscribe(options =>
		{
			if (options)
			{
				if (integrationKeys.length > 0)
				{
					integrationKeys.forEach(key =>
					{
						// find a match for the rule removed
						const tOption = options.find(x => x.id === key);

						if (tOption != null)
						{
							// setting has rules to false should remove the record from the options list
							tOption.hasRules = false;
						}
					});
				}
			}
		});
	}

	private checkUnusedChoices(point: DTPoint)
	{
		// check for any unused choices
		this._treeService.hasUnusedDivChoices(point.id).subscribe(hasUnusedChoices =>
		{
			// update flag
			point.hasUnusedChoices = hasUnusedChoices;
		});
	}

	private checkUnusedPoints(subGroup: DTSubGroup)
	{
		// check for any unused points
		this._treeService.hasUnusedDivPoints(this.currentTree.marketId, subGroup.id).subscribe(hasUnusedPoints =>
		{
			// update flag
			subGroup.hasUnusedPoints = hasUnusedPoints;
		});
	}

	private resetAllMatchValues(value: boolean)
	{
		this.currentTree.version.groups.forEach(gp =>
		{
			gp.matched = value;
			gp.open = value;

			if (gp.subGroups != null)
			{
				gp.subGroups.forEach(sg =>
				{
					sg.matched = value;
					sg.open = value;

					if (sg.points != null)
					{
						sg.points.forEach(dp =>
						{
							dp.matched = value;
							dp.open = value;

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

	private mainSearch(): number
	{
		let count = 0;
		const groups = this.currentTree.version.groups;

		if (groups != null)
		{
			const isFilteredGroup = this.isSearchFiltered('Group');
			const isFilteredSubGroup = this.isSearchFiltered('SubGroup');
			const isFilteredPoint = this.isSearchFiltered('Decision Point');
			const isFilteredChoice = this.isSearchFiltered('Choice');

			groups.forEach(gp =>
			{
				// filtered by group or all and label matches keyword
				if (isFilteredGroup && this.isSearchStringMatch(gp.label, this.searchString))
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
						if (isFilteredSubGroup && this.isSearchStringMatch(sg.label, this.searchString))
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
								if (isFilteredPoint && this.isSearchStringMatch(dp.label, this.searchString))
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
										if (isFilteredChoice && this.isSearchStringMatch(ch.label, this.searchString))
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
										} else
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

	private isSearchStringMatch(label: string, keyword: string): boolean
	{
		//keyword = keyword || '';

		return label.toLowerCase().indexOf(keyword.toLowerCase()) >= 0;
	}

	private isSearchFiltered(searchFilter: string)
	{
		let filtered = false;

		if (this.currentSearchFilter === searchFilter || this.currentSearchFilter === 'All')
		{
			filtered = true;
		}

		return filtered;
	}

	private checkCanEdit(marketId: string)
	{
		this._identityService.hasClaimWithPermission('CommunityTree', Permission.Edit)
			.pipe(
				combineLatest(this._identityService.hasMarket(marketId))
			).subscribe(([hasPermission, inMarket]) =>
			{
				this.canEdit = hasPermission && inMarket;
			});

		this._identityService.hasClaimWithPermission('CommunityTree', Permission.Publish)
			.pipe(
				combineLatest(this._identityService.hasMarket(marketId))
			).subscribe(([hasPermission, inMarket]) =>
			{
				this.canPublish = hasPermission && inMarket;
			});
	}

	private getSortList(): ITreeSortList
	{
		var sortList: ITreeSortList = { pointList: [], choiceList: [] } as ITreeSortList;

		this.currentTree.version.groups.forEach(group =>
		{
			group.subGroups.forEach(subGroup =>
			{
				subGroup.points.forEach(point =>
				{
					if (point.sortChanged)
					{
						sortList.pointList.push(this.mapDTreePointToDto(point));
					}

					if (point.choices.length > 0)
					{
						let choiceSortChanged = point.choices.find(x => x.sortChanged == true);

						if (choiceSortChanged)
						{
							let choiceItems = this.mapDTreeChoiceToDto(point.choices);

							choiceItems.forEach(choiceItem =>
							{
								sortList.choiceList.push(choiceItem);
							});
						}
					}
				});
			});
		});

		return sortList;
	}

	private mapDTreePointToDto(point: IDTPoint): PhdApiDto.IDTreePointDto
	{
		return {
			id: point.id,
			treeVersionId: point.treeVersionId,
			description: point.description,
			divPointCatalogId: point.divPointCatalogId,
			hasPointToPointRules: point.hasPointToPointRules,
			hasPointToChoiceRules: point.hasPointToChoiceRules,
			hasUnusedChoices: point.hasUnusedChoices,
			isStructuralItem: point.isStructuralItem,
			isQuickQuoteItem: point.isQuickQuoteItem,
			label: point.label,
			pointPickTypeId: point.pointPickTypeId,
			pointPickTypeLabel: point.pointPickTypeLabel,
			sortOrder: point.sortOrder,
			subGroupId: point.subGroupId,
			choices: this.mapDTreeChoiceToDto(point.choices)
		} as PhdApiDto.IDTreePointDto;
	}

	private mapDTreeChoiceToDto(choices: Array<IDTChoice>): Array<PhdApiDto.IDTreeChoiceDto>
	{
		return choices.map<PhdApiDto.IDTreeChoiceDto>(choice =>
		{
			return {
				id: choice.id,
				treeVersionId: choice.treeVersionId,
				description: choice.description,
				divChoiceCatalogId: choice.divChoiceCatalogId,
				hasChoiceRules: choice.hasChoiceRules,
				hasOptionRules: choice.hasOptionRules,
				hasAttributes: choice.hasAttributes,
				hasLocations: choice.hasLocations,
				imagePath: choice.imagePath,
				hasImage: choice.hasImage,
				isDecisionDefault: choice.isDecisionDefault,
				isSelectable: choice.isSelectable,
				label: choice.label,
				sortOrder: choice.sortOrder,
				treePointId: choice.treePointId,
				choiceMaxQuantity: choice.maxQuantity
			};
		});
	}

	private async showConfirmModal(body: string, title: string, defaultButton: string, primaryButton?: { hide: boolean, text: string }, secondaryButton?: { hide: boolean, text: string }): Promise<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		if (primaryButton)
		{
			confirm.componentInstance.primaryButton = primaryButton;
		}

		if (secondaryButton)
		{
			confirm.componentInstance.secondaryButton = secondaryButton;
		}

		return confirm.result.then((result) =>
		{
			return result === 'Continue';
		});
	}

	private clearTreeVersions()
	{
		this.treeVersions = [];

		this._treeService.currentTreeVersionId$.next(null);
	}

	closeModal()
	{
		this.modalReference.close();
	}
}
