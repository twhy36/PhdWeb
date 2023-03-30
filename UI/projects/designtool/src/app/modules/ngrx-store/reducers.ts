import { ActionReducerMap, createSelector } from '@ngrx/store';

import * as _ from 'lodash';

import
{
	isChoiceComplete, isChoiceAttributesComplete, ChangeTypeEnum, Lot, PointStatus,
	isSalesChangeOrder, setPriceBreakdown, ScenarioStatusType, PriceBreakdown, PickType, TreeVersion, DecisionPointFilterType, setSubgroupStatus, setPointStatus, setGroupStatus
} from 'phd-common';

import * as fromScenario from './scenario/reducer';
import * as fromLot from './lot/reducer';
import * as fromPlan from './plan/reducer';
import * as fromNav from './nav/reducer';
import * as fromOpp from './opportunity/reducer';
import * as fromOrg from './org/reducer';
import * as fromUser from './user/reducer';
import * as fromSummary from './summary/reducer';
import * as fromSalesAgreement from './sales-agreement/reducer';
import * as fromJob from './job/reducer';
import * as fromChangeOrder from './change-order/reducer';
import * as fromContract from './contract/reducer';
import * as fromFavorite from './favorite/reducer';
import * as fromLite from './lite/reducer';

import { MonotonyConflict } from '../shared/models/monotony-conflict.model';
import { LegacyColorScheme } from '../shared/models/lite.model';

export interface State
{
	scenario: fromScenario.State;
	lot: fromLot.State;
	plan: fromPlan.State;
	nav: fromNav.State;
	opportunity: fromOpp.State;
	org: fromOrg.State;
	summary: fromSummary.State;
	salesAgreement: fromSalesAgreement.State;
	job: fromJob.State;
	changeOrder: fromChangeOrder.State;
	contract: fromContract.State;
	user: fromUser.State;
	favorite: fromFavorite.State;
	lite: fromLite.State;
}

export const reducers: ActionReducerMap<State> = {
	scenario: fromScenario.reducer,
	lot: fromLot.reducer,
	plan: fromPlan.reducer,
	nav: fromNav.reducer,
	opportunity: fromOpp.reducer,
	org: fromOrg.reducer,
	summary: fromSummary.reducer,
	salesAgreement: fromSalesAgreement.reducer,
	job: fromJob.reducer,
	changeOrder: fromChangeOrder.reducer,
	contract: fromContract.reducer,
	user: fromUser.reducer,
	favorite: fromFavorite.reducer,
	lite: fromLite.reducer
}

export const title = createSelector(
	fromScenario.selectScenario,
	fromSalesAgreement.salesAgreementState,
	fromSalesAgreement.primaryBuyer,
	fromOpp.oppPrimaryContact,
	(scenario, sag, primaryBuyer, primaryOppContact) =>
	{
		if (scenario.buildMode === 'preview')
		{
			return 'Preview Home';
		}
		else if (sag && sag.id)
		{
			if (sag.salesAgreementName)
			{
				return sag.salesAgreementName;
			}
			else
			{
				// For existing sales agreement without a name
				let contact = primaryBuyer && primaryBuyer.opportunityContactAssoc
					? primaryBuyer.opportunityContactAssoc.contact
					: primaryOppContact;

				return `${contact ? contact.lastName || '' : ''} Home`;
			}
		}
		else if (scenario.scenario && scenario.buildMode === 'buyer')
		{
			return scenario.scenario.scenarioName;
		}
		else
		{
			return 'Home';
		}
	}
);

/* Used to determine whether the logged in user can make changes on the configuration screens */
export const canConfigure = createSelector(
	fromScenario.selectScenario,
	fromOrg.market,
	fromUser.selectUser,
	fromSalesAgreement.salesAgreementState,
	fromChangeOrder.currentChangeOrder,
	(scenario, market, user, sag, co) => scenario.buildMode === 'preview'
		|| ((scenario.buildMode === 'model' || scenario.buildMode === 'spec') && !!market && user.canDesign && user.assignedMarkets && user.assignedMarkets.some(m => m.number === market.number))
		// if there is a sales agreement, user can make changes if (a) user can Create Sales Agreements or (b) user can create Job Change Orders
		// if the change order hasn't been saved yet, the contact field on the change order will be null
		|| ((sag && sag.id ? (user.canSell || (user.canDesign && !!co)) : user.canConfigure)
			&& !!market && user.assignedMarkets && user.assignedMarkets.some(m => m.number === market.number))
)

export const canSell = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canSell && user.assignedMarkets.some(m => m.number === market.number)
)

export const canDeleteDeposit = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canDeleteDeposits && user.assignedMarkets.some(m => m.number === market.number)
)

export const canCreateDeposit = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canCreateDeposits && user.assignedMarkets.some(m => m.number === market.number)
)

export const canCancelSalesAgreement = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canCancel && user.assignedMarkets.some(m => m.number === market.number)
)

export const canSelectAddenda = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canSelectAddenda && user.assignedMarkets.some(m => m.number === market.number)
)

export const canUpdateECOE = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canUpdateECOE && user.assignedMarkets.some(m => m.number === market.number)
)

export const canApprove = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canApprove && user.assignedMarkets.some(m => m.number === market.number)
)

export const canOverride = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canOverride && user.assignedMarkets.some(m => m.number === market.number)
)

export const canDesign = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canDesign && user.assignedMarkets.some(m => m.number === market.number)
)

