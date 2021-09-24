import { Component, OnInit, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, ReplaySubject } from 'rxjs';
import { filter, map, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';

import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { Message } from 'primeng/api';

import { LocationService } from '../../../../../../core/services/location.service';

import { UnsubscribeOnDestroy } from '../../../../../../shared/classes/unsubscribeOnDestroy';

import { SidePanelComponent } from '../../../../../../shared/components/side-panel/side-panel.component';
import { AttributeGroupActionPanelComponent } from '../../../../../../shared/components/attribute-group-action-panel/attribute-group-action-panel.component';

import { LocationGroupMarket } from '../../../../../../shared/models/location-group-market.model';
import { Option } from '../../../../../../shared/models/option.model';
import { DivisionalChoice } from '../../../../../../shared/models/divisional-catalog.model';

@Component({
	selector: 'add-location-groups-side-panel',
	templateUrl: './add-location-groups-side-panel.component.html',
	styleUrls: ['./add-location-groups-side-panel.component.scss']
})
export class AddLocationGroupsSidePanelComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent;

	@ViewChild(AttributeGroupActionPanelComponent)
	private addGroupsPanel: AttributeGroupActionPanelComponent;

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;

	@Output() onSaveAssociation = new EventEmitter();
	@Input() associatedGroups$: Observable<Array<LocationGroupMarket>>;
	@Input() choice: DivisionalChoice;
	@Input() option: Option;
	@Input() callback: (grp: Array<LocationGroupMarket>) => void;

	associatedGroups: Array<LocationGroupMarket>;
	isSaving: boolean = false;

	allLocGroupsInMarket: Array<LocationGroupMarket> = [];
	locGroupsInMarket$: ReplaySubject<Array<LocationGroupMarket>>;

	errors: Array<Message> = [];

	get sidePanelHeader(): string
	{
		return 'Associate Location Groups';
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = this.isSaving || !this.addGroupsPanel || !this.addGroupsPanel.selectedGroups.length;

		if (this.sidePanel)
		{
			this.sidePanel.isDirty = !saveDisabled;
		}

		return saveDisabled;
	}

	constructor(private _modalService: NgbModal, private route: ActivatedRoute, private _locService: LocationService) { super(); }

	ngOnInit()
	{
		this.locGroupsInMarket$ = new ReplaySubject<Array<LocationGroupMarket>>(1);

		this.associatedGroups$.subscribe(grps =>
		{
			this.associatedGroups = grps;
			this.filterAssociatedLocationGroups();
		});

		this.route.parent.paramMap.pipe(
			this.takeUntilDestroyed(),
			filter(p => p.get('marketId') && p.get('marketId') != '0'),
			map(p => +p.get('marketId')),
			distinctUntilChanged(),
			switchMap(marketId => this._locService.getLocationGroupsByMarketId(marketId, true, null, null, null, null, true))
		).subscribe(data =>
		{
			this.allLocGroupsInMarket = data;
			this.filterAssociatedLocationGroups();
		});
	}

	onCloseSidePanel(status: boolean)
	{
		this.addGroupsPanel.reset();
		this.sidePanel.isDirty = false;
		this.onSidePanelClose.emit(status);
	}

	toggleSidePanel()
	{
		if (this.addGroupsPanel.selectedGroups.length)
		{
			this.sidePanel.setIsDirty();
		}

		this.sidePanel.toggleSidePanel();
	}

	filterAssociatedLocationGroups()
	{
		let groups = this.option ? this.allLocGroupsInMarket.filter(grp => !this.associatedGroups.some(x => x.id === grp.id)) : this.allLocGroupsInMarket;

		this.locGroupsInMarket$.next(groups);
	}

	saveAndClose()
	{
		this.isSaving = true;
		let groupIds = this.addGroupsPanel.selectedGroups.map(g => g.id);

		if (this.option)
		{
			this._locService.updateLocationGroupOptionMarketAssocs(this.option.id, groupIds, false).pipe(
				finalize(() =>
				{
					this.isSaving = false;
				}))
				.subscribe(option =>
				{
					if (this.callback)
					{
						this.callback(this.associatedGroups.concat(this.addGroupsPanel.selectedGroups as LocationGroupMarket[]));
					}

					this.errors = [];
					this.errors.push({ severity: 'success', detail: `Location group(s) associated.` });

					this.sidePanel.isDirty = false;

					this.sidePanel.toggleSidePanel();
				},
					error =>
					{
						this.displayErrorMessage('Failed to associate location group(s).');
					});
		}

		if (this.choice)
		{
			this._locService.updateLocationGroupChoiceMarketAssocs(this.choice.divChoiceCatalogId, groupIds, false).pipe(
				finalize(() =>
				{
					this.isSaving = false;
				}))
				.subscribe(option =>
				{
					if (this.callback)
					{
						this.callback(this.associatedGroups.concat(this.addGroupsPanel.selectedGroups as LocationGroupMarket[]));
					}

					this.errors = [];

					this.errors.push({ severity: 'success', detail: `Location group(s) associated.` });

					this.sidePanel.isDirty = false;

					this.sidePanel.toggleSidePanel();
				},
					error =>
					{
						this.displayErrorMessage('Failed to associate location group(s).');
					});
		}
	}

	displayErrorMessage(message: string)
	{
		if (message)
		{
			this.errors = [];

			this.errors.push({ severity: 'error', detail: message });
		}
	}
}
