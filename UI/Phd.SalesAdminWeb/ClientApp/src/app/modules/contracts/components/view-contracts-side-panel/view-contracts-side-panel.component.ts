import { Component, OnInit, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl, ValidatorFn } from '@angular/forms';

import { flatMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { ContractTemplate, ITemplateType } from '../../../shared/models/contracts.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { OrganizationService } from '../../../core/services/organization.service';
import { ContractService } from '../../../core/services/contract.service';
import { SidePanelComponent } from 'phd-common/components/side-panel/side-panel.component';

import * as moment from "moment";

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
	selectedTemplateTypeId: number;
	@Input() contracts: Array<ContractTemplate> = [];

	viewContractsForm: FormGroup;
	allCommunities: Array<FinancialCommunity> = [];
	communitiesForSelectedTemplate: Array<FinancialCommunity> = [];
	selectedCommunities: Array<FinancialCommunity> = [];
	communitiesWithExistingTemplate: Array<number> = [];

	oneDay: number = 86400000;
	effectiveDate: Date;
	expirationDate: Date;
	minEffectiveDate: Date = new Date(new Date().getTime() - this.oneDay);
	minDate: Date = new Date();

	public templateTypes: Array<ITemplateType> = [
		{ label: 'Sales Agreement', value: 'SalesAgreement', id: 1 },
		{ label: 'Addendum', value: 'Addendum', id: 2 },
		{ label: 'Cancel Form', value: 'CancelForm', id: 3 }
	];

	get isDirty(): boolean
	{
		return this.viewContractsForm.dirty;
	}

	get saveDisabled(): boolean
	{
		let saveDisabled = (!this.selected) ? (this.viewContractsForm.pristine || !this.viewContractsForm.valid) : (!this.viewContractsForm.valid);

		return saveDisabled;
	}

	get documentType(): ITemplateType
	{
		return this.templateTypes.find(t => t.id === this.selected.templateTypeId);
	}

	constructor(
		private _orgService: OrganizationService,
		private _contractService: ContractService
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

		let documentName = this.selected ? this.selected.documentName : null;
		let displayName = this.selected ? this.selected.displayName : null;
		let templateTypeId = this.selected ? this.selected.templateTypeId : null;
		let assignedCommunityIds = this.selected ? this.selected.assignedCommunityIds : null;
		let parentTemplateId = this.selected ? this.selected.parentTemplateId : null;
		let templateId = this.selected ? this.selected.templateId : null;

		const pattern = "^[^\\\\/:*?<>]*$";

		this.viewContractsForm = new FormGroup({
			'documentName': new FormControl({ value: documentName, disabled: (this.selected && this.selected.status === "In Use") }, [Validators.required, this.duplicateName(), this.whiteSpaceValidator(), Validators.pattern(pattern)]),
			'displayName': new FormControl({ value: displayName, disabled: (this.selected && this.selected.status === "In Use") }, [Validators.required, this.whiteSpaceValidator()]),
			'templateTypeId': new FormControl(templateTypeId),
			'effectiveDate': new FormControl({ value: this.effectiveDate ? this.effectiveDate.toISOString() : null, disabled: (this.selected && this.selected.status === "In Use") }),
			'expirationDate': new FormControl(this.expirationDate ? this.expirationDate.toISOString() : null),
			'assignedCommunityIds': new FormControl(assignedCommunityIds),
			'parentTemplateId': new FormControl(parentTemplateId),
			'templateId': new FormControl(templateId)
		});
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
		this.viewContractsForm.controls['assignedCommunityIds'].setValue(this.selectedCommunities.map(t => t.id));
		this.saveNewOrgs(this.selectedCommunities);
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
	}

	saveNewOrgs(financialCommunityDto: Array<FinancialCommunity>)
	{
		this._orgService.getInternalOrgs(this.currentMktId).pipe(
			flatMap(orgs =>
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
			this.onSave.emit(this.viewContractsForm.value as ContractTemplate);
			this.saving = true;
		});
	}

	onCloseSidePanel(status: boolean)
	{
		this.onSidePanelClose.emit(status);
	}

	onCancel()
	{
		this.sidePanel.toggleSidePanel(false);
	}

	updateSelection()
	{
		this.selectedTemplateTypeId = this.viewContractsForm.get('templateTypeId').value;

		if (this.selectedTemplateTypeId !== 2)
		{
			this._contractService.getCommunitiesWithExistingTemplate(this.currentMktId, this.selectedTemplateTypeId)
				.subscribe(data =>
				{
					this.communitiesWithExistingTemplate = data;
					this.communitiesForSelectedTemplate = this.allCommunities;

					for (let comm of this.communitiesWithExistingTemplate)
					{
						this.communitiesForSelectedTemplate = this.communitiesForSelectedTemplate.filter(t => t.id !== comm);
					}
				});
		}
		else
		{
			this.communitiesForSelectedTemplate = this.allCommunities;
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
					name: currentTag[0].name,
					salesStatusDescription: currentTag[0].salesStatusDescription
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
	}

	removeItem(tag: FinancialCommunity)
	{
		const items = this.selectedCommunities;

		if (tag)
		{
			const index = items.indexOf(tag);

			if (index !== -1)
			{
				items.splice(index, 1);
			}

			this.communitiesForSelectedTemplate.push(tag);
		}
	}
}
