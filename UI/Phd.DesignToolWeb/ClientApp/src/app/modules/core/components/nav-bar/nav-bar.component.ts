import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';

import * as _ from "lodash";

import { IdentityService } from 'phd-common/services';

import * as fromLot from '../../../ngrx-store/lot/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as fromJob from '../../../ngrx-store/job/reducer';
import { Group, DecisionPoint } from '../../../shared/models/tree.model.new';
import { Lot } from '../../../shared/models/lot.model';
import { LotService } from '../../services/lot.service';
import { PointStatus } from '../../../shared/models/point.model';
import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';
import { BrowserService } from '../../services/browser.service';
import { Job } from './../../../shared/models/job.model';

import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { ChangeTypeEnum } from '../../../shared/models/job-change-order.model';
import { ModalService } from '../../../core/services/modal.service';

@Component({
	selector: 'nav-bar',
	templateUrl: 'nav-bar.component.html',
	styleUrls: ['nav-bar.component.scss']
})

export class NavBarComponent extends UnsubscribeOnDestroy implements OnInit
{
	@Output() onSiteMenuToggled = new EventEmitter();

	@Input() scenarioName: string;
	@Input() groups: Observable<Group>[];
	@Input() selectedGroup: number;
	@Input() scenarioId: number;
	@Input() isPreview: boolean;
	@Input() opportunityName: Observable<string>;
	@Input() buildMode: string;

	currentRoute: string;
	PointStatus = PointStatus;
	buildItStatus: PointStatus;
	showStatusIndicator$: Observable<boolean>;
	salesAgreementId: number
	salesAgreementNumber: string;
	salesAgreementStatus: string;
	isTablet$: Observable<boolean>;
	selectedCommunity: string;
	selectedLot: string;
	selectedPlan: string;
	job: Job;
	inChangeOrder: boolean;
	changeOrderType: ChangeTypeEnum;
	hasActiveChangeOrder: boolean;
	invertHamburgerMenuColor: boolean;
	changeOrderPlanId: number;
	selectedPlanId: number;
	specCancelled = false;
	isLockedIn: boolean = false;

	constructor(private lotService: LotService,
		private identityService: IdentityService,
		private router: Router,
		private browser: BrowserService,
		private store: Store<fromRoot.State>,
		private modalService: ModalService
	) { super(); }

