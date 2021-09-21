import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { cloneDeep, orderBy } from 'lodash';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { finalize, take } from 'rxjs/operators';
import { ConfirmModalComponent } from '../../../../../core/components/confirm-modal/confirm-modal.component';
import { AttributeService } from '../../../../../core/services/attribute.service';
import { DivisionalService } from '../../../../../core/services/divisional.service';
import { UnsubscribeOnDestroy } from '../../../../../shared/classes/unsubscribeOnDestroy';
import { AttributeGroupMarket } from '../../../../../shared/models/attribute-group-market.model';
import { DivChoiceCatalogAttributeGroupCommunity, DivChoiceCatalogAttributeGroupMarket, DivisionalChoice } from '../../../../../shared/models/divisional-catalog.model';
import { IFinancialMarket } from '../../../../../shared/models/financial-market.model';
import { DivisionalAttributesComponent } from '../../divisional-attributes/divisional-attributes.component';

@Component({
	selector: 'expansion-choice-attribute-groups-tab-panel',
	templateUrl: './expansion-attribute-groups-tab-panel.component.html',
	styleUrls: ['./expansion-attribute-groups-tab-panel.component.scss']
})
export class ExpansionChoiceAttributeGroupsTabPanelComponent extends UnsubscribeOnDestroy implements OnChanges
{
	@Input() choice: DivisionalChoice;
	@Input() groups: Array<DivChoiceCatalogAttributeGroupMarket>;
	@Input() isReadOnly: boolean;

	@Output() onAssociate = new EventEmitter<{ choice: DivisionalChoice, groups: Array<AttributeGroupMarket>, callback: (grp: Array<any>) => void; }>();
	@Output() onDisassociate = new EventEmitter();
	@Output() onAssociateToCommunities = new EventEmitter<{ choice: DivisionalChoice, groups: Array<AttributeGroupMarket>, communityGroups: DivChoiceCatalogAttributeGroupCommunity[], marketId: number, callback: () => void; }>();

	selectedGroups: Array<DivChoiceCatalogAttributeGroupMarket> = [];
	isSaving: boolean = false;

	get saveDisabled(): boolean
	{
		return !this.selectedGroups.length || this.isSaving;
	}

	get selectedMarket(): IFinancialMarket
	{
		return this._divAttrComp.selectedMarket;
	}

	constructor(private _attrService: AttributeService,
		private cd: ChangeDetectorRef,
		private _divAttrComp: DivisionalAttributesComponent,
		private _divService: DivisionalService,
		private _modalService: NgbModal,
		private _msgService: MessageService)
	{
		super();
	}

	ngOnChanges(changes: SimpleChanges)
	{
		if (changes['groups'])
		{
			// The grid will momentarily show empty values, so show a placeholder until the data loads
			if (this.groups.find(g => !g.groupName))
			{
				this.groups = this.groups.map(g =>
				{
					g.groupName = 'Loading...';

					return g;
				});
			}

			// Assign values from EDH for missing properties to each group
			this._attrService.getAttributeGroupMarketForIds(this.groups.map(g => g.attributeGroupMarketId))
				.pipe(finalize(() =>
				{
					// Force the table to update with the added labels, etc.
					this.cd.detectChanges();
				}))
				.subscribe(attributeGroupMarkets =>
				{
					// Convert the groups to an AttributeGroupMarket type
					this.groups = this.groups.map(g =>
					{
						const agm = attributeGroupMarkets.find(agm => agm.id === g.attributeGroupMarketId);

						if (agm)
						{
							g.id = g.attributeGroupMarketId;
							g.groupName = agm.groupName;
							g.groupLabel = agm.groupLabel;
							g.description = agm.description;
							g.attributeGroupMarketTags = agm.attributeGroupMarketTags;
						}

						return g;
					});
				});
		}
	}

	/**
	 * Handles the click event on the Add Group button.
	 */
	onAddGroup(): void
	{
		let cb = (grp: Array<AttributeGroupMarket>) =>
		{
			// Convert the returned array
			let converted = grp.map(g =>
			{
				return {
					id: g.id,
					attributeGroupMarketId: g.id,
					groupName: g.groupName,
					groupLabel: g.groupLabel,
					description: g.description,
					attributeGroupMarketTags: g.attributeGroupMarketTags
				} as DivChoiceCatalogAttributeGroupMarket;
			});

			this.choice.hasAttributeLocationAssoc = true;
			this.choice.divChoiceCatalogMarketAttributes$ = of(converted);
		};

		this.onAssociate.emit({ choice: this.choice, groups: this.groups, callback: cb });
	}

