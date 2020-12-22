import { ActionReducerMap, createSelector } from '@ngrx/store';

import * as _ from 'lodash';

import { PriceBreakdown, TreeVersion } from 'phd-common';

import * as fromScenario from './scenario/reducer';
import * as fromLot from './lot/reducer';
import * as fromPlan from './plan/reducer';
import * as fromNav from './nav/reducer';
import * as fromOrg from './org/reducer';
import * as fromSalesAgreement from './sales-agreement/reducer';
import * as fromJob from './job/reducer';
import * as fromChangeOrder from './change-order/reducer';

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
}

export const reducers: ActionReducerMap<State> = {
	scenario: fromScenario.reducer,
	lot: fromLot.reducer,
	plan: fromPlan.reducer,
	nav: fromNav.reducer,
	org: fromOrg.reducer,
	salesAgreement: fromSalesAgreement.reducer,
	job: fromJob.reducer,
	changeOrder: fromChangeOrder.reducer
}

export const filteredTree = createSelector(
	fromScenario.selectScenario,
	(state) => {
		let tree = _.cloneDeep(state.tree);
		const treeFilter = state.treeFilter;
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

								return isValid;
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
	})

export const priceBreakdown = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromChangeOrder.currentChangeOrder,
	(salesAgreement, currentChangeOrder) => {
		let breakdown = new PriceBreakdown();

		if (salesAgreement) {
			const salesPrice = salesAgreement.salePrice || 0;
			if (currentChangeOrder) {
				breakdown.changePrice = currentChangeOrder.amount || 0;
			}
			breakdown.totalPrice = salesPrice + breakdown.changePrice;
		}

		return breakdown;
	}
)

export const showSpinner = createSelector(
	fromSalesAgreement.salesAgreementState,
	fromJob.jobState,
	(sa, job) => {
		return (sa ? sa.salesAgreementLoading : false) || (job ? job.jobLoading : false);
	}
);
