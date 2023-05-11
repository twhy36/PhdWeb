import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

import { MessageService } from 'primeng/api';
import { mergeMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { ContractTemplate, ITemplateType } from '../../../shared/models/contracts.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { ContractService } from '../../../core/services/contract.service';
import { SidePanelComponent } from 'phd-common';

import * as moment from 'moment';
import { environment } from '../../../../../environments/environment';

@Component({
	selector: 'view-contracts-side-panel-component',
	templateUrl: './view-contracts-side-panel.component.html',
	styleUrls: ['./view-contracts-side-panel.component.scss']
})
export class ViewContractsSidePanelComponent implements OnInit
{
	@ViewChild(SidePanelComponent)
	private sidePanel: SidePanelComponent

	@Output() onSave = new EventEmitter<object>();
	@Output() onSidePanelClose = new EventEmitter<boolean>();

	@Input() selected: ContractTemplate;
	@Input() currentMktId: number;
	@Input() saving: boolean;
	@Input() sidePanelOpen: boolean = false;
	@Input() contracts: Array<ContractTemplate> = [];

	selectedTemplateTypeId: number;

	viewContractsForm: UntypedFormGroup;
	allCommunities: Array<FinancialCommunity> = [];
	communitiesForSelectedTemplate: Array<FinancialCommunity> = [];
	selectedCommunities: Array<FinancialCommunity> = [];
	communitiesWithExistingTemplate: Array<number> = [];
	currentTab: string = 'details';
	environment = environment;

	oneDay: number = 86400000;
	effectiveDate: Date;
	expirationDate: Date;
	minEffectiveDate: Date = new Date(new Date().getTime() - this.oneDay);
	minDate: Date = new Date();
	documentAssociated: boolean = false;

	public templateTypes: Array<ITemplateType> = [
		{ label: 'Sales Agreement', value: 'SalesAgreement', id: 1 },
		{ label: 'Addendum', value: 'Addendum', id: 2 },
		{ label: 'Cancel Form', value: 'CancelForm', id: 3 },
		{ label: 'Consent to do Business Electronically', id: 5 }
	];

	public addendaTypes: Array<ITemplateType> = [
		{ label: 'FHA', value: 'FHA', id: 1 },
		{ label: 'VA', value: 'VA', id: 2 },
		{ label: 'QMI', value: 'QMI', id: 3 },
		{ label: 'Real Estate Agent', value: 'RealEstateAgent', id: 4 },
		{ label: 'Smart Home', value: 'SmartHome', id: 5 },
		{ label: 'Red or Yellow State', value: 'Red or Yellow State', id: 6 },
		{ label: 'Include in all contracts', value: 'IncludeInAllContracts', id: 7 },
		{ label: 'Other', value: 'Other', id: 8 }
	]

	get isDirty(): boolean
	{
		return this.viewContractsForm.dirty;
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = (!this.selected) ? (this.viewContractsForm.pristine || !this.viewContractsForm.valid) : (!this.viewContractsForm.valid || !this.viewContractsForm.dirty);

		return saveDisabled;
	}

	get documentType(): ITemplateType
	{
		return this.templateTypes.find(t => t.id === this.selected.templateTypeId);
	}

	constructor(
		private _orgService: OrganizationService,
		private _contractService: ContractService,
		private _msgService: MessageService
	) { }

	ngOnInit()
	{
		this._orgService.getFinancialCommunities(this.currentMktId)
			.subscribe(data =>
			{
				this.allCommunities = data.filter(t => t.salesStatusDescription === "Active" || t.salesStatusDescription === 'New');
				this.createForm();

				if (this.selected)
				{
					this.updateSelection();

					for (let commId of this.selected.assignedCommunityIds)
					{
						let community = this.allCommunities.find(t => t.id === commId);

						if (community)
						{
							this.selectedCommunities.push(community);
						}
					}

					for (let comm of this.selectedCommunities)
					{
						this.communitiesForSelectedTemplate = this.communitiesForSelectedTemplate.filter(t => t.id !== comm.id);
					}
				}
			})

		this.selected && this.selected.templateId && this.checkForDocument(this.selected.templateId);
	}

	convertDate(date)
	{
		return moment.parseZone(date).format("M/DD/YYYY")
	}

	createForm()
	{
		if (this.selected)
		{
			this.effectiveDate = this.selected.effectiveDate ? new Date(this.convertDate(this.selected.effectiveDate)) : null;
			this.expirationDate = this.selected.expirationDate ? new Date(this.convertDate(this.selected.expirationDate)) : null;

			if (this.selected.templateId === null && this.selected.parentTemplateId !== null)
			{
				let today = new Date(Date.now());

				this.minEffectiveDate.setDate(today.getDate());
			}

			if (this.effectiveDate)
			{
				this.minDate = new Date(this.effectiveDate.getTime() + this.oneDay);
			}
		}

		let isPhd = this.selected ? this.selected.isPhd : true;
		let isTho = this.selected ? this.selected.isTho : false;
		let documentName = this.selected ? this.selected.documentName : null;
		let displayName = this.selected ? this.selected.displayName : null;
		let templateTypeId = this.selected ? this.selected.templateTypeId : null;
		let addendumTypeId = this.selected ? this.selected.addendumTypeId : null;
		let assignedCommunityIds = this.selected ? this.selected.assignedCommunityIds : null;
		let parentTemplateId = this.selected ? this.selected.parentTemplateId : null;
		let templateId = this.selected ? this.selected.templateId : null;

		const pattern = "^[^\\\\/:*?<>]*$";

		this.viewContractsForm = new UntypedFormGroup({
			'isPhd': new UntypedFormControl({ value: isPhd, disabled: (this.selected && templateTypeId !== 2 && this.selected.status === "In Use") }),
			'isTho': new UntypedFormControl({ value: isTho, disabled: (this.selected && templateTypeId !== 2 && this.selected.status === "In Use") }),
			'documentName': new UntypedFormControl({ value: documentName, disabled: (this.selected && this.selected.status === "In Use") }, [Validators.required, this.duplicateName(), this.whiteSpaceValidator(), Validators.pattern(pattern)]),
			'displayName': new UntypedFormControl({ value: displayName, disabled: (this.selected && this.selected.status === "In Use") }, [Validators.required, this.whiteSpaceValidator()]),
			'templateTypeId': new UntypedFormControl(templateTypeId),
			'addendumTypeId': new UntypedFormControl(addendumTypeId),
			'effectiveDate': new UntypedFormControl({ value: this.effectiveDate ? this.effectiveDate.toISOString() : null, disabled: (this.selected && this.selected.status === "In Use") }),
			'expirationDate': new UntypedFormControl(this.expirationDate ? this.expirationDate.toISOString() : null),
			'assignedCommunityIds': new UntypedFormControl(assignedCommunityIds),
			'parentTemplateId': new UntypedFormControl(parentTemplateId),
			'templateId': new UntypedFormControl(templateId)
		}, [this.requireCheckBoxesToBeCheckedValidator(), this.addendumTypeValidator()]);
	}

	setMinimumExpirationDate(dateSet: Date = this.effectiveDate)
	{
		this.minDate = new Date(dateSet.getTime() + this.oneDay);

		if (this.viewContractsForm.value.expirationDate && (new Date(this.viewContractsForm.value.expirationDate).getTime() < this.minDate.getTime()))
		{
			this.expirationDate = this.minDate;

			this.onSetDate(this.minDate, 'expiration');
		}

		this.onSetDate(dateSet, 'effective');
	}

	save()
	{
		// Prevents users from rapidly double clicking save and creating a contract twice
		if (!this.saving)
		{
			this.viewContractsForm.controls['assignedCommunityIds'].setValue(this.selectedCommunities.map(t => t.id));
			this.saveNewOrgs(this.selectedCommunities);
		}
	}

	onSetDate(event: Date, dateType: 'expiration' | 'effective')
	{
		if (dateType === 'expiration')
		{
			this.viewContractsForm.controls.expirationDate.setValue(event.toISOString());
		}
		else
		{
			this.viewContractsForm.controls.effectiveDate.setValue(event.toISOString());
		}

		this.viewContractsForm.markAsDirty();
	}

	saveNewOrgs(financialCommunityDto: Array<FinancialCommunity>)
	{
		this.saving = true;
		this._orgService.getInternalOrgs(this.currentMktId).pipe(
			mergeMap(orgs =>
			{
				for (let financialCommunity of financialCommunityDto)
				{
					let org = orgs.find(o => o.edhFinancialCommunityId === financialCommunity.id);

					if (!org)
					{
						return this._orgService.createInternalOrg(financialCommunity);
					}
				}

				return of(orgs);
			})
		).subscribe(data =>
		{
			// Enable these so the as ContractTemplate cast properly picks up these to form values
			this.viewContractsForm.get('isPhd').enable();
			this.viewContractsForm.get('isTho').enable();

			this.onSave.emit(this.viewContractsForm.value as ContractTemplate);
		},
		error =>
		{
			this._msgService.add({ severity: 'error', summary: 'Error', detail: error.message });
			this.saving = false;
		});
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	onCancel()
	{
		this.sidePanel.toggleSidePanel();
	}

	updateSelectionFromFormGroup()
	{
		// This logic should be removed when isTho is scaled to all markets
		// Update only if templateType selected and new contract
		if (this.viewContractsForm.get('templateTypeId').value && this.selected?.status !== "In Use")
		{
			this.updateSelection();
		}
	}

	updateSelection()
	{
		this.viewContractsForm.get('isPhd').enable();
		this.viewContractsForm.get('isTho').enable();
		this.selectedTemplateTypeId = this.viewContractsForm.get('templateTypeId').value;

		if (this.selectedTemplateTypeId !== 2)
		{
			// If template is Consent to do Business Electronically, force it to be THO only
			if (this.selectedTemplateTypeId === 5)
			{
				this.viewContractsForm.get('isPhd').setValue(false);
				this.viewContractsForm.get('isTho').setValue(true);
				this.viewContractsForm.get('isPhd').disable();
				this.viewContractsForm.get('isTho').disable();
			}

			const isPhd = this.viewContractsForm.get('isPhd').value;
			const isTho = this.viewContractsForm.get('isTho').value;

			this._contractService.getCommunitiesWithExistingTemplate(this.currentMktId, this.selectedTemplateTypeId, isPhd, isTho)
				.subscribe(data =>
				{
					this.communitiesWithExistingTemplate = data;
					this.communitiesForSelectedTemplate = this.allCommunities.slice(0); // Create new array with allCommunities

					for (let comm of this.communitiesWithExistingTemplate)
					{
						this.communitiesForSelectedTemplate = this.communitiesForSelectedTemplate.filter(t => t.id !== comm);
					}
				});
		}
		else
		{
			this.communitiesForSelectedTemplate = this.allCommunities.slice(0); // Create new array with allCommunities
		}

		this.selectedCommunities = [];
	}

	duplicateName(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: boolean } =>
		{
			if (this.selected)
			{
				let inputName = control.value as string;
				let remainingTemplates = this.contracts.filter(t => t.templateId !== this.selected.templateId);
				let existingName = inputName ? remainingTemplates.find(n => n.documentName.toLowerCase() === inputName.toLowerCase()) : null;

				return existingName ? { duplicateName: true } : null;
			}

			let inputName = control.value as string;
			let existingName = inputName ? this.contracts.find(n => n.documentName.toLowerCase() === inputName.toLowerCase()) : null;

			return existingName ? { duplicateName: true } : null;
		};
	}

	whiteSpaceValidator(): ValidatorFn
	{
		return (control: AbstractControl): { [key: string]: any } =>
		{
			let isWhitespace = (control.value || '').trim().length === 0;
			let isValid = !isWhitespace;

			return isValid ? null : { whiteSpaceValidator: true }
		};
	}

	requireCheckBoxesToBeCheckedValidator(): ValidatorFn
	{
		return (formGroup: UntypedFormGroup): { [key: string]: any } =>
		{
			if (formGroup.controls['isPhd'].value === false && formGroup.controls['isTho'].value === false)
			{
				return { requireCheckBoxesToBeChecked: true };
			}

			return null;
		}
	}

	addendumTypeValidator(): ValidatorFn
	{
		return (formGroup: UntypedFormGroup): { [key: string]: any } =>
		{
			if (formGroup.controls['templateTypeId'].value === 2 && formGroup.controls['addendumTypeId'].value === null)
			{
				return { requireAddendumSelect: true };
			}

			return null;
		}
	}

	addHighlightedItems()
	{
		for (let communityId of this.viewContractsForm.controls['assignedCommunityIds'].value)
		{
			var currentTag = this.communitiesForSelectedTemplate.filter(t => t.id === communityId);

			if (currentTag != null)
			{
				const index = this.communitiesForSelectedTemplate.indexOf(currentTag[0]);

				if (index !== -1)
				{
					this.communitiesForSelectedTemplate.splice(index, 1);
				}

				this.selectedCommunities.push({
					id: currentTag[0].id,
					isPhasedPricingEnabled: currentTag[0].isPhasedPricingEnabled,
					key: currentTag[0].key,
					marketId: currentTag[0].marketId,
					salesCommunityId: currentTag[0].salesCommunityId,
					financialBrandId: currentTag[0].financialBrandId,
					name: currentTag[0].name,
					salesStatusDescription: currentTag[0].salesStatusDescription,
					isColorSchemeMonotonyRuleEnabled: currentTag[0].isColorSchemeMonotonyRuleEnabled,
					isElevationMonotonyRuleEnabled: currentTag[0].isElevationMonotonyRuleEnabled,
					isColorSchemePlanRuleEnabled: currentTag[0].isColorSchemePlanRuleEnabled,
					isDesignPreviewEnabled: currentTag[0].isDesignPreviewEnabled,
					isOnlineSalesEnabled: currentTag[0].isOnlineSalesEnabled
				});
			}
		}
	}

	addAllItems()
	{
		this.communitiesForSelectedTemplate.forEach(comm =>
		{
			this.selectedCommunities.push(comm);
		});

		this.communitiesForSelectedTemplate = [];
	}

	removeAllItems()
	{
		this.selectedCommunities.forEach(comm =>
		{
			this.communitiesForSelectedTemplate.push(comm);
		});

		this.selectedCommunities = [];

		this.viewContractsForm.markAsDirty();
	}

	removeItem(tag: FinancialCommunity)
	{
		const items = this.selectedCommunities;

		// If it is currently an active Consent to do Business Electronically don't add
		if (this.selected && this.selected.templateTypeId === 5 && this.selected.status === 'In Use' && tag)
		{
			this._msgService.add({ severity: 'error', summary: 'Error', detail: 'Cannot unassign community from \'In-Use\' document.' });
		}
		else if (tag)
		{
			const index = items.indexOf(tag);

			if (index !== -1)
			{
				items.splice(index, 1);
				this.viewContractsForm.markAsDirty();
			}

			this.communitiesForSelectedTemplate.push(tag);
		}
	}
		
	checkForDocument(templateId: number)
	{
		this._contractService.getTemplateUrl(templateId)
			.subscribe(data =>
			{
				this.documentAssociated = true;
			},
			error =>
			{
				this.documentAssociated = false;
			});
	}
}
