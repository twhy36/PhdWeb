import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { SidePanelComponent } from "phd-common";
import { MessageService } from "primeng/api";
import { PlanService } from "../../../core/services/plan.service";
import { DivChoiceCatalog } from "../../../shared/models/choice.model";
import { LotChoiceRuleAssoc, LotChoiceRuleAssocView } from "../../../shared/models/lotChoiceRule.model";
import { FinancialCommunityViewModel, HomeSiteViewModel, PlanViewModel } from "../../../shared/models/plan-assignment.model";

@Component({
	selector: 'lot-relationships-side-panel',
	templateUrl: './lot-relationships-side-panel.component.html',
	styleUrls: ['./lot-relationships-side-panel.component.scss']
})
export class LotRelationshipsSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent

	@Output() onSave = new EventEmitter<LotChoiceRuleAssoc[]>();
	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() divChoiceCatalogs: Array<DivChoiceCatalog>;
	@Input() edhToPhdPlanMap: Map<number, number>;
	@Input() existingLotRelationships: Array<LotChoiceRuleAssocView>;
	@Input() saving: boolean;
	@Input() selected: LotChoiceRuleAssocView;
	@Input() selectedCommunity: FinancialCommunityViewModel;
	@Input() sidePanelOpen: boolean = false;

	lotRelationshipsForm: FormGroup;
	lotsForSelectedCommunity: Array<HomeSiteViewModel>;
	plansForSelectedCommunity: Array<PlanViewModel>;
	selectedChoiceCatalogs: Array<DivChoiceCatalog> = [];
	selectedLots: Array<HomeSiteViewModel> = [];
	selectedPlans: Array<PlanViewModel> = [];
	searchResults: Array<DivChoiceCatalog> = [];
	showSearchResults = false;

	formControlLabels = 'assignedLotIds' || 'assignedPlanIds' || 'divChoiceCatalogId';

	get isDirty(): boolean
	{
		return this.lotRelationshipsForm.dirty;
	}

	get saveDisabled(): boolean
	{
		const valuesRequired = this.selectedPlans.length > 0 && this.selectedLots.length > 0 && this.selectedChoiceCatalogs.length > 0;
		let saveDisabled = (!this.selected) ? (this.lotRelationshipsForm.pristine || !valuesRequired) : (!valuesRequired);

		return saveDisabled;
	}
	
	constructor(private _msgService: MessageService, private _planService: PlanService) { }

	ngOnInit()
	{
		if (this.selectedCommunity)
		{
			this.lotsForSelectedCommunity = this.selectedCommunity.lots;
			// only show plans that have a direct map from edh to phd
			this.plansForSelectedCommunity = this.selectedCommunity.plans.filter(p => this.edhToPhdPlanMap.get(p.id) !== null);
		}
		this.createForm();
	}

	createForm()
	{
		let assignedLotIds = null;
		let assignedPlansIds = null;

		if (this.selected)
		{
			this.selectedLots = this.lotsForSelectedCommunity.filter(l => l.dto.id === this.selected.edhLotId);
			this.lotsForSelectedCommunity = this.lotsForSelectedCommunity.filter(l => l.dto.id !== this.selected.edhLotId);
			assignedLotIds = [this.selected.edhLotId];

			const edhPlanIds = this.selected.associatedLotChoiceRules.map(rule => this.getEdhPlanId(rule.planId));
			this.selectedPlans = this.plansForSelectedCommunity.filter(p => edhPlanIds.includes(p.id));
			this.plansForSelectedCommunity = this.plansForSelectedCommunity.filter(p => !edhPlanIds.includes(p.id));

			const divChoiceCatalog = this.divChoiceCatalogs.find(c => c.divChoiceCatalogID === this.selected.divChoiceCatalogId);
			if (divChoiceCatalog)
			{
				this.selectedChoiceCatalogs.push(divChoiceCatalog);
			}
		}

		this.lotRelationshipsForm = new FormGroup({
			'assignedLotIds': new FormControl({value: assignedLotIds, disabled: this.selected !== null}, Validators.required),
			'assignedPlanIds': new FormControl(assignedPlansIds, Validators.required)
		});
	}

	addHighlightedItems(formControl: string)
	{
		const ids = this.lotRelationshipsForm.controls[formControl].value;
		const isLot = formControl === 'assignedLotIds';
		const isPlan = formControl === 'assignedPlanIds';

		if (ids)
		{
			ids.forEach(id =>
			{
				if (isLot && !this.doesLotRelationshipExist(id, 'homesite'))
				{
					this.selectedLots.push(this.lotsForSelectedCommunity.find(l => l.dto.id === id));
					this.lotsForSelectedCommunity = this.lotsForSelectedCommunity.filter(l => l.dto.id !== id);
				}
				else if (isPlan)
				{
					this.selectedPlans.push(this.plansForSelectedCommunity.find(p => p.id === id));
					this.plansForSelectedCommunity = this.plansForSelectedCommunity.filter(p => p.id !== id);
				}
			});
		}
	}

	addAllItems(formControl: string)
	{
		const isLot = formControl === 'assignedLotIds';
		const isPlan = formControl === 'assignedPlanIds';

		if (isLot)
		{
			if (this.lotsForSelectedCommunity.length > 0)
			{
				this.lotRelationshipsForm.markAsDirty();
			}

			const existingLotsOnRules = [];
			this.lotsForSelectedCommunity.forEach(lot =>
			{
				if (this.doesLotRelationshipExist(lot.dto.id, 'homesite'))
				{
					existingLotsOnRules.push(lot);
				}
				this.selectedLots.push(lot);
			})
			this.lotsForSelectedCommunity = existingLotsOnRules;
		}
		else if (isPlan)
		{
			if (this.plansForSelectedCommunity.length > 0)
			{
				this.lotRelationshipsForm.markAsDirty();
			}
			this.selectedPlans = this.selectedCommunity.plans.filter(p => this.edhToPhdPlanMap.get(p.id) !== null);
			this.plansForSelectedCommunity = [];
		}
	}

	removeAllItems(formControl: string)
	{
		const isLot = formControl === 'assignedLotIds';
		const isPlan = formControl === 'assignedPlanIds';

		if (isLot)
		{
			this.lotsForSelectedCommunity = this.selectedCommunity.lots;
			this.selectedLots = new Array<HomeSiteViewModel>();
		}
		else if (isPlan)
		{
			this.plansForSelectedCommunity = this.selectedCommunity.plans.filter(p => this.edhToPhdPlanMap.get(p.id) !== null);
			this.selectedPlans = new Array<PlanViewModel>();
		}
	}

	removeItem(item: any)
	{
		if (item instanceof HomeSiteViewModel)
		{
			this.lotsForSelectedCommunity.push(this.selectedLots.find(l => l.dto.id === item.dto.id));
			this.selectedLots = this.selectedLots.filter(l => l.dto.id !== item.dto.id);
			this.lotsForSelectedCommunity = this.lotsForSelectedCommunity.sort((a, b) => a.dto.id - b.dto.id);
			this.lotRelationshipsForm.markAsDirty();
		}
		else if (item instanceof PlanViewModel)
		{
			this.plansForSelectedCommunity.push(this.selectedPlans.find(p => p.id === item.id));
			this.selectedPlans = this.selectedPlans.filter(p => p.id !== item.id);
			this.plansForSelectedCommunity = this.plansForSelectedCommunity.sort((a, b) => a.id - b.id);
			this.lotRelationshipsForm.markAsDirty();
		}
	}

	clearFilter()
	{
		this.showSearchResults = false;
		this.searchResults = [];
	}

	keywordSearch(event: any)
	{
		// set the key search term
		const keyword = event['keyword'] || '';

		// reset everything
		this.showSearchResults = false;
		this.searchResults = [];

		// search the divChoiceCatalogs
		this.searchResults = this.divChoiceCatalogs.filter(c => c.choiceLabel.toLowerCase().includes(keyword.toLowerCase()));

		this.showSearchResults = true;
	}

	toggleMustHave(choice: DivChoiceCatalog)
	{
		choice.mustHave = !choice.mustHave;
	}

	choiceClicked(choice: DivChoiceCatalog)
	{
		if (this.selectedChoiceCatalogs.length === 0
			&& this.selectedChoiceCatalogs.findIndex(r => r.divChoiceCatalogID === choice.divChoiceCatalogID) === -1
			&& !this.doesLotRelationshipExist(choice.divChoiceCatalogID, 'choice'))
		{
			this.selectedChoiceCatalogs.push(choice);
		}
		else if (this.selectedChoiceCatalogs.length === 1 && this.selectedChoiceCatalogs.some(c => c.divChoiceCatalogID === choice.divChoiceCatalogID))
		{
			this._msgService.add({ severity: 'info', summary: 'Lot Rule Association' , detail: 'This choice has already been selected.' });
		}
		else if (this.selectedChoiceCatalogs.length === 1)
		{
			this._msgService.add({ severity: 'info', summary: 'Lot Rule Association' , detail: 'You may only add one choice. Please create another rule to add another choice.' });
		}
	}

	removeChoice(choice: DivChoiceCatalog)
	{
		this.selectedChoiceCatalogs = this.selectedChoiceCatalogs.filter(c => c.divChoiceCatalogID !== choice.divChoiceCatalogID);
	}

	save()
	{
		const lotRelationships: LotChoiceRuleAssoc[] = [];
		this.selectedChoiceCatalogs.forEach(choice =>
		{
			this.selectedLots.forEach(lot =>
			{
				this.selectedPlans.forEach(plan =>
				{
					const assoc = this.selected ? this.selected.associatedLotChoiceRules.find(rule =>
						rule.divChoiceCatalogId === choice.divChoiceCatalogID &&
						rule.edhLotId === lot.dto.id &&
						rule.planId === this.edhToPhdPlanMap.get(plan.id)) : null;
					// Add existing association to lotRelationships list
					if (assoc)
					{
						assoc.mustHave = choice.mustHave;
						lotRelationships.push(assoc);
					}
					// Association does not exist, then add it to lotRelationships list
					else
					{
						const newAssoc =
						{
							edhLotId: lot.dto.id,
							planId: this.edhToPhdPlanMap.get(plan.id), // Get the PHD plan ID
							divChoiceCatalogId: choice.divChoiceCatalogID,
							mustHave: choice.mustHave
						} as LotChoiceRuleAssoc;
						lotRelationships.push(newAssoc);
					}
				});
			});
		});
		
		this.onSave.emit(lotRelationships);
		this.saving = true;
	}

	onCancel()
	{
		this.sidePanel.toggleSidePanel();
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
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

	private doesLotRelationshipExist(id: number, type: string)
	{
		let relationshipExists = false;
		if (type === 'homesite')
		{
			this.selectedChoiceCatalogs.forEach(choice =>
			{
				const lotRelationship = this.existingLotRelationships.find(lr => lr.edhLotId === id && choice.divChoiceCatalogID === lr.divChoiceCatalogId);
				if (lotRelationship)
				{
					relationshipExists = true;
					const homesiteLotBlock = this.lotsForSelectedCommunity.find(l => l.dto.id === id)?.dto.lotBlock;
					const homesiteErrorMessage = `Homesite: ${homesiteLotBlock} & Choice: ${choice.choiceLabel} relationship already exists. Please edit existing relationship.`;
					this._msgService.add({ severity: 'error', summary: 'Lot Rule Association' , detail: homesiteErrorMessage });
				}
			});
		}
		else if (type === 'choice')
		{
			this.selectedLots.forEach(lot =>
			{
				const lotRelationship = this.existingLotRelationships.find(lr => lr.edhLotId === lot.dto.id && lr.divChoiceCatalogId === id);
				if (lotRelationship)
				{
					relationshipExists = true;
					const choiceName = this.divChoiceCatalogs.find(c => c.divChoiceCatalogID === id)?.choiceLabel;
					const choiceErrorMessage = `Choice: ${choiceName} & Homesite: ${lot.dto.lotBlock} relationship already exists. Please edit existing relationship.`;
					this._msgService.add({ severity: 'error', summary: 'Lot Rule Association' , detail: choiceErrorMessage });
				}
			});	
		}
		return relationshipExists;
	}
}