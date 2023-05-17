import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';

import { FinancialCommunityViewModel, HomeSiteViewModel, PlanViewModel, ITag } from '../../../shared/models/plan-assignment.model';
import { SidePanelComponent } from 'phd-common';

@Component({
	selector: 'plan-assignment-side-panel-component',
	templateUrl: './plan-assignment-side-panel.component.html',
	styleUrls: ['./plan-assignment-side-panel.component.scss']
})
export class PlanAssignmentSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;

    @Input() saving: boolean;
	@Input() selectedPlan: PlanViewModel;
	@Input() selectedCommunity: FinancialCommunityViewModel;

	@Output() onAssignPlanLot = new EventEmitter<Array<ITag>>();

	selectedItems: Array<ITag> = [];
	filteredLotTags: Array<ITag> = [];
	filteredPlans: Array<PlanViewModel> = [];
	selectedLotTags: Array<number> = [];
	sidePanelLots: Array<HomeSiteViewModel> = [];
	sidePanelPlans: Array<PlanViewModel> = [];

    isOpen: boolean = true;

    planAssignmentForm: FormGroup;

	get isDirty(): boolean {
		return this.planAssignmentForm.dirty;
	}

    get canSave(): boolean
    {
        return this.planAssignmentForm.pristine || !this.planAssignmentForm.valid || this.saving;
    }

	get sidePanelSubheader(): string
	{
		return `Plan: ${this.selectedPlan ? this.selectedPlan.displayName : "No Plan Selected" }`;
	}

	get notFoundLabel(): string {
		let label = '';
		if (this.selectedItems.length === 0 && this.filteredLotTags.length === 0) {
			label = 'No Homesites Found';
		}
		return label;
	}

	get selectLotClass(): string
	{
		let lotClass = '';
		let classArray = ['phd-tags-1row', 'phd-tags-2row', 'phd-tags-3row', 'phd-tags-4row'];
		let itemLength = this.selectedItems.length;

		if (itemLength <= 4)
		{
			lotClass = classArray[0];
		}
		else if (itemLength > 4 && itemLength <= 8)
		{
			lotClass = classArray[1];
		}
		else if (itemLength > 8 && itemLength <= 12)
		{
			lotClass = classArray[2];
		}
		else if (itemLength > 12)
		{
			lotClass = classArray[3];
		}

		return lotClass;
	}

	get searchForItemsLabel(): string
	{
		let text = 'Homesite(s)';

		return `Unselected ${text}`;
	}

	get selectedItemsTagsLabel(): string
	{
		let text = 'Homesite(s)';

		return `Selected ${text}`;
	}
	
	constructor() { }

	ngOnInit()
    {
        this.createForm();

		let fc = this.selectedCommunity;

		let lotTags = this.selectedPlan.lots.map(l =>
		{
			return {
				id: l.commLbid,
				label: l.lotBlock
			} as ITag;
		});

		this.selectedItems = lotTags;

		this.sidePanelPlans.push(...fc.plans);

		this.showUnselectedLotsForFinancialCommunity();
    }

    createForm()
    {
        this.planAssignmentForm = new FormGroup({
            'pendingSelection': new FormControl(),
            'selectedLots': new FormControl(this.selectedItems.length > 0 ? '1' : '')
        });
    }

    setSelectedLotValue()
    {
        const control = this.planAssignmentForm.get('selectedLots');

        control.setValue(this.selectedItems.length > 0 ? '1' : '');
        control.markAsDirty();
    }

	showUnselectedLotsForFinancialCommunity() {
		const lots = this.selectedCommunity.lots;

		this.sidePanelLots = [];

		lots.forEach(l => {
			if (!this.selectedItems.some(i => i.id === l.commLbid)) {
				this.sidePanelLots.push(l);
			}
		});

		this.sidePanelLots.sort(HomeSiteViewModel.sorter);

		this.updateFilteredLotTagsFromFilteredLots();

	}

	private updateFilteredLotTagsFromFilteredLots()
	{
		this.filteredLotTags = [];
		this.selectedLotTags = [];

		this.sidePanelLots.forEach(lot =>
		{
			// filtered lot tags are the lots displayed in the list
			this.filteredLotTags.push({
				id: lot.commLbid,
				label: `${lot.lotBlock} - ${lot.lotStatusDescription}`
			});
		});
	}

	// add selected lot(s) to a plan
	addHighlightedItems()
    {
        
        for (let tagId of this.planAssignmentForm.controls['pendingSelection'].value)
        {
            console.log("tagid: ", tagId);
            var currentTag = this.filteredLotTags.filter(t => t.id === tagId);

            if (currentTag != null)
            {
                const index = this.filteredLotTags.indexOf(currentTag[0]);

                if (index !== -1)
                {
                    this.filteredLotTags.splice(index, 1);
                }
            }

            var currentLot = this.sidePanelLots.filter(l => l.commLbid === tagId);

            if (currentLot != null)
            {
                this.selectedItems.push({
                    id: currentLot[0].commLbid,
                    label: currentLot[0].lotBlock
                });

                const index = this.sidePanelLots.indexOf(currentLot[0]);

                if (index !== -1)
                {
                    this.sidePanelLots.splice(index, 1);
                }
            }
        }		

        this.selectedLotTags = [];
        this.setSelectedLotValue();
	}

	// add all lots to a plan
	addAllItems()
	{
		this.selectedLotTags = [];

		this.selectedItems.push(...this.sidePanelLots.map(t =>
		{
			return {
				id: t.commLbid,
				label: t.lotBlock
			};
		}));

		this.sidePanelLots = [];
        this.filteredLotTags = [];
        this.setSelectedLotValue();
	}

	removeAllItems() {
		this.selectedItems = [];
		this.showUnselectedLotsForFinancialCommunity();
		this.setSelectedLotValue();
	}

	// add a plan to the lot
	addItem(plan: PlanViewModel)
	{
		const id = plan.id;
		const label = this.getFormattedPlanName(plan);

		this.selectedItems.push({ id: id, label: label });
	}

	removeItem(tag: ITag) {
		const items = this.selectedItems;

		if (tag) {
			const community = this.selectedCommunity;
			const index = items.indexOf(tag);

			if (index !== -1) {
				items.splice(index, 1);
			}
			const lot = community.lots.find(l => l.commLbid === tag.id);

			if (lot) {
				this.sidePanelLots.push(lot);
				this.sidePanelLots.sort(HomeSiteViewModel.sorter);

				this.updateFilteredLotTagsFromFilteredLots();
			}


			this.setSelectedLotValue();
		}
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	onCancel() {
		this.sidePanel.toggleSidePanel();
	}

	assignPlanLot()
	{
		this.onAssignPlanLot.emit(this.selectedItems);
	}

	getFormattedPlanName(plan: PlanViewModel): string
	{
		// need to find out why we don't have lawsonNumber.  Not in this version nor in the original but it's used
		//return `${plan.name} (${plan.lawsonNumber})`;
		return `${plan.name} (${plan.id})`;
	}
}
