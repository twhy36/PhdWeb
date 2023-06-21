import { ActionReducerMap, createSelector } from '@ngrx/store';

import * as _ from 'lodash';

import { PriceBreakdown, TreeVersion, PlanOption, PickType, getChoiceImage } from 'phd-common';

import * as fromApp from './app/reducer';
import * as fromScenario from './scenario/reducer';
import * as fromPlan from './plan/reducer';
import * as fromNav from './nav/reducer';
import * as fromOrg from './org/reducer';
import * as fromSalesAgreement from './sales-agreement/reducer';
import * as fromJob from './job/reducer';
import * as fromChangeOrder from './change-order/reducer';
import * as fromFavorite from './favorite/reducer';
import { BuildMode } from '../shared/models/build-mode.model';

export interface State
{
	app: fromApp.State;
	scenario: fromScenario.State;
	plan: fromPlan.State;
	nav: fromNav.State;
	org: fromOrg.State;
	salesAgreement: fromSalesAgreement.State;
	job: fromJob.State;
	changeOrder: fromChangeOrder.State;
	favorite: fromFavorite.State;
}

export const reducers: ActionReducerMap<State> = {
	app: fromApp.reducer,
	scenario: fromScenario.reducer,
	plan: fromPlan.reducer,
	nav: fromNav.reducer,
	org: fromOrg.reducer,
	salesAgreement: fromSalesAgreement.reducer,
	job: fromJob.reducer,
	changeOrder: fromChangeOrder.reducer,
	favorite: fromFavorite.reducer
};

export const filteredTree = createSelector(
	fromScenario.selectScenario,
	fromFavorite.favoriteState,
	fromSalesAgreement.salesAgreementState,
	(scenario, favorite, sag) =>
	{
		const tree = _.cloneDeep(scenario?.tree);
		const treeFilter = scenario?.treeFilter;
		let filteredTree: TreeVersion;

		if (tree && tree.treeVersion)
		{
			const isPreview = scenario.buildMode === BuildMode.Preview;
			const isPresale = scenario.buildMode === BuildMode.Presale;
			const isDesignComplete = sag?.isDesignComplete || false;

			const filter = (label: string) =>
			{
				return treeFilter ? label.toLowerCase().includes(treeFilter.keyword.toLowerCase()) : true;
			};

			const treeMatched = { subGroup: false, point: false };

			filteredTree = {
				...tree.treeVersion, groups: tree.treeVersion.groups.map(g =>
				{
					const subGroups = g.subGroups.map(sg =>
					{
						treeMatched.subGroup = filter(sg.label);

						let points = sg.points.map(p =>
						{
							treeMatched.point = treeMatched.subGroup || filter(p.label);

							const contractedChoices = p.choices.filter(c => favorite?.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);

							const choices = p.choices.filter(c =>
							{
								const isValid = treeMatched.point || filter(c.label);

								let isIncluded = true;
								const isContractedChoice = contractedChoices?.includes(c);

								if (p.isStructuralItem)
								{
									isIncluded = favorite.includeContractedOptions && c.quantity > 0;
								}
								else
								{
									// If there are contracted design choices and the include contracted option flag is false,
									// Pick1 or Pick0or1 - remove all choices
									// Pick1ormore or Pick0ormore - remove the selected choice and leave other choices viewable
									if (!favorite.includeContractedOptions)
									{
										if (contractedChoices?.length)
										{
											isIncluded = !isContractedChoice;
										}

										if (p.choices.find(ch => contractedChoices?.includes(ch)))
										{
											switch (p.pointPickTypeId) 
											{
											case PickType.Pick1:
												isIncluded = false;
											case PickType.Pick0or1:
												isIncluded = false;
											}
										}
									}

									// Apply cutoff to non-contracted choice whether or not it is favorited
									if (!isContractedChoice && p.isPastCutOff)
									{
										isIncluded = false;
									}
								}

								if (scenario.hiddenChoiceIds.indexOf(c.id) > -1)
								{
									isIncluded = false;
								}

								// Only display contracted choices when the design complete flag is turned on
								if (isDesignComplete)
								{
									isIncluded = isContractedChoice;
								}

								return isValid && (isIncluded || isPreview || isPresale) && !c.isHiddenFromBuyerView;
							});

							return { ...p, choices: choices };
						});

						points = points.filter(dp =>
						{
							dp.price = dp.choices.reduce((acc, ch) => acc + (!ch.priceHiddenFromBuyerView ? ch.quantity * ch.price : 0), 0);

							let isIncluded = true;

							if (dp.choices.length === 0)
							{
								isIncluded = false;
							}
							else if (!isPreview && !isPresale && scenario.hiddenPointIds.indexOf(dp.id) > -1)
							{
								isIncluded = false;
							}

							return isIncluded && !dp.isHiddenFromBuyerView;
						});

						return { ...sg, points: points };
					}).filter(sg =>
					{
						return !!sg.points.length;
					});

					return { ...g, subGroups: subGroups };
				}).filter(g =>
				{
					return !!g.subGroups.length;
				})
			} as TreeVersion;
		}

		return filteredTree ? new TreeVersion(filteredTree) : null;
	}
);

