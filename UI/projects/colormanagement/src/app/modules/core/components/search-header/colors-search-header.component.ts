import { Component, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
import { OptionService } from '../../services/option.service';
import { IOptionSubCategory } from '../../../shared/models/option.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { switchMap, filter, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ModalRef, UnsubscribeOnDestroy } from 'phd-common';
import { IColorDto } from '../../../shared/models/color.model';
import { ColorService } from '../../services/color.service';
import { SettingsService } from '../../services/settings.service';
import { Settings } from '../../../shared/models/settings.model';

import { ModalService } from '../../services/modal.service';
import { FormGroup } from '@angular/forms';

@Component({
	selector: 'colors-search-header',
	templateUrl: './colors-search-header.component.html',
	styleUrls: ['./colors-search-header.component.scss']
})
export class ColorsSearchHeaderComponent
	extends UnsubscribeOnDestroy
	implements OnInit
{

	@Output() sidePanelWasToggled = new EventEmitter<boolean>();
	@ViewChild('addColorModal') addColorModal: any;
	colorname: string = null;
	isCounterVisible: boolean;
	saveColorsDisabled: boolean
	optionSubCategory: Array<IOptionSubCategory>;
	optionSubCategory$: Observable<Array<IOptionSubCategory>>;
	selectedSubCategory: IOptionSubCategory;
	colorsDtoList: Array<IColorDto> = [];
	currentCommunityId: number;
	allDataLoaded: boolean;
	isActiveColor: boolean;
	isLoading: boolean = true;
	isModalOpen: boolean;
	currentPage: number = 0;
	skip: number;
	settings: Settings;
	modalReference: ModalRef;
	newColors: IColorDto[] = [];
	addColorDialogForm: FormGroup;

	constructor(
		private _optionService: OptionService,
		private _orgService: OrganizationService,
		private _colorService: ColorService,
		private _settingsService: SettingsService,
		private _modalService: ModalService
	) {
		super();
	}

	ngOnInit() {
		this.settings = this._settingsService.getSettings();

		this.optionSubCategory$ = this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			filter((comm) => !!comm),
			switchMap((comm) => {
				this.currentCommunityId = comm.id;
				return this._optionService.getOptionsCategorySubcategory(
					this.currentCommunityId
				);
			})
		);
		this.optionSubCategory$.subscribe((x) => {
			this.optionSubCategory = x;
			this.resetfilter();
			this.loadColors();
		});
	}
	showCounter() {
		this.isCounterVisible = true;
	}
	hideCounter() {
		this.isCounterVisible = false;
	}
	loadColors() {
		this.allDataLoaded = false;

		this._colorService
			.getColors(
				this.currentCommunityId,
				this.colorname,
				this.selectedSubCategory?.id,
				this.settings.infiniteScrollPageSize,
				this.skip,
				this.isActiveColor
			)
			.pipe(
				map((colors) => {
					let colorsList = colors.map((color) => {
						let categorySubcategory = this.optionSubCategory.find(
							(x) => x.id === color.edhOptionSubcategoryId
						);
						let colorsDto: IColorDto = {
							colorId: color.colorId,
							name: color.name,
							sku: color.sku,
							optionCategoryName:
								categorySubcategory?.optionCategory?.name,
							optionSubCategoryName: categorySubcategory?.name,
							isActive: color.isActive,
						};
						return colorsDto;
					}) as Array<IColorDto>;
					return colorsList;
				})
			)
			.subscribe((x) => {
				this.currentPage++;
				this.allDataLoaded =
					x.length < this.settings.infiniteScrollPageSize;
				this.colorsDtoList = [...this.colorsDtoList, ...x];
			});
	}
	filterColors() {
		this.colorsDtoList = [];
		this.currentPage = 0;
		this.loadColors();
	}
	onPanelScroll() {
		this.isLoading = true;
		this.skip = this.currentPage * this.settings.infiniteScrollPageSize;
		this.loadColors();
	}
	resetfilter() {
		this.colorname = '';
		this.selectedSubCategory = null;
		this.isActiveColor = null;
		this.colorsDtoList = [];
	}

	showAddColorsDialog(): boolean {
		for(let i=0; i < 50; i++) {
			this.newColors[i] = {
				name: '',
				colorId: 0,
				sku: '',
				optionSubCategoryName: '',
				optionCategoryName: '',
				isActive: true
			};
		}

		this.modalReference = this._modalService.open(this.addColorModal);
		this.isModalOpen = true;
		this.modalReference.result.catch(err => console.log(err));
		return false;
	}

	saveColors() {

	}

	cancelAddColorDialog() {
		this.modalReference.dismiss();
		this.isModalOpen = false;
	}
}
