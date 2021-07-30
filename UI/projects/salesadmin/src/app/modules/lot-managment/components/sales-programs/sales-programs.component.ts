import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';
import { tap, switchMap, map, finalize, combineLatest } from 'rxjs/operators';

import { UnsubscribeOnDestroy } from '../../../shared/utils/unsubscribe-on-destroy';
import { FinancialCommunity, FinancialCommunityInfo } from '../../../shared/models/financialCommunity.model';
import { SalesProgram } from '../../../shared/models/salesPrograms.model';
import { SalesService } from '../../../core/services/sales.service';
import { MessageService } from 'primeng/api';
import { OrganizationService } from '../../../core/services/organization.service';
import { FinancialCommunityViewModel } from '../../../shared/models/plan-assignment.model';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmModalComponent, PhdTableComponent } from 'phd-common';
import { SalesProgramsSidePanelComponent } from '../sales-programs-side-panel/sales-programs-side-panel.component';

import * as moment from 'moment';
import { Org } from '../../../shared/models/org.model';

@Component({
	selector: 'sales-programs',
	templateUrl: './sales-programs.component.html',
	styleUrls: ['./sales-programs.component.scss']
})

export class SalesProgramsComponent extends UnsubscribeOnDestroy implements OnInit
{
	@ViewChild(SalesProgramsSidePanelComponent)
	private sidePanel: SalesProgramsSidePanelComponent;

	private _selected: SalesProgram;

	saving: boolean = false;
	sidePanelOpen: boolean = false;
	activeCommunities: Array<FinancialCommunityViewModel>;
	selectedCommunity: FinancialCommunityViewModel = null;
	canEdit: boolean = false;
	salesPrograms: Array<SalesProgram>;
	_loading: boolean = true;
	financialCommunityInfo: FinancialCommunityInfo;
	internalOrgs: Array<Org>;
	orgId: number;

	constructor(
		private _salesService: SalesService,
		private _orgService: OrganizationService,
		private _modalService: NgbModal,
		private _msgService: MessageService,
		private _route: ActivatedRoute
	) { super() }

	@HostListener('window:beforeunload')
	canDeactivate(): Observable<boolean> | boolean
	{
		return this.sidePanelOpen ? !this.sidePanel.releaseForm.dirty : true
	}

	ngOnInit()
	{
		this._orgService.currentMarket$.pipe(
			this.takeUntilDestroyed(),
			tap(mkt =>
			{
				this.loading = true;
			}),
			switchMap(mkt =>
			{
				if (mkt)
				{
					return this._orgService.getFinancialCommunities(mkt.id).pipe(
						combineLatest(this._orgService.getInternalOrgs(mkt.id),
							this._orgService.currentCommunity$)
					);
				}
			})
		).subscribe(([comms, orgs, comm]) =>
		{
			this.activeCommunities = comms.map(comm => new FinancialCommunityViewModel(comm)).filter(c => c.isActive);

			this.orgId = orgs.find(o => o.edhFinancialCommunityId === comm.id)?.orgID;

			if (comm != null)
			{
				if (!this.selectedCommunity || this.selectedCommunity.id != comm.id)
				{
					this.selectedCommunity = new FinancialCommunityViewModel(comm);

					this._salesService.getSalesPrograms(comm.id)
						.pipe(
							combineLatest(this._orgService.getFinancialCommunityInfo(this.orgId))
						)
						.subscribe(([programs, fcInfo]) =>
						{
							this.salesPrograms = programs;
							this.financialCommunityInfo = fcInfo;

							if (this.financialCommunityInfo)
							{
								this.salesPrograms.map(sp =>
								{
									sp.isThoEnabled = this.financialCommunityInfo.thoBuyerClosingCostId === sp.id || this.financialCommunityInfo.thoDiscountFlatAmountId === sp.id;
								});
							}

							this.loading = false;
						});
				}
			}
			else
			{
				this.selectedCommunity = null;
			}
		});

		this._orgService.canEdit(this._route.parent.snapshot.data['requiresClaim']).pipe(
			this.takeUntilDestroyed()
		).subscribe(canEdit => this.canEdit = canEdit);
	}

	get loading(): boolean
	{
		return this._loading;
	}