	ngOnInit()
	{
		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.job)).subscribe(job => this.job = job);

		this.router.events.subscribe(evt =>
		{
			if (evt instanceof NavigationEnd)
			{
				this.currentRoute = evt.url.toLowerCase();

				if (this.currentRoute)
				{
					this.invertHamburgerMenuColor = this.currentRoute.startsWith('/point-of-sale') || this.currentRoute.startsWith('/change-orders') || this.currentRoute.startsWith('/scenario-summary');
				}
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.isComplete)
		).subscribe(isComplete => this.buildItStatus = isComplete ? PointStatus.COMPLETED : PointStatus.REQUIRED);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromJob.isCancelled)).subscribe(cancelled =>
			{
				this.specCancelled = cancelled;
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement)
		).subscribe(sag =>
		{
			this.salesAgreementStatus = sag.status === 'OutforSignature' ? 'OutForSignature' : sag.status;
			this.salesAgreementNumber = sag && sag.salesAgreementNumber;
			this.salesAgreementId = sag && sag.id;

			this.isLockedIn = sag.isLockedIn;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.org.salesCommunity && state.org.salesCommunity.name)
		).subscribe(community =>
		{
			this.selectedCommunity = community;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromPlan.selectedPlanData)
		).subscribe(planData =>
		{
			this.selectedPlan = planData && planData.salesName;
			this.selectedPlanId = planData && planData.id;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromLot.selectSelectedLot)
		).subscribe((lot: Lot) =>
		{
			this.selectedLot = lot && lot.lotBlock;
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder)
		).subscribe(changeOrder =>
		{
			this.inChangeOrder = changeOrder && changeOrder.isChangingOrder;
			this.changeOrderType = changeOrder && changeOrder.changeInput ? changeOrder.changeInput.type : null;
			this.changeOrderPlanId = changeOrder && changeOrder.changeInput ? changeOrder.changeInput.changeOrderPlanId : null;

			const currentChangeOrder = changeOrder && changeOrder.currentChangeOrder;

			if (currentChangeOrder)
			{
				this.hasActiveChangeOrder = currentChangeOrder.jobChangeOrders &&
					currentChangeOrder.jobChangeOrders.length &&
					currentChangeOrder.jobChangeOrders[0].id > 0 &&
					currentChangeOrder.jobChangeOrders[0].jobChangeOrderTypeDescription !== 'SalesJIO' &&
					['Pending', 'OutforSignature', 'Signed'].indexOf(this.salesAgreementStatus) === -1;
			}
		});

		this.showStatusIndicator$ = this.store.select(fromRoot.canEditAgreementOrSpec);
		this.isTablet$ = this.browser.isTablet();
	}

	navigate(path: any[], group?: Group)
	{
		if ((this.buildMode === 'spec' || this.buildMode === 'model') && path[0] !== '/scenario-summary')
		{
			path[1] = 0;
		}

		if (path[0] === '/spec')
		{
			path[1] = this.job.id;

			this.navigateToPath(path);
		}

		if (this.isPreview)
		{
			this.navigateToPath(path, group ? group : null);
		}
		else
		{
			this.navigateToPath(path, group);
		}
	}

	navigateToPath(path: any[], group?: Group)
	{
		if (path[0] === '/change-orders' && this.disableChangeOrders)
		{
			return;
		}

		let point: DecisionPoint = null;

		if (group)
		{
			point = group.subGroups[0].points[0];
		}

		let newPath = [...path, ...(point ? [point.divPointCatalogId] : [])];

		if (!this.currentRoute.startsWith(newPath.join('/')) || newPath.length && newPath[0] === '/change-orders')
		{
			if (newPath.join('/').includes("new-home"))
			{
				if ((this.buildMode === 'spec' || this.buildMode === 'model'))
				{
					this.store.dispatch(new NavActions.SetSelectedSubNavItem(3));
					newPath = ['/new-home/lot'];

				}
				else
				{
					this.store.dispatch(new NavActions.SetSelectedSubNavItem(1));
				}
			}

			this.router.navigate(newPath);
		}

	}

	newHomeNavPath()
	{
		if (!this.salesAgreementNumber && this.job.id !== 0)
		{
			this.store.dispatch(new NavActions.SetSelectedSubNavItem(4));

			this.router.navigate(['/new-home/quick-move-in']);
		}
		else if (!this.isPreview)
		{
			this.store.dispatch(new NavActions.SetSelectedSubNavItem(1));

			this.router.navigate(['/new-home/name-scenario']);
		}
	}

	async buildIt()
	{
		if (this.salesAgreementId)
		{
			this.router.navigateByUrl(`/point-of-sale/people/${this.salesAgreementId}`);
		}
		else
		{
			this.lotService.hasMonotonyConflict().subscribe(async mc =>
			{
				if (mc.monotonyConflict)
				{
					this.router.navigate(['/edit-home', this.scenarioId])
				}
				else
				{
					if (this.buildMode === 'spec' || this.buildMode === 'model')
					{
						this.lotService.buildScenario();
					}
					else
					{
						const title = 'Generate Home Purchase Agreement';
						const body = 'You are about to generate an Agreement for your configuration. Do you wish to continue?';

						if (await this.showConfirmModal(body, title, 'Continue'))
						{
							// this really needs to get fixed.  the alert messsage isn't correct.
							this.lotService.buildScenario();
						}
					}
				}
			});
		}
	}

	private async showConfirmModal(body: string, title: string, defaultButton: string): Promise<boolean>
	{
		const confirm = this.modalService.open(ConfirmModalComponent);

		confirm.componentInstance.title = title;
		confirm.componentInstance.body = body;
		confirm.componentInstance.defaultOption = defaultButton;

		return confirm.result.then((result) =>
		{
			return result === 'Continue';
		});
	}

	toggleSiteMenu()
	{
		this.onSiteMenuToggled.emit();
	}

	logout()
	{
		this.identityService.logout();
	}

	get displayChangeOrderMenuItem()
	{
		return (this.inChangeOrder || this.hasActiveChangeOrder) &&
			(this.changeOrderType === ChangeTypeEnum.PLAN ||
				this.changeOrderType === ChangeTypeEnum.NON_STANDARD ||
				this.changeOrderType === ChangeTypeEnum.LOT_TRANSFER);
	}

	get disableChangeOrders()
	{
		return this.inChangeOrder && !this.hasActiveChangeOrder;
	}

	get isSalesOnlyChangeOrder()
	{
		return this.inChangeOrder && this.changeOrderType === ChangeTypeEnum.SALES;
	}

	get isSalesAgreementCancelledOrVoided(): boolean
	{
		return this.salesAgreementStatus == 'Void' || this.salesAgreementStatus == 'Cancel';
	}

	getChangeOrderMenuItemLabel()
	{
		switch (this.changeOrderType)
		{
			case ChangeTypeEnum.PLAN:
				return 'Plan Change';
			case ChangeTypeEnum.NON_STANDARD:
				return 'Non-Standard Option';
			case ChangeTypeEnum.LOT_TRANSFER:
				return 'Lot Transfer';
			default:
				return '';
		}
	}

	onChangeOrderMenuItem()
	{
		switch (this.changeOrderType)
		{
			case ChangeTypeEnum.PLAN:
				this.router.navigateByUrl('/change-orders/plan-change');
				break;
			case ChangeTypeEnum.LOT_TRANSFER:
				this.router.navigateByUrl('/change-orders/lot-transfer');
				break;
			case ChangeTypeEnum.NON_STANDARD:
				this.router.navigateByUrl('/change-orders/non-standard');
		}
	}

	displayGroupMenuItem(group: Group)
	{
		if (this.inChangeOrder || this.hasActiveChangeOrder)
		{
			if (this.changeOrderType === ChangeTypeEnum.LOT_TRANSFER ||
				this.changeOrderType === ChangeTypeEnum.NON_STANDARD ||
				this.changeOrderType === ChangeTypeEnum.SALES)
			{
				return false;
			}

			if (this.changeOrderType === ChangeTypeEnum.PLAN && this.router.url === '/change-orders/plan-change')
			{
				return this.selectedPlanId && this.changeOrderPlanId && this.selectedPlanId === this.changeOrderPlanId;
			}
		}

		return true;
	}
}
