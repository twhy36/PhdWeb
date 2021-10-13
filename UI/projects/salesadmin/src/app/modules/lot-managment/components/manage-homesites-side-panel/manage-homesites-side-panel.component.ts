import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

import { filter } from 'rxjs/operators';

import { MessageService } from 'primeng/api';

import { HomeSite, HomeSiteDtos } from '../../../shared/models/homesite.model';
import { MonotonyRule, MonotonyRuleDtos } from '../../../shared/models/monotonyRule.model';

import { HomeSiteService } from '../../../core/services/homesite.service';
import { SidePanelComponent } from 'phd-common';

@Component({
	selector: 'manage-homesites-side-panel-component',
	templateUrl: './manage-homesites-side-panel.component.html',
	styleUrls: ['./manage-homesites-side-panel.component.scss']
})
export class ManageHomesitesSidePanelComponent implements OnInit
{
	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;
	@Input() saving: boolean;
	@Input() selectedHomesite: HomeSite;
	@Input() monotonyRules: Array<MonotonyRule>;
	@Input() lots: Array<HomeSite> = [];
	@Input() viewAdjacencies: Array<HomeSiteDtos.ILabel> = [];
	@Input() physicalLotTypes: Array<HomeSiteDtos.ILabel> = [];
	@Input() communityWebsiteKey: string;
	@Input() isColorSchemePlanRuleEnabled: boolean;

	@Output() onSaveHomesiteAndMonotonyRules = new EventEmitter<{ homesite: HomeSiteDtos.IHomeSiteEventDto, rule: MonotonyRuleDtos.IMonotonyRuleEventDto }>();

	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent

	homesiteForm: FormGroup;
	elevationAvailableLots: Array<string> = [];
	elevationSelectedLots: Array<string> = [];
	colorAvailableLots: Array<string> = [];
	colorSelectedLots: Array<string> = [];
	currentTab: string = 'details';
	monotonyForm: FormGroup;
	disableMonotonyForm: boolean;
	fromMonotony: string;

	inaccessibleLotStatuses = ["Sold", "Closed"];
	disallowedStatusesForPremiumUpdate = this.inaccessibleLotStatuses.concat("PendingSale");

	isOpen: boolean = true;

	canEditAvailability: boolean = false;

	showCheckBoxes: boolean = false;

	handingsGroup = [];

	Handing = HomeSiteDtos.Handing;

	selectedHandings: Array<HomeSiteDtos.IHanding> = [];

	get isDirty(): boolean
	{
		return this.homesiteForm.dirty || this.monotonyForm.dirty;
	}

	get sidePanelSubheader(): string
	{
		return `Homesite: ${this.selectedHomesite.dto.lotBlock}`;
	}

	get lotInaccessible(): boolean
	{
		return this.inaccessibleLotStatuses.includes(this.selectedHomesite.dto.lotStatusDescription);
	}

	get canSaveHomesite(): boolean
	{
		return !this.homesiteForm.pristine && this.homesiteForm.valid && !this.saving;
	}

	get canSaveMonotony(): boolean
	{
		return !this.lotInaccessible && !this.monotonyForm.pristine && this.monotonyForm.valid && !this.saving;
	}
	
	get handings(): Array<HomeSiteDtos.Handing>
	{
		return [HomeSiteDtos.Handing.Left, HomeSiteDtos.Handing.Right, HomeSiteDtos.Handing.NA];
	}

	get facings(): Array<string>
	{
		return ["", ...this.enumKeys(HomeSiteDtos.Facing)];
	}

	get foundationTypes(): Array<string>
	{
		return this.enumKeys(HomeSiteDtos.FoundationType);
	}

	get isNAHandingSelected(): boolean
	{
		return this.homesiteForm.controls['handing-3'].value;
	}

	get warrantyTypes(): Array<string>
	{
		return this.enumKeys(HomeSiteDtos.EdhWarrantyType);
	}

	get lotBuildTypes()
	{
		return ['Model', 'Spec'];
	}

	get handingChecked()
	{
		//if N/A handing is not selected, and Left or Right handing is not selected
		return !this.homesiteForm.controls['handing-3'].value && !(this.homesiteForm.controls['handing-1'].value || this.homesiteForm.controls['handing-2'].value);
	}

