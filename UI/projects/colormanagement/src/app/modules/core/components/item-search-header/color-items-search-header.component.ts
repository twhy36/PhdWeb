import { Component, OnInit, ViewChild } from '@angular/core';
import { UnsubscribeOnDestroy, ModalRef, ModalService } from 'phd-common';
import { IPlanCommunity, IOptionCommunity, IPlanOptionCommunityDto } from '../../../shared/models/community.model';
import { OrganizationService } from '../../services/organization.service';
import { PlanOptionService } from '../../services/plan-option.service';
import { Observable, of } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { ColorService } from '../../../core/services/color.service';
import { IColorItemDto } from '../../../shared/models/colorItem.model';
import { SettingsService } from '../../services/settings.service';
import { Settings } from '../../../shared/models/settings.model';

@Component({
	selector: 'color-items-search-header',
	templateUrl: './color-items-search-header.component.html',
	styleUrls: ['./color-items-search-header.component.scss']
})
export class ColorItemsSearchHeaderComponent
	extends UnsubscribeOnDestroy
	implements OnInit {
	planCommunityList$: Observable<Array<IPlanCommunity>>;
	currentFinancialCommunityId: number;
	selectedPlans: Array<number> = [];
	planOptionList: Array<IOptionCommunity>;
	planOptionDtosList: Array<IPlanOptionCommunityDto> = [];
	currentOption: IOptionCommunity = null;
	isActiveColor: boolean = null;
	colorItemDtolist: IColorItemDto[];
	settings: Settings;
	allDataLoaded: boolean;
	currentPage: number = 0;
	isLoading: boolean = true;
	skip: number;
	selectedplanids = null;
	pageNumber: number = 1;
	modalReference: ModalRef;
	disableAddColorItemButton: boolean = true;
	@ViewChild('addColorItemModal') addColorItemModal: any;

	constructor(
		private _orgService: OrganizationService,
		private _planService: PlanOptionService,
		private _colorService: ColorService,
		private _settingsService: SettingsService,
		private _modalService: ModalService
	) {
		super();
	}

	ngOnInit() {
		this.settings = this._settingsService.getSettings();

		this.planCommunityList$ = this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			filter((comm) => !!comm),
			switchMap((comm) => {
				this.reset();
				this.selectedPlans = [];
				this.currentFinancialCommunityId = comm.id;
				return this._planService.getPlanCommunities(this.currentFinancialCommunityId).pipe(
					map((plans) => {
						return [
							{ planSalesName: 'All Plans', id: 0 },
							...plans
						];
					})
				)
			})
		);
	}

	reset() {
		this.skip = 0;
		this.planOptionDtosList = [];
		this.currentOption = null;
		this.planOptionList = [];
		this.currentPage = 0;
		this.pageNumber = 1;
	}

	onShowOptions() {

		this.reset();
		this.selectedplanids = null;
		// if >= 0 means user selected all plans
		// if -1 means user selected individual plans
		if (this.selectedPlans?.findIndex(x => x == 0) == -1) {
			this.selectedplanids = this.selectedPlans;
		}

		this._planService
			.getPlanOptions(this.currentFinancialCommunityId, this.selectedplanids)
			.subscribe((options) => {
				this.planOptionList = options
			});
	}

	showAddColorItemDialog() {
		this.modalReference = this._modalService.open(this.addColorItemModal);
		this.modalReference.result.catch(err => console.log(err));
	}

	loadColorItemsGrid() {
		// Skip if currentOption is blank
		if (this.currentOption) {
			this._planService.getPlanOptionsGrid(this.currentFinancialCommunityId,
				this.currentOption?.id,
				this.selectedplanids,
				this.settings.infiniteScrollPageSize,
				this.skip,
			)
				.pipe(
					map((planOptions) => {
						let planOptionsList = planOptions.map((planoption) => {
							let planOptionDto: IPlanOptionCommunityDto = {
								planId: planoption.planCommunity.id,
								planSalesName: planoption.planCommunity.planSalesName,
								optionCommunityId: planoption.optionCommunity.id,
								optionSalesName: planoption.optionCommunity.optionSalesName,
								planOptionId: planoption.id,
								colorItem: null
							}
							return planOptionDto;
						}) as Array<IPlanOptionCommunityDto>;
						return planOptionsList;
					}),
					switchMap((planOptionDtos) => {
						if (planOptionDtos?.length > 0) {
							return this._colorService
								.getPlanOptionAssocColorItems
								(this.currentFinancialCommunityId,
									planOptionDtos.map(planoption => planoption.planOptionId),
									this.isActiveColor
								)
								.pipe(
									map((colorItemDtos) => {
										planOptionDtos.forEach(element => {
											element.colorItem = colorItemDtos?.find(coloritem => coloritem.edhPlanOptionId === element.planOptionId);
										});
										return planOptionDtos;
									})
								)
						}
						else {
							return of([]);
						}
					})
				)
				.subscribe((planOptionDtos) => {
					this.currentPage++;
					this.allDataLoaded = planOptionDtos.length < this.settings.infiniteScrollPageSize;
					planOptionDtos = planOptionDtos.filter(x => !!x.colorItem);
					if (planOptionDtos.length > 0) {
						this.planOptionDtosList = [...this.planOptionDtosList, ...planOptionDtos];
						let expectedListLength = this.pageNumber * this.settings.infiniteScrollPageSize;
						if (this.planOptionDtosList.length < expectedListLength && !this.allDataLoaded) {
							this.onPanelScroll();
						}
						else if (this.planOptionDtosList.length >= expectedListLength && !this.allDataLoaded) {
							this.pageNumber++;
						}
					}
					else if (!this.allDataLoaded) {
						this.onPanelScroll();
					}
				});

				this.getAddColorItemButtonState();
		}
	}

	onPanelScroll() {
		this.isLoading = true;
		this.skip = this.currentPage * this.settings.infiniteScrollPageSize;
		this.loadColorItemsGrid();
	}

	onActiveColorChange() {
		this.planOptionDtosList = [];
		this.skip = 0;
		this.currentPage = 0;
		this.pageNumber = 1;
		this.loadColorItemsGrid();
	}

	onChangeOption() {
		this.planOptionDtosList = [];
		this.skip = 0;
		this.currentPage = 0;
		this.pageNumber = 1;
		this.loadColorItemsGrid();
	}

	private getAddColorItemButtonState() {
		//TODO: ask faye if elevation optioncategoryid 361 & 362 will work in all environments or do we have to query categoryname of elevation then find the subcategoryids?
		// If 0 results for the search then enable the button does not matter if the option is an elevation or not
		// If the option is an elevation option
		//	Then if any of the plans for that elevation option do not have an active color item then enbable the button
		//		if all of the plans have an active color item then disable the button


		if (this.currentOption.id > 0)
		{
			this.disableAddColorItemButton = false;
		}
		else
		{
			this.disableAddColorItemButton = true;
		}
	}
}
