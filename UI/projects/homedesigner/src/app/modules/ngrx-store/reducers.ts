import { ActionReducerMap, createSelector } from '@ngrx/store';

import * as _ from 'lodash';

import { PriceBreakdown, TreeVersion, PlanOption } from 'phd-common';

import * as fromScenario from './scenario/reducer';
import * as fromLot from './lot/reducer';
import * as fromPlan from './plan/reducer';
import * as fromNav from './nav/reducer';
import * as fromOrg from './org/reducer';
import * as fromSalesAgreement from './sales-agreement/reducer';
import * as fromJob from './job/reducer';
import * as fromChangeOrder from './change-order/reducer';
import * as fromFavorite from './favorite/reducer';

export interface State
{
	scenario: fromScenario.State;
	lot: fromLot.State;
	plan: fromPlan.State;
	nav: fromNav.State;
	org: fromOrg.State;
	salesAgreement: fromSalesAgreement.State;
	job: fromJob.State;
	changeOrder: fromChangeOrder.State;
	favorite: fromFavorite.State;
}

export const reducers: ActionReducerMap<State> = {
	scenario: fromScenario.reducer,
	lot: fromLot.reducer,
	plan: fromPlan.reducer,
	nav: fromNav.reducer,
	org: fromOrg.reducer,
	salesAgreement: fromSalesAgreement.reducer,
	job: fromJob.reducer,
	changeOrder: fromChangeOrder.reducer,
	favorite: fromFavorite.reducer
}

export const filteredTree = createSelector(
	fromScenario.selectScenario,
	fromFavorite.favoriteState,
	(scenario, favorite) => {
		let tree = _.cloneDeep(scenario.tree);
		const treeFilter = scenario.treeFilter;
		let filteredTree: TreeVersion;

		if (tree && tree.treeVersion) {
			const filter = (label: string) => {
				return treeFilter ? label.toLowerCase().includes(treeFilter.keyword.toLowerCase()) : true;
			};

			let treeMatched = { subGroup: false, point: false };

			filteredTree = {
				...tree.treeVersion, groups: tree.treeVersion.groups.map(g => {
					let subGroups = g.subGroups.map(sg => {
						treeMatched.subGroup = filter(sg.label);

						let points = sg.points.map(p => {
							treeMatched.point = treeMatched.subGroup || filter(p.label);

							let choices = p.choices.filter(c => {
								let isValid = treeMatched.point || filter(c.label);

								const isIncluded = p.isStructuralItem
									? favorite.includeContractedOptions && c.quantity > 0
									: true;

								return isValid && isIncluded;
							});

							return { ...p, choices: choices };
						}).filter(dp => {
							return !!dp.choices.length;
						});

						return { ...sg, points: points };
					}).filter(sg => {
						return !!sg.points.length;
					});

					return { ...g, subGroups: subGroups };
				}).filter(g => !!g.subGroups.length)
			} as TreeVersion;
		}

		return filteredTree ? new TreeVersion(filteredTree) : null;
	}
)

export const selectedPlanPrice = createSelector(
	fromPlan.selectedPlanData,
	fromLot.selectSelectedLot,
	(selectedPlan, selectedLot) => {
		let price = selectedPlan ? selectedPlan.price : 0;
		if (selectedPlan && selectedLot && selectedLot.salesPhase && selectedLot.salesPhase.salesPhasePlanPriceAssocs) {
			const phasePlanPrice = selectedLot.salesPhase.salesPhasePlanPriceAssocs.find(x => x.planId === selectedPlan.id);
			if (phasePlanPrice) {
				price = phasePlanPrice.price;
			}
		}
		return price;
	}
)

