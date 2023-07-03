import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';

import { HomeSite } from '../../../shared/models/homesite.model';
import { IHomeSiteReleaseDto, IHomeSiteReleaseSidePanelItem } from '../../../shared/models/homesite-releases.model';
import { ConfirmModalComponent, SidePanelComponent } from 'phd-common';

import * as moment from "moment";
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
@Component({
	selector: 'releases-side-panel-component',
	templateUrl: './releases-side-panel.component.html',
	styleUrls: ['./releases-side-panel.component.scss']
})
export class ReleasesSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;

	@Input() saving: boolean = false;
	@Input() selected: boolean = false;
	@Input() disabled: boolean = false;
	@Input() customClasses: string = '';

	@Input() selectedRelease: IHomeSiteReleaseSidePanelItem;

	@Output() onSaveRelease = new EventEmitter<IHomeSiteReleaseDto>();

	isOpen: boolean = true;

	releaseForm: UntypedFormGroup;

	items: Array<MultiSelectHomeSiteItem> = [];

	pendingSelection: Array<MultiSelectHomeSiteItem> = [];

	minDate: Date = new Date();
	descMaxLength: number = 50;

	get isDirty(): boolean
	{
		return this.releaseForm.dirty;
	}

	get homeSiteCount(): number
	{
		let count = this.homeSites.filter(hs => hs.selected).length;

		return count;
	}

	get homeSites(): Array<MultiSelectHomeSiteItem>
	{
		if (this.selectedRelease != null)
		{
			return this.selectedRelease.homeSites.map(hs =>
			{
				let item = new MultiSelectHomeSiteItem(hs);

				item.selectable = hs.lotStatusDescription === 'Unavailable' && hs.hasRequiredInfo;

				if (this.selectedRelease.homeSiteRelease != null)
				{
					item.selected = this.selectedRelease.homeSiteRelease.associatedHomeSites.indexOf(item.id) > -1;
				}

				return item;
			});
		}
		else
		{
			return [];
		}
	}

	get canSave(): boolean
	{
		return this.releaseForm.pristine || !this.releaseForm.valid || this.saving;
	}

	constructor(private _modalService: NgbModal) { }

	ngOnInit()
	{
		this.items = this.homeSites;

		this.createForm();
	}

	createForm()
	{
		const release = this.selectedRelease.homeSiteRelease;

		let dateValue: Date;
		let description: string;
		let releaseRank: number;

		if (release != null)
		{
			dateValue = new Date(release.dateString);
			releaseRank = release.releaseRank;
			description = release.description;
		}

		this.releaseForm = new UntypedFormGroup({
			'dateValue': new UntypedFormControl(dateValue, [Validators.required]),
			'description': new UntypedFormControl(description, [Validators.maxLength(this.descMaxLength)]),
			'releaseRank': new UntypedFormControl(releaseRank),
			'pendingSelection': new UntypedFormControl(),
			'selectedLots': new UntypedFormControl(this.selectedItems.length > 0 ? '1' : '', [Validators.required])
		});
	}

	setSelectedLotValue()
	{
		const control = this.releaseForm.get('selectedLots');

		control.setValue(this.selectedItems.length > 0 ? '1' : '');
		control.markAsDirty();
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	onCancel()
	{
		this.sidePanel.toggleSidePanel();
	}

	get selectedItems(): Array<MultiSelectHomeSiteItem>
	{
		return this.items.filter(x => x.selected);
	}

	get unSelectedItems(): Array<MultiSelectHomeSiteItem>
	{
		return this.items.filter(x => x.selectable && x.selected === false);
	}

	addSelectedItems()
	{
		for (let item of this.releaseForm.controls['pendingSelection'].value)
		{
			item.selected = true;
		}

		this.setSelectedLotValue();
	}

	addAllItems()
	{
		for (let item of this.unSelectedItems)
		{
			item.selected = true;
		}

		this.setSelectedLotValue();
	}

	removeItem(item: MultiSelectHomeSiteItem)
	{
		item.selected = false;
		item.selectable = true;
		item.wrappedHomeSite.lotStatusDescription = 'Unavailable'
		this.setSelectedLotValue();
	}

	removeAllItems()
	{
		for (let item of this.selectedItems)
		{
			this.removeItem(item);
		}

		this.setSelectedLotValue();
	}

	
	checkReleaseModels()
	{
		if (this.selectedItems.find(s => s.isModel))
		{
			let models = this.selectedItems.filter(x => x.isModel).map(model => {
				return model.label;
			});
			const ngbModalOptions: NgbModalOptions = {
				centered: true,
				backdrop: 'static',
				keyboard: false
			};
			const confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);
			if (models.length === 1)
			{
				confirm.componentInstance.title = 'Create Release';
				confirm.componentInstance.body = '<div class="phd-center-text">The following selected lot is a model: <br><br><span class="font-weight-bold">' 
				+ models[0] + '</span><br><br>If you continue, ' 
				+ 'this model will be released and made available for sale on the scheduled release date.</div>';
				confirm.componentInstance.defaultOption = 'Continue';
				confirm.componentInstance.primaryButtonText = 'Continue';
			}
			else
			{
				confirm.componentInstance.title = 'Create Release';
				confirm.componentInstance.body = '<div class="phd-center-text">The following selected lots are models: <br><br> <span class="font-weight-bold">' 
				+ models.join(',') + '</span> <br><br>If you continue, ' 
				+ 'these models will be released and made available for sale on the scheduled release date.</div>';
				confirm.componentInstance.defaultOption = 'Continue';
				confirm.componentInstance.primaryButtonText = 'Continue';
			}

			confirm.result.then((result) =>
			{
				if (result == 'Continue')
				{
					this.saveRelease();
				}
			});
		}
		else
		{
			this.saveRelease();
		}
	}

	saveRelease()
	{
		const form = this.releaseForm;
		let releaseDate = moment(form.get('dateValue').value).format('Y-MM-DD') + 'T00:00:00';
		let description = form.get('description').value;
		const releaseRank = form.get('releaseRank').value || null;

		const release = this.selectedRelease.homeSiteRelease;
		const updatedHomeSites = this.selectedItems.map(hs => hs.wrappedHomeSite);

		let dto: IHomeSiteReleaseDto = {
			releaseDate: releaseDate,
			releaseDescription: description,
			releaseRank: releaseRank,
			homeSitesAssociated: updatedHomeSites.map(hs => hs.commLbid)
		};

		// merge in with any existing release
		if (release != null)
		{
			// clone the dto object so we don't modify it yet
			dto = Object.assign({} as IHomeSiteReleaseDto, release.dto, dto);
		}

		this.onSaveRelease.emit(dto);
		
	}
}

class MultiSelectHomeSiteItem implements IMultiSelectItem
{
	selected: boolean = false;
	selectable: boolean = false;
	isModel: boolean;

	constructor(private _homeSite: HomeSite) {
		this.isModel = _homeSite.lotBuildTypeDescription === 'Model';
	 }

	get id(): number
	{
		return this._homeSite.commLbid;
	}

	get label(): string
	{
		return this._homeSite.lotBlock;
	}

	get wrappedHomeSite(): HomeSite
	{
		return this._homeSite;
	}
}

interface IMultiSelectItem
{
	readonly id: any;
	readonly label: string;

	/**
	 * Indicates if the item can or cannot be selected
	 */
	readonly selectable: boolean;

	/**
	 * Indicates the item has been selected
	 */
	selected: boolean;
}
