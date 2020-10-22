import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { distinctUntilChanged, filter, switchMap, tap, map, combineLatest, finalize, take } from 'rxjs/operators';
import { of ,  Observable } from 'rxjs';

import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { MergeField, CommunityMergeField, isCommunityMergeField } from '../../../shared/models/mergeField.model';
import { ESignField } from '../../../shared/models/ESignFields.model';
import { FinancialMarket } from '../../../shared/models/financialMarket.model';
import { FinancialCommunity } from '../../../shared/models/financialCommunity.model';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { ConfirmModalComponent } from 'phd-common/components/confirm-modal/confirm-modal.component';
import { MergeFieldsSidePanelComponent } from '../../../contracts/components/merge-fields-side-panel/merge-fields-side-panel.component';
import { SignFieldsComponent } from '../sign-fields/sign-fields.component';

import { OrganizationService } from '../../../core/services/organization.service';
import { MessageService } from 'primeng/api';
import { ContractService } from '../../../core/services/contract.service';
import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';

import { CanComponentDeactivate } from 'phd-common/guards/can-deactivate.guard';
import { PhdTableComponent } from 'phd-common/components/table/phd-table.component';

@Component({
	selector: 'merge-fields',
	templateUrl: './merge-fields.component.html',
	styleUrls: ['./merge-fields.component.scss']
})
export class MergeFieldsComponent extends UnsubscribeOnDestroy implements OnInit, CanComponentDeactivate
{
	@ViewChild(MergeFieldsSidePanelComponent)
	private sidePanel: MergeFieldsSidePanelComponent;

	@ViewChild(SignFieldsComponent)
	private eSignField: SignFieldsComponent;

	sidePanelOpen: boolean = false;
	loading: boolean = false;
	activeCommunities: Observable<Array<FinancialCommunityViewModel>>;
	marketMergeFields: Array<MergeField> = [];
	communityMergeFields: Array<CommunityMergeField> = [];
	currentMkt: FinancialMarket;
	selected: MergeField | CommunityMergeField;
	selectedCommunity: FinancialCommunity = null;
	newOrUpdatedMergeField: MergeField = null;
	existingSignField: ESignField = null;
	selectedTab: 'Market' | 'Community' | 'SignFields';
	canAddSignField: boolean = false;
	canEdit: boolean = false;
	saving: boolean = false;