export const priceBreakdown = createSelector(
	fromScenario.selectScenario,
	fromSalesAgreement.salesAgreementState,
	fromChangeOrder.currentChangeOrder,
	selectedPlanPrice,
	(scenario, salesAgreement, currentChangeOrder, planPrice) => {
		let breakdown = new PriceBreakdown();

		if (salesAgreement && scenario) {
			breakdown.baseHouse = planPrice;
			breakdown.homesite = scenario.lotPremium;

			let base = scenario.options ? scenario.options.find(o => o.isBaseHouse) : null;
			if (base && scenario.tree) {
				breakdown.selections = _.flatMap(scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, p => p.choices)))
					.reduce((acc, ch) => acc + (ch.quantity * ch.price), 0);
			}

			const programs = salesAgreement.programs;
			programs && programs.forEach(p => {
				if (p.salesProgram.salesProgramType === 'BuyersClosingCost') {
					breakdown.closingIncentive += p.amount;
				}
				else if (p.salesProgram.salesProgramType === 'DiscountFlatAmount') {
					breakdown.salesProgram += p.amount;
				}
			});

			if (salesAgreement.priceAdjustments && salesAgreement.priceAdjustments.length) {
				salesAgreement.priceAdjustments.forEach(adj => {
					if (adj.priceAdjustmentType === 'ClosingCost') {
						breakdown.closingCostAdjustment += adj.amount;
					}
				});
			}

			if (currentChangeOrder && currentChangeOrder.jobChangeOrders) {
				const priceAdjustmentCO = currentChangeOrder.jobChangeOrders.find(x => x.jobChangeOrderTypeDescription === 'PriceAdjustment');
				if (priceAdjustmentCO) {
					const salesChangeOrderSalesPrograms = priceAdjustmentCO.jobSalesChangeOrderSalesPrograms;
					if (salesChangeOrderSalesPrograms && salesChangeOrderSalesPrograms.length) {
						salesChangeOrderSalesPrograms.forEach(salesProgram => {
							if (salesProgram.action === 'Add') {
								if (salesProgram.salesProgramType === 'DiscountFlatAmount') {
									breakdown.salesProgram += salesProgram.amount;
								} else if (salesProgram.salesProgramType === 'BuyersClosingCost') {
									breakdown.closingIncentive += salesProgram.amount;
								}
							} else if (salesProgram.action === 'Delete') {
								if (salesProgram.salesProgramType === 'DiscountFlatAmount') {
									breakdown.salesProgram -= salesProgram.amount;
								} else if (salesProgram.salesProgramType === 'BuyersClosingCost') {
									breakdown.closingIncentive -= salesProgram.amount;
								}
							}
						});
					}

					const salesChangeOrderPriceAdjustments = priceAdjustmentCO.jobSalesChangeOrderPriceAdjustments;
					if (salesChangeOrderPriceAdjustments && salesChangeOrderPriceAdjustments.length) {
						salesChangeOrderPriceAdjustments.forEach(priceAdjustment => {
							if (priceAdjustment.priceAdjustmentTypeName === 'ClosingCost') {
								if (priceAdjustment.action === 'Add') {
									breakdown.closingCostAdjustment += priceAdjustment.amount;
								} else if (priceAdjustment.action === 'Delete') {
									breakdown.closingCostAdjustment -= priceAdjustment.amount;
								}
							}
						});
					}
				}
			}

			let changePrice = currentChangeOrder && currentChangeOrder.amount || 0;
			const salesPrice = salesAgreement.salePrice || 0;
			breakdown.totalPrice = salesPrice + changePrice + breakdown.favoritesPrice;
		}

		return breakdown;
	}
)

export const financialCommunityName = createSelector(
	fromOrg.selectOrg,
	fromJob.jobState,
	(org, job) => {
		let communityName = '';
		if (org && org.salesCommunity && org.salesCommunity.financialCommunities && org.salesCommunity.financialCommunities.length) {
			const financialCommunity = org.salesCommunity.financialCommunities.find(x => x.id === job.financialCommunityId);
			if (financialCommunity) {
				communityName = financialCommunity.name;
			}
		}
		return communityName;
	}
)

export const elevationImageUrl = createSelector(
	fromScenario.selectScenario,
	fromScenario.elevationDP,
	fromPlan.selectedPlanData,
	(scenario, dp, plan) => {
		let imageUrl = '';
		const elevationOption = scenario && scenario.options ? scenario.options.find(x => x.isBaseHouseElevation) : null;

		if (dp) {
			const selectedChoice = dp.choices.find(x => x.quantity > 0);
			let option: PlanOption = null;

			if (selectedChoice && selectedChoice.options && selectedChoice.options.length) {
				// look for a selected choice to pull the image from
				option = selectedChoice.options.find(x => x && x.optionImages != null);
			}
			else if (!selectedChoice && elevationOption) {
				// if a choice hasn't been selected then get the default option
				option = elevationOption;
			}

			if (option && option.optionImages.length > 0) {
				imageUrl = option.optionImages[0].imageURL;
			} else if (selectedChoice && selectedChoice.imagePath) {
				imageUrl = selectedChoice.imagePath;
			}
		}

		if (!imageUrl && plan) {
			imageUrl = plan.baseHouseElevationImageUrl;
		}
		return imageUrl;
	}
)

export const showSpinner = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromJob.jobState,
	(sa, job) => {
		return (sa ? sa.salesAgreementLoading : false) || (job ? job.jobLoading : false);
	}
);