export const canCreateChangeOrder = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canCreateChangeOrder && user.assignedMarkets.some(m => m.number === market.number)
)

export const canApproveChangeOrder = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canApproveChangeOrder && user.assignedMarkets.some(m => m.number === market.number)
)

export const canAddIncentive = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canAddIncentive && user.assignedMarkets.some(m => m.number === market.number)
)

export const canLockSalesAgreement = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canLockSalesAgreement && user.assignedMarkets.some(m => m.number === market.number)
)

export const canEditInternalNotes = createSelector(
	fromOrg.market,
	fromUser.selectUser,
	(market, user) => !!market && user.canEditInternalNotes && user.assignedMarkets.some(m => m.number === market.number)
)

export const canEstimateOnSummary = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromScenario.buildMode,
	(sag, build) => build !== 'spec' && build !== 'model' && sag?.id === 0
)

export const monotonyConflict = createSelector(
	fromLot.selectSelectedLot,
	fromPlan.selectedPlanData,
	fromScenario.elevationDP,
	fromScenario.hasMonotonyAdvisement,
	fromScenario.colorSchemeDP,
	(selectedLot, selectedPlan, elevation, advisement, colorScheme) =>
	{
		let conflict = {
			monotonyConflict: false,
			conflictSeen: advisement,
			colorSchemeConflict: false,
			colorSchemeConflictOverride: false,
			elevationConflict: false,
			elevationConflictOverride: false
		} as MonotonyConflict;

		if (selectedLot !== null)
		{
			let isColorSchemePlanRuleEnabled = selectedLot.financialCommunity?.isColorSchemePlanRuleEnabled;
			let planId = !!selectedPlan ? selectedPlan.id : 0;
			let monotonyrules = selectedLot && selectedLot.monotonyRules ? selectedLot.monotonyRules : [];
			let elevationOverride = elevation && elevation.choices ? elevation.choices.some(choice => !!choice.overrideNote) : false;
			let colorSchemeOverride = colorScheme && colorScheme.choices ? colorScheme.choices.some(choice => !!choice.overrideNote) : false;

			if (elevation && elevation.choices && (elevation.choices.find(x => x.quantity > 0) !== undefined) && !elevationOverride)
			{
				let choice = elevation.choices.find(x => x.quantity > 0);

				conflict.elevationConflict = monotonyrules.some(x => x.elevationDivChoiceCatalogId === choice.divChoiceCatalogId && x.edhPlanId === planId);

				if (!colorScheme && choice.selectedAttributes.length > 0)
				{
					monotonyrules.forEach(rule =>
					{
						// check rules of plans match
						if (rule.edhPlanId === planId)
						{
							let colorAttributeConflicts = [];

							if (!conflict.colorSchemeConflict)
							{
								choice.selectedAttributes.forEach(x =>
								{
									colorAttributeConflicts.push(rule.colorSchemeAttributeCommunityIds.some(colorAttributeIds => colorAttributeIds === x.attributeId));
								});
							}

							if (!colorAttributeConflicts.some(x => x === false))
							{
								conflict.colorSchemeConflict = true;
								conflict.colorSchemeAttributeConflict = true;
							}
						}
					});
				}
			}

			if (colorScheme && colorScheme.choices && (colorScheme.choices.find(x => x.quantity > 0) != undefined) && !colorSchemeOverride)
			{
				let colorChoice = colorScheme.choices.find(x => x.quantity > 0);

				conflict.colorSchemeConflict = isColorSchemePlanRuleEnabled ? monotonyrules.some(x => x.colorSchemeDivChoiceCatalogId === colorChoice.divChoiceCatalogId && x.edhPlanId === planId) :
					monotonyrules.some(x => x.colorSchemeDivChoiceCatalogId === colorChoice.divChoiceCatalogId);
			}

			conflict.monotonyConflict = (conflict.colorSchemeConflict || conflict.elevationConflict);
		}

		return conflict;
	}
)

export const monotonyChoiceIds = createSelector(
	fromLot.selectSelectedLot,
	fromPlan.selectedPlanData,
	(selectedLot, selectedPlan) =>
	{
		let monotonyChoices = { colorSchemeAttributeCommunityIds: [], ColorSchemeDivChoiceCatalogIds: [], ElevationDivChoiceCatalogIds: [] };

		if (selectedLot)
		{
			let isColorSchemePlanRuleEnabled = selectedLot.financialCommunity.isColorSchemePlanRuleEnabled;

			if (selectedLot.monotonyRules && selectedLot.monotonyRules.length)
			{
				let planId = selectedPlan !== null ? selectedPlan.id : 0;

				monotonyChoices.colorSchemeAttributeCommunityIds = isColorSchemePlanRuleEnabled ? selectedLot.monotonyRules
					.filter(r => (r.ruleType === "ColorScheme" || r.ruleType === "Both") && r.colorSchemeAttributeCommunityIds.length && r.edhPlanId === planId)
					.map(r => r.colorSchemeAttributeCommunityIds) : selectedLot.monotonyRules
						.filter(r => (r.ruleType === "ColorScheme" || r.ruleType === "Both") && r.colorSchemeAttributeCommunityIds.length)
						.map(r => r.colorSchemeAttributeCommunityIds);

				monotonyChoices.ElevationDivChoiceCatalogIds = selectedLot.monotonyRules
					.filter(r => (r.ruleType === "Elevation" || r.ruleType === "Both") && !!r.elevationDivChoiceCatalogId && r.edhPlanId === planId)
					.map(r => r.elevationDivChoiceCatalogId);

				monotonyChoices.ColorSchemeDivChoiceCatalogIds = isColorSchemePlanRuleEnabled ? selectedLot.monotonyRules
					.filter(r => (r.ruleType === "ColorScheme" || r.ruleType === "Both") && !!r.colorSchemeDivChoiceCatalogId && r.edhPlanId === planId)
					.map(r => r.colorSchemeDivChoiceCatalogId) : selectedLot.monotonyRules
						.filter(r => (r.ruleType === "ColorScheme" || r.ruleType === "Both") && !!r.colorSchemeDivChoiceCatalogId)
						.map(r => r.colorSchemeDivChoiceCatalogId);
			}
		}

		return monotonyChoices;
	}
)

