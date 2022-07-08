import { Component, OnInit, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { intersection, union } from 'lodash';
import { LotChoiceRuleAssoc, LotChoiceRuleAssocView, PhdTableComponent } from "phd-common";
import { MessageService, SelectItem } from "primeng/api";
import { combineLatest } from "rxjs";
import { filter, switchMap } from "rxjs/operators";
import { CatalogService } from "../../../core/services/catalog.service";
import { HomeSiteService } from "../../../core/services/homesite.service";
import { OrganizationService } from "../../../core/services/organization.service";
import { PlanService } from "../../../core/services/plan.service";
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { DivDChoice, DivDPoint, DivisionalCatalog } from "../../../shared/models/divisionalCatalog.model";
import { FinancialMarket } from "../../../shared/models/financialMarket.model";
import { FinancialCommunityViewModel, HomeSiteViewModel, PlanViewModel } from "../../../shared/models/plan-assignment.model";
import { UnsubscribeOnDestroy } from "../../../shared/utils/unsubscribe-on-destroy";

@Component({
	selector: 'lot-relationships',
	templateUrl: './lot-relationships.component.html',
	styleUrls: ['./lot-relationships.component.scss']
})
export class LotRelationshipsComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SearchBarComponent)
	private searchBar: SearchBarComponent;

	canEdit: boolean = false;
	currentMarket: FinancialMarket;
	divisionalCatalog: DivisionalCatalog
	divPoints: Array<DivDPoint>;
	divChoiceCatalogs: Array<DivDChoice>;
	edhToPhdPlanMap: Map<number, number> = new Map<number, number>();
	isSaving: boolean = false;
	lotRelationships: LotChoiceRuleAssoc[];
	lotRelationshipsToDisplay: LotChoiceRuleAssocView[] = new Array<LotChoiceRuleAssocView>();
	orgId: number;
	selected: LotChoiceRuleAssocView;
	selectedCommunity: FinancialCommunityViewModel;
	sidePanelOpen: boolean = false;
	selectedSearchFilter: string = 'Homesite';
	keyword: string = null;
	ruleOptions: SelectItem[] = [{ label: 'Must Have', value: 'Must Have' }, { label: 'Must Not Have', value: 'Must Not Have' }];
	ruleFilter: string[] = [];

	getChoiceName(divChoiceCatalogID: number): string
	{
		const dpLabel = this.divPoints.find(p => p.choices.map(ch => ch.divChoiceCatalogID).includes(divChoiceCatalogID))?.dPointLabel;
		const choiceLabel = this.divChoiceCatalogs.find(dcc => dcc.divChoiceCatalogID === divChoiceCatalogID)?.choiceLabel ?? divChoiceCatalogID.toString();

		return `${dpLabel} > ${choiceLabel}`;
	}

	getLotName(edhLotId: number): string
	{
		return this.selectedCommunity.lots.find(l => l.dto.id === edhLotId)?.dto.lotBlock;
	}

	getMustHave(mustHave: boolean): string
	{
		return mustHave ? 'Must Have' : 'Must Not Have';
	}

	constructor(
		private _catalogService: CatalogService,
		private _homeSiteService: HomeSiteService,
		private _msgService: MessageService,
		private _orgService: OrganizationService,
		private _planService: PlanService,
		private _route: ActivatedRoute) { super() }

	ngOnInit()
	{
		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			filter(comm => comm != null),
			switchMap(comm =>
			{
				this.selectedCommunity = null;
				this.divChoiceCatalogs = [];
				this.lotRelationships = [];

				if (comm)
				{
					this.selectedCommunity = new FinancialCommunityViewModel(comm);
					return combineLatest([
						this._catalogService.getDivisionalCatalog(comm.marketId),
						this._catalogService.getDivChoiceCatalogsByMarketId(comm.marketId),
						this._homeSiteService.getCommunityHomeSites(comm.id),
						this._homeSiteService.getLotChoiceRuleAssocs(comm.marketId),
						this._orgService.getInternalOrgs(comm.marketId),
						this._planService.getCommunityPlans(comm.id)
					]);
				}
			}),
			switchMap(([catalog, choices, lots, assocs, orgs, commPlans]) =>
			{
				this.divisionalCatalog = catalog;
				this.divChoiceCatalogs = choices;
				if (this.divisionalCatalog)
				{
					this.divPoints = this.divisionalCatalog.groups
						.map(g => g.subGroups).reduce((a, b) => a.concat(b))
						.map(sg => sg.points).reduce((a, b) => a.concat(b));

					const activeChoices = this.divPoints
						.map(p => p.choices).reduce((a, b) => a.concat(b));
					this.divChoiceCatalogs = this.divChoiceCatalogs.concat(activeChoices);
				}
				this.orgId = orgs?.find(o => o.edhFinancialCommunityId === this.selectedCommunity.dto.id)?.orgID;

				// Filter lots and plans
				this.selectedCommunity.lots = lots.filter(l => l.lotStatusDescription !== "Closed").map(l => new HomeSiteViewModel(l, this.selectedCommunity.dto)).sort(HomeSiteViewModel.sorter);
				this.selectedCommunity.plans = commPlans.map(p => new PlanViewModel(p, this.selectedCommunity)).sort(PlanViewModel.sorter);

				// Find assocs for this community
				const lotIds = lots.map(l => l.id);
				this.lotRelationships = assocs.filter(a => lotIds.some(id => id === a.edhLotId));

				// Add lots to plans
				this.selectedCommunity.plans.forEach(p =>
				{
					p.lots = this.selectedCommunity.lots.filter(l => l.plans.some(lp => lp === p.id));
				});

				return this._planService.getPlans(this.orgId);
			}),
		).subscribe(plans =>
		{
			this.selectedCommunity.plans.forEach(cp =>
			{
				this.edhToPhdPlanMap.set(cp.id, plans.find(p => p.integrationKey === cp.integrationKey)?.planID ?? null);
			});
			this.filterRelationships();
		});

		this._orgService.canEdit(this._route.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	addLotRelationship()
	{
		this.selected = null;
		this.sidePanelOpen = true;
	}

	editLotRelationship(relationship: LotChoiceRuleAssocView)
	{
		this.selected = relationship;
		this.sidePanelOpen = true;
	}

	deleteLotRelationship(relationship: LotChoiceRuleAssocView)
	{
		this._homeSiteService.deleteLotChoiceRuleAssoc(relationship.associatedLotChoiceRules).subscribe(deleted =>
		{
			if (deleted)
			{
				const deletedIds = relationship.associatedLotChoiceRules.map(a => a.lotChoiceRuleAssocId);
				this.lotRelationships = this.lotRelationships.filter(r => !deletedIds.includes(r.lotChoiceRuleAssocId));
				this.filterRelationships();
				this._msgService.add({ severity: 'success', summary: 'Lot Rule Association' , detail: 'Delete successful.' });
			}
		})
	}

	onSave(rules: LotChoiceRuleAssoc[])
	{
		let deleteProcessed = true; // true by default because delete isn't always necessary
		let savedCount = 0;
		// Check if there are any rules that need to be deleted
		if (this.selected)
		{
			const rulesToBeDeleted: LotChoiceRuleAssoc[] = [];
			const lcrAssocIdList = rules.map(l => l.lotChoiceRuleAssocId);
			this.selected.associatedLotChoiceRules.forEach(lcr =>
			{
				// Delete if the selected rule is no longer in the save list
				if (!lcrAssocIdList.includes(lcr.lotChoiceRuleAssocId))
				{
					rulesToBeDeleted.push(lcr);
				}
			});
			if (rulesToBeDeleted.length > 0)
			{
				deleteProcessed = false; // rules exist to be deleted
				this._homeSiteService.deleteLotChoiceRuleAssoc(rulesToBeDeleted).subscribe(deleted =>
				{
					deleteProcessed = deleted;
					if (deleteProcessed)
					{
						const deletedIds = rulesToBeDeleted.map(r => r.lotChoiceRuleAssocId);
						this.lotRelationships = this.lotRelationships.filter(r => !deletedIds.includes(r.lotChoiceRuleAssocId));
						if (savedCount === rules.length)
						{
							this.filterRelationships();
							this._msgService.add({ severity: 'success', summary: 'Lot Rule Association' , detail: 'Save successful.' });
							this.isSaving = false;
							this.selected = null;
							this.sidePanelOpen = false;
						}
					}
				});
			}
		}

		// Save each rule
		rules.forEach(rule =>
		{
			this._homeSiteService.saveLotChoiceRuleAssoc(rule).subscribe(association =>
			{
				// If rule already existed remove, and replace with updated rule
				if (this.lotRelationships.map(lcr => lcr.lotChoiceRuleAssocId).includes(association.lotChoiceRuleAssocId))
				{
					this.lotRelationships = this.lotRelationships.filter(lr => lr.lotChoiceRuleAssocId !== association.lotChoiceRuleAssocId);
				}
				this.lotRelationships.push(association);
				savedCount++;

				// All lot choice rules have been saved and deleted
				if (savedCount === rules.length && deleteProcessed)
				{
					this.filterRelationships();
					this._msgService.add({ severity: 'success', summary: 'Lot Rule Association' , detail: 'Save successful.' });
					this.isSaving = false;
					this.selected = null;
					this.sidePanelOpen = false;
				}
			}, (error =>
			{
				this._msgService.add({ severity: 'error', summary: 'Lot Rule Association' , detail: 'Server error. Save unsuccessful.' });
				this.isSaving = false;
				this.selected = null;
				this.sidePanelOpen = false;
			}));
		});
	}

	onSidePanelClose(status: boolean)
	{
		this.sidePanelOpen = status;
	}

	showTooltip(event: any, tooltipText: string, tableComponent: PhdTableComponent): void
	{
		tableComponent.showTooltip(event, tooltipText);
	}

	hideTooltip(tableComponent: PhdTableComponent): void
	{
		tableComponent.hideTooltip();
	}

	clearFilter()
	{
		this.keyword = null;
		this.filterRelationships();
	}

	keywordSearch(event: any)
	{
		this.searchBar.keyword = this.keyword = event['keyword'].trim();
		this.filterRelationships();
	}

	onStatusChange(event: any)
	{
		this.ruleFilter = event.value;

		this.filterRelationships();
	}

	filterRelationships()
	{
		if (this.keyword || this.ruleFilter.length)
		{
			this.lotRelationshipsToDisplay = [];

			let keywordRelationships = [];
			let ruleRelationships = [];

			if (this.keyword)
			{
				let splitKeywords = this.keyword.split(' ');

				// Check for lotBlock keywords
				splitKeywords.forEach(keyword =>
				{
					if (keyword)
					{
						const filteredResults = this.lotRelationships.filter(relationship => this.searchBar.wildcardMatch(this.getLotName(relationship.edhLotId), keyword));

						keywordRelationships = union(keywordRelationships, filteredResults);
					}
				});

				// Check for choice keywords
				splitKeywords.forEach(keyword =>
				{
					if (keyword)
					{
						const filteredResults = this.lotRelationships.filter(relationship => this.searchBar.wildcardMatch(this.getChoiceName(relationship.divChoiceCatalogId), keyword));

						keywordRelationships = union(keywordRelationships, filteredResults);
					}
				});
			}

			// check for rule filter
			this.ruleFilter.forEach(rule =>
			{
				const filteredResults = this.lotRelationships.filter(relationship => rule === "Must Have" ? relationship.mustHave : !relationship.mustHave);

				ruleRelationships = union(ruleRelationships, filteredResults);
			});

			// Intersect results if there are filtered results from keywordSearch & ruleSearch, else just set the non empty results
			const searchResults = keywordRelationships.length > 0 && ruleRelationships.length > 0 ? intersection(keywordRelationships, ruleRelationships) : keywordRelationships.length > 0 ? keywordRelationships : ruleRelationships;

			this.processLotRelationshipsToBeDisplayed(searchResults);
		}
		else
		{
			// Set filtered lots to the list of lots, before the filters were set
			this.processLotRelationshipsToBeDisplayed();
		}
	}

	private processLotRelationshipsToBeDisplayed(filteredRelationships?: LotChoiceRuleAssoc[])
	{
		if (!filteredRelationships)
		{
			filteredRelationships = this.lotRelationships;
		}

		this.lotRelationshipsToDisplay = [];
		// Sort so table remains in same order
		filteredRelationships.sort((a, b) => (a.edhLotId + a.divChoiceCatalogId) - (b.edhLotId + b.divChoiceCatalogId));
		filteredRelationships.forEach(assoc =>
		{
			const existingAssoc = this.lotRelationshipsToDisplay.find(lr => lr.edhLotId === assoc.edhLotId && lr.divChoiceCatalogId === assoc.divChoiceCatalogId);
			// If view already exists add LotChoiceRule to it
			if (existingAssoc)
			{
				existingAssoc.associatedLotChoiceRules.push(assoc);
			}
			// Create View if one does not exist
			else
			{
				this.lotRelationshipsToDisplay.push(
					{
						associatedLotChoiceRules: [assoc],
						associatedPlanIds: [assoc.planId],
						lotChoiceRuleAssocIds: [assoc.lotChoiceRuleAssocId],
						edhLotId: assoc.edhLotId,
						planIdDisplay: '',
						lotIdDisplay: '',
						divChoiceCatalogId: assoc.divChoiceCatalogId,
						mustHave: assoc.mustHave,
					} as LotChoiceRuleAssocView
				);
			}
		});

		// Set a planId grouping string to be displayed in table
		this.lotRelationshipsToDisplay.forEach(assoc =>
		{
			assoc.lotIdDisplay = `${this.getLotName(assoc.edhLotId)}`;

			assoc.associatedLotChoiceRules.forEach(rule =>
			{
				if (assoc.planIdDisplay.length === 0)
				{
					assoc.planIdDisplay += this.getPlanName(rule.planId);
				}
				else
				{
					assoc.planIdDisplay += `, ${this.getPlanName(rule.planId)}`;
				}
			});
			// Sort by plan name which is the second tag on planIdDisplay
			assoc.planIdDisplay = assoc.planIdDisplay.split(',').sort((a, b) => a.trim().split(' ')[1].localeCompare(b.trim().split(' ')[1])).join(',');
		});
	}

	private getEdhPlanId(planId: number)
	{
		for (let [key, value] of this.edhToPhdPlanMap.entries())
		{
			if (value === planId)
			{
				return key;
			}
		}
		return null;
	}

	private getPlanName(planId: number): string
	{
		return this.selectedCommunity.plans.find(p => p.id === this.getEdhPlanId(planId))?.displayName;
	}
}