	set loading(load)
	{
		if (load)
		{
			this.salesPrograms = null;
			this.onSidePanelClose(false);
		}

		this._loading = load;
	}

	onChangeCommunity(comm: FinancialCommunity)
	{
		this.loading = true;

		if (comm != null)
		{
			this._orgService.selectCommunity(comm);
		}
	}

	get selected(): SalesProgram
	{
		return this._selected;
	}

	set selected(item: SalesProgram)
	{
		this._selected = item;
	}

	onSidePanelClose(status: boolean)
	{
		this.sidePanelOpen = status;
	}

	save(dto: SalesProgram, inactivate: boolean = false)
	{
		this.saving = true;

		dto.financialCommunityId = this.selectedCommunity.id;
		dto.startDate = moment(dto.startDate).format('Y-MM-DD');
		dto.endDate = moment(dto.endDate).format('Y-MM-DD');

		this._salesService.saveSalesProgram(dto)
			.pipe(finalize(() =>
			{
				this.saving = false;
			}))
			.subscribe(newDto =>
			{
				if (!this.selected)
				{
					const newSalesProgram = new SalesProgram(newDto);

					// add new record and use spread to trigger table change.
					this.salesPrograms = [...this.salesPrograms, newSalesProgram];
				}
				else
				{
					this.salesPrograms.find(item => item.id === newDto.id).dto = newDto;
				}

				this.sort();
				this.onSidePanelClose(false);

				if (inactivate)
				{
					this._msgService.add({ severity: 'success', summary: `${dto.name}`, detail: `has been inactivated!` });
				}
				else
				{
					this._msgService.add({ severity: 'success', summary: 'Sales Program', detail: `has been saved!` });
				}
			},
			error =>
			{
				this._msgService.add({ severity: 'error', summary: 'Error', detail: error.message });
			});
	}

	sort()
	{
		this.salesPrograms.sort((a, b) =>
		{
			const strA = a.name.toUpperCase();
			const strB = b.name.toUpperCase();

			return strA < strB ? -1 : strA > strB ? 1 : 0;
		});
	}

	edit(dto: SalesProgram)
	{
		this.selected = dto;

		this.onSidePanelClose(true);
	}

	inactivate(dto: SalesProgram)
	{
		this.selected = dto;

		let ngbModalOptions: NgbModalOptions = {
			centered: true,
			backdrop: 'static',
			keyboard: false
		};

		let msgBody = `Are you sure you want to inactivate the Sales Program<br /><br /> <strong>${dto.name}</strong>`;

		let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

		confirm.componentInstance.title = 'Warning!';
		confirm.componentInstance.body = msgBody;
		confirm.componentInstance.defaultOption = 'Cancel';

		confirm.result.then((result) =>
		{
			if (result == 'Continue')
			{
				let currDate = new Date(moment.parseZone(moment()).toISOString()).toISOString().split('T')[0];
				let prevDate = moment(new Date(currDate).toISOString()).subtract(1, 'days').toISOString().split('T')[0];

				// set expiration date to yesterdays date
				dto.dto.endDate = prevDate;

				//If the Effective Date is current date, then set both the Effective Date and Expiration Date to yesterday's date.
				if (moment(currDate).isSame(dto.startDate))
				{
					dto.dto.startDate = prevDate;
				}

				this.save(dto.dto, true);
			}
		}, (reason) =>
		{
			console.log("Error:", reason);
		});
	}

	convertDate(date)
	{
		return moment.parseZone(date).format("M/DD/YYYY");
	}

	create()
	{
		this.selected = null;

		this.onSidePanelClose(true);
	}

	showTooltip(event: any, tooltipText: string, tableComponent: PhdTableComponent): void
	{
		tableComponent.showTooltip(event, tooltipText);
	}

	hideTooltip(tableComponent: PhdTableComponent): void
	{
		tableComponent.hideTooltip();
	}