export const needsPlanChange = createSelector(
	fromJob.jobState,
	fromPlan.planState,
	fromChangeOrder.changeOrderState,
	(job, plan, changeOrder) =>
	{
		return changeOrder && changeOrder.isChangingOrder && changeOrder.changeInput && changeOrder.changeInput.type === ChangeTypeEnum.PLAN
			? job.planId === plan.selectedPlan
			: false;
	}
)

export const hasSpecPlanId = createSelector(
	fromScenario.buildMode,
	fromPlan.planState,
	fromChangeOrder.changeOrderState,
	(buildMode, plan, changeOrder) =>
	{
		return (buildMode === 'spec' || buildMode === 'model') && changeOrder && changeOrder.isChangingOrder && changeOrder.changeInput && changeOrder.changeInput.type === ChangeTypeEnum.PLAN
			? !!plan.selectedPlan
			: false;
	}
)

export const isComplete = createSelector(
	fromScenario.selectScenario,
	fromScenario.elevationDP,
	fromScenario.colorSchemeDP,
	monotonyConflict,
	fromSalesAgreement.salesAgreementState,
	needsPlanChange,
	hasSpecPlanId,
	(scenario, elevation, colorScheme, monotonyConflict, sag, needsPlanChange, hasSpecPlanId) =>
	{
		const hasLot = !!sag.id || (scenario.scenario ? !!scenario.scenario.lotId : false);
		const hasPlan = !!sag.id || (scenario.scenario ? !!scenario.scenario.planId : false) || hasSpecPlanId;

		const hasColorScheme = (colorScheme && colorScheme.choices.some(x => isChoiceComplete(x, false)))
			|| (!colorScheme && elevation && elevation.choices.some(x => isChoiceComplete(x, true)))
			|| (!colorScheme && !elevation);

		// if there is an elevation then look to see if there is a selected value, else default to true since we might not be dealing with something that has an elevation, same for Color Scheme.
		const hasSelectedElevation = (elevation && elevation.choices.some(x => isChoiceComplete(x, false)))
			|| !elevation;

		return hasLot && hasPlan && hasSelectedElevation && hasColorScheme && !monotonyConflict.monotonyConflict && !needsPlanChange;
	}
)

export const canEditAgreementOrSpec = createSelector(
	fromScenario.buildMode,
	fromScenario.isPreview,
	fromSalesAgreement.salesAgreementState,
	fromChangeOrder.currentChangeOrder,
	fromJob.jobState,
	fromScenario.scenarioHasSalesAgreement,
	(buildMode, isPreview, salesAgreement, currentChangeOrder, job, scenarioHasSalesAgreement) =>
	{
		if (buildMode === 'spec' || buildMode === 'model')
		{
			return job.id === 0 || (job.id > 0 && currentChangeOrder ? currentChangeOrder.salesStatusDescription === 'Pending' : false);
		}
		else
		{
			return isPreview
				|| (salesAgreement.id === 0 && !scenarioHasSalesAgreement)
				|| salesAgreement.status === 'Pending'
				|| (currentChangeOrder
					? currentChangeOrder.salesStatusDescription === 'Pending'
					: false
				);
		}
	}
)

export const canEditCancelOrVoidAgreement = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromScenario.buildMode,
	(salesAgreement, buildMode) =>
	{
		return ((salesAgreement.id === 0 && buildMode !== 'spec' && buildMode !== 'model') || salesAgreement.status === 'Cancel' || salesAgreement.status === 'Void' || salesAgreement.status === 'Closed');
	}
)

export const isSpecSalePending = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromJob.jobState,
	(salesAgreement, job) =>
	{
		return job && job.lot && job.lot.lotBuildTypeDesc === 'Spec' && salesAgreement && (salesAgreement.status === 'Pending' || salesAgreement.status === 'Signed' || salesAgreement.status === 'OutforSignature');
	}
)

export const activePrimaryBuyer = createSelector(
	isSpecSalePending,
	fromChangeOrder.changeOrderState,
	fromSalesAgreement.primaryBuyer,
	fromChangeOrder.changeOrderPrimaryBuyer,
	(isSpecSalePending, changeOrder, saBuyer, coBuyer) =>
	{
		return changeOrder?.isChangingOrder || isSpecSalePending ? coBuyer : saBuyer;
	}
)

