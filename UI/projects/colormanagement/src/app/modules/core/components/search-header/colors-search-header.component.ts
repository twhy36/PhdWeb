import {Component, OnInit, ViewChild } from '@angular/core';
import {OptionService} from '../../services/option.service';
import {IOptionSubCategory} from '../../../shared/models/option.model';
import {OrganizationService} from '../../../core/services/organization.service';
import {filter, map, switchMap} from 'rxjs/operators';
import {Observable} from 'rxjs';
import {ModalRef, UnsubscribeOnDestroy, ModalService} from 'phd-common';
import {IColorDto, IColor} from '../../../shared/models/color.model';
import {ColorService} from '../../services/color.service';
import {SettingsService} from '../../services/settings.service';
import {Settings} from '../../../shared/models/settings.model';

@Component({
	selector: 'colors-search-header',
	templateUrl: './colors-search-header.component.html',
	styleUrls: ['./colors-search-header.component.scss']
})
export class ColorsSearchHeaderComponent
	extends UnsubscribeOnDestroy
	implements OnInit
{
	colorname: string = null;
	isCounterVisible: boolean;
	optionSubCategoryList: Array<IOptionSubCategory>;
	optionSubCategory$: Observable<Array<IOptionSubCategory>>;
	selectedSubCategory: IOptionSubCategory;
	colorsDtoList: Array<IColorDto> = [];
	currentCommunityId: number;
	allDataLoaded: boolean;
	isActiveColor: boolean;
	isLoading: boolean = true;
	currentPage: number = 0;
	skip: number;
	settings: Settings;
	modalReference: ModalRef;
	newColors: IColor[] = [];
	@ViewChild('addColorModal') addColorModal: any;
	deleteColorList: Array<IColorDto>=[];

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
		this.optionSubCategory$.subscribe((subcategoryList) => {
			this.optionSubCategoryList = subcategoryList;
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
						let categorySubcategory =
							this.optionSubCategoryList.find((subcategory) =>subcategory.id === color.edhOptionSubcategoryId);
						let colorsDto: IColorDto = {
							colorId: color.colorId,
							name: color.name,
							sku: color.sku,
							optionCategoryName:
								categorySubcategory?.optionCategory?.name,
							optionSubCategoryName: categorySubcategory?.name,
							optionSubCategoryId: categorySubcategory?.id??null,
							isActive: color.isActive,
							hasSalesConfig:null
						};
						return colorsDto;
					}) as Array<IColorDto>;
					return colorsList;
				}),
				switchMap((colorDtos)=>
				{
					return this._colorService.getSalesConfiguration(colorDtos);
				})
			)
			.subscribe((colorDtos) => {				
				this.currentPage++;
				this.allDataLoaded =
					colorDtos.length < this.settings.infiniteScrollPageSize;
				this.colorsDtoList = [...this.colorsDtoList, ...colorDtos];
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
	}

	resetfilter() {
		this.colorname = '';
		this.selectedSubCategory = null;
		this.isActiveColor = null;
		this.colorsDtoList = [];
	}

	isDeleteSelected(color:IColorDto):boolean
	{
		return this.deleteColorList.some(col => col.colorId	===	color.colorId);
	}

	setDeleteSelected(color: IColorDto, isSelected: boolean): void
	{

		let index = this.deleteColorList.findIndex(s => s.colorId === color.colorId);

		if (isSelected && index < 0)
		{
			this.deleteColorList.push(color);
		}
		else if (!isSelected && index >= 0)
		{
			this.deleteColorList.splice(index, 1);

			this.deleteColorList = [...this.deleteColorList];
		}
	}

	showAddColorsDialog()
	{
		this.modalReference = this._modalService.open(this.addColorModal);
		this.modalReference.result.catch(err => console.log(err));
	}

	onNewColorsWereSaved()
	{
		this.modalReference.dismiss();
		this.resetfilter();
		this.loadColors();
	}

	onCloseDialogWasRequested()
	{
		this.modalReference.dismiss();
	}
}
