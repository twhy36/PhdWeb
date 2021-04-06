import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';

import { SidePanelComponent } from '../../../../shared/components/side-panel/side-panel.component';

import { DivDChoice } from '../../../../shared/models/choice.model';
import { DivDPoint } from '../../../../shared/models/point.model';

@Component({
    selector: 'divisional-catalog-reactivate-component',
    templateUrl: './divisional-catalog-reactivate.component.html',
    styleUrls: ['./divisional-catalog-reactivate.component.scss']
})
export class DivisionalCatalogReactivateComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

    @Output() onSidePanelClose = new EventEmitter<boolean>();
    @Input() sidePanelOpen: boolean = false;
	    
    isOpen: boolean = true;
    isSaving: boolean = false;

	@Input() inactiveItems: Array<DivDPoint | DivDChoice> = [];
	@Input() itemType: string;

    @Output() onSaveReactivateItems = new EventEmitter<Array<DivDPoint | DivDChoice>>();
		
    get sidePanelHeader(): string
	{
		let header = this.itemType == 'Point' ? 'Decision Point' : this.itemType;

		return `Reactivate ${header}s`;
	}

	get hasRemainingItems(): boolean
	{
		let checked = this.inactiveItems.filter(x => x.dto.isActive == true);

		return checked.length != this.inactiveItems.length;
	}

	get canSave(): boolean
	{
		let canSave = this.inactiveItems.filter(x => x.dto.isActive == true).length > 0;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = canSave;
		}

		return canSave;
	}

    saving: boolean = false;

    constructor() { }

    ngOnInit()
    {
		
	}
			
    onCloseSidePanel(status: boolean)
    {
        this.onSidePanelClose.emit(status);
	}

	toggleSidePanel(status: boolean)
	{
		this.sidePanel.toggleSidePanel(status);
	}

    updateList(item: DivDPoint | DivDChoice)
	{
		if (item)
		{
			item.dto.isActive = !item.dto.isActive;
		}
	}

    save()
    {
        this.isSaving = true;

        try
        {			
			let selectedItems = this.inactiveItems.filter(x => x.dto.isActive == true);

			this.onSaveReactivateItems.emit(selectedItems);
        }
		finally
		{
			this.saving = false;
		}
    }
}
