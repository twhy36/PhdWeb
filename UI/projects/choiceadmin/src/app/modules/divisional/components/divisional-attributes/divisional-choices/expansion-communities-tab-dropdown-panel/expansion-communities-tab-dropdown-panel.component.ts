import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { isEqual } from 'lodash';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DivisionalService } from '../../../../../core/services/divisional.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { DivChoiceCatalogMarketImage, DivisionalChoice, isDivChoiceCatalogMarketImage } from '../../../../../shared/models/divisional-catalog.model';
import { IFinancialCommunity } from '../../../../../shared/models/financial-community.model';

@Component({
	selector: 'expansion-communities-tab-dropdown-panel',
	templateUrl: './expansion-communities-tab-dropdown-panel.component.html',
	styleUrls: ['./expansion-communities-tab-dropdown-panel.component.scss']
})
export class ExpansionCommunitiesTabDropdownPanelComponent implements OnInit {
	@Input() community: IFinancialCommunity;
	@Input() choice: DivisionalChoice;
	@Input() isReadOnly: boolean;

	@Output() onDataChange = new EventEmitter();

	choiceAssociations: DivisionalChoice;
	canAssociate: boolean = false;
	isSaving: boolean = false;

	selectedImages: DivChoiceCatalogMarketImage[] = [];

	origSelectedImages: DivChoiceCatalogMarketImage[] = [];

	constructor(private _divService: DivisionalService,
		private _msgService: MessageService,
		private _orgService: OrganizationService) { }

	ngOnInit(): void {
		// Update the community with its org ID
		this._orgService.getOrgsForCommunities(this.community.marketId, [this.community.id])
			.pipe(finalize(() => {
				this.getAssociations();
			}))
			.subscribe(orgs => {
				this.community.orgId = orgs.find(o => o.financialCommunityId === this.community.id)?.orgId;
			});

	}

	isItemSelected(item: DivChoiceCatalogMarketImage): boolean {
		let isSelected = false;

		if (isDivChoiceCatalogMarketImage(item)) {
			isSelected = this.selectedImages.some(s => s.divChoiceCatalogMarketImageID === item.divChoiceCatalogMarketImageID);
		}

		return isSelected;
	}

	setItemSelected(item: DivChoiceCatalogMarketImage, isSelected: boolean): void {
		let selectedItems = [];
		let index = 0;

		if (isDivChoiceCatalogMarketImage(item)) {
			selectedItems = this.selectedImages;
			item = item as DivChoiceCatalogMarketImage;
			index = selectedItems.findIndex(s => s.divChoiceCatalogMarketImageID === item.divChoiceCatalogMarketImageID);
		}

		if (isSelected && index < 0) {
			selectedItems.push(item);
		}
		else if (!isSelected && index >= 0) {
			selectedItems.splice(index, 1);
			selectedItems = [...selectedItems];
		}

		this.canAssociate = !isEqual(this.selectedImages, this.origSelectedImages);
	}

	getAssociations() {
		if (this.community.orgId) {
			this.choiceAssociations = new DivisionalChoice();

			forkJoin(this._divService.getDivChoiceCatalogMarketImages(this.choice.divChoiceCatalogId),
				this._divService.getDivChoiceCatalogCommunityImagesByOrgId(this.community.orgId))
				.subscribe(([marketImages, communityImages]) => {
					this.choiceAssociations.divChoiceCatalogMarketImages = marketImages;

					marketImages.forEach(mImg => {
						if (communityImages.findIndex(ci => ci.divChoiceCatalogMarketImageID === mImg.divChoiceCatalogMarketImageID) > -1) {
							this.selectedImages.push(mImg);
							this.origSelectedImages.push(mImg);
						}
					});
				});
		}
	}

	associateItems() {
		this.isSaving = true;

		this._msgService.add({ severity: 'info', summary: 'Associations', detail: `Saving selected associations!` });

		this._divService.associateChoiceItemsToCommunity(this.choice.divChoiceCatalogId, this.community.marketId, this.community.orgId, this.selectedImages)
			.pipe(finalize(() => {
				this.canAssociate = false;
				this.isSaving = false;

				this.onDataChange.emit();
			}))
			.subscribe(() => {
				this._msgService.add({ severity: 'success', summary: 'Associations', detail: `Updated successfully!` });
			}, () => {
				this._msgService.add({ severity: 'error', summary: 'Associations', detail: `An error has occured!` });
			});
	}

	onLoadImageError(event: any) {
		event.srcElement.src = 'assets/pultegroup_logo.jpg';
	}
}
