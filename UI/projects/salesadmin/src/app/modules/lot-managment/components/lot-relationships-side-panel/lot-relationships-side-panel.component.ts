import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { LotChoiceRuleAssoc, LotChoiceRuleAssocView, SidePanelComponent } from "phd-common";
import { MessageService } from "primeng/api";
import { PlanService } from "../../../core/services/plan.service";
import { DivisionalCatalog, DivDGroup, DivDSubGroup, DivDPoint, DivDChoice } from "../../../shared/models/divisionalCatalog.model";
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
	@Input() divChoiceCatalogs: Array<DivDChoice> = []; // Need this to view inactive choices from old rules
	@Input() divisionalCatalog: DivisionalCatalog;
	@Input() edhToPhdPlanMap: Map<number, number>;
	@Input() existingLotRelationships: Array<LotChoiceRuleAssocView>;
	@Input() saving: boolean;
	@Input() selected: LotChoiceRuleAssocView;
	@Input() selectedCommunity: FinancialCommunityViewModel;
	@Input() sidePanelOpen: boolean = false;

	lotRelationshipsForm: FormGroup;
	lotsForSelectedCommunity: Array<HomeSiteViewModel>;
	plansForSelectedCommunity: Array<PlanViewModel>;
	selectedChoiceCatalogs: Array<DivDChoice> = [];
	selectedLots: Array<HomeSiteViewModel> = [];
	selectedPlans: Array<PlanViewModel> = [];

	formControlLabels: string = 'assignedLotIds' || 'assignedPlanIds' || 'divChoiceCatalogId';
	keyword: string = '';
	searchFilters: Array<string> = ['All', 'Group', 'SubGroup', 'Decision Point', 'Choice'];
	searchResultsCount: number = 0;
	selectedSearchFilter: string = 'All';
	showSearchResults: boolean = false;

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
				divChoiceCatalog.mustHave = this.selected.mustHave;
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
		this._resetAllMatchValues(false);
	}

	keywordSearch(event: any)
	{
		// set the key search term
		this.keyword = event['keyword'].trim();
		this.selectedSearchFilter = event['searchFilter'];

		// reset everything to unmatched
		this._resetAllMatchValues(false);

		this.searchResultsCount = this._mainSearch(this.divisionalCatalog.groups, false);
		this.showSearchResults = true;
	}

	toggleMustHave(choice: DivDChoice)
	{
		choice.mustHave = !choice.mustHave;
	}

	choiceClicked(choice: DivDChoice)
	{
		if (this.selectedChoiceCatalogs.length === 0
			&& !this.doesLotRelationshipExist(choice.divChoiceCatalogID, 'choice'))
		{
			choice.mustHave = false;
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

	removeChoice(choice: DivDChoice)
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

	isGroupInterface(arg: any): arg is DivDGroup
	{
		return arg.dGroupCatalogID !== undefined;
	}

	isSubGroupInterface(arg: any): arg is DivDSubGroup
	{
		return arg.dSubGroupCatalogID !== undefined;
	}

	isPointInterface(arg: any): arg is DivDPoint
	{
		return arg.dPointCatalogID !== undefined;
	}

	isChoiceInterface(arg: any): arg is DivDChoice
	{
		return arg.divChoiceCatalogID !== undefined;
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

	// recursively searches groups/subgroups/points/choices
	private _mainSearch = (items: Array<DivDGroup | DivDSubGroup | DivDPoint | DivDChoice>, inheritMatch: boolean): number =>
	{
		let count = 0;
		const isFilteredGroup = this._isFiltered('Group');
		const isFilteredSubGroup = this._isFiltered('SubGroup');
		const isFilteredPoint = this._isFiltered('Decision Point');
		const isFilteredChoice = this._isFiltered('Choice');
		const isNotFiltered = !(isFilteredGroup || isFilteredSubGroup || isFilteredPoint || isFilteredChoice);

		if (items != null)
		{
			items.forEach(i =>
			{
				if (this.isGroupInterface(i))
				{
					if (i.subGroups.length > 0)
					{
						// check for match if no filter has been selected OR filter by group has been selected
						if ((isNotFiltered || isFilteredGroup) && this._isMatch(i.dGroupLabel, this.keyword))
						{
							count++;
							i.matched = true;
							// expand group to show everything in it
							i.open = true;
							// match found so show everything under this group by setting 2nd parm to true (inheritMatch)
							count += this._mainSearch(i.subGroups as Array<DivDSubGroup>, true);
						}
						else
						{
							// check for a match in subgroups
							const c = this._mainSearch(i.subGroups as Array<DivDSubGroup>, false);
							// match and expand group to show everything in it if match count > 0
							i.matched = c > 0;
							i.open = c > 0;
							count += c;
						}
					}
					else
					{
						// the group does not have any subgroups so set matched to false
						i.matched = false;
					}
				}
				else if (this.isSubGroupInterface(i))
				{
					if (i.points.length > 0)
					{
						// check for match if no filter has been selected OR filter by subgroup has been selected
						// automatically set subgroup matched to true if the group matches (inheritMatch is true)
						if (((isNotFiltered || isFilteredSubGroup) && this._isMatch(i.dSubGroupLabel, this.keyword)) || inheritMatch)
						{
							count++;
							i.matched = true;
							// expand subgroup to show everything in it
							i.open = true;
							// show everything under this subgroup by setting 2nd parm to true (inheritMatch)
							count += this._mainSearch(i.points as Array<DivDPoint>, true);
						}
						else
						{
							// check for a match in decision points
							const c = this._mainSearch(i.points as Array<DivDPoint>, false);
							// match and expand subgroup to show everything in it if match count > 0
							i.matched = c > 0;
							i.open = c > 0;
							count += c;
						}
					}
					else
					{
						// the subgroup does not have any decision points so set matched to false
						i.matched = false;
					}
				}
				else if (this.isPointInterface(i))
				{
					if (i.choices.length > 0)
					{
						// check for match if no filter has been selected OR filter by decision point has been selected
						// automatically set decision point matched to true if the subgroup matches (inheritMatch is true)
						if (((isNotFiltered || isFilteredPoint) && this._isMatch(i.dPointLabel, this.keyword)) || inheritMatch)
						{
							count++;
							i.matched = true;
							// expand decision point to show everything in it
							i.open = true;
							// show everything under this decision point by setting 2nd parm to true (inheritMatch)
							count += this._mainSearch(i.choices as Array<DivDChoice>, true);
						}
						else
						{
							// check for a match in choices
							const c = this._mainSearch(i.choices as Array<DivDChoice>, false);
							// match and expand decision point to show everything in it if match count > 0
							i.matched = c > 0;
							i.open = c > 0;
							count += c;
						}
					}
					else
					{
						// the decision point does not have any choices so set matched to false
						i.matched = false;
					}
				}
				else if (this.isChoiceInterface(i))
				{
					// check for match if no filter has been selected OR filter by choice has been selected
					// automatically set choice matched to true if the decision point matches (inheritMatch is true)
					if (((isNotFiltered || isFilteredChoice) && this._isMatch(i.choiceLabel, this.keyword)) || inheritMatch)
					{
						count++;
						i.matched = true;
					}
					else
					{
						// choice does not match
						i.matched = false;
					}
				}
			});
		}
		return count;
	}

	private _isMatch = (label: string, keyword: string): boolean =>
	{
		return label.toLowerCase().indexOf(keyword.toLowerCase()) >= 0;
	}

	private _isFiltered(filterType: string)
	{
		let filtered = false;

		if (this.selectedSearchFilter === filterType || this.selectedSearchFilter === 'All')
		{
			filtered = true;
		}

		return filtered;
	}

	private _resetAllMatchValues(value: boolean)
	{
		this.showSearchResults = false;
		this.searchResultsCount = 0;

		this.divisionalCatalog.groups.forEach(gp =>
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
						});
					}
				});
			}
		});
	}
}
