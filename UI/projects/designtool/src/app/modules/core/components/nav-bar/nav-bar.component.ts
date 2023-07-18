import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { Observable, combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import
{
	UnsubscribeOnDestroy, IdentityService, ChangeTypeEnum, Job, Lot, PointStatus,
	Group, DecisionPoint, BrowserService, BrandService, FinancialBrand, getBrandUrl, Constants
} from 'phd-common';

import * as fromLot from '../../../ngrx-store/lot/reducer';
import * as fromPlan from '../../../ngrx-store/plan/reducer';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as NavActions from '../../../ngrx-store/nav/actions';
import * as fromJob from '../../../ngrx-store/job/reducer';

import { environment } from '../../../../../environments/environment';

import * as fromLite from '../../../ngrx-store/lite/reducer';
import { SubNavItems, PhdSubMenu } from '../../../new-home/subNavItems';

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
	@Input() isDesignPreviewEnabled: boolean;
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
	newHomeStatus: PointStatus;
	isPhdLite$: Observable<boolean>;
	isPhdLite: boolean;
	exteriorStatus: PointStatus;
	financialBrand: FinancialBrand;
	optionsAndColorsMenuAreVisible: boolean;
	currentChangeOrderSalesStatus: string;
	colorMenuIsDisabled: boolean;

	constructor(
		private identityService: IdentityService,
		private router: Router,
		private browser: BrowserService,
		private store: Store<fromRoot.State>,
		private brandService: BrandService)
	{
		super();
	}

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
					this.invertHamburgerMenuColor = this.currentRoute.startsWith('/point-of-sale') || this.currentRoute.startsWith('/change-orders') || this.currentRoute.startsWith('/scenario-summary') || this.currentRoute.startsWith('/lite-summary');
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
			this.salesAgreementStatus = sag.status === Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE ? 'OutForSignature' : sag.status;
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
					[Constants.AGREEMENT_STATUS_PENDING, Constants.AGREEMENT_STATUS_OUT_FOR_SIGNATURE, Constants.AGREEMENT_STATUS_SIGNED].indexOf(this.salesAgreementStatus) === -1;

				this.currentChangeOrderSalesStatus = currentChangeOrder.salesStatusDescription;
				this.setVisibilityOfOptionsAndColorsMenu();
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.nav.subNavItems)
		).subscribe(navItems =>
		{
			if (navItems)
			{
				// Find plan/lot/qmi based on id and label to avoid id conflicts
				let plan = navItems.find(x => x.id === PhdSubMenu.ChoosePlan && x.label === SubNavItems.find(item => item.id === PhdSubMenu.ChoosePlan).label);
				let lot = navItems.find(x => x.id === PhdSubMenu.ChooseLot && x.label === SubNavItems.find(item => item.id === PhdSubMenu.ChooseLot).label);
				let qmi = navItems.find(x => x.id === PhdSubMenu.QuickMoveIns && x.label === SubNavItems.find(item => item.id === PhdSubMenu.QuickMoveIns).label);

				if (plan || lot || qmi)
				{
					this.newHomeStatus = (plan?.status === PointStatus.COMPLETED && lot?.status === PointStatus.COMPLETED) || qmi?.status === PointStatus.COMPLETED ? PointStatus.COMPLETED : PointStatus.REQUIRED;
				}
			}
			else
			{
				this.newHomeStatus = PointStatus.REQUIRED;
			}
		});

		this.showStatusIndicator$ = this.store.select(fromRoot.canEditAgreementOrSpec);
		this.isTablet$ = this.browser.isTablet();

		this.isPhdLite$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state =>
			{
				this.isPhdLite = state.lite?.isPhdLite;
				this.setVisibilityOfOptionsAndColorsMenu();

				return state.lite?.isPhdLite;
			})
		);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.financialBrandId),
			switchMap(financialBrandId =>
			{
				return financialBrandId && !this.financialBrand
					? this.brandService.getFinancialBrand(financialBrandId, environment.apiUrl)
					: of(null);
			})
		).subscribe(brand =>
		{
			if (brand)
			{
				this.financialBrand = brand;
			}
		});

		combineLatest([
			this.store.pipe(select(fromLite.selectedElevation)),
			this.store.pipe(select(fromLite.selectedColorScheme)),
			this.store.pipe(select(fromRoot.legacyColorScheme))
		])
			.pipe(this.takeUntilDestroyed())
			.subscribe(([elevation, colorScheme, legacyColorScheme]) =>
			{
				const isColorSchemeCompleted = !!colorScheme || legacyColorScheme?.isSelected;

				if (!!elevation && isColorSchemeCompleted)
				{
					this.exteriorStatus = PointStatus.COMPLETED;
				}
				else if (!!elevation || isColorSchemeCompleted)
				{
					this.exteriorStatus = PointStatus.PARTIALLY_COMPLETED;
				}
				else
				{
					this.exteriorStatus = PointStatus.REQUIRED;
				}
			});

		combineLatest([
			this.store.pipe(select(fromLite.liteState)),
			this.store.pipe(select(state => state.job.jobPlanOptions))
		])
			.pipe(this.takeUntilDestroyed())
			.subscribe(([liteState, jobPlanOptions]) =>
			{
				if (liteState.isPhdLite)
				{
					const elevationCategory = liteState.categories.find(c => c.name.toLowerCase() === 'elevations');

					if (elevationCategory)
					{
						const selectedOptions =
							liteState.options.filter(o => liteState.scenarioOptions.some(so =>
								so.edhPlanOptionId === o.id && o.optionCategoryId !== elevationCategory.id));

						this.colorMenuIsDisabled = selectedOptions.every(selectedOption =>
						{
							// Keep inactive color items and colors if they are in the job
							const jobPlanOption = jobPlanOptions?.find(jpo => jpo.planOptionId === selectedOption.id);

							const hasColors = selectedOption.colorItems?.some(colorItem =>
							{
								const isJobColorItem = !!jobPlanOption?.jobPlanOptionAttributes?.find(jpoa => jpoa.attributeGroupLabel === colorItem.name);
								const isScenarioColorItem = liteState.scenarioOptions.some(so => so.edhPlanOptionId === selectedOption.id && so.scenarioOptionColors.some(soc => soc.colorItemId === colorItem.colorItemId));

								return (colorItem.isActive || isJobColorItem || isScenarioColorItem)
									&& colorItem.color?.some(color =>
									{
										const isJobColor = !!jobPlanOption?.jobPlanOptionAttributes?.find(jpoa => jpoa.attributeName === colorItem.name);
										const isScenarioColor = liteState.scenarioOptions.some(so => so.edhPlanOptionId === selectedOption.id && so.scenarioOptionColors.some(soc => soc.colorId === color.colorId));

										return color.isActive || isJobColor || isScenarioColor;
									});
							});

							return !hasColors;
						});
					}
				}
			});
	}

	setVisibilityOfOptionsAndColorsMenu()
	{
		//same pre-existing logic from the ngContainer tag that wraps Exterior, Options and Colors
		this.optionsAndColorsMenuAreVisible = !!this.isPhdLite
			&& this.displayGroupMenuItem(null)
			&& this.selectedPlanId
			&& !(this.isSalesAgreementCancelledOrVoided && this.specCancelled);

		if (this.optionsAndColorsMenuAreVisible && this.changeOrderType === ChangeTypeEnum.PLAN)
		{
			//only hide options and colors if there is an active plan change order with a pending status
			if (this.currentChangeOrderSalesStatus.trim().toLowerCase() === 'pending')
			{
				this.optionsAndColorsMenuAreVisible = false;
			}
		}
	}

	navigate(path: any[], group?: Group)
	{
		if ((this.buildMode === Constants.BUILD_MODE_SPEC || this.buildMode === Constants.BUILD_MODE_MODEL) && path[0] !== '/scenario-summary' && !this.isPhdLite)
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
				if ((this.buildMode === Constants.BUILD_MODE_SPEC || this.buildMode === Constants.BUILD_MODE_MODEL))
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
		return this.salesAgreementStatus === Constants.AGREEMENT_STATUS_VOID || this.salesAgreementStatus === Constants.AGREEMENT_STATUS_CANCEL;
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

	isActiveModelOrSpec()
	{
		return this.job.id !== 0 && (this.buildMode === Constants.BUILD_MODE_SPEC || this.buildMode === Constants.BUILD_MODE_MODEL);
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

	launchPreview()
	{
		const buyerSpecific = 'favorites/preview/'

		const dpUrls = environment.baseUrl.designPreviewUrls;

		const brandUrl = getBrandUrl(this.financialBrand?.key, dpUrls);

		const url = `${brandUrl}${buyerSpecific}${this.salesAgreementId}`;

		window.open(url, '_blank');
	}

	onExteriorPath()
	{
		this.router.navigate(['/lite/elevation']);
	}

	onOptionsNavPath()
	{
		this.router.navigate(['/lite/options']);
	}

	onColorsPath()
	{
		if (this.colorMenuIsDisabled)
		{
			return;
		}

		this.router.navigate(['/lite/colors']);
	}
}