export const contractedTree = createSelector(
	fromScenario.selectScenario,
	fromFavorite.favoriteState,
	fromSalesAgreement.salesAgreementState,
	(scenario, favorite, sag) =>
	{
		const tree = _.cloneDeep(scenario?.tree);
		const treeFilter = scenario?.treeFilter;
		let contractedTree: TreeVersion;

		if (tree && tree.treeVersion)
		{
			const isPreview = scenario.buildMode === BuildMode.Preview;
			const isDesignComplete = sag?.isDesignComplete || false;

			const filter = (label: string) =>
			{
				return treeFilter ? label.toLowerCase().includes(treeFilter.keyword.toLowerCase()) : true;
			};

			const treeMatched = { subGroup: false, point: false };

			contractedTree = {
				...tree.treeVersion, groups: tree.treeVersion.groups.map(g =>
				{
					const subGroups = g.subGroups.map(sg =>
					{
						treeMatched.subGroup = filter(sg.label);

						let points = sg.points.map(p =>
						{
							treeMatched.point = treeMatched.subGroup || filter(p.label);

							const contractedChoices = p.choices.filter(c => favorite?.salesChoices?.findIndex(x => x.divChoiceCatalogId === c.divChoiceCatalogId) > -1);

							const choices = p.choices.filter(c =>
							{
								const isValid = treeMatched.point || filter(c.label);

								const isContractedChoice = contractedChoices?.includes(c);

								let isIncluded = p.isStructuralItem ? c.quantity > 0 : isContractedChoice;

								if (scenario.hiddenChoiceIds.indexOf(c.id) > -1)
								{
									isIncluded = false;
								}

								// Only display contracted choices when the design complete flag is turned on
								if (isDesignComplete)
								{
									isIncluded = isContractedChoice;
								}

								return isValid && (isIncluded || isPreview) && !c.isHiddenFromBuyerView;
							});

							return { ...p, choices: choices };
						});

						points = points.filter(dp =>
						{
							dp.price = dp.choices.reduce((acc, ch) => acc + (!ch.priceHiddenFromBuyerView ? ch.quantity * ch.price : 0), 0);

							let isIncluded = true;

							if (dp.choices.length === 0)
							{
								isIncluded = false;
							}
							else if (!isPreview && scenario.hiddenPointIds.indexOf(dp.id) > -1)
							{
								isIncluded = false;
							}

							return isIncluded && !dp.isHiddenFromBuyerView;
						});

						return { ...sg, points: points };
					}).filter(sg =>
					{
						return !!sg.points.length;
					});

					return { ...g, subGroups: subGroups };
				}).filter(g =>
				{
					return !!g.subGroups.length;
				})
			} as TreeVersion;
		}

		return contractedTree ? new TreeVersion(contractedTree) : null;
	}
);

export const selectedPlanPrice = createSelector(
	fromPlan.selectedPlanData,
	fromSalesAgreement.salesAgreementState,
	(selectedPlan, sag) =>
	{
		let price = selectedPlan ? selectedPlan.price : 0;

		if (selectedPlan && sag.selectedLot && sag.selectedLot.salesPhase && sag.selectedLot.salesPhase.salesPhasePlanPriceAssocs
			&& (sag.status === 'Pending' || !sag?.id))
		{
			const isPhaseEnabled = sag.selectedLot.financialCommunity && sag.selectedLot.financialCommunity.isPhasedPricingEnabled;
			const phasePlanPrice = sag.selectedLot.salesPhase.salesPhasePlanPriceAssocs.find(x => x.planId === selectedPlan.id);

			if (isPhaseEnabled && phasePlanPrice)
			{
				price = phasePlanPrice.price;
			}
		}

		return price;
	}
);