	toggleThoEnabled(dto: SalesProgram)
	{
		if (!this.financialCommunityInfo)
		{
			this.financialCommunityInfo = {
				financialCommunityId: 0,
				defaultECOEMonths: null,
				earnestMoneyAmount: null,
				thoBuyerClosingCostId: null,
				thoDiscountFlatAmountId: null
			};
		}

		this.selected = dto;

		let thoEnabledCc = this.salesPrograms.find(sp => sp.isThoEnabled && sp.salesProgramType.toString() === 'BuyersClosingCost');

		let thoEnabledDfa = this.salesPrograms.find(sp => sp.isThoEnabled && sp.salesProgramType.toString() === 'DiscountFlatAmount');

		// Discount Flat Amount
		if (dto.salesProgramType.toString() === 'DiscountFlatAmount')
		{
			this.toggleDiscountFlatAmount(thoEnabledDfa, dto);
		}
		else
		{
			this.toggleClosingCostAmount(thoEnabledCc, dto);
		}
	}

	private toggleClosingCostAmount(thoEnabledCc: SalesProgram, dto: SalesProgram)
	{
		if (!dto.isPMCAffiliate || (thoEnabledCc && dto.id !== thoEnabledCc.id))
		{
            let ngbModalOptions: NgbModalOptions = {
                centered: true,
                backdrop: 'static',
                keyboard: false
            };

            let msgBody = `Selecting to enable this THO Sales Program will also enable PMC Affiliation and disable any other active THO Enabled BuyerClosingCost Sales Program`;

            let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

            confirm.componentInstance.title = 'Warning!';
            confirm.componentInstance.body = msgBody;
            confirm.componentInstance.defaultOption = 'Cancel';

			confirm.result.then((result) =>
			{
				if (result == 'Continue')
				{
                    this.financialCommunityInfo.thoBuyerClosingCostId = dto.isThoEnabled ? null : dto.id;
					this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId).subscribe(fc =>
					{
                        // Toggle existing enabled closing cost
						if (thoEnabledCc)
						{
                            thoEnabledCc.isThoEnabled = !thoEnabledCc.isThoEnabled;
                        }

                        // Toggle selected closing cost
                        dto.isThoEnabled = !dto.isThoEnabled;

                        // Update isPmcAffiliate if a closing cost is being tho enabled & isPMCAffiliate is false
						if (dto.isThoEnabled && !dto.dto.isPMCAffiliate)
						{
                            dto.dto.isPMCAffiliate = true;
                            this.save(dto.dto, false);
                        }
                    });
                }
			}, (reason) =>
			{
                console.log("Error:", reason);
            });
        }

		else
		{
            this.financialCommunityInfo.thoBuyerClosingCostId = dto.isThoEnabled ? null : dto.id;
			this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId).subscribe(fc =>
			{
                dto.isThoEnabled = !dto.isThoEnabled;
            });
        }
    }

	private toggleDiscountFlatAmount(thoEnabledDfa: SalesProgram, dto: SalesProgram)
	{
		if (thoEnabledDfa && dto.id !== thoEnabledDfa.id)
		{
            let ngbModalOptions: NgbModalOptions = {
                centered: true,
                backdrop: 'static',
                keyboard: false
            };

            let msgBody = `Selecting to enable this THO Sales Program will disable any other active THO Enabled DiscountFlatAmount Sales Program`;

            let confirm = this._modalService.open(ConfirmModalComponent, ngbModalOptions);

            confirm.componentInstance.title = 'Warning!';
            confirm.componentInstance.body = msgBody;
            confirm.componentInstance.defaultOption = 'Cancel';

			confirm.result.then((result) =>
			{
				if (result == 'Continue')
				{
                    this.financialCommunityInfo.thoDiscountFlatAmountId = dto.isThoEnabled ? null : dto.id;
					this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId).subscribe(x =>
					{
                        thoEnabledDfa.isThoEnabled = !thoEnabledDfa.isThoEnabled;
                        dto.isThoEnabled = !dto.isThoEnabled;
                    });
                }
			}, (reason) =>
			{
                console.log("Error:", reason);
            });
        }

		else
		{
            this.financialCommunityInfo.thoDiscountFlatAmountId = dto.isThoEnabled ? null : dto.id;
			this._orgService.saveFinancialCommunityInfo(this.financialCommunityInfo, this.orgId).subscribe(fc =>
			{
                dto.isThoEnabled = !dto.isThoEnabled;
            });
        }
    }
}
