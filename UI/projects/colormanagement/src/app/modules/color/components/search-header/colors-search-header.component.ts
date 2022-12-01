import { Component, OnInit, ViewChild } from '@angular/core';
import { OptionService } from '../../../core/services/option.service';
import { IOptionSubCategory } from '../../../shared/models/option.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { filter, map, switchMap } from 'rxjs/operators';
import { from, Observable, EMPTY } from 'rxjs';
import { ConfirmModalComponent, ModalRef, ModalService, UnsubscribeOnDestroy, IColor, IColorDto } from 'phd-common';
import { ColorService } from '../../../core/services/color.service';
import { SettingsService } from '../../../core/services/settings.service';
import { Settings } from '../../../shared/models/settings.model';
import { MessageService } from 'primeng/api';
import { IToastInfo } from '../../../../../../../phd-common/src/lib/models/toast-info.model';
import { CrudMode } from '../../../shared/classes/constants.class';

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
	@ViewChild('editColorSidePanel') editColorSidePanel: any;
	deleteColorList: Array<IColorDto> = [];
	editSidePanelIsOpen: boolean;
	colorToEdit: IColorDto;

	public get CrudMode()
	{
		//to allow using enum in html template
		return CrudMode;
	}

	constructor(
		private _optionService: OptionService,
		private _orgService: OrganizationService,
		private _colorService: ColorService,
		private _settingsService: SettingsService,
		private _modalService: ModalService,
		private _msgService: MessageService
	)
	{
		super();
	}

	ngOnInit()
	{
		this.settings = this._settingsService.getSettings();

		this.optionSubCategory$ = this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			filter((comm) => !!comm),
			switchMap((comm) =>
			{
				this.currentCommunityId = comm.id;
				return this._optionService.getOptionsCategorySubcategory();
			})
		);

		this.optionSubCategory$.subscribe((subcategoryList) =>
		{
			this.optionSubCategoryList = subcategoryList;
			this.resetFilter();
			this.loadColors();
		});
	}

	showCounter()
	{
		this.isCounterVisible = true;
	}

	hideCounter()
	{
		this.isCounterVisible = false;
	}

	loadColors()
	{
		this.allDataLoaded = false;
		this.isLoading = true;

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
				map((colors) =>
				{
					let colorsList = colors.map((color) =>
					{
						let categorySubcategory =
							this.optionSubCategoryList.find((subcategory) => subcategory.id === color.edhOptionSubcategoryId);
						let colorsDto: IColorDto = {
							colorId: color.colorId,
							name: color.name,
							sku: color.sku,
							optionCategoryName:
								categorySubcategory?.optionCategory?.name,
							optionSubCategoryName: categorySubcategory?.name,
							optionSubCategoryId: categorySubcategory?.id ?? null,
							isActive: color.isActive,
							hasSalesConfig: null,
							hasSalesAgreement: null
						};

						return colorsDto;
					}) as Array<IColorDto>;

					return colorsList;
				})
			)
			.subscribe((colorDtos) =>
			{
				this.currentPage++;
				this.allDataLoaded =
					colorDtos.length < this.settings.infiniteScrollPageSize;
				this.colorsDtoList = [...this.colorsDtoList, ...colorDtos];
				this.isLoading = false;
				this.getSalesConfig(colorDtos);
			});
	}

	getSalesConfig(colorDtos: IColorDto[])
	{
		this._colorService.getSalesConfigurationForColors(colorDtos, this.currentCommunityId).subscribe((config) =>
		{
			config.map((color) =>
			{
				this.colorsDtoList.find(c => c.colorId === color.colorId).hasSalesConfig = color.hasSalesConfig;
			});
		});

		this._colorService.getSalesAgreementForColors(colorDtos, this.currentCommunityId).subscribe((config) =>
		{
			config.map((color) =>
			{
				this.colorsDtoList.find(c => c.colorId === color.colorId).hasSalesAgreement = color.hasSalesAgreement;
			});
		});
	}

	filterColors()
	{
		this.colorsDtoList = [];
		this.currentPage = 0;
		this.skip = 0;
		this.loadColors();
	}

	onPanelScroll()
	{
		this.skip = this.currentPage * this.settings.infiniteScrollPageSize;
		this.loadColors();
	}

	resetFilter()
	{
		this.colorname = '';
		this.selectedSubCategory = null;
		this.isActiveColor = null;
		this.colorsDtoList = [];
		this.currentPage = 0;
		this.skip = 0;
	}

	getRowClass(rowData: any): string
	{
		return rowData['isActive'] ? null : 'phd-inactive-color';
	}

	isDeleteSelected(color: IColorDto): boolean
	{
		return this.deleteColorList.some(col => col.colorId === color.colorId);
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

	onNewColorsWereSaved(successful: boolean, mode: CrudMode)
	{
		if (this.modalReference && successful)
		{
			this.modalReference.dismiss();
		}

		this.showToast(successful, mode);

		if (successful)
		{
			this.filterColors();
		}
	}

	private showToast(successful: boolean, mode: CrudMode)
	{
		const messagePrefix = mode === CrudMode.Delete ? 'Delete' : 'Save';

		const toast = {
			severity: successful ? 'success' : 'error',
			summary: successful ? 'Success' : 'Error',
			detail: successful ? `${messagePrefix} was successful! Refreshing grid...` : `${messagePrefix} failed. Please try again.`,
			sticky: successful === false
		} as IToastInfo;

		this._msgService.add(toast);
	}

	onCloseDialogWasRequested()
	{
		this.modalReference.dismiss();
	}

	showEditColorSidePanel(color: IColorDto)
	{
		this.colorToEdit = color;
		this.editSidePanelIsOpen = true;
	}

	onEditSidePanelWasClosed()
	{
		this.editSidePanelIsOpen = false;
	}

	deleteSelectedColors()
	{
		const message = 'Are you sure you want to delete selected colors?';

		this.showConfirmModal(message, 'Warning', 'Continue').pipe(
			switchMap(cancelDeletion =>
			{
				if (cancelDeletion)
				{
					return EMPTY;
				}

				const colorsToDelete = this.deleteColorList.map(color => color.colorId);

				return this._colorService.deleteColors(colorsToDelete);
			})
		).subscribe(successful =>
		{
			if (successful)
			{
				this.skip = 0;
				this.deleteColorList = [];
			}

			this.onNewColorsWereSaved(successful, CrudMode.Delete);
		});
	}

	private showConfirmModal(body: string, title: string, defaultButton: string): Observable<boolean>
	{
		const confirm = this._modalService.open(ConfirmModalComponent, { centered: true, windowClass: "phd-modal-window" });

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		return from(confirm.result.then((result) => result !== 'Continue'));
	}

	onColorsWasEdited(successful: boolean)
	{
		if (successful)
		{
			this.editSidePanelIsOpen = false;
			this.showToast(successful, CrudMode.Edit);
			this.filterColors();
			return;
		}

		this.showToast(successful, CrudMode.Edit);
	}

	activateColor(colorDto: IColorDto)
	{
		const colorToSave = {
			colorId: colorDto.colorId,
			name: colorDto.name,
			sku: colorDto.sku,
			optionSubCategoryId: colorDto.optionSubCategoryId,
			isActive: true
		} as IColorDto;

		let toast: IToastInfo;

		this._colorService.updateColor(colorToSave, this.currentCommunityId).subscribe((color) =>
		{
			if (color)
			{
				toast = {
					severity: 'success',
					summary: 'Activate Color',
					detail: 'Color activation was successful!'
				};

				this._msgService.add(toast);

				this.colorsDtoList.find(c => c.colorId === color.colorId).isActive = color.isActive;
			}
			else
			{
				toast = {
					severity: 'error',
					summary: 'Activate Color',
					detail: 'Color activation failed. Please try again.'
				} as IToastInfo;

				this._msgService.add(toast);
			}
		}, error =>
		{
			toast = {
				severity: 'error',
				summary: 'Activate Color',
				detail: 'Color activation failed due to an unexpected error.'
			} as IToastInfo;

			this._msgService.add(toast);
		}
		);
	}

	inactivateColor(colorDto: IColorDto)
	{
		const message = 'Are you sure you want to inactivate this color?';
		let cancelled = false;
		let toast: IToastInfo;

		this.showConfirmModal(message, 'Warning', 'Continue').pipe(
			switchMap(cancel =>
			{
				if (cancel)
				{
					cancelled = true;

					return;
				}

				const colorToSave = {
					colorId: colorDto.colorId,
					name: colorDto.name,
					sku: colorDto.sku,
					optionSubCategoryId: colorDto.optionSubCategoryId,
					isActive: false
				} as IColorDto;

				return this._colorService.updateColor(colorToSave, this.currentCommunityId)
			})).subscribe((color: IColor) =>
			{
				if (color)
				{
					toast = {
						severity: 'success',
						summary: 'Inactivate Color',
						detail: 'Color inactivation was successful!'
					}

					this._msgService.add(toast);

					this.colorsDtoList.find(c => c.colorId === color.colorId).isActive = color.isActive;
				}
				else
				{
					toast = {
						severity: 'error',
						summary: 'Inactivate Color',
						detail: 'Color inactivation failed. Please try again.'
					} as IToastInfo;

					this._msgService.add(toast);
				}
			}, error =>
			{
				if (!cancelled)
				{
					toast = {
						severity: 'error',
						summary: 'Inactivate Color',
						detail: 'Color inactivation failed due to an unexpected error.'
					} as IToastInfo;

					this._msgService.add(toast);
				}
			}
			);
	}
}
