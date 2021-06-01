import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';

import { SidePanelComponent } from '../../../shared/components/side-panel/side-panel.component';

import { DSubGroup } from '../../../shared/models/subgroup.model';
import { DGroup } from '../../../shared/models/group.model';
import { DPoint } from '../../../shared/models/point.model';

import { NationalService } from '../../../core/services/national.service';

@Component({
    selector: 'national-catalog-reactivate-component',
    templateUrl: './national-catalog-reactivate.component.html',
    styleUrls: ['./national-catalog-reactivate.component.scss']
})
export class NationalCatalogReactivateComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

    @Output() onSidePanelClose = new EventEmitter<boolean>();
    @Input() sidePanelOpen: boolean = false;
	    
    isOpen: boolean = true;
    isSaving: boolean = false;

	@Input() inactiveItems: Array<DGroup | DSubGroup | DPoint> = [];
	@Input() itemType: string;

	@Output() onSaveReactivateItems = new EventEmitter<Array<DGroup | DSubGroup | DPoint>>();
		
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

    constructor(private _natService: NationalService) { }

    ngOnInit()
    {
		
	}
			
    onCloseSidePanel(status: boolean)
    {
        this.onSidePanelClose.emit(status);
	}

	toggleSidePanel()
	{
		this.sidePanel.toggleSidePanel();
	}

	updateList(item: DGroup | DSubGroup | DPoint)
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