	constructor(
		private _orgService: OrganizationService,
		private _contractService: ContractService,
		private _msgService: MessageService,
		private _modalService: NgbModal,
		private _route: ActivatedRoute
	) { super() }

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return this.sidePanelOpen ? !this.sidePanel.mergeFieldsForm.dirty : true;
	}

	ngOnInit(): void
	{
		let mkt$ = this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			distinctUntilChanged(),
			filter(mkt => !!mkt)
		);

		this.activeCommunities = mkt$.pipe(
			switchMap(mkt =>
			{
				return mkt ? this._orgService.getFinancialCommunities(mkt.id) : of([]);
			}),
			map(comms => comms.map(comm => new FinancialCommunityViewModel(comm)).filter(c => c.isActive))
		);

		mkt$.pipe(
			tap(mkt =>
			{
				this.marketMergeFields = [];
				this.communityMergeFields = [];
				this.currentMkt = mkt;
				this.selectedTab = 'Market';
				this.onSidePanelClose(false);
			}),
			switchMap(mkt =>
				this._contractService.getMergeFields(mkt.id)
			)
		).subscribe(data =>
		{
			this.marketMergeFields = data;
		});

		this._orgService.currentCommunity$.pipe(
			this.takeUntilDestroyed(),
			tap(comm =>
			{
				this.selectedCommunity = comm;
			}),
			filter(comm => !!comm),
			switchMap(comm =>
				this._contractService.getAllMergeFields(this.currentMkt.id, comm.id).pipe(
					combineLatest(this._contractService.getSignField(comm.id))
				)
			)
		).subscribe(([communityMergeFields, eSignField]) =>
		{
			this.existingSignField = eSignField;

			if (this.canAddSignField === true && this.selectedTab === 'Market')
			{
				this.selectedTab = 'SignFields';
				this.canAddSignField = false;
			}

			communityMergeFields.forEach(item =>
			{
				if (item.customFieldFinancialCommunities.length)
				{
					this.communityMergeFields.push(item.customFieldFinancialCommunities[0]);
				}
				else
				{
					this.communityMergeFields.push({
						customFieldFinancialCommunityId: this.selectedCommunity.id,
						fieldName: item.fieldName,
						fieldValue: item.fieldValue,
						isActive: item.isActive,
						customFieldMarketId: item.customFieldMarketId,
						financialCommunityId: this.selectedCommunity.id,
						marketFieldValue: item.fieldValue
					});
				}
			})

			for (let communityMergeField of this.communityMergeFields)
			{
				let marketMergeField = this.marketMergeFields.find(t => t.customFieldMarketId === communityMergeField.customFieldMarketId);

				if (marketMergeField)
				{
					communityMergeField.fieldName = marketMergeField.fieldName;
				}
			}
		});

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed(),
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	onTabClick(selectedTab: any)
	{
		if (selectedTab === 'Market' || selectedTab === 'Community')
		{
			if ((this.selectedTab === 'SignFields') ? !this.eSignField.signFieldForm.dirty : true)
			{
				this.selectedTab = selectedTab;
			}
			else
			{
				let ngbModalOptions: NgbModalOptions = {
					centered: true,
					backdrop: 'static',
					keyboard: false
				};

				let msgBody = `If you continue you will lose your changes.<br><br>Do you wish to continue?`;
				let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

				confirm.componentInstance.title = 'Warning!';
				confirm.componentInstance.body = msgBody;
				confirm.componentInstance.defaultOption = 'Cancel';

				confirm.result.then((result) =>
				{
					if (result == 'Continue')
					{
						this.selectedTab = selectedTab;
					}

				}, (reason) =>
				{

				});
			}
		}
		else
		{
			this.selectedTab = selectedTab;
		}
	}

	onChangeCommunity(comm: FinancialCommunity)
	{
		this.communityMergeFields = []; // Reset

		if (this.selectedTab === 'SignFields')
		{
			this.selectedTab = 'Market';
			this.canAddSignField = true;
		}

		if (comm != null)
		{
			this._orgService.selectCommunity(comm);
		}
	}

	addField()
	{
		this.selected = null;
		this.sidePanelOpen = true;
	}

	editMergeField(dto: any)
	{
		this.selected = dto;
		this.sidePanelOpen = true;
	}

	onSidePanelClose(status: boolean)
	{
		this.sidePanelOpen = status;
	}

	resetAllCommunityFieldValues()
	{
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};

		let msgBody = `Are you sure you want to reset all of the community fields to the market values?`;

		let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				const communityFieldsToBeReset = [...this.communityMergeFields.filter(t => t.fieldValue !== t.marketFieldValue).map(f =>
				{
					return { ...f, fieldValue: f.marketFieldValue };
				})];

				this._contractService.deleteCommunityMergeField(communityFieldsToBeReset)
					.subscribe(result =>
					{
						this.fetchAllMergeFields();

						this._msgService.add({ severity: 'success', summary: 'Merge Fields', detail: `have been reverted!` });
					},
					error =>
					{
						this._msgService.add({ severity: 'error', summary: 'Error', detail: error.message });
					});
			}
		}, (reason) =>
		{

		});
	}

	resetCommunityFieldValue(communityFieldDto: CommunityMergeField)
	{
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};

		let msgBody = `Are you sure you want to reset this field value to the market value?`;

		let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this._contractService.deleteCommunityMergeField([communityFieldDto])
					.subscribe(result =>
					{
						this.fetchAllMergeFields();

						this._msgService.add({ severity: 'success', summary: 'Merge Field', detail: `has been reverted!` });
					},
					error =>
					{
						this._msgService.add({ severity: 'error', summary: 'Error', detail: error.message });
					});
			}
		}, (reason) =>
		{

		});
	}

	save(mergeFieldDto: MergeField | CommunityMergeField)
	{
		//Add/Update for the current community
		if (isCommunityMergeField(mergeFieldDto))
		{
			mergeFieldDto.financialCommunityId = this.selectedCommunity.id;

			// Check if it's an existing or a new community merge field
			if (mergeFieldDto.customFieldFinancialCommunityId === this.selectedCommunity.id)
			{

				// It's a new field
				this._contractService.saveCommunityMergeField(mergeFieldDto).subscribe(result =>
				{
					this.fetchAllMergeFields();

					this.onSidePanelClose(false);
					this._msgService.add({ severity: 'success', summary: 'Merge Field', detail: `has been saved!` });
				})
			}
			else
			{
				this._contractService.updateCommunityMergeFields([mergeFieldDto])
					.subscribe((communityFieldsDto: Array<CommunityMergeField>) =>
					{
						this.fetchAllMergeFields();

						this.onSidePanelClose(false);
						this._msgService.add({ severity: 'success', summary: 'Merge Field', detail: `has been saved!` });
					});
			}
		}
		else
		{
			this._orgService.getInternalOrgs(this.currentMkt.id).pipe(
				finalize(() =>
				{
					this.saving = false;
				}),
				combineLatest(this.activeCommunities),
				take(1),
				switchMap(([orgs, edhCommunities]) =>
				{
					// get a list of active phd communities
					let activePhdCommunties = orgs.filter(x => x.edhFinancialCommunityId != null && edhCommunities.some(a => a.id == x.edhFinancialCommunityId && a.isActive));

					mergeFieldDto.communityIds = activePhdCommunties.map(x => x.orgID);
					mergeFieldDto.marketId = this.currentMkt.id;
					
					return this._contractService.saveMergeField(mergeFieldDto);
				}),
				tap(data =>
				{
					this.newOrUpdatedMergeField = data;
				})
			).subscribe(result =>
			{
				if (this.selected)
				{
					let marketFieldIndex = this.marketMergeFields.findIndex(t => t.customFieldMarketId === this.selected.customFieldMarketId);
					this.marketMergeFields[marketFieldIndex] = this.newOrUpdatedMergeField;
				}
				else
				{
					this.marketMergeFields.push(this.newOrUpdatedMergeField);
				}

				if (this.selectedCommunity)
				{
					this.fetchAllMergeFields();
				}

				this.onSidePanelClose(false);

				this._msgService.add({ severity: 'success', summary: 'Merge Field', detail: `has been saved!` });
			});
		}
	}

	fetchAllMergeFields()
	{
		this._contractService.getAllMergeFields(this.currentMkt.id, this.selectedCommunity.id).subscribe(dto =>
		{
			// Reset community fields
			this.communityMergeFields = [];

			dto.forEach(item =>
			{
				if (item.customFieldFinancialCommunities.length)
				{
					this.communityMergeFields.push(item.customFieldFinancialCommunities[0]);
				}
				else
				{
					this.communityMergeFields.push({
						customFieldFinancialCommunityId: this.selectedCommunity.id,
						fieldName: item.fieldName,
						fieldValue: item.fieldValue,
						isActive: item.isActive,
						customFieldMarketId: item.customFieldMarketId,
						financialCommunityId: this.selectedCommunity.id,
						marketFieldValue: item.fieldValue
					});
				}
			})

			for (let communityMergeField of this.communityMergeFields)
			{
				let marketMergeField = this.marketMergeFields.find(t => t.customFieldMarketId === communityMergeField.customFieldMarketId);

				if (marketMergeField)
				{
					communityMergeField.fieldName = marketMergeField.fieldName;
				}
			}
		});
	}

	deleteMergeField(mergeFieldDto: MergeField)
	{
		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};

		let msgBody = `Are you sure you want to delete this market custom field?`;

		let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				this._contractService.deleteMergeField(mergeFieldDto)
					.subscribe(data =>
					{
						this.marketMergeFields = this.marketMergeFields.filter(t => t.customFieldMarketId !== mergeFieldDto.customFieldMarketId);
						this.communityMergeFields = this.communityMergeFields.filter(t => t.customFieldMarketId !== mergeFieldDto.customFieldMarketId);

						this._msgService.add({ severity: 'success', summary: 'Merge Field', detail: `has been deleted!` });
					});
			}
		},
		(reason) =>
		{

		});
	}

	onSaveSignField(dto: ESignField)
	{
		this.existingSignField = dto;
	}

	showTooltip(event: any, tooltipText: string, tableComponent: PhdTableComponent): void
	{
		tableComponent.showTooltip(event, tooltipText);
	}

	hideTooltip(tableComponent: PhdTableComponent): void
	{
		tableComponent.hideTooltip();
	}
}