export const isActivePrimaryBuyerComplete = createSelector(
	activePrimaryBuyer,
	(primaryBuyer) =>
	{
		const buyer = primaryBuyer ? primaryBuyer.opportunityContactAssoc.contact : null;
		const buyerEmail = buyer && buyer.emailAssocs.find(email => email.isPrimary) ? buyer.emailAssocs.find(email => email.isPrimary).email : null;
		const buyerPhone = buyer && buyer.phoneAssocs.find(phone => phone.isPrimary) ? buyer.phoneAssocs.find(phone => phone.isPrimary).phone : null;
		const address = buyer && buyer.addressAssocs.find(primaryAddress => primaryAddress.isPrimary) ? buyer.addressAssocs.find(primaryAddress => primaryAddress.isPrimary).address : null;

		return buyer && address && buyerEmail && buyerPhone && buyer.firstName && buyer.firstName.length > 0 && buyer.lastName && buyer.lastName.length > 0 &&
			address.address1 && address.address1.length > 0 && address.city && address.city.length > 0 && address.country && address.country.length > 0 &&
			address.postalCode && address.postalCode.length > 0 && address.stateProvince && address.stateProvince.length > 0 && buyerEmail.emailAddress &&
			buyerEmail.emailAddress.length > 0 && buyerPhone.phoneNumber && buyerPhone.phoneNumber.length > 0;
	}
)

export const activeCoBuyers = createSelector(
	isSpecSalePending,
	fromChangeOrder.changeOrderState,
	fromSalesAgreement.coBuyers,
	fromChangeOrder.changeOrderCoBuyers,
	(isSpecSalePending, changeOrder, saBuyers, coBuyers) =>
	{
		return changeOrder?.isChangingOrder || isSpecSalePending ? coBuyers : saBuyers;
	}
)

export const scenarioStatus = createSelector(
	isComplete,
	monotonyConflict,
	fromScenario.selectScenario,
	(isComplete, monotonyConflict, scenario) =>
	{
		let status: ScenarioStatusType;

		if (!isComplete && monotonyConflict.monotonyConflict)
		{
			// Shows when SC has selected a plan, lot, elevation or color scheme but has a monotony conflict
			status = ScenarioStatusType.MONOTONY_CONFLICT;
		}
		else
		{
			// check the points to make sure the selections made are valid
			const checkPoints = (points) =>
			{
				return points.every(pt =>
				{
					// Looks to see if location/attributes have been selected on a choice.
					let selectedChoices = pt.choices.filter(c => c.quantity > 0);
					let choicesComplete = selectedChoices.length ? selectedChoices.every(c => isChoiceAttributesComplete(c)) : false;

					return !pt.enabled || !pt.choices.some(ch => ch.enabled) || [PickType.Pick1, PickType.Pick1ormore].indexOf(pt.pointPickTypeId) === -1 || (choicesComplete && pt.completed);
				});
			};

			if (scenario.tree.treeVersion)
			{
				const points = _.flatMap(scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)) || null;

				const structuralDPs = points.filter(x => x.isStructuralItem == true);
				const structuralFulfilled = checkPoints(structuralDPs);

				// go directly to Ready for Design if no structural DPs found
				if (!structuralDPs.length || structuralFulfilled)
				{
					// check to see if All points have been satisfied
					const pointsFulfilled = checkPoints(points);

					if (pointsFulfilled)
					{
						//Shows after SC has made selections (Pick 1's) or viewed (Pick 0's) all DP's.
						status = ScenarioStatusType.READY_TO_BUILD;
					}
					else
					{
						//Shows after SC has made selections (Pick 1's) for or viewed (Pick 0's) all DP's flagged as "Structural"
						status = ScenarioStatusType.READY_FOR_DESIGN;
					}
				}
				else
				{
					//Shows after SC has made all selections necessary for contract.
					status = ScenarioStatusType.READY_FOR_STRUCTURAL;
				}
			}
		}
		return status;
	}
)

export const salesAgreementStatus = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromJob.jobState,
	(sa, job) =>
	{
		let saStatus: string;

		switch (sa.status)
		{
			case 'Pending':
				saStatus = 'Pending Sale';

				break;
			case 'Signed':
				saStatus = 'Signed';

				break;
			case 'Approved':
				saStatus = 'Approved';

				break;
			case 'Cancel':
				saStatus = 'Cancelled';

				break;
			case 'Void':
				saStatus = 'Voided';

				break;
			case 'Closed':
				saStatus = 'Closed';

				break;
			case 'OutforSignature':
				saStatus = 'Out for Signature';

				break;
		}

		if (job && job.id !== 0)
		{
			// Any status other than Approved or Withdrawn counts as an active CO
			let hasActiveChangeOrder = job.changeOrderGroups.length ? job.changeOrderGroups.some(co => co.jobChangeOrders[0].jobChangeOrderTypeDescription !== 'SalesJIO' && co.salesStatusDescription !== 'Approved' && co.salesStatusDescription !== 'Withdrawn') : false;

			if (hasActiveChangeOrder)
			{
				saStatus = 'Pending Change Order';
			}
		}

		return saStatus;
	}
)

export const selectedPlanPrice = createSelector(
	fromPlan.selectedPlanData,
	fromLot.selectSelectedLot,
	fromSalesAgreement.salesAgreementState,
	(selectedPlan, selectedLot, salesAgreement) =>
	{
		let price = selectedPlan ? selectedPlan.price : 0;

		if (selectedPlan && selectedLot && selectedLot.salesPhase && selectedLot.salesPhase.salesPhasePlanPriceAssocs && ((salesAgreement && salesAgreement.status === 'Pending') || !salesAgreement?.id))
		{
			const isPhaseEnabled = selectedLot.financialCommunity && selectedLot.financialCommunity.isPhasedPricingEnabled;
			const phasePlanPrice = selectedLot.salesPhase.salesPhasePlanPriceAssocs.find(x => x.planId === selectedPlan.id);

			if (isPhaseEnabled && phasePlanPrice)
			{
				price = phasePlanPrice.price;
			}
		}

		return price;
	})

