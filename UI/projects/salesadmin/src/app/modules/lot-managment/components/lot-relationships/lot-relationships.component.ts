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
import { LotChoiceRuleAssoc } from "../../../shared/models/lotChoiceRule.model";
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
	orgId: number;
	selected: LotChoiceRuleAssoc;
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

	getPlanName(planId: number): string
	{
		return this.selectedCommunity.plans.find(p => p.id === this.getEdhPlanId(planId))?.displayName;
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
			})
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

	deleteRelationship(relationship: LotChoiceRuleAssoc)
	{
		this._homeSiteService.deleteLotChoiceRuleAssoc(relationship.lotChoiceRuleAssocId).subscribe((deleted) =>
		{
			if (deleted)
			{
				this.lotRelationships = this.lotRelationships.filter(r => r.lotChoiceRuleAssocId !== relationship.lotChoiceRuleAssocId);
			}
		})
	}

	onSave(associations: Array<LotChoiceRuleAssoc>)
	{
		let startSize = this.lotRelationships.length;
		associations.forEach(assoc =>
		{
			this._homeSiteService.saveLotChoiceRuleAssoc(assoc).subscribe(association =>
			{
				this.lotRelationships.push(association);
				if (associations.length === (this.lotRelationships.length - startSize))
				{
					
					this._msgService.add({ severity: 'success', summary: 'Lot Rule Association' , detail: 'Save successful.' });
					this.isSaving = false;
					this.sidePanelOpen = false;
				}
			}, (error =>
			{
				
				this._msgService.add({ severity: 'error', summary: 'Lot Rule Association' , detail: 'Server error. Save unsuccessful.' });
				this.isSaving = false;
				this.sidePanelOpen = false;
			}));
		});
	}

	toggleMustHave(relationship: LotChoiceRuleAssoc)
	{
		const assoc = {
			lotChoiceRuleAssocId: relationship.lotChoiceRuleAssocId,
			edhLotId: relationship.edhLotId,
			planId: relationship.planId,
			divChoiceCatalogId: relationship.divChoiceCatalogId,
			mustHave: !relationship.mustHave
		} as LotChoiceRuleAssoc;
		this._homeSiteService.saveLotChoiceRuleAssoc(assoc).subscribe(association =>
			{
				relationship.mustHave = association.mustHave;
				this._msgService.add({ severity: 'success', summary: 'Lot Rule Association' , detail: 'Update successful.' })
			}), (() =>
			{
				this._msgService.add({ severity: 'error', summary: 'Lot Rule Association' , detail: 'Server error. Update unsuccessful.' });
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
}