	/**
	 * Handles the click event on the Remove Groups button.
	 */
	onRemoveGroups()
	{
		let singlePlural = this.selectedGroups.length > 1 ? `these Attribute Groups` : `this Attribute Group`;
		let msgBody = `Are you sure you want to <span class="font-weight-bold text-danger">remove</span> ${singlePlural}?<br><br> `;

		msgBody += `<div class="phd-modal-item-list">`;

		this.selectedGroups.forEach(group =>
		{
			msgBody += `<span class="font-weight-bold">${group.groupName}</span>`;
		});

		msgBody += `</div>`;
		msgBody += `<br>Do you wish to continue?`;

		let confirm = this._modalService.open(ConfirmModalComponent, { centered: true });

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Continue';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this.removeGroups();
			}
		}, (reason) =>
		{

		});
	}

	/**
	 * Removes attribute groups from the choice.
	 */
	removeGroups(): void
	{
		this.isSaving = true;

		let groupOrders = this.selectedGroups.map(g =>
		{
			return {
				attributeGroupId: g.attributeGroupMarketId,
				sortOrder: g.sortOrder
			};
		});

		this._attrService.updateAttributeGroupChoiceMarketAssocs(this.choice.divChoiceCatalogId, groupOrders, true).pipe(
			finalize(() =>
			{
				this.isSaving = false;
			}))
			.subscribe(option =>
			{
				this.selectedGroups.forEach(group =>
				{
					const index = this.groups.indexOf(group);

					this.groups.splice(index, 1);
				});

				if (this.groups.length === 0)
				{
					this.choice.divChoiceCatalogMarketLocations$.pipe(take(1)).subscribe(g =>
					{
						// check to see if there are associations still attached to the option.
						this.choice.hasAttributeLocationAssoc = g.length > 0;
					});
				}

				this.selectedGroups = [];

				this.onDisassociate.emit();

				this._msgService.add({ severity: 'success', summary: 'Attribute Groups', detail: `Attribute Group(s) removed successfully!` });
			},
				error =>
				{
					this._msgService.clear();
					this._msgService.add({ severity: 'error', summary: 'Attribute Groups', detail: `An error has occured!` });
				});
	}

	/**
	 * Returns if a group is selected.
	 * @param group The group to check if it is selected.
	 */
	isGroupSelected(group: DivChoiceCatalogAttributeGroupMarket): boolean
	{
		return this.selectedGroups.some(s => s.attributeGroupMarketId === group.attributeGroupMarketId);
	}

	/**
	 * Returns if all groups are selected.
	 */
	areAllGroupsSelected(): boolean
	{
		return this.groups.length && this.selectedGroups.length === this.groups.length;
	}

	/**
	 * Toggles the selection on a single group.
	 * @param group The group to toggle.
	 * @param isSelected Whether to select the group.
	 */
	setGroupSelected(group: DivChoiceCatalogAttributeGroupMarket, isSelected: boolean): void
	{
		let index = this.selectedGroups.findIndex(s => s.attributeGroupMarketId === group.attributeGroupMarketId);

		if (isSelected && index < 0)
		{
			this.selectedGroups.push(group);

			this.selectedGroups = orderBy(this.selectedGroups, [attr => attr.groupName.toLowerCase()]);
		}
		else if (!isSelected && index >= 0)
		{
			this.selectedGroups.splice(index, 1);

			this.selectedGroups = [...this.selectedGroups];
		}
	}

	/**
	 * Toggles all groups' selection status.
	 * @param isSelected Whether to select the groups.
	 */
	toggleAllGroups(isSelected: boolean): void
	{
		this.selectedGroups = isSelected ? this.groups.slice() : [];
	}

	/**
	 * Handles the click event on the Associate Communities button.
	 */
	onAssociateCommunities(): void
	{
		// Get community groups linked to the market groups
		this._divService.getDivChoiceCatalogCommunityAttributeGroups(this.selectedGroups.map(g => g.attributeGroupMarketId)).subscribe(communityGroups =>
		{
			// Deselect all groups on callback
			let cb = () =>
			{
				this.toggleAllGroups(false);
			};

			this.onAssociateToCommunities.emit({ choice: this.choice, groups: this.selectedGroups, communityGroups: communityGroups, marketId: this.selectedMarket.id, callback: cb });
		});
	}
}