export const priceBreakdown = createSelector(
	fromScenario.selectScenario,
	fromSalesAgreement.salesAgreementState,
	fromChangeOrder.currentChangeOrder,
	fromJob.jobState,
	selectedPlanPrice,
	fromLite.liteState,
	(scenario, salesAgreement, currentChangeOrder, job, planPrice, lite) =>
	{
		let breakdown = new PriceBreakdown();

		if (salesAgreement && scenario)
		{
			if (job.jobNonStandardOptions)
			{
				job.jobNonStandardOptions.forEach(x =>
				{
					breakdown.nonStandardSelections += x.unitPrice * x.quantity;
				});
			}

			const programs = salesAgreement.programs;

			programs && programs.forEach(p =>
			{
				if (p.salesProgram.salesProgramType === 'BuyersClosingCost')
				{
					breakdown.closingIncentive += p.amount;
				}
				else if (p.salesProgram.salesProgramType === 'DiscountFlatAmount')
				{
					breakdown.salesProgram += p.amount;
				}
			});

			if (salesAgreement.priceAdjustments && salesAgreement.priceAdjustments.length)
			{
				salesAgreement.priceAdjustments.forEach(adj =>
				{
					if (adj.priceAdjustmentType === 'Discount')
					{
						breakdown.priceAdjustments += adj.amount;
					}
					else if (adj.priceAdjustmentType === 'ClosingCost')
					{
						breakdown.closingCostAdjustment += adj.amount;
					}
				});
			}

			if (currentChangeOrder && currentChangeOrder.jobChangeOrders)
			{

				//check price adjustment COs
				const priceAdjustmentCO = currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'PriceAdjustment');

				if (priceAdjustmentCO)
				{
					const salesChangeOrderSalesPrograms = priceAdjustmentCO.jobSalesChangeOrderSalesPrograms;

					if (salesChangeOrderSalesPrograms && salesChangeOrderSalesPrograms.length)
					{
						salesChangeOrderSalesPrograms.forEach(salesProgram =>
						{
							if (salesProgram.action === 'Add')
							{
								if (salesProgram.salesProgramType === 'DiscountFlatAmount')
								{
									breakdown.salesProgram += salesProgram.amount;
								}
								else if (salesProgram.salesProgramType === 'BuyersClosingCost')
								{
									breakdown.closingIncentive += salesProgram.amount;
								}
							}
							else if (salesProgram.action === 'Delete')
							{
								if (salesProgram.salesProgramType === 'DiscountFlatAmount')
								{
									breakdown.salesProgram -= salesProgram.amount;
								}
								else if (salesProgram.salesProgramType === 'BuyersClosingCost')
								{
									breakdown.closingIncentive -= salesProgram.amount;
								}
							}
						});
					}

					const salesChangeOrderPriceAdjustments = priceAdjustmentCO.jobSalesChangeOrderPriceAdjustments;

					if (salesChangeOrderPriceAdjustments && salesChangeOrderPriceAdjustments.length)
					{
						salesChangeOrderPriceAdjustments.forEach(priceAdjustment =>
						{
							if (priceAdjustment.action === 'Add')
							{
								if (priceAdjustment.priceAdjustmentTypeName === 'Discount')
								{
									breakdown.priceAdjustments += priceAdjustment.amount;
								}
								else if (priceAdjustment.priceAdjustmentTypeName === 'ClosingCost')
								{
									breakdown.closingCostAdjustment += priceAdjustment.amount;
								}
							}
							else if (priceAdjustment.action === 'Delete')
							{
								if (priceAdjustment.priceAdjustmentTypeName === 'Discount')
								{
									breakdown.priceAdjustments -= priceAdjustment.amount;
								}
								else if (priceAdjustment.priceAdjustmentTypeName === 'ClosingCost')
								{
									breakdown.closingCostAdjustment -= priceAdjustment.amount;
								}
							}
						});
					}
				}

				//check NSO COs
				const nsos = _.flatMap(currentChangeOrder.jobChangeOrders, co => co.jobChangeOrderNonStandardOptions);

				nsos.forEach(nso =>
				{
					if (nso.action === 'Add')
					{
						breakdown.nonStandardSelections += (nso.unitPrice * nso.qty);
					}
					else
					{
						breakdown.nonStandardSelections -= (nso.unitPrice * nso.qty);
					}
				});
			}

			if (scenario.scenario)
			{
				const scenarioInfo = scenario.scenario.scenarioInfo;

				if (scenarioInfo)
				{
					breakdown.designEstimate = scenarioInfo.designEstimate;
					breakdown.homesiteEstimate = scenarioInfo.homesiteEstimate;
					breakdown.closingIncentive = scenarioInfo.closingIncentive;
					breakdown.salesProgram = scenarioInfo.discount;
				}
			}

			if (lite?.isPhdLite)
			{
				breakdown.baseHouse = planPrice;

				const baseHouseCategory = lite.categories.find(x => x.name.toLowerCase() === 'base house');
				let selections = 0;

				if (lite.scenarioOptions && baseHouseCategory)
				{
					lite.scenarioOptions.forEach(scenarioOption =>
					{
						const planOption = lite.options?.find(option =>
							option.id === scenarioOption.edhPlanOptionId
							&& option.optionCategoryId !== baseHouseCategory.id);

						if (planOption)
						{
							selections += planOption.listPrice * scenarioOption.planOptionQuantity;
						}
					});
				}

				breakdown.selections = selections;
			}

			breakdown = setPriceBreakdown(breakdown, scenario.tree, scenario.options, scenario.lotPremium, salesAgreement.salePrice, planPrice);
		}

		return breakdown;
	}
)

