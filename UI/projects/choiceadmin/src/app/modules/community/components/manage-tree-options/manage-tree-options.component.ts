import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable, BehaviorSubject, Subscription, from as fromPromise } from 'rxjs';
import { combineLatest, switchMap, distinctUntilChanged, flatMap, skipWhile, finalize } from 'rxjs/operators';

import * as moment from 'moment';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent } from '../../../core/components/confirm-modal/confirm-modal.component';
import { MessageService } from 'primeng/api';

import { ComponentCanNavAway } from '../../../shared/classes/component-can-nav-away.class';

import { IFinancialCommunity } from '../../../shared/models/financial-community.model';
import { IPlan } from '../../../shared/models/plan.model';
import { DTree } from '../../../shared/models/tree.model';
import { ITreeOption } from '../../../shared/models/option.model';
import { PhdApiDto } from '../../../shared/models/api-dtos.model';

import { OrganizationService } from '../../../core/services/organization.service';
import { PlanService } from '../../../core/services/plan.service';
import { TreeService } from '../../../core/services/tree.service';
import { SettingsService } from '../../../core/services/settings.service';
import { Constants, IdentityService, Permission } from 'phd-common';

import { TreeOptionsContainerComponent } from './';

@Component({
	selector: 'manage-tree-options',
	templateUrl: './manage-tree-options.component.html',
	styleUrls: ['./manage-tree-options.component.scss']
})
export class ManageTreeOptionsComponent extends ComponentCanNavAway implements OnInit, OnDestroy
{
	@ViewChild(TreeOptionsContainerComponent)
	optionsTable: TreeOptionsContainerComponent;

	treeVersion: Observable<DTree> = this._treeService.currentTree;
	currentTree: DTree = null;
	currentTreeOptions: Array<ITreeOption> = [];
	marketCommunityPlanBreadcrumb = '';

	selectedOption: ITreeOption;

	loading = new BehaviorSubject(true);
	optionDetailsSaving = false;

	currentTab = '';
	showOptionDetails = false;
	optionDetailsTitle = '';