	whiteSpaceValidator(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			let isValid = true;

			if ((control.value).length > 0)
			{
				let isWhitespace = (control.value || '').trim().length === 0;
				isValid = !isWhitespace;
			}

			return isValid ? null : { whiteSpaceValidator: true }
		};
	}

	constructor(private homeSiteService: HomeSiteService, private route: ActivatedRoute, private _msgService: MessageService) { }

	ngOnInit()
	{
		this.canEditAvailability = this.selectedHomesite.dto.lotStatusDescription === "Available"
			|| (this.selectedHomesite.dto.lotBuildTypeDescription === "Spec" && this.selectedHomesite.dto.lotStatusDescription === "Unavailable"); //check on this
		this.createForm();
		this.getLotsForMonotonyRules();
		this.createMonotonyForm();

		if (this.selectedHomesite.lotStatusDescription === 'Sold' || this.selectedHomesite.lotStatusDescription == 'Closed')
		{
			this.disableMonotonyForm = true;
			this.monotonyForm.disable();
		}

		this.route.queryParams.pipe(
			filter(params => params.activeTab)
		).subscribe(params =>
		{
			this.currentTab = params.activeTab;
		});
	}

	checkRequired(...controls: AbstractControl[]): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			return controls.some(c => c.value) ? null : { 'checkRequired': true };
		};
	}

	createForm()
	{
		this.homesiteForm = new FormGroup({
			'premium': new FormControl({ value: this.selectedHomesite.dto.premium, disabled: this.disallowedStatusesForPremiumUpdate.includes(this.selectedHomesite.dto.lotStatusDescription) }, [Validators.required, Validators.min(0)]),
			'lotStatusDescription': new FormControl(this.selectedHomesite.dto.lotStatusDescription !== "Available"),
			'isHiddenInTho': new FormControl(this.selectedHomesite.dto.isHiddenInTho),
			'facing': new FormControl({ value: this.selectedHomesite.dto.facing, disabled: this.lotInaccessible }),
			'foundationType': new FormControl(this.selectedHomesite.dto.foundationType, Validators.required),
			'altLotBlock': new FormControl({ value: this.selectedHomesite.dto.altLotBlock, disabled: this.lotInaccessible }, this.whiteSpaceValidator()),
			'viewAdjacency': new FormControl({
				value: this.selectedHomesite.dto.view &&
					this.selectedHomesite.dto.view.value, disabled: this.lotInaccessible
			}, Validators.required),
			'physicalLotTypes': new FormControl({
				value: this.selectedHomesite.dto.lotType &&
					this.selectedHomesite.dto.lotType.value, disabled: this.lotInaccessible
			}, Validators.required),
			'warranty': new FormControl({ value: this.selectedHomesite.phdLotWarranty, disabled: this.lotInaccessible }, Validators.required),
			'changeModelToSpec': new FormControl({ value: this.selectedHomesite.lotBuildTypeDescription, disable: this.selectedHomesite.lotBuildTypeDescription !== 'Model' })
		});

		//add controls for Left, Right, and NA Handing
		this.handings.forEach(hand =>
		{
			this.homesiteForm.addControl('handing-' + hand, new FormControl(this.selectedHomesite.dto.lotHandings.some(h => h.handingId === hand)));			
		});

		this.homesiteForm.setValidators(this.checkRequired(this.homesiteForm.controls['handing-1'], this.homesiteForm.controls['handing-2'], this.homesiteForm.controls['handing-3']));
	}

	createMonotonyForm()
	{
		this.monotonyForm = new FormGroup({
			'elevation': new FormControl(),
			'color': new FormControl()
		});
	}

	getLotsForMonotonyRules()
	{
		if (this.monotonyRules === undefined)
		{
			this.monotonyRules = [];
		}

		this.monotonyRules.forEach(rule =>
		{
			const lot = this.lots.find(x => x.dto.id === rule.relatedLotId);
			if (!!lot)
			{
				if (rule.monotonyRuleType === 'Elevation')
				{
					this.elevationSelectedLots.push(String(lot.lotBlock));
				}
				else
				{
					this.colorSelectedLots.push(String(lot.lotBlock));
				}
			}
		});

		this.lots.forEach(lot =>
		{
			if (lot.lotBlock !== this.selectedHomesite.lotBlock)
			{
				if ((this.colorSelectedLots.find(rule => rule === lot.lotBlock)) === undefined)
				{
					this.colorAvailableLots.push(lot.lotBlock);
				}

				if ((this.elevationSelectedLots.find(rule => rule === lot.lotBlock)) === undefined)
				{
					this.elevationAvailableLots.push(lot.lotBlock);
				}
			}
		});
	}

	removeLotFromColorScheme(lot: any)
	{
		const items = this.colorSelectedLots;

		if (lot)
		{
			this.monotonyForm.markAsDirty();

			const index = items.indexOf(lot);

			if (index !== -1)
			{
				items.splice(index, 1);
			}

			this.colorAvailableLots.push(lot);
		}
	}

	removeLotFromElevation(lot: any)
	{
		const items = this.elevationSelectedLots;

		if (lot)
		{
			this.monotonyForm.markAsDirty();

			const index = items.indexOf(lot);

			if (index !== -1)
			{
				items.splice(index, 1);
			}

			this.elevationAvailableLots.push(lot);
		}
	}

	addHighlightedElevations()
	{
		for (let lot of this.monotonyForm.controls['elevation'].value)
		{

			var currentLot = this.elevationAvailableLots.filter(t => t === lot);

			if (currentLot.length != 0)
			{
				const index = this.elevationAvailableLots.indexOf(currentLot[0]);

				if (index !== -1)
				{
					this.elevationAvailableLots.splice(index, 1);
				}

				this.elevationSelectedLots.push(currentLot[0]);
			}
		}
	}

	addHighlightedColors()
	{
		for (let lot of this.monotonyForm.controls['color'].value)
		{

			var currentLot = this.colorAvailableLots.filter(t => t === lot);

			if (currentLot.length != 0)
			{
				const index = this.colorAvailableLots.indexOf(currentLot[0]);

				if (index !== -1)
				{
					this.colorAvailableLots.splice(index, 1);
				}

				this.colorSelectedLots.push(currentLot[0]);
			}
		}
	}

	addAllElevations()
	{
		this.elevationAvailableLots.forEach(lot =>
		{
			this.elevationSelectedLots.push(lot);
		});

		this.elevationAvailableLots = [];
	}

	removeAllElevations()
	{
		this.elevationSelectedLots.forEach(lot =>
		{
			this.elevationAvailableLots.push(lot);
		});

		this.elevationSelectedLots = [];
	}

	addAllColors()
	{
		this.colorAvailableLots.forEach(lot =>
		{
			this.colorSelectedLots.push(lot);
		});

		this.colorAvailableLots = [];
	}

	removeAllColors()
	{
		this.colorSelectedLots.forEach(lot =>
		{
			this.colorAvailableLots.push(lot);
		});

		this.colorSelectedLots = [];
	}

	removeHandings()
	{
		//if NA is turned on, remove all selected handings
		if(this.homesiteForm.controls['handing-3'])
		{
			this.homesiteForm.controls['handing-' + 1].setValue(false);
			this.homesiteForm.controls['handing-' + 2].setValue(false);
		}
	}

	saveMonotonyRules(): MonotonyRuleDtos.IMonotonyRuleEventDto
	{
		const monotonyRulesToSave: Array<MonotonyRule> = [];
		const lotId = this.selectedHomesite.dto.id;

		this.elevationSelectedLots.forEach(lot =>
		{
			monotonyRulesToSave.push({
				monotonyRuleType: 'Elevation',
				lotId: lotId,
				relatedLotId: this.lots.find(x => x.lotBlock === lot).dto.id
			})
		});

		this.colorSelectedLots.forEach(lot =>
		{
			monotonyRulesToSave.push({
				monotonyRuleType: 'ColorScheme',
				lotId: lotId,
				relatedLotId: this.lots.find(x => x.lotBlock === lot).dto.id
			})
		});

		return { lotId: lotId, monotonyRules: monotonyRulesToSave } as MonotonyRuleDtos.IMonotonyRuleEventDto;
	}

	copyAssignedLots(elevationColor: string)
	{
		if (elevationColor === 'color')
		{
			this.elevationSelectedLots.forEach(lot =>
			{
				if ((this.colorSelectedLots.find(rule => rule === lot)) === undefined)
				{
					this.colorSelectedLots.push(lot);
					const index = this.colorAvailableLots.indexOf(lot);
					if (index !== -1)
					{
						this.colorAvailableLots.splice(index, 1);
					}
				}
			});

			this.colorSelectedLots.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
			this.elevationSelectedLots.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
		}
		else
		{
			this.colorSelectedLots.forEach(lot =>
			{
				if ((this.elevationSelectedLots.find(rule => rule === lot)) === undefined)
				{
					this.elevationSelectedLots.push(lot);

					const index = this.elevationAvailableLots.indexOf(lot);

					if (index !== -1)
					{
						this.elevationAvailableLots.splice(index, 1);
					}
				}
			});

			this.colorSelectedLots.sort((a, b) => parseInt(a) - parseInt(b));
			this.elevationSelectedLots.sort((a, b) => parseInt(a) - parseInt(b));
		}

		this._msgService.add({ severity: 'success', summary: 'Copy was successful' });
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	onCancel()
	{
		this.sidePanel.toggleSidePanel();
	}

	showCheckbox()
	{
		this.showCheckBoxes = !this.showCheckBoxes;
	}

	private getNewLotStatus(origStatus: string, makeUnavailable: boolean): any
	{
		return !this.canEditAvailability || !makeUnavailable ? origStatus : 'Unavailable';
	}

	/**
	 * Handles the click event on the Save button.
	 */ 
	onSave()
	{
		let homesiteDto: HomeSiteDtos.IHomeSiteEventDto;
		let monotonyRulesDto: MonotonyRuleDtos.IMonotonyRuleEventDto;

		if (this.canSaveHomesite)
		{
			homesiteDto = this.saveHomesite();
		}

		if (this.canSaveMonotony)
		{
			monotonyRulesDto = this.saveMonotonyRules();
		}

		this.onSaveHomesiteAndMonotonyRules.emit({ homesite: homesiteDto, rule: monotonyRulesDto });
	}

	saveHomesite(): HomeSiteDtos.IHomeSiteEventDto
	{
		this.selectedHomesite.dto.premium = this.homesiteForm.controls['premium'].value;
		this.selectedHomesite.dto.lotStatusDescription = this.getNewLotStatus(this.selectedHomesite.dto.lotStatusDescription, this.homesiteForm.controls['lotStatusDescription'].value);
		this.selectedHomesite.dto.foundationType = this.homesiteForm.controls['foundationType'].value;
		this.selectedHomesite.dto.view = this.viewAdjacencies.find(item => item.value === this.homesiteForm.controls['viewAdjacency'].value);
		this.selectedHomesite.dto.lotType = this.physicalLotTypes.find(item => item.value === this.homesiteForm.controls['physicalLotTypes'].value);
		this.selectedHomesite.dto.facing = this.homesiteForm.controls['facing'].value || null;
		this.selectedHomesite.dto.lotHandings = this.handings.filter(h => this.homesiteForm.controls['handing-' + h].value).map(h => { return { lotId: 0, handingId: h }; });
		this.selectedHomesite.dto.edhWarrantyType = HomeSiteDtos.EdhWarrantyType[this.homesiteForm.controls['warranty'].value].toString();
		this.selectedHomesite.dto.altLotBlock = this.homesiteForm.controls['altLotBlock'].value;
		this.selectedHomesite.dto.isHiddenInTho = this.homesiteForm.controls['isHiddenInTho'].value;

		const lotBuildTypeUpdated = this.homesiteForm.controls['changeModelToSpec'].dirty;
		this.selectedHomesite.dto.lotBuildTypeDescription = lotBuildTypeUpdated ? this.homesiteForm.controls['changeModelToSpec'].value : this.selectedHomesite.lotBuildTypeDescription;

		return { homesiteDto: this.selectedHomesite.dto, lotBuildTypeUpdated: lotBuildTypeUpdated} as HomeSiteDtos.IHomeSiteEventDto;
	}

	controlHasErrors(control: AbstractControl)
	{
		return control.invalid && (control.dirty || control.touched);
	}

	enumKeys(enumType)
	{
		//grab enum key and values -- return keys
		return Object.keys(enumType).filter(
			type => isNaN(<any>type)
		)
	}

	getAvailable(homesite: HomeSite)
	{
		return homesite.lotStatusDescription === 'Available';
	}
}