export const filteredTree = createSelector(
	fromScenario.selectScenario,
	monotonyConflict,
	fromChangeOrder.inPlanChangeOrder,
	(state, monotonyConflict, inPlanChangeOrder) =>
	{
		let tree = _.cloneDeep(state.tree);
		const treeFilter = state.treeFilter;
		let filteredTree: TreeVersion;

		// Set point status
		if (tree && tree.treeVersion)
		{
			tree.treeVersion.groups.forEach(group => group.subGroups.forEach(subGroup => subGroup.points.forEach(point =>
			{
				if (point.dPointTypeId === 2 && (monotonyConflict.colorSchemeConflict && !monotonyConflict.colorSchemeConflictOverride))
				{
					point.status = PointStatus.REQUIRED;
					subGroup.status = PointStatus.REQUIRED;
					group.status = PointStatus.REQUIRED;
				}
				else if (point.dPointTypeId === 1 && ((monotonyConflict.elevationConflict || monotonyConflict.colorSchemeAttributeConflict) && !monotonyConflict.elevationConflictOverride))
				{
					point.status = PointStatus.REQUIRED;
					subGroup.status = PointStatus.REQUIRED;
					group.status = PointStatus.REQUIRED;
				}
			})));

			const filter = (filterType: string, label: string) =>
			{
				let isValid = true;

				if (treeFilter)
				{
					isValid = (treeFilter.filterType === 'All' || treeFilter.filterType === filterType) ? label.toLowerCase().includes(treeFilter.keyword.toLowerCase()) : false;
				}

				return isValid;
			};

			let treeMatched = { subGroup: false, point: false };

			filteredTree = {
				...tree.treeVersion, groups: tree.treeVersion.groups.map(g =>
				{
					let subGroups = g.subGroups.map(sg =>
					{
						treeMatched.subGroup = filter('SubGroup', sg.label);

						let points = sg.points.map(p =>
						{
							treeMatched.point = treeMatched.subGroup || filter('Decision Point', p.label);

							let choices = p.choices.filter(c =>
							{
								let isValid = treeMatched.point || filter('Choice', c.label);

								return isValid;
							});

							return { ...p, choices: choices };
						}).filter(dp =>
						{
							return (state.selectedPointFilter === DecisionPointFilterType.FULL
								|| (state.selectedPointFilter === DecisionPointFilterType.QUICKQUOTE && dp.isQuickQuoteItem)
								|| (state.selectedPointFilter === DecisionPointFilterType.DESIGN && !dp.isStructuralItem)
								|| (state.selectedPointFilter === DecisionPointFilterType.STRUCTURAL && dp.isStructuralItem))
								&& !!dp.choices.length
								&& (!inPlanChangeOrder || dp.dPointTypeId === 1 || dp.dPointTypeId === 2);
						});

						return { ...sg, points: points };
					}).filter(sg =>
					{
						return !!sg.points.length;
					});

					return { ...g, subGroups: subGroups };
				}).filter(g => !!g.subGroups.length)
			} as TreeVersion;
		}

		const filteredGroups = filteredTree.groups;
		const filteredSubGroups = _.flatMap(filteredGroups, g => g.subGroups);
		const filteredPoints = _.flatMap(filteredSubGroups, sg => sg.points);

		filteredPoints.forEach(pt => setPointStatus(pt));
		filteredSubGroups.forEach(sg => setSubgroupStatus(sg, state.selectedPointFilter));
		filteredGroups.forEach(g => setGroupStatus(g));

		return filteredTree ? new TreeVersion(filteredTree) : null;
	}
)

/**
 * gets color scheme to display on the Agreement details page.
 **/
export const agreementColorScheme = createSelector(
	fromScenario.elevationDP,
	fromScenario.colorSchemeDP,
	(elevationDp, colorSchemeDp) =>
	{
		let colorScheme;

		const elevationChoice = elevationDp && elevationDp.choices.find(c => c.quantity > 0);
		const colorSchemeChoice = colorSchemeDp && colorSchemeDp.choices.find(c => c.quantity > 0);

		// if there is a color scheme choice then use that
		if (colorSchemeChoice)
		{
			colorScheme = colorSchemeChoice.label;
		}
		// no color scheme choice so check for attributes/locations on the elevation choice
		else if (elevationChoice && elevationChoice.selectedAttributes && elevationChoice.selectedAttributes.length)
		{
			colorScheme = elevationChoice.selectedAttributes.map(att => att.attributeName).join(', ');
		}
		else
		{
			colorScheme = '';
		}

		return colorScheme;
	}
)

