import {
	dpToDpRulesPoint,
	mockGroup,
	mockSubGroup,
	mockTreeVersionSingleGroup,
} from '../../shared/classes/mockdata.class';
import { reducer } from './reducer';

import { JobPlan } from 'phd-common';
import { CommonActionTypes, SalesAgreementLoaded } from '../actions';

describe('Scenario Reducer', () => 
{
	describe('Showing post contract points and choices', () => 
	{
		const joc = jasmine.objectContaining;
		const jac = jasmine.arrayContaining;

		const salesAgreementLoadedAction: SalesAgreementLoaded = {
			tree: {
				treeVersion: mockTreeVersionSingleGroup,
				id: 0,
				orgId: 0,
				marketKey: '',
				planId: 0,
				planKey: '',
				communityId: 0,
				communityKey: '',
				marketId: 0,
				financialCommunityId: 0,
			},
			type: CommonActionTypes.SalesAgreementLoaded,
			salesAgreement: undefined,
			info: undefined,
			job: {
				id: 0,
				financialCommunityId: 0,
				constructionStageName: '',
				planId: 0,
				lotId: 0,
				handing: '',
				warrantyTypeDesc: '',
				jobChoices: [],
				jobPlanOptions: [],
				lot: undefined,
				plan: new JobPlan(),
				jobSalesAgreementAssocs: [],
				jobTypeName: '',
				createdBy: '',
				timeOfSaleOptionPrices: [],
			},
			salesCommunity: undefined,
			choices: [],
			selectedPlanId: 0,
			handing: undefined,
			rules: {
				choiceRules: [],
				optionRules: [],
				pointRules: [],
				lotChoiceRules: [],
			},
			options: [],
			optionImages: [],
			webPlanMappings: [],
			changeOrder: undefined,
			lot: undefined,
			myFavorites: [],
		};

		it('should show an unhidden decision point if it has an unhidden choice', () => 
		{
			const reducerResult = reducer(
				undefined,
				salesAgreementLoadedAction
			);

			expect(reducerResult.tree.treeVersion).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											isHiddenFromBuyerView: false,
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
													isHiddenFromBuyerView:
														false,
												}),
											]),
										}),
									]),
								}),
							]),
						}),
					]),
				})
			);
		});

		it('should show a hidden contracted choice and its dp if it was not hidden', () => 
		{
			const dpWithHiddenContractedChoice = {
				...dpToDpRulesPoint,
				choices: [
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: true,
					},
				],
			};
			const treeVersion = {
				...mockTreeVersionSingleGroup,
				groups: [
					{
						...mockGroup,
						subGroups: [
							{
								...mockSubGroup,
								points: [dpWithHiddenContractedChoice],
							},
						],
					},
				],
			};
			const salesAgreementLoadedWithHiddenContractedChoice = {
				...salesAgreementLoadedAction,
				tree: {
					...salesAgreementLoadedAction.tree,
					treeVersion: treeVersion,
				},
			};
			const reducerResult = reducer(
				undefined,
				salesAgreementLoadedWithHiddenContractedChoice
			);

			expect(reducerResult.tree.treeVersion).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											isHiddenFromBuyerView: false,
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
													isHiddenFromBuyerView:
														false,
												}),
											]),
										}),
									]),
								}),
							]),
						}),
					]),
				})
			);
		});

		it('should show dp if it is visible but not a hidden option', () => 
		{
			const dpWithHiddenChoice = {
				...dpToDpRulesPoint,
				choices: [
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: true,
						quantity: 0,
					},
				],
			};
			const treeVersion = {
				...mockTreeVersionSingleGroup,
				groups: [
					{
						...mockGroup,
						subGroups: [
							{
								...mockSubGroup,
								points: [dpWithHiddenChoice],
							},
						],
					},
				],
			};
			const sagLoadedWithHiddenChoice = {
				...salesAgreementLoadedAction,
				tree: {
					...salesAgreementLoadedAction.tree,
					treeVersion: treeVersion,
				},
			};
			const reducerResult = reducer(undefined, sagLoadedWithHiddenChoice);

			expect(reducerResult.tree.treeVersion).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											isHiddenFromBuyerView: false,
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
													isHiddenFromBuyerView: true,
												}),
											]),
										}),
									]),
								}),
							]),
						}),
					]),
				})
			);
		});

		it('should show only the hidden contracted choice if the decision point is not hidden, and not show other previously hidden choices', () => 
		{
			const dpWithHiddenAndHiddenContractedChoices = {
				...dpToDpRulesPoint,
				choices: [
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: true,
					},
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: false,
						label: 'This Choice Should Be Hidden #1',
					},
				],
			};
			const treeVersion = {
				...mockTreeVersionSingleGroup,
				groups: [
					{
						...mockGroup,
						subGroups: [
							{
								...mockSubGroup,
								points: [
									dpWithHiddenAndHiddenContractedChoices,
								],
							},
						],
					},
				],
			};
			const sagLoadedWithHiddenAndHiddenContractedChoice = {
				...salesAgreementLoadedAction,
				tree: {
					...salesAgreementLoadedAction.tree,
					treeVersion: treeVersion,
				},
			};
			const reducerResult = reducer(
				undefined,
				sagLoadedWithHiddenAndHiddenContractedChoice
			);

			expect(reducerResult.tree.treeVersion).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											isHiddenFromBuyerView: false,
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
													isHiddenFromBuyerView:
														false,
												}),
											]),
										}),
									]),
								}),
							]),
						}),
					]),
				})
			);

			expect(reducerResult.tree.treeVersion).not.toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											isHiddenFromBuyerView: false,
											choices: jac([
												joc({
													label: 'This Choice Should Be Hidden',
													isHiddenFromBuyerView: true,
												}),
											]),
										}),
									]),
								}),
							]),
						}),
					]),
				})
			);
		});

		it('should show a hidden contracted choice and its dp if it was hidden', () => 
		{
			const hiddenDpWithHiddenChoice = {
				...dpToDpRulesPoint,
				isHiddenFromBuyerView: true,
				choices: [
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: true,
					},
				],
			};
			const treeVersion = {
				...mockTreeVersionSingleGroup,
				groups: [
					{
						...mockGroup,
						subGroups: [
							{
								...mockSubGroup,
								points: [hiddenDpWithHiddenChoice],
							},
						],
					},
				],
			};
			const salesAgreementLoadedWithHiddenContractedChoice = {
				...salesAgreementLoadedAction,
				tree: {
					...salesAgreementLoadedAction.tree,
					treeVersion: treeVersion,
				},
			};
			const reducerResult = reducer(
				undefined,
				salesAgreementLoadedWithHiddenContractedChoice
			);
			expect(reducerResult.tree.treeVersion).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											isHiddenFromBuyerView: false,
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
													isHiddenFromBuyerView:
														false,
												}),
											]),
										}),
									]),
								}),
							]),
						}),
					]),
				})
			);
		});

		it('should show only the hidden contracted choice if the decision point is hidden, and not show other previously hidden choices', () => 
		{
			const hiddenDpWithHiddenAndHiddenContractedChoices = {
				...dpToDpRulesPoint,
				isHiddenFromBuyerView: true,
				choices: [
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: true,
					},
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: false,
						label: 'This Choice Should Be Hidden #1',
					},
				],
			};
			const treeVersion = {
				...mockTreeVersionSingleGroup,
				groups: [
					{
						...mockGroup,
						subGroups: [
							{
								...mockSubGroup,
								points: [
									hiddenDpWithHiddenAndHiddenContractedChoices,
								],
							},
						],
					},
				],
			};
			const salesAgreementLoadedWithHiddenAndHiddenContractedChoice = {
				...salesAgreementLoadedAction,
				tree: {
					...salesAgreementLoadedAction.tree,
					treeVersion: treeVersion,
				},
			};
			const reducerResult = reducer(
				undefined,
				salesAgreementLoadedWithHiddenAndHiddenContractedChoice
			);

			expect(reducerResult.tree.treeVersion).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											isHiddenFromBuyerView: false,
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
													isHiddenFromBuyerView:
														false,
												}),
											]),
										}),
									]),
								}),
							]),
						}),
					]),
				})
			);

			expect(reducerResult.tree.treeVersion).not.toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											isHiddenFromBuyerView: false,
											choices: jac([
												joc({
													label: 'This Choice Should Be Hidden',
													isHiddenFromBuyerView: true,
												}),
											]),
										}),
									]),
								}),
							]),
						}),
					]),
				})
			);
		});

		it('should continue to hide the hidden decision point if it has no hidden contracted choices', () => 
		{
			const hiddenDp = {
				...dpToDpRulesPoint,
				isHiddenFromBuyerView: true,
				choices: [
					{
						...dpToDpRulesPoint.choices[0],
					},
				],
			};
			const treeVersion = {
				...mockTreeVersionSingleGroup,
				groups: [
					{
						...mockGroup,
						subGroups: [
							{
								...mockSubGroup,
								points: [hiddenDp],
							},
						],
					},
				],
			};
			const salesAgreementLoadedWithHiddenDp = {
				...salesAgreementLoadedAction,
				tree: {
					...salesAgreementLoadedAction.tree,
					treeVersion: treeVersion,
				},
			};
			const reducerResult = reducer(
				undefined,
				salesAgreementLoadedWithHiddenDp
			);
			expect(reducerResult.tree.treeVersion).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											isHiddenFromBuyerView: true,
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
													isHiddenFromBuyerView:
														false,
												}),
											]),
										}),
									]),
								}),
							]),
						}),
					]),
				})
			);
		});
		it('should continue to hide the hidden decision point if it has no unhidden choices', () => 
		{
			const hiddenDp = {
				...dpToDpRulesPoint,
				isHiddenFromBuyerView: true,
				choices: [
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: true,
						quantity: 0,
					},
				],
			};
			const treeVersion = {
				...mockTreeVersionSingleGroup,
				groups: [
					{
						...mockGroup,
						subGroups: [
							{
								...mockSubGroup,
								points: [hiddenDp],
							},
						],
					},
				],
			};
			const salesAgreementLoadedWithHiddenDp = {
				...salesAgreementLoadedAction,
				tree: {
					...salesAgreementLoadedAction.tree,
					treeVersion: treeVersion,
				},
			};
			const reducerResult = reducer(
				undefined,
				salesAgreementLoadedWithHiddenDp
			);
			expect(reducerResult.tree.treeVersion).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											isHiddenFromBuyerView: true,
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
													isHiddenFromBuyerView: true,
												}),
											]),
										}),
									]),
								}),
							]),
						}),
					]),
				})
			);
		});
	});
});