	searchString = '';
	searchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];
	currentSearchFilter = 'All';
	showSearchFilter = false;

	sidePanelHasChanges = false;

	lockedFromChanges = false;
	canEdit = false;

	showMessages = false;
	selectedMarket$: Observable<string>;

	private observableSubscriptions: Array<Subscription> = [];

	constructor(
		private _orgService: OrganizationService,
		private _planService: PlanService,
		private _treeService: TreeService,
		private _identityService: IdentityService,
		private _settingsService: SettingsService,
		private _modalService: NgbModal,
		private _msgService: MessageService,
		private _activatedRoute: ActivatedRoute
	)
	{
		super();

		this.selectedMarket$ = this._orgService.currentFinancialMarket$;
	}

	ngOnInit()
	{
		const sub1 = this._activatedRoute.paramMap
			.pipe(
				distinctUntilChanged()
			)
			.subscribe(data =>
			{
				if (data && data.get('treeVersionId'))
				{
					const treeVersionId = parseInt(data.get('treeVersionId'), 10);

					if (this._treeService.currentTreeVersionId$.value === treeVersionId)
					{
						// we already have the current tree loaded
					}
					else
					{
						this._treeService.currentTreeVersionId$.next(treeVersionId);
					}
				}
			});

		const obs = this._treeService.currentTree.pipe(
			skipWhile(tree => !tree),
			combineLatest(this._treeService.currentTreeOptions),
			switchMap(([tree, options]) =>
			{
				return this._orgService.getFinancialCommunity(tree.commId, true).pipe(
					combineLatest(this._planService.getCommunityPlan(tree.planKey, tree.commId)),
					flatMap(([community, plan]: [IFinancialCommunity, IPlan]) =>
					{
						return [{ tree, options, community, plan }];
					})
				);
			})
		);

		const sub2 = obs.subscribe(({ tree, options, community, plan }) =>
		{
			this.currentTree = tree;

			this.checkCanEdit(tree ? tree.marketId : null);

			this.currentTreeOptions = options ? options : [];
			this.optionsTable.optionsList = this.currentTreeOptions;
			this.marketCommunityPlanBreadcrumb = `${community.market.name} > ${community.name} - ${community.number} > ${plan.planSalesName}`;

			// update local storage
			this._orgService.currentFinancialCommunity = community;

			this.loading.next(false);
		});

		this.observableSubscriptions.push(...[sub1, sub2]);
	}

	ngOnDestroy()
	{
		this.observableSubscriptions.forEach(s => s.unsubscribe());
	}

	get treeRouteLink(): string
	{
		return `/community/tree${this.currentTree ? '/' + this.currentTree.version.id : ''}`;
	}

	get isTreeInvalid(): boolean
	{
		return this.inactiveOptions.length > 0 || this.unassignedOptions.length > 0;
	}

	get optionMessages(): Array<string>
	{
		const msgs: Array<string> = [];

		if (this.unassignedOptions.length > 0)
		{
			msgs.push(this.unassignedOptionsMessage);
		}

		if (this.inactiveOptions.length > 0)
		{
			msgs.push(this.inactiveOptionsMessage);

			const inactiveOptionsWithImage = this.inactiveOptions.filter(io => io.treeLevelImageCount > 0);

			const imageCnt = inactiveOptionsWithImage.length;

			if (imageCnt > 0)
			{
				msgs.push(`${imageCnt} Inactive Option${imageCnt > 1 ? 's have' : ' has'} an image associated with it.`);
			}
		}

		return msgs;
	}

	get unassignedOptionsMessage(): string
	{
		const cnt = this.unassignedOptions.length;

		return cnt > 0 ? `${cnt} Unassigned Option${cnt > 1 ? 's have' : ' has'} to be mapped.` : '';
	}

	get inactiveOptionsMessage(): string
	{
		const cnt = this.inactiveOptions.length;

		return cnt > 0 ? `${cnt} Inactive Option${cnt > 1 ? 's have' : ' has'} rules associated.` : '';
	}

	get unassignedOptions(): Array<ITreeOption>
	{
		const options = this.currentTreeOptions.filter(o => !o.hasRules && !o.baseHouse);

		return options ? options : [];
	}

	get inactiveOptions(): Array<ITreeOption>
	{
		const options = this.currentTreeOptions.filter(o => !o.isActive);

		return options ? options : [];
	}

	get isReadOnly(): boolean
	{
		return !this.currentTab || this.currentTree.version.isReadOnly;
	}

	get hasChanges()
	{
		return this.sidePanelHasChanges;
	}

	get isDraft(): boolean
	{
		return this.currentTree && (this.currentTree.version.publishStartDate == null || moment.utc().isBefore(moment.utc(this.currentTree.version.publishStartDate).local()));
	}

	get titleAddon(): string
	{
		return this.isDraft ? ' - Draft' : '';
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
		return this.confirm('Discard changes?', Constants.WARNING, Constants.CANCEL);
	}

	private confirm(msg: string, title: string, defaultOption: string): Observable<boolean>
	{
		return fromPromise(this.showConfirmModal(msg, title, defaultOption));
	}

	onMessageClick(message: string)
	{
		this.currentTab = message.toLowerCase().includes('unassigned') ? 'unassignedoptions' : 'inactiveoptions';

		this.showMessages = true;
	}

	onMessagesSidePanelClose()
	{
		this.currentTab = '';
		this.showMessages = false;
	}

	onMessageItemClick(option: ITreeOption)
	{
		// scroll to point
		this.optionsTable.scrollToOption(option);

		this.showMessages = false;
	}

	onPreviewTreeClicked()
	{
		const path = `preview/${this.currentTree.version.id}`;

		const ref = window.open('', "preview", '');

		if (!ref.location.href.endsWith(path)) // just opened
		{
			const dtUrl = this._settingsService.getSettings().designToolUrl;

			ref.location.href = `${dtUrl}${path}`;
		}
		else
		{
			// was already opened -- we refresh it
			ref.location.reload();
		}

		ref.focus();
	}

	onIsBaseHouseChange(params: { option: ITreeOption, isBaseHouse: boolean })
	{
		this.optionDetailsSaving = true;

		this._treeService.saveBaseHouseOption(params.isBaseHouse, this.currentTree.version.id, params.option.id.toString())
			.pipe(finalize(() => this.optionDetailsSaving = false))
			.subscribe(response =>
			{
				params.option.baseHouse = params.isBaseHouse;
			});
	}

	onOptionSelected(params: { item: ITreeOption, tab: string })
	{
		this.currentTab = params.tab;
		this.selectedOption = params.item;
	}

	onOptionSidePanelClose()
	{
		this.selectedOption = null;
		this.sidePanelHasChanges = false;
	}

	onUpdateTreeChoiceOptionRules(params: { choices: Array<PhdApiDto.IOptionChoiceRuleChoice>, hasRules: boolean })
	{
		const groups = this.currentTree.version.groups;

		groups.forEach(group =>
		{
			if (group.subGroups.length > 0)
			{
				group.subGroups.forEach(subGroup =>
				{
					if (subGroup.points.length > 0)
					{
						subGroup.points.forEach(point =>
						{
							if (point.choices.length > 0)
							{
								// choices passed in have points attached so we can just find matching records instead of looping through all of the point.choices
								const foundPoint = params.choices.filter(x => x.pointId === point.id);

								if (foundPoint.length > 0)
								{
									foundPoint.forEach(record =>
									{
										// find the choice we need to update
										const foundChoice = point.choices.find(x => x.id === record.choiceId);

										if (foundChoice != null)
										{
											foundChoice.hasOptionRules = params.hasRules;
										}
									});
								}
							}
						});
					}
				});
			}
		});

		this._treeService.updateCurrentTree(this.currentTree);
	}

	private checkCanEdit(marketId: number)
	{
		if (!marketId)
		{
			this.canEdit = false;
		}

		this._identityService.hasClaimWithPermission('CommunityTree', Permission.Edit)
			.pipe(
				combineLatest(this._identityService.hasMarket(marketId))
			).subscribe(([hasPermission, inMarket]) =>
			{
				this.canEdit = hasPermission && inMarket;
			});
	}

	private async showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		return confirm.result.then((result) =>
		{
			return result === Constants.CONTINUE;
		});
	}
}