export const selectSelectedPlanLotAvailability = createSelector(
	fromPlan.selectedPlanData,
	fromLot.selectLot,
	fromLot.lotsLoaded,
	(selectedPlan, lots, lotsLoaded) =>
	{
		let hasAvailableLot: boolean = true;

		if (selectedPlan && lotsLoaded)
		{
			hasAvailableLot = false;

			selectedPlan.lotAssociations.map(lotId =>
			{
				if (!hasAvailableLot)
				{
					let lot: Lot = lots.lots.find(l => l.id === lotId);

					if (lot && lot.lotStatusDescription === 'Available')
					{
						hasAvailableLot = true;
					}
				}
			});
		}

		return hasAvailableLot;
	}
)

export const changeOrderChoicesPastCutoff = createSelector(
	fromScenario.selectScenario,
	fromChangeOrder.changeOrderState,
	(scenario, changeOrder) =>
	{
		let changeOrderChoicesPastCutoff = [];
		if (changeOrder.currentChangeOrder && !isSalesChangeOrder(changeOrder.currentChangeOrder))
		{
			const jobChangeOrders = changeOrder.currentChangeOrder.jobChangeOrders;
			if (jobChangeOrders && jobChangeOrders.length)
			{
				// Decision points and choices past cutoff
				const pointsPastCutoff = _.flatMap(scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points)).filter(x => x.isPastCutOff);
				const choicesPastCutoff = _.flatMap(pointsPastCutoff, pt => pt.choices) || [];

				// Change order choices without override note
				const changeOrderChoices = _.flatMap(jobChangeOrders, co => co.jobChangeOrderChoices).filter(x => x.action !== 'Delete' && !x.overrideNoteId);

				changeOrderChoicesPastCutoff = changeOrderChoices.filter(choice => choicesPastCutoff.findIndex(x => x.id === choice.decisionPointChoiceID || x.divChoiceCatalogId === choice.divChoiceCatalogId) > -1) || [];
			}
		}
		return changeOrderChoicesPastCutoff;
	}
)

export const canCancelSpec = createSelector(
	fromJob.jobState,
	fromScenario.buildMode,
	fromLite.liteState,
	(job, buildMode, lite) =>
	{
		return buildMode === 'spec' &&
			job.constructionStageName === 'Configured' &&
			(lite.isPhdLite ? (job.jobTypeName === 'Spec' || job.jobTypeName === 'House') : job.jobTypeName === 'Spec') &&
			!(job.jobSalesAgreementAssocs && job.jobSalesAgreementAssocs.length > 0);
	});

export const canCancelModel = createSelector(
	fromJob.jobState,
	fromScenario.buildMode,
	fromLite.liteState,
	(job, buildMode, lite) =>
	{
		return buildMode === 'model' &&
			job.constructionStageName === 'Configured' &&
			(lite.isPhdLite ? (job.jobTypeName === 'Model' || job.jobTypeName === 'House') : job.jobTypeName === 'Model') &&
			!(job.jobSalesAgreementAssocs && job.jobSalesAgreementAssocs.length > 0);
	});

export const showSpinner = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromJob.jobState,
	(sa, job) =>
	{
		return (sa ? sa.salesAgreementLoading : false) || (job ? job.jobLoading : false);
	}
);

export const isDesignPreviewEnabled = createSelector(
	fromJob.jobState,
	fromOrg.selectOrg,
	(job, org) =>
	{
		const financialCommunity = org?.salesCommunity?.financialCommunities?.find(f => f.id === job?.financialCommunityId);
		return financialCommunity ? financialCommunity.isDesignPreviewEnabled : false;
	}
);

export const financialBrandId = createSelector(
	fromJob.jobState,
	fromOrg.selectOrg,
	(job, org) =>
	{
		const financialCommunity = org?.salesCommunity?.financialCommunities?.find(f => f.id === job?.financialCommunityId);
		return financialCommunity?.financialBrandId;
	}
);

// PHD Lite
export const legacyColorScheme = createSelector(
	fromJob.jobState,
	fromLite.liteState,
	fromChangeOrder.currentChangeOrder,
	(job, lite, changeOrder) =>
	{
		let colorScheme: LegacyColorScheme = null;

		const jobOption = job?.jobPlanOptions?.find(jpo => jpo.integrationKey === '99999');

		if (lite?.isPhdLite && !!jobOption?.jobPlanOptionAttributes?.length)
		{
			let colorItemName = jobOption.jobPlanOptionAttributes[0].attributeGroupLabel;
			let colorName = jobOption.jobPlanOptionAttributes[0].attributeName;

			// Apply generic option attribute change to legacy color scheme
			if (changeOrder)
			{
				const changeOrderOptions = _.flatMap(changeOrder.jobChangeOrders, co => co.jobChangeOrderPlanOptions);
				const genericChangeOrderOption = changeOrderOptions?.find(opt => opt.planOptionId === jobOption.planOptionId);
				if (genericChangeOrderOption)
				{
					const deletedColorScheme = genericChangeOrderOption.jobChangeOrderPlanOptionAttributes?.find(att => att.action === 'Delete');
					if (deletedColorScheme?.attributeGroupLabel === colorItemName && deletedColorScheme?.attributeName === colorName)
					{
						colorItemName = '';
						colorName = '';
					}

					const addedColorScheme = genericChangeOrderOption.jobChangeOrderPlanOptionAttributes?.find(att => att.action === 'Add');
					if (addedColorScheme)
					{
						colorItemName = addedColorScheme.attributeGroupLabel;
						colorName = addedColorScheme.attributeName;
					}
				}
			}

			colorScheme = {
				colorItemName: colorItemName,
				colorName: colorName,
				isSelected: !!lite.scenarioOptions?.find(so => so.edhPlanOptionId === jobOption.planOptionId),
				genericPlanOptionId: jobOption.planOptionId
			};
		}

		return colorScheme;
	}
);