export const priceBreakdown = createSelector(
	fromScenario.selectScenario,
	fromSalesAgreement.salesAgreementState,
	fromChangeOrder.currentChangeOrder,
	fromJob.jobState,
	fromFavorite.favoriteState,
	selectedPlanPrice,
	(scenario, salesAgreement, currentChangeOrder, job, favorite, planPrice) =>
	{
		const breakdown = new PriceBreakdown();

		if (salesAgreement && scenario)
		{
			const isDesignComplete = salesAgreement.isDesignComplete;

			breakdown.baseHouse = planPrice;
			breakdown.homesite = scenario.lotPremium;

			const base = scenario.options ? scenario.options.find(o => o.isBaseHouse) : null;

			if (base && scenario.tree)
			{
				const treePoints = _.flatMap(scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => sg.points));
				const treeChoices = _.flatMap(scenario.tree.treeVersion.groups, g => _.flatMap(g.subGroups, sg => _.flatMap(sg.points, p => p.choices)));

				breakdown.selections = treeChoices.filter(c => !!favorite?.salesChoices?.find(x => x.divChoiceCatalogId === c.divChoiceCatalogId))
					?.reduce((acc, ch) => acc + (ch.quantity * ch.price), 0);
				breakdown.favoritesPrice = treeChoices.filter(c => c.quantity > 0 && !c.priceHiddenFromBuyerView && !c.isHiddenFromBuyerView
					&& !treePoints.find(p => p.choices.find(ch => ch.divChoiceCatalogId === c.divChoiceCatalogId)).isHiddenFromBuyerView
					&& !favorite?.salesChoices?.find(x => x.divChoiceCatalogId === c.divChoiceCatalogId))
					?.reduce((acc, ch) => acc + (ch.quantity * ch.price), 0);
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
							if (priceAdjustment.priceAdjustmentTypeName === 'ClosingCost')
							{
								if (priceAdjustment.action === 'Add')
								{
									breakdown.closingCostAdjustment += priceAdjustment.amount;
								}
								else if (priceAdjustment.action === 'Delete')
								{
									breakdown.closingCostAdjustment -= priceAdjustment.amount;
								}
							}
						});
					}
				}
			}

			const changePrice = salesAgreement.status === 'Approved' && currentChangeOrder?.amount || 0;
			let salesPrice = salesAgreement.salePrice || 0;

			if (salesPrice === 0 && (scenario.buildMode === BuildMode.Preview || scenario.buildMode === BuildMode.Presale))
			{
				salesPrice = breakdown.baseHouse;
			}

			let nonStandardOptions = 0;

			job.jobNonStandardOptions?.forEach(nso =>
			{
				nonStandardOptions += (nso.quantity * nso.unitPrice);
			});

			breakdown.nonStandardSelections = nonStandardOptions;

			const nsos = _.flatMap(currentChangeOrder?.jobChangeOrders, co => co.jobChangeOrderNonStandardOptions);

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

			breakdown.totalPrice = salesPrice + changePrice + (!isDesignComplete ? breakdown.favoritesPrice : 0);
		}

		return breakdown;
	}
);

export const financialCommunityName = createSelector(
	fromOrg.selectOrg,
	fromJob.jobState,
	fromScenario.selectScenario,
	(org, job, scenario) =>
	{
		let communityName = '';

		if (org && org.salesCommunity && org.salesCommunity.financialCommunities && org.salesCommunity.financialCommunities.length)
		{
			const financialCommunity = org.salesCommunity.financialCommunities.find(x => x.id === (job?.financialCommunityId || scenario?.tree?.financialCommunityId));

			if (financialCommunity)
			{
				communityName = financialCommunity.name;
			}
		}

		return communityName;
	}
);

export const financialCommunityId = createSelector(
	fromOrg.selectOrg,
	fromJob.jobState,
	fromScenario.selectScenario,
	(org, job, scenario) =>
	{
		let communityId = 0;

		if (org && org.salesCommunity && org.salesCommunity.financialCommunities && org.salesCommunity.financialCommunities.length)
		{
			const financialCommunity = org.salesCommunity.financialCommunities.find(x => x.id === (job?.financialCommunityId || scenario?.tree?.financialCommunityId));

			if (financialCommunity)
			{
				communityId = financialCommunity.id;
			}
		}

		return communityId;
	}
);

export const elevationImageUrl = createSelector(
	fromScenario.selectScenario,
	fromScenario.elevationDP,
	(scenario, dp) =>
	{
		let imageUrl = '';
		let elevationOption = scenario && scenario.options ? scenario.options.find(x => x.isBaseHouseElevation) : null;

		if (!!!elevationOption) 
		{
			elevationOption = scenario && scenario.options ? scenario.options.find(x => x.isBaseHouse) : null;
		}

		if (dp)
		{
			const selectedChoice = dp.choices.find(x => x.quantity > 0);

			if (selectedChoice)
			{
				imageUrl = getChoiceImage(selectedChoice);
			}
			else if (elevationOption)
			{
				// if a choice hasn't been selected then get the default option
				imageUrl = elevationOption?.optionImages[0]?.imageURL;
			}
		}

		return imageUrl;
	}
);

export const showSpinner = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromJob.jobState,
	(sa, job) =>
	{
		return (sa ? sa.salesAgreementLoading : false) || (job ? job.jobLoading : false);
	}
);

export const favoriteTitle = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromSalesAgreement.primaryBuyer,
	fromChangeOrder.changeOrderPrimaryBuyer,
	(state, sagBuyer, changeOrderBuyer) =>
	{
		if (state?.id) 
		{
			const buyer = changeOrderBuyer ? changeOrderBuyer : sagBuyer;
			const contact = buyer?.opportunityContactAssoc?.contact;
			const lastName = contact && !!contact.lastName ? contact.lastName : '';

			return `${!!lastName ? lastName || '' : ''} Favorites`;
		}
		else 
		{
			return 'Favorites';
		}
	}
);

export const getScenarioLoadError = createSelector(
	fromScenario.selectScenario,
	(scenario) =>
	{
		return scenario.loadError;
	}
);
