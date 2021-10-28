import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { PhdTableComponent } from "phd-common";
import { MessageService } from "primeng/api";
import { combineLatest } from "rxjs";
import { switchMap } from "rxjs/operators";
import { CatalogService } from "../../../core/services/catalog.service";
import { HomeSiteService } from "../../../core/services/homesite.service";
import { OrganizationService } from "../../../core/services/organization.service";
import { PlanService } from "../../../core/services/plan.service";
import { DivChoiceCatalog } from "../../../shared/models/choice.model";
import { FinancialMarket } from "../../../shared/models/financialMarket.model";
import { LotChoiceRuleAssoc, LotChoiceRuleAssocView } from "../../../shared/models/lotChoiceRule.model";
import { FinancialCommunityViewModel, HomeSiteViewModel, PlanViewModel } from "../../../shared/models/plan-assignment.model";
import { UnsubscribeOnDestroy } from "../../../shared/utils/unsubscribe-on-destroy";

@Component({
	selector: 'lot-relationships',
	templateUrl: './lot-relationships.component.html',
	styleUrls: ['./lot-relationships.component.scss']
})
export class LotRelationshipsComponent extends UnsubscribeOnDestroy implements OnInit
{
	canEdit: boolean = false;
	currentMarket: FinancialMarket;
	divChoiceCatalogs: Array<DivChoiceCatalog>;
	edhToPhdPlanMap: Map<number, number> = new Map<number, number>();
	isSaving: boolean = false;
	lotRelationships: LotChoiceRuleAssoc[];
	lotRelationshipsToDisplay: LotChoiceRuleAssocView[] = new Array<LotChoiceRuleAssocView>();
	orgId: number;
	selected: LotChoiceRuleAssocView;
	selectedCommunity: FinancialCommunityViewModel;
	sidePanelOpen: boolean = false;

	getChoiceName(divChoiceCatalogID: number): string
	{
		return this.divChoiceCatalogs.find(dcc => dcc.divChoiceCatalogID === divChoiceCatalogID)?.choiceLabel ?? divChoiceCatalogID.toString();
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
			switchMap(comm =>
			{
				this.selectedCommunity = null;
				this.divChoiceCatalogs = [];
				this.lotRelationships = [];
				if (comm)
				{
					this.selectedCommunity = new FinancialCommunityViewModel(comm);
				
					return combineLatest([
						this._catalogService.getDivChoiceCatalogsByMarketId(comm.marketId),
						this._homeSiteService.getCommunityHomeSites(comm.id),
						this._homeSiteService.getLotChoiceRuleAssocs(comm.marketId),
						this._orgService.getInternalOrgs(comm.marketId),
						this._planService.getCommunityPlans(comm.id)
					]);
				}
			}),
			switchMap(([choices, lots, assocs, orgs, commPlans]) =>
			{
				this.divChoiceCatalogs = choices;
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
			this.processLotRelationshipsToBeDisplayed();
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
				this.processLotRelationshipsToBeDisplayed();
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
							this.processLotRelationshipsToBeDisplayed();
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
					this.processLotRelationshipsToBeDisplayed();
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

	private processLotRelationshipsToBeDisplayed()
	{
		this.lotRelationshipsToDisplay = [];
		// Sort so table remains in same order
		this.lotRelationships.sort((a, b) => (a.edhLotId + a.divChoiceCatalogId) - (b.edhLotId + b.divChoiceCatalogId));
		this.lotRelationships.forEach(assoc =>
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
						divChoiceCatalogId: assoc.divChoiceCatalogId,
						mustHave: assoc.mustHave,
					} as LotChoiceRuleAssocView
				);
			}
		});

		// Set a planId grouping string to be displayed in table
		this.lotRelationshipsToDisplay.forEach(assoc =>
		{
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