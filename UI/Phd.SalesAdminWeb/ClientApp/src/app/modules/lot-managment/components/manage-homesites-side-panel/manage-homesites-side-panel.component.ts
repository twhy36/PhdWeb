import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl, FormArray, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

import { filter } from 'rxjs/operators';

import { MessageService, Message } from 'primeng/api';

import { NgbTabChangeEvent } from '@ng-bootstrap/ng-bootstrap';

import { HomeSite, HomeSiteDtos } from '../../../shared/models/homesite.model';
import { MonotonyRule } from '../../../shared/models/monotonyRule.model';

import { HomeSiteService } from '../../../core/services/homesite.service';
import { SidePanelComponent } from 'phd-common/components/side-panel/side-panel.component';

@Component({
	selector: 'manage-homesites-side-panel-component',
	templateUrl: './manage-homesites-side-panel.component.html',
	styleUrls: ['./manage-homesites-side-panel.component.scss']
})
export class ManageHomesitesSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent

	@Output() onSidePanelClose = new EventEmitter<boolean>();
	@Input() sidePanelOpen: boolean = false;
	@Input() saving: boolean;
	@Input() selectedHomesite: HomeSite;
	@Input() monotonyRules: Array<MonotonyRule>;
	@Input() lots: Array<HomeSite> = [];
	@Output() onSaveHomesite = new EventEmitter<{ homesiteDto: HomeSiteDtos.ILotDto, lotBuildTypeUpdated: boolean}>();
	@Output() onSaveMonotonyRules = new EventEmitter <{ lotId: number, monotonyRules: MonotonyRule[] }>();

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
	disallowedStatusesForPremiumUpdate = this.inaccessibleLotStatuses.concat("Pending Sale");

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

	get canSave(): boolean
	{
		return this.homesiteForm.pristine || !this.homesiteForm.valid || this.saving;
	}

	get canSaveMonotony(): boolean
	{
		return this.lotInaccessible || this.monotonyForm.pristine || !this.monotonyForm.valid || this.saving;
	}
	get handings(): Array<HomeSiteDtos.Handing>
	{
		return [HomeSiteDtos.Handing.Left, HomeSiteDtos.Handing.Right, HomeSiteDtos.Handing.NA];
	}
	get handingsControl(): FormArray
	{
		return this.homesiteForm.get('handing') as FormArray;
	}
	get facings(): Array<string>
	{
		return ["", ...this.enumKeys(HomeSiteDtos.Facing)];
	}

	get foundationTypes(): Array<string>
	{
		return this.enumKeys(HomeSiteDtos.FoundationType);
	}

	get viewAdjacencies(): Array<HomeSiteDtos.ILabel>
	{
		return this.homeSiteService.viewAdjacencies;
	}

	get physicalLotTypes(): Array<HomeSiteDtos.ILabel>
	{
		return this.homeSiteService.physicalLotTypes;
	}

	get homesiteFormValues()
	{
		return this.homesiteForm.value;
	}

	isHandingSelected(handing: HomeSiteDtos.Handing): boolean
	{
		return this.selectedHomesite.dto.lotHandings.some(h => h.handingId === handing);
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
		return !(this.homesiteForm.controls['handing-1'].value || this.homesiteForm.controls['handing-2'].value || this.homesiteForm.controls['handing-3'].value);
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
			if (rule.monotonyRuleTypeId === 1)
			{
				this.elevationSelectedLots.push(String(this.lots.find(x => x.dto.id === rule.relatedEdhLotId).lotBlock));
			}
			else
			{
				this.colorSelectedLots.push(String(this.lots.find(x => x.dto.id === rule.relatedEdhLotId).lotBlock));
			}
		})

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

	saveMonotonyRules()
	{
		const monotonyRulesToSave: Array<MonotonyRule> = [];
		const lotId = this.selectedHomesite.dto.id;

		this.elevationSelectedLots.forEach(lot =>
		{
			monotonyRulesToSave.push({
				monotonyRuleId: 0,
				monotonyRuleTypeId: 1,
				edhLotId: lotId,
				relatedEdhLotId: this.lots.find(x => x.lotBlock === lot).dto.id
			})
		});

		this.colorSelectedLots.forEach(lot =>
		{
			monotonyRulesToSave.push({
				monotonyRuleId: 0,
				monotonyRuleTypeId: 2,
				edhLotId: lotId,
				relatedEdhLotId: this.lots.find(x => x.lotBlock === lot).dto.id
			})
		});

		this.onSaveMonotonyRules.emit({ lotId: lotId, monotonyRules: monotonyRulesToSave });
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

	async onNavChange($event: NgbTabChangeEvent)
	{
		this.currentTab = $event.nextId;
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	onCancel()
	{
		this.sidePanel.toggleSidePanel(false);
	}

	showCheckbox()
	{
		this.showCheckBoxes = !this.showCheckBoxes;
	}

	private getNewLotStatus(origStatus: string, makeUnavailable: boolean): any
	{
		return !this.canEditAvailability || !makeUnavailable ? origStatus : 'Unavailable';
	}

	saveHomesite()
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

		const lotBuildTypeUpdated = this.homesiteForm.controls['changeModelToSpec'].dirty;
		this.selectedHomesite.dto.lotBuildTypeDescription = lotBuildTypeUpdated ? this.homesiteForm.controls['changeModelToSpec'].value : this.selectedHomesite.lotBuildTypeDescription;

		this.onSaveHomesite.emit({ homesiteDto: this.selectedHomesite.dto, lotBuildTypeUpdated: lotBuildTypeUpdated});
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
}
