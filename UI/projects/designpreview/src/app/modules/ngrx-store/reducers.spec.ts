import {
	dpToDpRulesPoint,
	mockGroup,
	mockSalesChoice,
	mockSubGroup,
	mockTreeVersionSingleGroup,
} from '../shared/classes/mockdata.class';
import { BuildMode } from '../shared/models/build-mode.model';
import * as fromRoot from './reducers';
import * as fromFavorite from './favorite/reducer';
import * as fromSalesAgreement from './sales-agreement/reducer';
import * as fromScenario from './scenario/reducer';

describe('Reducers', () => 
{
	const joc = jasmine.objectContaining;
	const jac = jasmine.arrayContaining;

	const testScenario: fromScenario.State = {
		buildMode: BuildMode.Buyer,
		financialCommunityFilter: 0,
		isGanked: false,
		isUnsaved: false,
		loadError: false,
		lotPremium: 0,
		monotonyAdvisementShown: false,
		options: [],
		pointHasChanges: false,
		rules: undefined,
		salesCommunity: undefined,
		saveError: false,
		savingScenario: false,
		scenario: undefined,
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
		treeFilter: undefined,
		treeLoading: false,
		overrideReason: '',
		hiddenChoiceIds: [],
		hiddenPointIds: [],
		floorPlanImages: [],
		presalePricingEnabled: false,
		priceRanges: [],
	};

	const testFavoriteState: fromFavorite.State = {
		myFavorites: [],
		selectedFavoritesId: 0,
		isLoading: false,
		saveError: false,
		salesChoices: [mockSalesChoice],
		includeContractedOptions: true,
	};

	const testSalesAgreementState: fromSalesAgreement.State = {
		isFloorplanFlipped: false,
		isDesignComplete: false,
		loadError: false,
		salesAgreementLoading: false,
		approvedDate: undefined,
		buyers: [],
		changeOrderGroupSalesAgreementAssocs: [],
		consultants: [],
		ecoeDate: undefined,
		insuranceQuoteOptIn: false,
		lastModifiedUtcDate: undefined,
		lenderType: '',
		notes: [],
		salesAgreementNumber: '',
		propertyType: '',
		realtors: [],
		signedDate: undefined,
		status: '',
		statusUtcDate: undefined,
		trustName: '',
		salePrice: 0,
		salesAgreementName: '',
		isLockedIn: false,
	};

	describe('Filtered tree selector', () => 
	{
		it('should return an unhidden decision point and its unhidden choices', () => 
		{
			const testFavoriteStateNotContracted = {
				...testFavoriteState,
				salesChoices: [{ ...mockSalesChoice, divChoiceCatalogId: 1 }],
			};
			const filteredTreeResult = fromRoot.filteredTree.projector(
				testScenario,
				testFavoriteStateNotContracted,
				testSalesAgreementState
			);
			expect(filteredTreeResult).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
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

		it('should not return a hidden decision point and its choices', () => 
		{
			const hiddenDp = {
				...dpToDpRulesPoint,
				isHiddenFromBuyerView: true,
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
			const testScenarioWithHiddenDp: fromScenario.State = {
				...testScenario,
				tree: { ...testScenario.tree, treeVersion: treeVersion },
			};

			const filteredTreeResult = fromRoot.filteredTree.projector(
				testScenarioWithHiddenDp,
				testFavoriteState,
				testSalesAgreementState
			);

			expect(filteredTreeResult).toEqual(
				joc({
					groups: [],
				})
			);
		});

		it('should not return a hidden choice even if dp is visible', () => 
		{
			const dpWithHiddenChoice = {
				...dpToDpRulesPoint,
				choices: [
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: true,
						label: 'This Choice Should Be Hidden',
					},
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: false,
						label: 'This Choice Should Not Be Hidden',
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
			const testScenarioWithHiddenChoice: fromScenario.State = {
				...testScenario,
				tree: { ...testScenario.tree, treeVersion: treeVersion },
			};

			const filteredTreeResult = fromRoot.filteredTree.projector(
				testScenarioWithHiddenChoice,
				testFavoriteState,
				testSalesAgreementState
			);
			expect(filteredTreeResult).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											choices: jac([
												joc({
													label: 'This Choice Should Not Be Hidden',
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

			expect(filteredTreeResult).not.toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											choices: jac([
												joc({
													label: 'This Choice Should Be Hidden',
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

		it('should not return a contracted choice when include contracted options = false', () => 
		{
			const hideIncludedOptionsFavoriteState = {
				...testFavoriteState,
				includeContractedOptions: false,
			};

			const filteredTreeResult = fromRoot.filteredTree.projector(
				testScenario,
				hideIncludedOptionsFavoriteState,
				testSalesAgreementState
			);
			expect(filteredTreeResult).toEqual(
				joc({
					groups: [],
				})
			);
		});

		it('should return contracted choices when include contracted options = true', () => 
		{
			const filteredTreeResult = fromRoot.filteredTree.projector(
				testScenario,
				testFavoriteState,
				testSalesAgreementState
			);

			expect(filteredTreeResult).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
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

	describe('Contracted tree selector', () => 
	{
		it('should return an unhidden decision point and its unhidden choices', () => 
		{
			const testFavoriteStateNotContracted = {
				...testFavoriteState,
				salesChoices: [{ ...mockSalesChoice, divChoiceCatalogId: 1 }],
			};
			const filteredTreeResult = fromRoot.filteredTree.projector(
				testScenario,
				testFavoriteStateNotContracted,
				testSalesAgreementState
			);
			expect(filteredTreeResult).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
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

		it('should not return a hidden decision point and its choices', () => 
		{
			const hiddenDp = {
				...dpToDpRulesPoint,
				isHiddenFromBuyerView: true,
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
			const testScenarioWithHiddenDp: fromScenario.State = {
				...testScenario,
				tree: { ...testScenario.tree, treeVersion: treeVersion },
			};

			const filteredTreeResult = fromRoot.filteredTree.projector(
				testScenarioWithHiddenDp,
				testFavoriteState,
				testSalesAgreementState
			);

			expect(filteredTreeResult).toEqual(
				joc({
					groups: [],
				})
			);
		});

		it('should not return a hidden choice even if dp is visible', () => 
		{
			const dpWithHiddenChoice = {
				...dpToDpRulesPoint,
				choices: [
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: true,
						label: 'This Choice Should Be Hidden',
					},
					{
						...dpToDpRulesPoint.choices[0],
						isHiddenFromBuyerView: false,
						label: 'This Choice Should Not Be Hidden',
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
			const testScenarioWithHiddenChoice: fromScenario.State = {
				...testScenario,
				tree: { ...testScenario.tree, treeVersion: treeVersion },
			};

			const filteredTreeResult = fromRoot.filteredTree.projector(
				testScenarioWithHiddenChoice,
				testFavoriteState,
				testSalesAgreementState
			);
			expect(filteredTreeResult).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											choices: jac([
												joc({
													label: 'This Choice Should Not Be Hidden',
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

			expect(filteredTreeResult).not.toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											choices: jac([
												joc({
													label: 'This Choice Should Be Hidden',
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

		it('should not return a contracted choice when include contracted options = false', () => 
		{
			const hideIncludedOptionsFavoriteState = {
				...testFavoriteState,
				includeContractedOptions: false,
			};

			const filteredTreeResult = fromRoot.filteredTree.projector(
				testScenario,
				hideIncludedOptionsFavoriteState,
				testSalesAgreementState
			);
			expect(filteredTreeResult).toEqual(
				joc({
					groups: [],
				})
			);
		});

		it('should return contracted choices when include contracted options = true', () => 
		{
			const filteredTreeResult = fromRoot.filteredTree.projector(
				testScenario,
				testFavoriteState,
				testSalesAgreementState
			);

			expect(filteredTreeResult).toEqual(
				joc({
					groups: jac([
						joc({
							subGroups: jac([
								joc({
									points: jac([
										joc({
											label: 'Smart Home Additions',
											choices: jac([
												joc({
													label: 'Single Wi-Fi Speaker',
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