export const liteMonotonyConflict = createSelector(
	fromLot.selectSelectedLot,
	fromPlan.selectedPlanData,
	fromLite.selectedElevation,
	fromScenario.hasMonotonyAdvisement,
	fromLite.selectedColorScheme,
	legacyColorScheme,
	fromLite.liteState,
	(selectedLot, selectedPlan, elevation, advisement, colorScheme, legacyColorScheme, lite) =>
	{
		let conflict = {
			monotonyConflict: false,
			conflictSeen: advisement,
			colorSchemeConflict: false,
			colorSchemeConflictOverride: false,
			elevationConflict: false,
			elevationConflictOverride: false
		} as MonotonyConflict;

		if (selectedLot !== null && lite.isPhdLite)
		{
			let isColorSchemePlanRuleEnabled = selectedLot.financialCommunity?.isColorSchemePlanRuleEnabled;
			let planId = !!selectedPlan ? selectedPlan.id : 0;
			const monotonyRules = lite.liteMonotonyRules?.find(rule => rule.edhLotId === selectedLot.id)?.relatedLotsElevationColorScheme || [];

			if (elevation && (legacyColorScheme || colorScheme))
			{
				conflict.elevationConflict = !lite.elevationOverrideNote && monotonyRules.some(rule => rule.elevationPlanOptionId === elevation.id);

				let colorName: string = null;

				if (legacyColorScheme?.isSelected)
				{
					colorName = legacyColorScheme.colorName;
				}
				else if (!legacyColorScheme && colorScheme)
				{
					const colorItem = elevation.colorItems?.find(item => item.colorItemId === colorScheme.colorItemId);
					const color = colorItem?.color?.find(c => c.colorId === colorScheme.colorId);

					colorName = color?.name;
				}

				if (colorName && !lite.colorSchemeOverrideNote)
				{
					conflict.colorSchemeConflict = isColorSchemePlanRuleEnabled
						? monotonyRules.some(r => r.colorSchemeColorName === colorName && r.edhPlanId === planId)
						: monotonyRules.some(r => r.colorSchemeColorName === colorName);
				}
			}

			conflict.monotonyConflict = (conflict.colorSchemeConflict || conflict.elevationConflict);
		}

		return conflict;
	}
);

export const isLiteComplete = createSelector(
	fromScenario.selectScenario,
	liteMonotonyConflict,
	fromSalesAgreement.salesAgreementState,
	needsPlanChange,
	hasSpecPlanId,
	fromLite.liteState,
	fromLite.selectedElevation,
	fromLite.selectedColorScheme,
	legacyColorScheme,
	(scenario, monotonyConflict, sag, needsPlanChange, hasSpecPlanId, lite, selectedElevation, selectedColorScheme, legacyColorScheme) =>
	{
		let isLiteComplete = false;

		if (lite?.isPhdLite)
		{
			const hasLot = !!sag.id || (scenario.scenario ? !!scenario.scenario.lotId : false);
			const hasPlan = !!sag.id || (scenario.scenario ? !!scenario.scenario.planId : false) || hasSpecPlanId;

			isLiteComplete = hasLot
				&& hasPlan
				&& !!selectedElevation
				&& (!!selectedColorScheme || legacyColorScheme?.isSelected)
				&& !monotonyConflict.monotonyConflict
				&& !needsPlanChange;
		}

		return isLiteComplete;
	}
);

export const liteMonotonyOptions = createSelector(
	fromLot.selectSelectedLot,
	fromPlan.selectedPlanData,
	fromLite.liteState,
	(selectedLot, selectedPlan, lite) =>
	{
		let monotonyOptions = { elevationOptionIds: [], colorSchemeNames: [] };

		if (selectedLot && lite.isPhdLite)
		{
			const isColorSchemePlanRuleEnabled = selectedLot.financialCommunity.isColorSchemePlanRuleEnabled;
			const monotonyRules = lite.liteMonotonyRules?.find(rule => rule.edhLotId === selectedLot.id)?.relatedLotsElevationColorScheme;

			if (monotonyRules?.length)
			{
				let planId = selectedPlan !== null ? selectedPlan.id : 0;

				monotonyOptions.elevationOptionIds = monotonyRules
					.filter(r => (r.ruleType === "Elevation" || r.ruleType === "Both") && !!r.elevationPlanOptionId && r.edhPlanId === planId)
					.map(r => r.elevationPlanOptionId);

				monotonyOptions.colorSchemeNames = monotonyRules
					.filter(r => (r.ruleType === "ColorScheme" || r.ruleType === "Both")
						&& !!r.colorSchemeColorName
						&& !!r.colorSchemeColorItemName
						&& (!isColorSchemePlanRuleEnabled || isColorSchemePlanRuleEnabled && r.edhPlanId === planId))
					.map(r =>
					{
						return {
							colorSchemeColorName: r.colorSchemeColorName,
							colorSchemeColorItemName: r.colorSchemeColorItemName
						};
					});
			}
		}

		return monotonyOptions;
	}
);

// End PHD Lite
