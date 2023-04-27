/// <reference types="jasmine" />

import { ScenarioStatusType, TreeVersion } from 'phd-common';
import
{
	State,
	title,
	canConfigure,
	canSell,
	canDesign,
	canApprove,
	canOverride,
	canAddIncentive,
	monotonyConflict,
	needsPlanChange,
	hasSpecPlanId,
	isComplete,
	canEditAgreementOrSpec,
	canEditCancelOrVoidAgreement,
	isSpecSalePending,
	activePrimaryBuyer,
	isActivePrimaryBuyerComplete,
	activeCoBuyers,
	scenarioStatus,
	salesAgreementStatus,
	selectedPlanPrice,
	priceBreakdown,
	filteredTree,
	agreementColorScheme,
	selectSelectedPlanLotAvailability,
	changeOrderChoicesPastCutoff,
	canCancelSpec,
	showSpinner
} from './reducers';

describe('Common reducer', function ()
{
	const testDate = new Date(123456789);

	it('title displays preview', () =>
	{
		let state: State = <any>{
			scenario: {
				buildMode: 'preview'
			},
			opportunity: {},
			salesAgreement: {}
		};

		let result = title(state);
		expect(result).toBe('Preview Home');
	});

	it('title displays sales agreement buyer', () =>
	{
		let state: State = <any>{
			scenario: {
				buildMode: 'buyer'
			},
			salesAgreement: {
				salesAgreementName: 'Jones Home',
				id: 1234,
				buyers: [
					{
						sortKey: 0,
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								lastName: 'Jones'
							}
						}
					},
					{
						sortKey: 1,
						isPrimaryBuyer: false,
						opportunityContactAssoc: {
							contact: {
								lastName: 'Smith'
							}
						}
					}
				]
			},
			opportunity: {
				opportunityContactAssoc: {
					contact: {
						lastName: 'Johnson'
					}
				}
			}
		};

		let result = title(state);
		expect(result).toBe('Jones Home');
	});

	it('title displays scenario buyer', () =>
	{
		let state: State = <any>{
			scenario: {
				scenario: {
					scenarioName: 'Johnson Home'
				},
				buildMode: 'buyer'
			},
			salesAgreement: {},
			opportunity: {
				opportunityContactAssoc: {
					contact: {
						lastName: 'Johnson'
					}
				}
			}
		};

		let result = title(state);
		expect(result).toBe('Johnson Home');
	});

	it('canConfigure is true for model', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'model'
			},
			user: {
				canDesign: true,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			},
			salesAgreement: {},
			changeOrder: {},
		};

		const result = canConfigure(state);
		expect(result).toBe(true);
	});

	it('canConfigure is true for spec', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'spec'
			},
			user: {
				canDesign: true,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			},
			salesAgreement: {},
			changeOrder: {},
		};

		const result = canConfigure(state);
		expect(result).toBe(true);
	});

	it('canConfigure is true for preview', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'preview'
			},
			user: {},
			org: {
				salesCommunity: {
					market: {}
				}
			},
			salesAgreement: {},
			changeOrder: {},
		};

		const result = canConfigure(state);
		expect(result).toBe(true);
	});

	it('canConfigure is false when user is not assigned to market', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'spec'
			},
			user: {
				canSell: true,
				canConfigure: true,
				canDesign: true,
				assignedMarkets: [{ id: 1, number: '115' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			},
			salesAgreement: {
				id: 0
			},
			changeOrder: null,
		};

		const result = canConfigure(state);
		expect(result).toBe(false);
	});

	it('canConfigure is true when in sales agreement and user can design and changeOrder contact id === user contact id', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'spec'
			},
			user: {
				canSell: false,
				canConfigure: true,
				canDesign: true,
				contactId: 142,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			},
			salesAgreement: {
				id: 0
			},
			changeOrder: {
				createdByContactId: 142
			},
		};

		const result = canConfigure(state);
		expect(result).toBe(true);
	});

	it('canConfigure is true when in sales agreement and user can sell', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'spec'
			},
			user: {
				canSell: true,
				canConfigure: true,
				canDesign: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			},
			salesAgreement: {
				id: 0
			},
			changeOrder: {
				createdByContactId: 142
			},
		};

		const result = canConfigure(state);
		expect(result).toBe(true);
	});

	it('canConfigure is true when not in sales agreement and user can configure', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'spec'
			},
			user: {
				canSell: true,
				canConfigure: true,
				canDesign: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			},
			salesAgreement: {},
			changeOrder: {},
		};

		const result = canConfigure(state);
		expect(result).toBe(true);
	});

	it('canSell is true when user canSell and is assigned to the market', () =>
	{
		const state: State = <any>{
			user: {
				canSell: true,
				canConfigure: true,
				canDesign: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canSell(state);
		expect(result).toBe(true);
	});

	it('canSell is false when user canSell is false', () =>
	{
		const state: State = <any>{
			user: {
				canSell: false,
				canConfigure: true,
				canDesign: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canSell(state);
		expect(result).toBe(false);
	});

	it('canSell is false when user canSell and is not assigned to the market', () =>
	{
		const state: State = <any>{
			user: {
				canSell: true,
				canConfigure: true,
				canDesign: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '1142' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canSell(state);
		expect(result).toBe(false);
	});

	it('canApprove is true when user canApprove and is assigned to the market', () =>
	{
		const state: State = <any>{
			user: {
				canApprove: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canApprove(state);
		expect(result).toBe(true);
	});

	it('canApprove is false when user canApprove is false', () =>
	{
		const state: State = <any>{
			user: {
				canApprove: false,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canApprove(state);
		expect(result).toBe(false);
	});

	it('canApprove is false when user canApprove and is not assigned to the market', () =>
	{
		const state: State = <any>{
			user: {
				canApprove: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '1142' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canApprove(state);
		expect(result).toBe(false);
	});

	it('canOverride is true when user canApprove and is assigned to the market', () =>
	{
		const state: State = <any>{
			user: {
				canOverride: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canOverride(state);
		expect(result).toBe(true);
	});

	it('canOverride is false when user canOverride is false', () =>
	{
		const state: State = <any>{
			user: {
				canOverride: false,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canOverride(state);
		expect(result).toBe(false);
	});

	it('canOverride is false when user canOverride and is not assigned to the market', () =>
	{
		const state: State = <any>{
			user: {
				canOverride: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '1142' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canOverride(state);
		expect(result).toBe(false);
	});

	it('canDesign is true when user canDesign and is assigned to the market', () =>
	{
		const state: State = <any>{
			user: {
				canDesign: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canDesign(state);
		expect(result).toBe(true);
	});

	it('canDesign is false when user canDesign is false', () =>
	{
		const state: State = <any>{
			user: {
				canDesign: false,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canDesign(state);
		expect(result).toBe(false);
	});

	it('canDesign is false when user canDesign and is not assigned to the market', () =>
	{
		const state: State = <any>{
			user: {
				canDesign: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '1142' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canDesign(state);
		expect(result).toBe(false);
	});

	it('canAddIncentive is true when user canAddIncentive and is assigned to the market', () =>
	{
		const state: State = <any>{
			user: {
				canAddIncentive: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canAddIncentive(state);
		expect(result).toBe(true);
	});

	it('canAddIncentive is false when user canAddIncentive is false', () =>
	{
		const state: State = <any>{
			user: {
				canAddIncentive: false,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '114' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canAddIncentive(state);
		expect(result).toBe(false);
	});

	it('canAddIncentive is false when user canAddIncentive and is not assigned to the market', () =>
	{
		const state: State = <any>{
			user: {
				canAddIncentive: true,
				contactId: 144,
				assignedMarkets: [{ id: 1, number: '1142' }]
			},
			org: {
				salesCommunity: {
					market: {
						number: '114'
					}
				}
			}
		};

		const result = canAddIncentive(state);
		expect(result).toBe(false);
	});

	it('monotonyConflict is true when selected elevation divChoiceCatalogId === monotonyRules divChoiceCatalogId', () =>
	{
		const state: State = <any>{
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 5,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'to be determined'
									}]
								}]
							}]
						}]
					}
				}
			},
			plan: {
				plans: [{ id: 5 }],
				selectedPlan: 5
			}
		};

		const result = monotonyConflict(state);
		expect(result.monotonyConflict).toBe(true);
	});

	it('monotonyConflict is false when selected elevation divChoiceCatalogId === monotonyRules divChoiceCatalogId and there is an overrideNote', () =>
	{
		const state: State = <any>{
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 5,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: 'its override time'
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'to be determined'
									}]
								}]
							}]
						}]
					}
				}
			},
			plan: {
				plans: [{ id: 5 }],
				selectedPlan: 5
			}
		};

		const result = monotonyConflict(state);
		expect(result.monotonyConflict).toBe(false);
	});

	it('monotonyConflict is false when selected elevation divChoiceCatalogId !== monotonyRules divChoiceCatalogId', () =>
	{
		const state: State = <any>{
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 5,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17714,
										quantity: 1,
										overrideNote: null
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'to be determined'
									}]
								}]
							}]
						}]
					}
				}
			},
			plan: {
				plans: [{ id: 5 }],
				selectedPlan: 5
			}
		};

		const result = monotonyConflict(state);
		expect(result.monotonyConflict).toBe(false);
	});

	it('monotonyConflict is true when selected colorscheme divChoiceCatalogId === monotonyRules divChoiceCatalogId', () =>
	{
		const state: State = <any>{
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 5,
						ruleType: 'ColorScheme',
						colorSchemeAttributeCommunityIds: [],
						elevationDivChoiceCatalogId: null,
						colorSchemeDivChoiceCatalogId: 18473
					}]
				}
			},
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: null
									}]
								}]
							}]
						}]
					}
				}
			},
			plan: {
				plans: [{ id: 5 }],
				selectedPlan: 5
			}
		};

		const result = monotonyConflict(state);
		expect(result.monotonyConflict).toBe(true);
	});

	it('monotonyConflict is false when selected colorscheme divChoiceCatalogId === monotonyRules divChoiceCatalogId and there is an override', () =>
	{
		const state: State = <any>{
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 5,
						ruleType: 'ColorScheme',
						colorSchemeAttributeCommunityIds: [],
						elevationDivChoiceCatalogId: null,
						colorSchemeDivChoiceCatalogId: 18473
					}]
				}
			},
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			plan: {
				plans: [{ id: 5 }],
				selectedPlan: 5
			}
		};

		const result = monotonyConflict(state);
		expect(result.monotonyConflict).toBe(false);
	});

	it('monotonyConflict is true when selected elevation colorscheme attribute community id  === monotonyRules colorscheme attribute community id', () =>
	{
		const state: State = <any>{
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 5,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 713,
										quantity: 1,
										overrideNote: null,
										selectedAttributes: [{ attributeId: 1115 }]
									}]
								}]
							}]
						}]
					}
				}
			},
			plan: {
				plans: [{ id: 5 }],
				selectedPlan: 5
			}
		};

		const result = monotonyConflict(state);
		expect(result.monotonyConflict).toBe(true);
	});

	it('needsPlanChange is true if in plan change order and job.plan === plan.selected plan', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				selectedPlan: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 2
				}
			}
		};

		const result = needsPlanChange(state);
		expect(result).toBe(true);
	});

	it('needsPlanChange is false if in plan change order and job.plan !== plan.selected plan', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				selectedPlan: 5555
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 2
				}
			}
		};

		const result = needsPlanChange(state);
		expect(result).toBe(false);
	});

	it('needsPlanChange is false if not in plan change order', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				selectedPlan: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 1
				}
			}
		};

		const result = needsPlanChange(state);
		expect(result).toBe(false);
	});

	it('hasSpecPlanId is true if buildmode is spec, is in plan change order and there is a plan.selectedPlan', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'spec'
			},
			plan: {
				selectedPlan: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 2
				}
			}
		};

		const result = hasSpecPlanId(state);
		expect(result).toBe(true);
	});

	it('hasSpecPlanId is true if buildmode is model, is in plan change order and there is a plan.selectedPlan', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'model'
			},
			plan: {
				selectedPlan: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 2
				}
			}
		};

		const result = hasSpecPlanId(state);
		expect(result).toBe(true);
	});

	it('hasSpecPlanId is false if buildmode is spec, is not in a plan change order and there is a plan.selectedPlan', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'spec'
			},
			plan: {
				selectedPlan: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 1
				}
			}
		};

		const result = hasSpecPlanId(state);
		expect(result).toBe(false);
	});

	it('hasSpecPlanId is false if buildmode is spec, is in plan change order and there is not a plan.selectedPlan', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'spec'
			},
			plan: {
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 2
				}
			}
		};

		const result = hasSpecPlanId(state);
		expect(result).toBe(false);
	});

	it('isComplete is true if lot, plan, elevation, colorscheme, no monotony conflicts, and does not need a plan change ', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				selectedPlan: 12345
			},
			lot: {
				lots: [
					{
						id: 3424,
						lotStatusDescription: 'Available'
					},
				],
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 1111,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					lotId: 3424,
					planId: 765
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17715,
										quantity: 1,
										overrideNote: 'override'
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
				id: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = isComplete(state);
		expect(result).toBe(true);
	});

	it('isComplete is false if scenario does not have a lot and no sales agreement Id', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				plans: [{ id: 12345 }],
				selectedPlan: 12345
			},
			lot: {
				lots: [
					{
						id: 3424,
						lotStatusDescription: 'Available'
					},
				],
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 12345,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					planId: 765
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17715,
										quantity: 1,
										overrideNote: 'override'
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = isComplete(state);
		expect(result).toBe(false);
	});

	it('isComplete is false if scenario does not have a plan and no salesagreement id', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				selectedPlan: 12345
			},
			lot: {
				lots: [
					{
						id: 3424,
						lotStatusDescription: 'Available'
					},
				],
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 0,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					lotId: 3424
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17715,
										quantity: 1,
										overrideNote: 'override'
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = isComplete(state);
		expect(result).toBe(false);
	});

	it('isComplete is true if scenario does not have a plan or lot but has a salesagreement id', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				plans: [{ id: 12345 }],
				selectedPlan: 12345
			},
			lot: {
				lots: [
					{
						id: 3424,
						lotStatusDescription: 'Available'
					},
				],
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 12345,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17715,
										quantity: 1,
										overrideNote: 'override'
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
				id: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = isComplete(state);
		expect(result).toBe(true);
	});

	it('isComplete is false if monotony conflicts', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				plans: [{ id: 12345 }],
				selectedPlan: 12345
			},
			lot: {
				lots: [
					{
						id: 3424,
						lotStatusDescription: 'Available'
					},
				],
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 12345,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					lotId: 3424,
					planId: 765
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
				id: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = isComplete(state);
		expect(result).toBe(false);
	});

	it('isComplete is false if no elevation', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				plans: [{ id: 12345 }],
				selectedPlan: 12345
			},
			lot: {
				lots: [
					{
						id: 3424,
						lotStatusDescription: 'Available'
					},
				],
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 12345,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					lotId: 3424,
					planId: 765
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17715,
										quantity: 0,
										overrideNote: null
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
				id: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = isComplete(state);
		expect(result).toBe(false);
	});

	it('isComplete is false if no colorscheme', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				plans: [{ id: 12345 }],
				selectedPlan: 12345
			},
			lot: {
				lots: [
					{
						id: 3424,
						lotStatusDescription: 'Available'
					},
				],
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 12345,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					lotId: 3424,
					planId: 765
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17715,
										quantity: 1,
										overrideNote: 'override'
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 0,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
				id: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = isComplete(state);
		expect(result).toBe(false);
	});

	it('isComplete is false if needs a plan change ', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				plans: [{ id: 12345 }],
				selectedPlan: 12345
			},
			lot: {
				lots: [
					{
						id: 3424,
						lotStatusDescription: 'Available'
					},
				],
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 12345,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					lotId: 3424,
					planId: 765
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17715,
										quantity: 1,
										overrideNote: 'override'
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
				id: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 2
				}
			}
		};

		const result = isComplete(state);
		expect(result).toBe(false);
	});

	it('canEditAgreementOrSpec is true if isPreview is true and buildmode is dirt', () =>
	{
		const state: State = <any>{
			job: {
				id: 0
			},
			scenario: {
				buildMode: 'dirt',
				isPreview: true,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 12345,
				status: 'Pending'
			},
			changeOrder: {
				isChangingOrder: true,
				currentChangeOrder: {
					salesStatusDescription: 'Pending'
				},
				changeInput: {
					type: 3
				}
			}
		};

		const result = canEditAgreementOrSpec(state);
		expect(result).toBe(true);
	});

	it('canEditAgreementOrSpec is true if buildMode is spec and job id === 0 ', () =>
	{
		const state: State = <any>{
			job: {
				id: 0
			},
			scenario: {
				buildMode: 'spec',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 12345,
				status: 'Sold'
			},
			changeOrder: {
				isChangingOrder: true,
				currentChangeOrder: {
					salesStatusDescription: 'Sold'
				},
				changeInput: {
					type: 3
				}
			}
		};

		const result = canEditAgreementOrSpec(state);
		expect(result).toBe(true);
	});

	it('canEditAgreementOrSpec is true if buildMode is model and job id === 0 ', () =>
	{
		const state: State = <any>{
			job: {
				id: 0
			},
			scenario: {
				buildMode: 'spec',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 12345,
				status: 'Sold'
			},
			changeOrder: {
				isChangingOrder: true,
				currentChangeOrder: {
					salesStatusDescription: 'Sold'
				},
				changeInput: {
					type: 3
				}
			}
		};

		const result = canEditAgreementOrSpec(state);
		expect(result).toBe(true);
	});

	it('canEditAgreementOrSpec is true if buildMode is spec and job id > 0 and changeOrder SalesStatusDescription is Pending ', () =>
	{
		const state: State = <any>{
			job: {
				id: 5
			},
			scenario: {
				buildMode: 'spec',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 12345,
				status: 'Pending'
			},
			changeOrder: {
				isChangingOrder: true,
				currentChangeOrder: {
					salesStatusDescription: 'Pending'
				},
				changeInput: {
					type: 3
				}
			}
		};

		const result = canEditAgreementOrSpec(state);
		expect(result).toBe(true);
	});

	it('canEditAgreementOrSpec is true if buildMode is dirt and salesagreement status is Pending ', () =>
	{
		const state: State = <any>{
			job: {
				id: 5
			},
			scenario: {
				buildMode: 'dirt',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 12345,
				status: 'Pending'
			},
			changeOrder: {
				isChangingOrder: true,
				currentChangeOrder: {
					salesStatusDescription: 'Approved'
				},
				changeInput: {
					type: 3
				}
			}
		};

		const result = canEditAgreementOrSpec(state);
		expect(result).toBe(true);
	});

	it('canEditAgreementOrSpec is true if buildMode is dirt, salesagreement status is Approved and changeOrder sales status is pending ', () =>
	{
		const state: State = <any>{
			job: {
				id: 5
			},
			scenario: {
				buildMode: 'dirt',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 12345,
				status: 'Approved'
			},
			changeOrder: {
				isChangingOrder: true,
				currentChangeOrder: {
					salesStatusDescription: 'Pending'
				},
				changeInput: {
					type: 3
				}
			}
		};

		const result = canEditAgreementOrSpec(state);
		expect(result).toBe(true);
	});

	it('canEditCancelOrVoidAgreement is true if buildMode is dirt and salesagreement id === 0 ', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'dirt',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 0,
				status: 'Pending'
			}
		};

		const result = canEditCancelOrVoidAgreement(state);
		expect(result).toBe(true);
	});

	it('canEditCancelOrVoidAgreement is false if buildMode is spec and salesagreement id === 0 ', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'spec',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 0,
				status: 'Pending'
			}
		};

		const result = canEditCancelOrVoidAgreement(state);
		expect(result).toBe(false);
	});

	it('canEditCancelOrVoidAgreement is false if buildMode is model and salesagreement id === 0 ', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'model',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 0,
				status: 'Pending'
			}
		};

		const result = canEditCancelOrVoidAgreement(state);
		expect(result).toBe(false);
	});

	it('canEditCancelOrVoidAgreement is true if buildMode is dirt and salesagreement status is Cancel ', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'dirt',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 4,
				status: 'Cancel'
			}
		};

		const result = canEditCancelOrVoidAgreement(state);
		expect(result).toBe(true);
	});

	it('canEditCancelOrVoidAgreement is true if buildMode is dirt and salesagreement status is void ', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'dirt',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 4,
				status: 'Void'
			}
		};

		const result = canEditCancelOrVoidAgreement(state);
		expect(result).toBe(true);
	});

	it('canEditCancelOrVoidAgreement is true if buildMode is dirt and salesagreement status is Closed ', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'dirt',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 4,
				status: 'Closed'
			}
		};

		const result = canEditCancelOrVoidAgreement(state);
		expect(result).toBe(true);
	});

	it('canEditCancelOrVoidAgreement is false if buildMode is dirt and salesagreement status is OutforSignature ', () =>
	{
		const state: State = <any>{
			scenario: {
				buildMode: 'dirt',
				isPreview: false,
				monotonyAdvisementShown: false
			},
			salesAgreement: {
				id: 4,
				status: 'OutforSignature'
			}
		};

		const result = canEditCancelOrVoidAgreement(state);
		expect(result).toBe(false);
	});

	it('isSpecSalePending is true if job.lot.lotbuildtypedesc is spec and salesagreement status is OutforSignature ', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'Spec'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'OutforSignature'
			}
		};

		const result = isSpecSalePending(state);
		expect(result).toBe(true);
	});

	it('isSpecSalePending is true if job.lot.lotbuildtypedesc is spec and salesagreement status is pending ', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'Spec'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Pending'
			}
		};

		const result = isSpecSalePending(state);
		expect(result).toBe(true);
	});

	it('isSpecSalePending is true if job.lot.lotbuildtypedesc is spec and salesagreement status is signed ', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'Spec'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed'
			}
		};

		const result = isSpecSalePending(state);
		expect(result).toBe(true);
	});

	it('isSpecSalePending is false if job.lot.lotbuildtypedesc is not spec and salesagreement status is OutforSignature ', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'dirt'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'OutforSignature'
			}
		};

		const result = isSpecSalePending(state);
		expect(result).toBe(false);
	});

	it('isSpecSalePending is false if job.lot.lotbuildtypedesc is spec and salesagreement status is approved ', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'Spec'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Approved'
			}
		};

		const result = isSpecSalePending(state);
		expect(result).toBe(false);
	});

	it('activePrimaryBuyer is SalesAgreementBuyer if is not a pending spec sale', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'dirt'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed',
				buyers: [{
					isPrimaryBuyer: true,
					opportunityContactAssoc: {
						contact: {
							firstName: 'SalesAgreementBuyer'
						}
					}
				}]
			},
			changeOrder: {
				buyers: [{
					isPrimaryBuyer: true,
					opportunityContactAssoc: {
						contact: {
							firstName: 'ChangeOrderBuyer'
						}
					}
				}]
			}
		};

		const result = activePrimaryBuyer(state);
		expect(result.opportunityContactAssoc.contact.firstName).toEqual('SalesAgreementBuyer');
	});

	it('activePrimaryBuyer is ChangeOrderBuyer if is a pending spec sale', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'Spec'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed',
				buyers: [{
					isPrimaryBuyer: true,
					opportunityContactAssoc: {
						contact: {
							firstName: 'SalesAgreementBuyer'
						}
					}
				}]
			},
			changeOrder: {
				changeInput: {
					buyers: [{
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								firstName: 'ChangeOrderBuyer'
							}
						}
					}]
				}
			}
		};

		const result = activePrimaryBuyer(state);
		expect(result.opportunityContactAssoc.contact.firstName).toEqual('ChangeOrderBuyer');
	});

	it('isActivePrimaryBuyerComplete is true if is a dirt sale and sag phone, email, and address is complete', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'dirt'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed',
				buyers: [{
					isPrimaryBuyer: true,
					opportunityContactAssoc: {
						contact: {
							firstName: 'SalesAgreementBuyer',
							lastName: 'lastName',
							addressAssocs: [{
								isPrimary: true,
								address: {
									address1: 'address1',
									city: 'city',
									stateProvince: 'state',
									country: 'country',
									postalCode: 'pcode'
								}
							}],
							phoneAssocs: [{
								isPrimary: true,
								phone: {
									phoneNumber: 'phone',
								}
							}],
							emailAssocs: [{
								isPrimary: true,
								email: {
									emailAddress: 'email'
								}
							}]
						}
					}
				}]
			},
			changeOrder: {
				changeInput: {
					buyers: [{
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								firstName: 'ChangeOrderBuyer'
							}
						}
					}]
				}
			}
		};

		const result = isActivePrimaryBuyerComplete(state);
		expect(result).toEqual(true);
	});

	it('isActivePrimaryBuyerComplete is false if is a dirt sale and sag phone is incomplete', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'dirt'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed',
				buyers: [{
					isPrimaryBuyer: true,
					opportunityContactAssoc: {
						contact: {
							firstName: 'SalesAgreementBuyer',
							lastName: 'lastName',
							addressAssocs: [{
								isPrimary: true,
								address: {
									address1: 'address1',
									city: 'city',
									stateProvince: 'state',
									country: 'country',
									postalCode: 'pcode'
								}
							}],
							phoneAssocs: [{
								isPrimary: true,
								phone: {
								}
							}],
							emailAssocs: [{
								isPrimary: true,
								email: {
									emailAddress: 'email'
								}
							}]
						}
					}
				}]
			},
			changeOrder: {
				changeInput: {
					buyers: [{
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								firstName: 'ChangeOrderBuyer'
							}
						}
					}]
				}
			}
		};

		const result = isActivePrimaryBuyerComplete(state);
		expect(result).toBeFalsy();
	});

	it('isActivePrimaryBuyerComplete is false if is a dirt sale and sag email is incomplete', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'dirt'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed',
				buyers: [{
					isPrimaryBuyer: true,
					opportunityContactAssoc: {
						contact: {
							firstName: 'SalesAgreementBuyer',
							lastName: 'lastName',
							addressAssocs: [{
								isPrimary: true,
								address: {
									address1: 'address1',
									city: 'city',
									stateProvince: 'state',
									country: 'country',
									postalCode: 'pcode'
								}
							}],
							phoneAssocs: [{
								isPrimary: true,
								phone: {
									phoneNumber: 'phone',
								}
							}],
							emailAssocs: [{
								isPrimary: true,
								email: {
								}
							}]
						}
					}
				}]
			},
			changeOrder: {
				changeInput: {
					buyers: [{
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								firstName: 'ChangeOrderBuyer'
							}
						}
					}]
				}
			}
		};

		const result = isActivePrimaryBuyerComplete(state);
		expect(result).toBeFalsy();
	});

	it('isActivePrimaryBuyerComplete is false if is a dirt sale and sag address is incomplete', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'dirt'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed',
				buyers: [{
					isPrimaryBuyer: true,
					opportunityContactAssoc: {
						contact: {
							firstName: 'SalesAgreementBuyer',
							lastName: 'lastName',
							addressAssocs: [{
								isPrimary: true,
								address: {
									address1: 'address1',
									city: 'city',
									stateProvince: 'state',
									country: 'country',
								}
							}],
							phoneAssocs: [{
								isPrimary: true,
								phone: {
									phoneNumber: 'phone',
								}
							}],
							emailAssocs: [{
								isPrimary: true,
								email: {
									emailAddress: 'email'
								}
							}]
						}
					}
				}]
			},
			changeOrder: {
				changeInput: {
					buyers: [{
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								firstName: 'ChangeOrderBuyer'
							}
						}
					}]
				}
			}
		};

		const result = isActivePrimaryBuyerComplete(state);
		expect(result).toBeFalsy();
	});

	it('isActivePrimaryBuyerComplete is true if is a  pending spec sale and changeInput phone, address, email is complete', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'Spec'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed'
			},
			changeOrder: {
				changeInput: {
					buyers: [{
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								firstName: 'SalesAgreementBuyer',
								lastName: 'lastName',
								addressAssocs: [{
									isPrimary: true,
									address: {
										address1: 'address1',
										city: 'city',
										stateProvince: 'state',
										country: 'country',
										postalCode: 'pcode'
									}
								}],
								phoneAssocs: [{
									isPrimary: true,
									phone: {
										phoneNumber: 'phone',
									}
								}],
								emailAssocs: [{
									isPrimary: true,
									email: {
										emailAddress: 'email'
									}
								}]
							}
						}
					}]
				}
			}
		};

		const result = isActivePrimaryBuyerComplete(state);
		expect(result).toEqual(true);
	});

	it('isActivePrimaryBuyerComplete is true if is a  pending spec sale and changeInput email is incomplete', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'Spec'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed'
			},
			changeOrder: {
				changeInput: {
					buyers: [{
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								firstName: 'SalesAgreementBuyer',
								lastName: 'lastName',
								addressAssocs: [{
									isPrimary: true,
									address: {
										address1: 'address1',
										city: 'city',
										stateProvince: 'state',
										country: 'country',
										postalCode: 'pcode'
									}
								}],
								phoneAssocs: [{
									isPrimary: true,
									phone: {
										phoneNumber: 'phone',
									}
								}],
								emailAssocs: [{
									isPrimary: true,
									email: {
									}
								}]
							}
						}
					}]
				}
			}
		};

		const result = isActivePrimaryBuyerComplete(state);
		expect(result).toBeFalsy();
	});

	it('isActivePrimaryBuyerComplete is false if is a  pending spec sale and changeInput phone is incomplete', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'Spec'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed'
			},
			changeOrder: {
				changeInput: {
					buyers: [{
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								firstName: 'SalesAgreementBuyer',
								lastName: 'lastName',
								addressAssocs: [{
									isPrimary: true,
									address: {
										address1: 'address1',
										city: 'city',
										stateProvince: 'state',
										country: 'country',
										postalCode: 'pcode'
									}
								}],
								phoneAssocs: [{
									isPrimary: true,
									phone: {
									}
								}],
								emailAssocs: [{
									isPrimary: true,
									email: {
										emailAddress: 'email'
									}
								}]
							}
						}
					}]
				}
			}
		};

		const result = isActivePrimaryBuyerComplete(state);
		expect(result).toBeFalsy();
	});

	it('isActivePrimaryBuyerComplete is false if is a  pending spec sale and changeInput address  is incomplete', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'Spec'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed'
			},
			changeOrder: {
				changeInput: {
					buyers: [{
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								firstName: 'SalesAgreementBuyer',
								lastName: 'lastName',
								addressAssocs: [{
									isPrimary: true,
									address: {
										address1: 'address1',
										city: 'city',
										stateProvince: 'state',
										country: 'country',
										postalCode: false
									}
								}],
								phoneAssocs: [{
									isPrimary: true,
									phone: {
										phoneNumber: 'phone',
									}
								}],
								emailAssocs: [{
									isPrimary: true,
									email: {
										emailAddress: 'email'
									}
								}]
							}
						}
					}]
				}
			}
		};

		const result = isActivePrimaryBuyerComplete(state);
		expect(result).toBeFalsy();
	});

	it('activecoBuyer is SalesAgreementcoBuyer if is not a pending spec sale', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'dirt'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed',
				buyers: [{
					isPrimaryBuyer: true,
					opportunityContactAssoc: {
						contact: {
							firstName: 'SalesAgreementBuyer'
						}
					}
				},
				{
					isPrimaryBuyer: false,
					opportunityContactAssoc: {
						contact: {
							firstName: 'SalesAgreementCoBuyer'
						}
					}
				}]
			},
			changeOrder: {
				buyers: [{
					isPrimaryBuyer: true,
					opportunityContactAssoc: {
						contact: {
							firstName: 'ChangeOrderBuyer'
						}
					}
				}]
			}
		};

		const result = activeCoBuyers(state);
		expect(result[0].opportunityContactAssoc.contact.firstName).toEqual('SalesAgreementCoBuyer');
	});

	it('activeCoBuyer is ChangeOrdercoBuyer if is a pending spec sale and there are changeorder cobuyers', () =>
	{
		const state: State = <any>{
			job: {
				id: 5,
				lot: {
					lotBuildTypeDesc: 'Spec'
				}
			},
			salesAgreement: {
				id: 4,
				status: 'Signed',
				buyers: [{
					isPrimaryBuyer: true,
					opportunityContactAssoc: {
						contact: {
							firstName: 'SalesAgreementBuyer'
						}
					}
				}]
			},
			changeOrder: {
				changeInput: {
					buyers: [{
						isPrimaryBuyer: true,
						opportunityContactAssoc: {
							contact: {
								firstName: 'ChangeOrderBuyer'
							}
						}
					},
					{
						isPrimaryBuyer: false,
						opportunityContactAssoc: {
							contact: {
								firstName: 'ChangeOrderCoBuyer'
							}
						}
					}]
				}
			}
		};

		const result = activeCoBuyers(state);
		expect(result[0].opportunityContactAssoc.contact.firstName).toEqual('ChangeOrderCoBuyer');
	});

	it('ScenarioStatus is ScenarioStatusType.READY_TO_BUILD if no monotony conflict and all DPs have been satisfied', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				plans: [{ id: 12345 }],
				selectedPlan: 12345
			},
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 12345,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					lotId: 3424,
					planId: 765
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									enabled: true,
									isStructuralItem: false,
									pointPickTypeId: 1,
									completed: true,
									choices: [{
										enabled: true,
										divChoiceCatalogId: 17715,
										quantity: 1,
										overrideNote: ''
									}]
								},
								{
									dPointTypeId: 2,
									enabled: true,
									isStructuralItem: false,
									pointPickTypeId: 1,
									completed: true,
									choices: [{
										enabled: true,
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
				id: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = scenarioStatus(state);
		expect(result).toBe(ScenarioStatusType.READY_TO_BUILD);
	});

	it('ScenarioStatus is ScenarioStatusType.READY_FOR_DESIGN if no monotony conflict and not all DPs have been satisfied', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				plans: [{ id: 12345 }],
				selectedPlan: 12345
			},
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 12345,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					lotId: 3424,
					planId: 765
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									enabled: true,
									isStructuralItem: false,
									pointPickTypeId: 1,
									completed: true,
									choices: [{
										enabled: true,
										divChoiceCatalogId: 17715,
										quantity: 1,
										overrideNote: ''
									}]
								},
								{
									dPointTypeId: 2,
									enabled: true,
									isStructuralItem: false,
									pointPickTypeId: 1,
									completed: false,
									choices: [{
										enabled: true,
										divChoiceCatalogId: 18473,
										quantity: 0,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
				id: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = scenarioStatus(state);
		expect(result).toBe(ScenarioStatusType.READY_FOR_DESIGN);
	});

	it('ScenarioStatus is ScenarioStatusType.READY_FOR_STRUCTURAL if no monotony conflict and not all DPs have been satisfied', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				plans: [{ id: 12345 }],
				selectedPlan: 12345
			},
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 12345,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					lotId: 3424,
					planId: 765
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									enabled: true,
									isStructuralItem: false,
									pointPickTypeId: 1,
									completed: true,
									choices: [{
										enabled: true,
										divChoiceCatalogId: 17715,
										quantity: 1,
										overrideNote: ''
									}]
								},
								{
									dPointTypeId: 2,
									enabled: true,
									isStructuralItem: true,
									pointPickTypeId: 1,
									completed: false,
									choices: [{
										enabled: true,
										divChoiceCatalogId: 18473,
										quantity: 0,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
				id: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = scenarioStatus(state);
		expect(result).toBe(ScenarioStatusType.READY_FOR_STRUCTURAL);
	});

	it('ScenarioStatus is ScenarioStatusType.MONOTONY_CONFLICT if there is a monotony conflict ', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345
			},
			plan: {
				plans: [{ id: 12345 }],
				selectedPlan: 12345
			},
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 12345,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [1115],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				scenario: {
					lotId: 3424,
					planId: 765
				},
				buildMode: 'dirt',
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									enabled: true,
									isStructuralItem: false,
									pointPickTypeId: 1,
									completed: true,
									choices: [{
										enabled: true,
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null
									}]
								},
								{
									dPointTypeId: 2,
									enabled: true,
									isStructuralItem: true,
									pointPickTypeId: 1,
									completed: false,
									choices: [{
										enabled: true,
										divChoiceCatalogId: 18473,
										quantity: 0,
										overrideNote: 'override'
									}]
								}]
							}]
						}]
					}
				}
			},
			salesAgreement: {
				id: 12345
			},
			changeOrder: {
				isChangingOrder: true,
				changeInput: {
					type: 3
				}
			}
		};

		const result = scenarioStatus(state);
		expect(result).toBe(ScenarioStatusType.MONOTONY_CONFLICT);
	});

	it('salesAgreementStatus is Pending Sale if salesagreement status is pending and there are no active change orders', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345,
				changeOrderGroups: [
					{
						jobChangeOrders: [
							{
								jobChangeOrderTypeDescription: 'SalesJIO',
								salesStatusDescription: 'Approved'
							}
						]
					}
				]
			},
			salesAgreement: {
				id: 12345,
				status: 'Pending'
			}
		};

		const result = salesAgreementStatus(state);
		expect(result).toBe('Pending Sale');
	});

	it('salesAgreementStatus is Signed if salesagreement status is Signed and there are no active change orders', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345,
				changeOrderGroups: [
					{
						jobChangeOrders: [
							{
								jobChangeOrderTypeDescription: 'SalesJIO',
								salesStatusDescription: 'Approved'
							}
						]
					}
				]
			},
			salesAgreement: {
				id: 12345,
				status: 'Signed'
			}
		};

		const result = salesAgreementStatus(state);
		expect(result).toBe('Signed');
	});

	it('salesAgreementStatus is Approved if salesagreement status is Approved and there are no active change orders', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345,
				changeOrderGroups: [
					{
						jobChangeOrders: [
							{
								jobChangeOrderTypeDescription: 'SalesJIO',
								salesStatusDescription: 'Approved'
							}
						]
					}
				]
			},
			salesAgreement: {
				id: 12345,
				status: 'Approved'
			}
		};

		const result = salesAgreementStatus(state);
		expect(result).toBe('Approved');
	});

	it('salesAgreementStatus is Cancelled if salesagreement status is Cancel and there are no active change orders', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345,
				changeOrderGroups: [
					{
						jobChangeOrders: [
							{
								jobChangeOrderTypeDescription: 'SalesJIO',
								salesStatusDescription: 'Approved'
							}
						]
					}
				]
			},
			salesAgreement: {
				id: 12345,
				status: 'Cancel'
			}
		};

		const result = salesAgreementStatus(state);
		expect(result).toBe('Cancelled');
	});

	it('salesAgreementStatus is Voided if salesagreement status is Void and there are no active change orders', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345,
				changeOrderGroups: [
					{
						jobChangeOrders: [
							{
								jobChangeOrderTypeDescription: 'SalesJIO',
								salesStatusDescription: 'Approved'
							}
						]
					}
				]
			},
			salesAgreement: {
				id: 12345,
				status: 'Void'
			}
		};

		const result = salesAgreementStatus(state);
		expect(result).toBe('Voided');
	});

	it('salesAgreementStatus is Closed if salesagreement status is Closed and there are no active change orders', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345,
				changeOrderGroups: [
					{
						jobChangeOrders: [
							{
								jobChangeOrderTypeDescription: 'SalesJIO',
								salesStatusDescription: 'Approved'
							}
						]
					}
				]
			},
			salesAgreement: {
				id: 12345,
				status: 'Closed'
			}
		};

		const result = salesAgreementStatus(state);
		expect(result).toBe('Closed');
	});

	it('salesAgreementStatus is Out for Signature if salesagreement status is OutforSignature and there are no active change orders', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345,
				changeOrderGroups: [
					{
						jobChangeOrders: [
							{
								jobChangeOrderTypeDescription: 'SalesJIO',
								salesStatusDescription: 'Approved'
							}
						]
					}
				]
			},
			salesAgreement: {
				id: 12345,
				status: 'OutforSignature'
			}
		};

		const result = salesAgreementStatus(state);
		expect(result).toBe('Out for Signature');
	});

	it('salesAgreementStatus is Pending Change Order if there is an active change order', () =>
	{
		const state: State = <any>{
			job: {
				planId: 12345,
				changeOrderGroups: [
					{
						jobChangeOrders: [
							{
								jobChangeOrderTypeDescription: 'Construction',
								salesStatusDescription: 'pending'
							}
						]
					}
				]
			},
			salesAgreement: {
				id: 12345,
				status: 'Pending'
			}
		};

		const result = salesAgreementStatus(state);
		expect(result).toBe('Pending Change Order');
	});

	it('selectedPlanPrice is salesPhasePlanPrice when the phase is enabled and there is a salesPhasePlan ', () =>
	{
		const state: State = <any>{
			plan: {
				plans: [{
					id: 17,
					price: 12999
				}],
				selectedPlan: 17
			},
			lot: {
				selectedLot: {
					salesPhase: {
						salesPhasePlanPriceAssocs: [{
							planId: 17,
							price: 99921
						}]
					},
					financialCommunity: {
						isPhasedPricingEnabled: true
					}
				}
			}
		};

		const result = selectedPlanPrice(state);
		expect(result).toBe(99921);
	});

	it('selectedPlanPrice is planPrice when the phase is disabled and there is a salesPhasePlan ', () =>
	{
		const state: State = <any>{
			plan: {
				plans: [{
					id: 17,
					price: 12999
				}],
				selectedPlan: 17
			},
			lot: {
				selectedLot: {
					salesPhase: {
						salesPhasePlanPriceAssocs: [{
							planId: 17,
							price: 99921
						}]
					},
					financialCommunity: {
						isPhasedPricingEnabled: false
					}
				}
			}
		};

		const result = selectedPlanPrice(state);
		expect(result).toBe(12999);
	});

	it('selectedPlanPrice is planPrice when there is not a salesPhasePlan ', () =>
	{
		const state: State = <any>{
			plan: {
				plans: [{
					id: 17,
					price: 12999
				}],
				selectedPlan: 17
			},
			lot: {
				selectedLot: {
				}
			}
		};

		const result = selectedPlanPrice(state);
		expect(result).toBe(12999);
	});

	it('selectedPlanPrice is 0 when there is not a selectedPlan ', () =>
	{
		const state: State = <any>{
			plan: {
				plans: [{
					id: 17,
					price: 12999
				}],
				selectedPlan: null
			},
			lot: {
				selectedLot: {
				}
			}
		};

		const result = selectedPlanPrice(state);
		expect(result).toBe(0);
	});

	it('priceBreakdown is takes into account all prices', () =>
	{
		const state: State = <any>{
			scenario: {
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									enabled: true,
									isStructuralItem: false,
									pointPickTypeId: 1,
									completed: true,
									choices: [{
										enabled: true,
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null,
										price: 34
									}]
								},
								{
									dPointTypeId: 2,
									enabled: true,
									isStructuralItem: true,
									pointPickTypeId: 1,
									completed: false,
									choices: [{
										enabled: true,
										divChoiceCatalogId: 18473,
										quantity: 0,
										overrideNote: 'override',
										price: 37
									}]
								}]
							}]
						}]
					}
				},
				lotPremium: 50000,
				options: [{
					isBaseHouse: true,
					listPrice: 87555
				}],
				scenario: {
					scenarioInfo: {
						homesiteEstimate: 63000,
						designEstimate: 45,
						discount: 50,
						closingIncentive: 50,
						isFloorplanFlipped: null
					}
				}
			},
			salesAgreement: {
				salePrice: 45000,
				programs: [
					{
						amount: 500,
						salesProgram: {
							salesProgramType: 'BuyersClosingCost',
						}
					}
				],
				priceAdjustments: [{
					priceAdjustmentType: 'Discount',
					amount: 50
				}]
			},
			changeOrder: {
				currentChangeOrder: {
					jobChangeOrders: [{
						jobChangeOrderTypeDescription: 'PriceAdjustment',
						jobSalesChangeOrderSalesPrograms: [
							{
								action: 'Add',
								salesProgramType: 'DiscountFlatAmount',
								amount: 50
							}
						],
						jobSalesChangeOrderPriceAdjustments: [
							{
								action: 'Add',
								priceAdjustmentTypeName: 'ClosingCost',
								amount: 75
							}
						],
						jobChangeOrderNonStandardOptions: [{
							action: 'Add',
							unitPrice: 65,
							qty: 4
						}]
					}]
				}
			},
			job: {
				jobNonStandardOptions: [{
					unitPrice: 40,
					quantity: 3
				}]
			},
			plan: {
				plans: [{
					id: 17,
					price: 12999
				}],
				selectedPlan: 17
			},
			lot: {
				selectedLot: {
				}
			}
		};

		const result = priceBreakdown(state);
		expect(result).toEqual({
			baseHouse: 12999,
			homesite: 50000,
			selections: 34,
			salesProgram: 50,
			closingIncentive: 50,
			nonStandardSelections: 380,
			priceAdjustments: 50,
			closingCostAdjustment: 75,
			homesiteEstimate: 63000,
			designEstimate: 45,
			totalPrice: 126458,
			changePrice: 81458,
			favoritesPrice: 0
		});
	});

	it('filteredTree shows all enabled items when filter is full', () =>
	{
		const state: State = <any>{
			scenario: {
				selectedPointFilter: 0,
				tree: {
					treeVersion: {
						id: 0,
						treeId: 23,
						planKey: 'plan',
						name: 'someTree',
						communityId: 23,
						description: 'description',
						publishStartDate: testDate,
						publishEndDate: testDate,
						lastModifiedDate: testDate,
						includedOptions: ['option', 'option'],
						groups: [{
							groupCatalogId: 3,
							id: 16760,
							label: 'FLOORING',
							sortOrder: 1,
							status: 0,
							treeVersionId: 2123,
							subGroups: [
								{
									groupId: 16760,
									id: 24276,
									sortOrder: 1,
									status: 0,
									subGroupCatalogId: 8,
									treeVersionId: 2123,
									useInteractiveFloorplan: false,
									label: 'sgLabel',
									points: [{
										cutOffDays: null,
										description: null,
										disabledBy: [],
										divPointCatalogId: 1115,
										edhConstructionStageId: 4,
										hasPointToChoiceRules: false,
										hasPointToPointRules: false,
										id: 24485,
										isPastCutOff: false,
										isQuickQuoteItem: false,
										isStructuralItem: true,
										pointPickTypeId: 1,
										pointPickTypeLabel: 'Pick 1',
										price: 0,
										sortOrder: 1,
										status: 0,
										subGroupCatalogId: 0,
										subGroupId: 24276,
										treeVersionId: 2123,
										viewed: true,
										label: 'pLabel',
										dPointTypeId: 1,
										enabled: true,
										completed: true,
										choices: [{
											label: 'cLabel',
											enabled: true,
											divChoiceCatalogId: 17713,
											quantity: 1,
											overrideNote: null,
											price: 34,
											mappedAttributeGroups: [],
											mappedLocationGroups: [],
											attributeGroups: [],
											locationGroups: [],
											choiceMaxQuantity: null,
											description: 'string',
											disabledBy: [],
											hasChoiceRules: false,
											hasOptionRules: false,
											id: 5,
											imagePath: 'string',
											hasImage: false,
											isDecisionDefault: false,
											isSelectable: false,
											maxQuantity: 1,
											options: [],
											selectedAttributes: [],
											sortOrder: 0,
											treePointId: 24485,
											treeVersionId: 2123,
											lockedInOptions: [],
											changedDependentChoiceIds: [],
											lockedInChoice: null,
											mappingChanged: false
										}]
									},
									{
										cutOffDays: null,
										description: null,
										disabledBy: [],
										divPointCatalogId: 1115,
										edhConstructionStageId: 4,
										hasPointToChoiceRules: false,
										hasPointToPointRules: false,
										id: 24486,
										isPastCutOff: false,
										isQuickQuoteItem: false,
										isStructuralItem: true,
										pointPickTypeId: 1,
										pointPickTypeLabel: 'Pick 1',
										price: 0,
										sortOrder: 1,
										status: 0,
										subGroupCatalogId: 0,
										subGroupId: 24276,
										treeVersionId: 2123,
										viewed: true,
										label: 'pLabel2',
										dPointTypeId: 2,
										enabled: true,
										completed: false,
										choices: [{
											label: 'cLabel2',
											enabled: true,
											divChoiceCatalogId: 18473,
											quantity: 0,
											overrideNote: 'override',
											price: 37,
											mappedAttributeGroups: [],
											mappedLocationGroups: [],
											attributeGroups: [],
											locationGroups: [],
											choiceMaxQuantity: null,
											description: 'string',
											disabledBy: [],
											hasChoiceRules: false,
											hasOptionRules: false,
											id: 5,
											imagePath: 'string',
											hasImage: false,
											isDecisionDefault: false,
											isSelectable: false,
											maxQuantity: 1,
											options: [],
											selectedAttributes: [],
											sortOrder: 1,
											treePointId: 24486,
											treeVersionId: 2123,
											lockedInOptions: [],
											changedDependentChoiceIds: [],
											lockedInChoice: null,
											mappingChanged: false
										}]
									}]
								}]
						}]
					}
				},
				lotPremium: 50000,
				options: [{
					isBaseHouse: true,
					listPrice: 87555
				}],
				scenario: {
					scenarioInfo: {
						homesiteEstimate: 63000,
						designEstimate: 45,
						discount: 50,
						closingIncentive: 50,
						isFloorplanFlipped: null
					}
				}
			},
			changeOrder: {
				currentChangeOrder: {
					jobChangeOrders: [{
						jobChangeOrderTypeDescription: 'PriceAdjustment',
						jobSalesChangeOrderSalesPrograms: [
							{
								action: 'Add',
								salesProgramType: 'DiscountFlatAmount',
								amount: 50
							}
						],
						jobSalesChangeOrderPriceAdjustments: [
							{
								action: 'Add',
								priceAdjustmentTypeName: 'ClosingCost',
								amount: 75
							}
						],
						jobChangeOrderNonStandardOptions: [{
							action: 'Add',
							unitPrice: 65,
							qty: 4
						}]
					}]
				}
			},
			lot: {
				selectedLot: {
				}
			}
		};

		const result = filteredTree(state);
		expect(result).toEqual(new TreeVersion({
			id: 0,
			treeId: 23,
			planKey: 'plan',
			name: 'someTree',
			communityId: 23,
			description: 'description',
			publishStartDate: testDate,
			publishEndDate: testDate,
			lastModifiedDate: testDate,
			includedOptions: ['option', 'option'],
			groups: [{
				groupCatalogId: 3,
				id: 16760,
				label: 'FLOORING',
				sortOrder: 1,
				status: 0,
				treeVersionId: 2123,
				subGroups: [
					{
						groupId: 16760,
						id: 24276,
						sortOrder: 1,
						status: 0,
						subGroupCatalogId: 8,
						treeVersionId: 2123,
						useInteractiveFloorplan: false,
						label: 'sgLabel',
						points: [{
							cutOffDays: null,
							description: null,
							disabledBy: [],
							divPointCatalogId: 1115,
							edhConstructionStageId: 4,
							hasPointToChoiceRules: false,
							hasPointToPointRules: false,
							id: 24485,
							isPastCutOff: false,
							isQuickQuoteItem: false,
							isStructuralItem: true,
							pointPickTypeId: 1,
							pointPickTypeLabel: 'Pick 1',
							price: 0,
							sortOrder: 1,
							status: 1,
							subGroupCatalogId: 0,
							subGroupId: 24276,
							treeVersionId: 2123,
							viewed: true,
							label: 'pLabel',
							dPointTypeId: 1,
							enabled: true,
							completed: true,
							choices: [{
								label: 'cLabel',
								enabled: true,
								divChoiceCatalogId: 17713,
								quantity: 1,
								overrideNote: null,
								price: 34,
								mappedAttributeGroups: [],
								mappedLocationGroups: [],
								attributeGroups: [],
								locationGroups: [],
								choiceMaxQuantity: null,
								description: 'string',
								disabledBy: [],
								hasChoiceRules: false,
								hasOptionRules: false,
								id: 5,
								imagePath: 'string',
								hasImage: false,
								isDecisionDefault: false,
								isSelectable: false,
								maxQuantity: 1,
								options: [],
								selectedAttributes: [],
								sortOrder: 0,
								treePointId: 24485,
								treeVersionId: 2123,
								lockedInOptions: [],
								changedDependentChoiceIds: [],
								lockedInChoice: null,
								mappingChanged: false
							}]
						},
						{
							cutOffDays: null,
							description: null,
							disabledBy: [],
							divPointCatalogId: 1115,
							edhConstructionStageId: 4,
							hasPointToChoiceRules: false,
							hasPointToPointRules: false,
							id: 24486,
							isPastCutOff: false,
							isQuickQuoteItem: false,
							isStructuralItem: true,
							pointPickTypeId: 1,
							pointPickTypeLabel: 'Pick 1',
							price: 0,
							sortOrder: 1,
							status: 0,
							subGroupCatalogId: 0,
							subGroupId: 24276,
							treeVersionId: 2123,
							viewed: true,
							label: 'pLabel2',
							dPointTypeId: 2,
							enabled: true,
							completed: false,
							choices: [{
								label: 'cLabel2',
								enabled: true,
								divChoiceCatalogId: 18473,
								quantity: 0,
								overrideNote: 'override',
								price: 37,
								mappedAttributeGroups: [],
								mappedLocationGroups: [],
								attributeGroups: [],
								locationGroups: [],
								choiceMaxQuantity: null,
								description: 'string',
								disabledBy: [],
								hasChoiceRules: false,
								hasOptionRules: false,
								id: 5,
								imagePath: 'string',
								hasImage: false,
								isDecisionDefault: false,
								isSelectable: false,
								maxQuantity: 1,
								options: [],
								selectedAttributes: [],
								sortOrder: 1,
								treePointId: 24486,
								treeVersionId: 2123,
								lockedInOptions: [],
								changedDependentChoiceIds: [],
								lockedInChoice: null,
								mappingChanged: false
							}]
						}]
					}]
			}]
		}));
	});

	it('filteredTree shows only Structural items when filter is Structural', () =>
	{
		const state: State = <any>{
			scenario: {
				selectedPointFilter: 2,
				tree: {
					treeVersion: {
						id: 0,
						treeId: 23,
						planKey: 'plan',
						name: 'someTree',
						communityId: 23,
						description: 'description',
						publishStartDate: testDate,
						publishEndDate: testDate,
						lastModifiedDate: testDate,
						includedOptions: ['option', 'option'],
						groups: [{
							groupCatalogId: 3,
							id: 16760,
							label: 'FLOORING',
							sortOrder: 1,
							status: 0,
							treeVersionId: 2123,
							subGroups: [
								{
									groupId: 16760,
									id: 24276,
									sortOrder: 1,
									status: 0,
									subGroupCatalogId: 8,
									treeVersionId: 2123,
									useInteractiveFloorplan: false,
									label: 'sgLabel',
									points: [{
										cutOffDays: null,
										description: null,
										disabledBy: [],
										divPointCatalogId: 1115,
										edhConstructionStageId: 4,
										hasPointToChoiceRules: false,
										hasPointToPointRules: false,
										id: 24485,
										isPastCutOff: false,
										isQuickQuoteItem: false,
										isStructuralItem: true,
										pointPickTypeId: 1,
										pointPickTypeLabel: 'Pick 1',
										price: 0,
										sortOrder: 1,
										status: 0,
										subGroupCatalogId: 0,
										subGroupId: 24276,
										treeVersionId: 2123,
										viewed: true,
										label: 'pLabel',
										dPointTypeId: 1,
										enabled: true,
										completed: true,
										choices: [{
											label: 'cLabel',
											enabled: true,
											divChoiceCatalogId: 17713,
											quantity: 1,
											overrideNote: null,
											price: 34,
											mappedAttributeGroups: [],
											mappedLocationGroups: [],
											attributeGroups: [],
											locationGroups: [],
											choiceMaxQuantity: null,
											description: 'string',
											disabledBy: [],
											hasChoiceRules: false,
											hasOptionRules: false,
											id: 5,
											imagePath: 'string',
											hasImage: false,
											isDecisionDefault: false,
											isSelectable: false,
											maxQuantity: 1,
											options: [],
											selectedAttributes: [],
											sortOrder: 0,
											treePointId: 24485,
											treeVersionId: 2123,
											lockedInOptions: [],
											changedDependentChoiceIds: [],
											lockedInChoice: null,
											mappingChanged: false
										}]
									},
									{
										cutOffDays: null,
										description: null,
										disabledBy: [],
										divPointCatalogId: 1115,
										edhConstructionStageId: 4,
										hasPointToChoiceRules: false,
										hasPointToPointRules: false,
										id: 24486,
										isPastCutOff: false,
										isQuickQuoteItem: true,
										isStructuralItem: false,
										pointPickTypeId: 1,
										pointPickTypeLabel: 'Pick 1',
										price: 0,
										sortOrder: 1,
										status: 0,
										subGroupCatalogId: 0,
										subGroupId: 24276,
										treeVersionId: 2123,
										viewed: true,
										label: 'pLabel2',
										dPointTypeId: 2,
										enabled: true,
										completed: false,
										choices: [{
											label: 'cLabel2',
											enabled: true,
											divChoiceCatalogId: 18473,
											quantity: 0,
											overrideNote: 'override',
											price: 37,
											mappedAttributeGroups: [],
											mappedLocationGroups: [],
											attributeGroups: [],
											locationGroups: [],
											choiceMaxQuantity: null,
											description: 'string',
											disabledBy: [],
											hasChoiceRules: false,
											hasOptionRules: false,
											id: 5,
											imagePath: 'string',
											hasImage: false,
											isDecisionDefault: false,
											isSelectable: false,
											maxQuantity: 1,
											options: [],
											selectedAttributes: [],
											sortOrder: 1,
											treePointId: 24486,
											treeVersionId: 2123,
											lockedInOptions: [],
											changedDependentChoiceIds: [],
											lockedInChoice: null,
											mappingChanged: false
										}]
									}]
								}]
						}]
					}
				},
				lotPremium: 50000,
				options: [{
					isBaseHouse: true,
					listPrice: 87555
				}],
				scenario: {
					scenarioInfo: {
						homesiteEstimate: 63000,
						designEstimate: 45,
						discount: 50,
						closingIncentive: 50,
						isFloorplanFlipped: null
					}
				}
			},
			changeOrder: {
				currentChangeOrder: {
					jobChangeOrders: [{
						jobChangeOrderTypeDescription: 'PriceAdjustment',
						jobSalesChangeOrderSalesPrograms: [
							{
								action: 'Add',
								salesProgramType: 'DiscountFlatAmount',
								amount: 50
							}
						],
						jobSalesChangeOrderPriceAdjustments: [
							{
								action: 'Add',
								priceAdjustmentTypeName: 'ClosingCost',
								amount: 75
							}
						],
						jobChangeOrderNonStandardOptions: [{
							action: 'Add',
							unitPrice: 65,
							qty: 4
						}]
					}]
				}
			},
			lot: {
				selectedLot: {
				}
			}
		};

		const result = filteredTree(state);
		expect(result).toEqual(new TreeVersion({
			id: 0,
			treeId: 23,
			planKey: 'plan',
			name: 'someTree',
			communityId: 23,
			description: 'description',
			publishStartDate: testDate,
			publishEndDate: testDate,
			lastModifiedDate: testDate,
			includedOptions: ['option', 'option'],
			groups: [{
				groupCatalogId: 3,
				id: 16760,
				label: 'FLOORING',
				sortOrder: 1,
				status: 1,
				treeVersionId: 2123,
				subGroups: [
					{
						groupId: 16760,
						id: 24276,
						sortOrder: 1,
						status: 1,
						subGroupCatalogId: 8,
						treeVersionId: 2123,
						useInteractiveFloorplan: false,
						label: 'sgLabel',
						points: [{
							cutOffDays: null,
							description: null,
							disabledBy: [],
							divPointCatalogId: 1115,
							edhConstructionStageId: 4,
							hasPointToChoiceRules: false,
							hasPointToPointRules: false,
							id: 24485,
							isPastCutOff: false,
							isQuickQuoteItem: false,
							isStructuralItem: true,
							pointPickTypeId: 1,
							pointPickTypeLabel: 'Pick 1',
							price: 0,
							sortOrder: 1,
							status: 1,
							subGroupCatalogId: 0,
							subGroupId: 24276,
							treeVersionId: 2123,
							viewed: true,
							label: 'pLabel',
							dPointTypeId: 1,
							enabled: true,
							completed: true,
							choices: [{
								label: 'cLabel',
								enabled: true,
								divChoiceCatalogId: 17713,
								quantity: 1,
								overrideNote: null,
								price: 34,
								mappedAttributeGroups: [],
								mappedLocationGroups: [],
								attributeGroups: [],
								locationGroups: [],
								choiceMaxQuantity: null,
								description: 'string',
								disabledBy: [],
								hasChoiceRules: false,
								hasOptionRules: false,
								id: 5,
								imagePath: 'string',
								hasImage: false,
								isDecisionDefault: false,
								isSelectable: false,
								maxQuantity: 1,
								options: [],
								selectedAttributes: [],
								sortOrder: 0,
								treePointId: 24485,
								treeVersionId: 2123,
								lockedInOptions: [],
								changedDependentChoiceIds: [],
								lockedInChoice: null,
								mappingChanged: false
							}]
						}]
					}]
			}]
		}));
	});

	it('filteredTree shows only quickquote items when filter is quickquote', () =>
	{
		const state: State = <any>{
			scenario: {
				selectedPointFilter: 1,
				tree: {
					treeVersion: {
						id: 0,
						treeId: 23,
						planKey: 'plan',
						name: 'someTree',
						communityId: 23,
						description: 'description',
						publishStartDate: testDate,
						publishEndDate: testDate,
						lastModifiedDate: testDate,
						includedOptions: ['option', 'option'],
						groups: [{
							groupCatalogId: 3,
							id: 16760,
							label: 'FLOORING',
							sortOrder: 1,
							status: 0,
							treeVersionId: 2123,
							subGroups: [
								{
									groupId: 16760,
									id: 24276,
									sortOrder: 1,
									status: 0,
									subGroupCatalogId: 8,
									treeVersionId: 2123,
									useInteractiveFloorplan: false,
									label: 'sgLabel',
									points: [{
										cutOffDays: null,
										description: null,
										disabledBy: [],
										divPointCatalogId: 1115,
										edhConstructionStageId: 4,
										hasPointToChoiceRules: false,
										hasPointToPointRules: false,
										id: 24485,
										isPastCutOff: false,
										isQuickQuoteItem: true,
										isStructuralItem: false,
										pointPickTypeId: 1,
										pointPickTypeLabel: 'Pick 1',
										price: 0,
										sortOrder: 1,
										status: 0,
										subGroupCatalogId: 0,
										subGroupId: 24276,
										treeVersionId: 2123,
										viewed: true,
										label: 'pLabel',
										dPointTypeId: 1,
										enabled: true,
										completed: true,
										choices: [{
											label: 'cLabel',
											enabled: true,
											divChoiceCatalogId: 17713,
											quantity: 1,
											overrideNote: null,
											price: 34,
											mappedAttributeGroups: [],
											mappedLocationGroups: [],
											attributeGroups: [],
											locationGroups: [],
											choiceMaxQuantity: null,
											description: 'string',
											disabledBy: [],
											hasChoiceRules: false,
											hasOptionRules: false,
											id: 5,
											imagePath: 'string',
											hasImage: false,
											isDecisionDefault: false,
											isSelectable: false,
											maxQuantity: 1,
											options: [],
											selectedAttributes: [],
											sortOrder: 0,
											treePointId: 24485,
											treeVersionId: 2123,
											lockedInOptions: [],
											changedDependentChoiceIds: [],
											lockedInChoice: null,
											mappingChanged: false
										}]
									},
									{
										cutOffDays: null,
										description: null,
										disabledBy: [],
										divPointCatalogId: 1115,
										edhConstructionStageId: 4,
										hasPointToChoiceRules: false,
										hasPointToPointRules: false,
										id: 24486,
										isPastCutOff: false,
										isQuickQuoteItem: false,
										isStructuralItem: true,
										pointPickTypeId: 1,
										pointPickTypeLabel: 'Pick 1',
										price: 0,
										sortOrder: 1,
										status: 0,
										subGroupCatalogId: 0,
										subGroupId: 24276,
										treeVersionId: 2123,
										viewed: true,
										label: 'pLabel2',
										dPointTypeId: 2,
										enabled: true,
										completed: false,
										choices: [{
											label: 'cLabel2',
											enabled: true,
											divChoiceCatalogId: 18473,
											quantity: 0,
											overrideNote: 'override',
											price: 37,
											mappedAttributeGroups: [],
											mappedLocationGroups: [],
											attributeGroups: [],
											locationGroups: [],
											choiceMaxQuantity: null,
											description: 'string',
											disabledBy: [],
											hasChoiceRules: false,
											hasOptionRules: false,
											id: 5,
											imagePath: 'string',
											hasImage: false,
											isDecisionDefault: false,
											isSelectable: false,
											maxQuantity: 1,
											options: [],
											selectedAttributes: [],
											sortOrder: 1,
											treePointId: 24486,
											treeVersionId: 2123,
											lockedInOptions: [],
											changedDependentChoiceIds: [],
											lockedInChoice: null,
											mappingChanged: false
										}]
									}]
								}]
						}]
					}
				},
				lotPremium: 50000,
				options: [{
					isBaseHouse: true,
					listPrice: 87555
				}],
				scenario: {
					scenarioInfo: {
						homesiteEstimate: 63000,
						designEstimate: 45,
						discount: 50,
						closingIncentive: 50,
						isFloorplanFlipped: null
					}
				}
			},
			changeOrder: {
				currentChangeOrder: {
					jobChangeOrders: [{
						jobChangeOrderTypeDescription: 'PriceAdjustment',
						jobSalesChangeOrderSalesPrograms: [
							{
								action: 'Add',
								salesProgramType: 'DiscountFlatAmount',
								amount: 50
							}
						],
						jobSalesChangeOrderPriceAdjustments: [
							{
								action: 'Add',
								priceAdjustmentTypeName: 'ClosingCost',
								amount: 75
							}
						],
						jobChangeOrderNonStandardOptions: [{
							action: 'Add',
							unitPrice: 65,
							qty: 4
						}]
					}]
				}
			},
			lot: {
				selectedLot: {
				}
			}
		};

		const result = filteredTree(state);
		expect(result).toEqual(new TreeVersion({
			id: 0,
			treeId: 23,
			planKey: 'plan',
			name: 'someTree',
			communityId: 23,
			description: 'description',
			publishStartDate: testDate,
			publishEndDate: testDate,
			lastModifiedDate: testDate,
			includedOptions: ['option', 'option'],
			groups: [{
				groupCatalogId: 3,
				id: 16760,
				label: 'FLOORING',
				sortOrder: 1,
				status: 1,
				treeVersionId: 2123,
				subGroups: [
					{
						groupId: 16760,
						id: 24276,
						sortOrder: 1,
						status: 1,
						subGroupCatalogId: 8,
						treeVersionId: 2123,
						useInteractiveFloorplan: false,
						label: 'sgLabel',
						points: [{
							cutOffDays: null,
							description: null,
							disabledBy: [],
							divPointCatalogId: 1115,
							edhConstructionStageId: 4,
							hasPointToChoiceRules: false,
							hasPointToPointRules: false,
							id: 24485,
							isPastCutOff: false,
							isQuickQuoteItem: true,
							isStructuralItem: false,
							pointPickTypeId: 1,
							pointPickTypeLabel: 'Pick 1',
							price: 0,
							sortOrder: 1,
							status: 1,
							subGroupCatalogId: 0,
							subGroupId: 24276,
							treeVersionId: 2123,
							viewed: true,
							label: 'pLabel',
							dPointTypeId: 1,
							enabled: true,
							completed: true,
							choices: [{
								label: 'cLabel',
								enabled: true,
								divChoiceCatalogId: 17713,
								quantity: 1,
								overrideNote: null,
								price: 34,
								mappedAttributeGroups: [],
								mappedLocationGroups: [],
								attributeGroups: [],
								locationGroups: [],
								choiceMaxQuantity: null,
								description: 'string',
								disabledBy: [],
								hasChoiceRules: false,
								hasOptionRules: false,
								id: 5,
								imagePath: 'string',
								hasImage: false,
								isDecisionDefault: false,
								isSelectable: false,
								maxQuantity: 1,
								options: [],
								selectedAttributes: [],
								sortOrder: 0,
								treePointId: 24485,
								treeVersionId: 2123,
								lockedInOptions: [],
								changedDependentChoiceIds: [],
								lockedInChoice: null,
								mappingChanged: false
							}]
						}]
					}]
			}]
		}));
	});

	it('agreementColorScheme returns the selected colorscheme choice', () =>
	{
		const state: State = <any>{
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 5,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null
									}]
								},
								{
									dPointTypeId: 2,
									choices: [{
										label: 'ColorSchemeLabel',
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'to be determined'
									}]
								}]
							}]
						}]
					}
				}
			},
			plan: {
				plans: [{ id: 5 }],
				selectedPlan: 5
			}
		};

		const result = agreementColorScheme(state);
		expect(result).toEqual('ColorSchemeLabel');
	});

	it('agreementColorScheme returns the selected colorscheme attribute on elevation when there is no colorScheme choice', () =>
	{
		const state: State = <any>{
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 5,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null,
										selectedAttributes: [{
											attributeName: 'colorschemeAttribute'
										}]
									}]
								},
								{
									dPointTypeId: 3,
									choices: [{
										label: 'ColorSchemeLabel',
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'to be determined'
									}]
								}]
							}]
						}]
					}
				}
			},
			plan: {
				plans: [{ id: 5 }],
				selectedPlan: 5
			}
		};

		const result = agreementColorScheme(state);
		expect(result).toEqual('colorschemeAttribute');
	});

	it('agreementColorScheme returns the empty string if no colorscheme or elevation with attributes is selected', () =>
	{
		const state: State = <any>{
			lot: {
				selectedLot: {
					monotonyRules: [{
						edhLotId: 1234,
						edhPlanId: 5,
						ruleType: 'Elevation',
						colorSchemeAttributeCommunityIds: [],
						elevationDivChoiceCatalogId: 17713,
						colorSchemeDivChoiceCatalogId: null
					}]
				}
			},
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									choices: [{
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null
									}]
								},
								{
									dPointTypeId: 3,
									choices: [{
										label: 'ColorSchemeLabel',
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'to be determined'
									}]
								}]
							}]
						}]
					}
				}
			},
			plan: {
				plans: [{ id: 5 }],
				selectedPlan: 5
			}
		};

		const result = agreementColorScheme(state);
		expect(result).toEqual('');
	});

	it('selectSelectedPlanLotAvailability is true when plan has available associated lots', () =>
	{
		const state: State = <any>{
			plan: {
				plans: [{
					id: 17,
					price: 12999,
					lotAssociations: [1234, 2345]
				}],
				selectedPlan: 17
			},
			lot: {
				lots: [
					{
						id: 1234,
						lotStatusDescription: 'Available'
					},
					{
						id: 2345,
						lotStatusDescription: 'Available'
					}
				],
				selectedLot: {
					salesPhase: {
						salesPhasePlanPriceAssocs: [{
							planId: 17,
							price: 99921
						}]
					}
				}
			}
		};

		const result = selectSelectedPlanLotAvailability(state);
		expect(result).toBe(true);
	});

	it('selectSelectedPlanLotAvailability is false when plan has no available associated lots', () =>
	{
		const state: State = <any>{
			plan: {
				plans: [{
					id: 17,
					price: 12999,
					lotAssociations: [1234, 2345]
				}],
				selectedPlan: 17
			},
			lot: {
				lots: [
					{
						id: 1234,
						lotStatusDescription: 'sold'
					},
					{
						id: 2345,
						lotStatusDescription: 'sold'
					}
				],
				selectedLot: {
					salesPhase: {
						salesPhasePlanPriceAssocs: [{
							planId: 17,
							price: 99921
						}]
					}
				}
			}
		};

		const result = selectSelectedPlanLotAvailability(state);
		expect(result).toBe(false);
	});

	it('selectSelectedPlanLotAvailability is false when plan has no associated lots', () =>
	{
		const state: State = <any>{
			plan: {
				plans: [{
					id: 17,
					price: 12999,
					lotAssociations: []
				}],
				selectedPlan: 17
			},
			lot: {
				lots: [
					{
						id: 1234,
						lotStatusDescription: 'Available'
					},
					{
						id: 2345,
						lotStatusDescription: 'Available'
					}
				],
				selectedLot: {
					salesPhase: {
						salesPhasePlanPriceAssocs: [{
							planId: 17,
							price: 99921
						}]
					}
				}
			}
		};

		const result = selectSelectedPlanLotAvailability(state);
		expect(result).toBe(false);
	});

	it('changeOrderChoicesPastCutoff is co choice when changeorder choice dp is past cutoff', () =>
	{
		const state: State = <any>{
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									isPastCutOff: true,
									choices: [{
										id: 5,
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null,
										selectedAttributes: [{
											attributeName: 'colorschemeAttribute'
										}]
									}]
								},
								{
									id: 6,
									dPointTypeId: 3,
									isPastCutOff: false,
									choices: [{
										label: 'ColorSchemeLabel',
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'to be determined'
									}]
								}]
							}]
						}]
					}
				}
			},
			changeOrder: {
				isChangingOrder: true,
				currentChangeOrder: {
					jobChangeOrders: [{
						jobChangeOrderTypeDescription: 'Construction',
						jobChangeOrderChoices: [{
							action: 'Add',
							overrideNoteId: null,
							decisionPointChoiceID: 5
						}]
					}]
				},
				changeInput: {
					type: 2
				}
			}
		};

		const result = changeOrderChoicesPastCutoff(state);
		expect(result).toEqual([{
			action: 'Add',
			overrideNoteId: null,
			decisionPointChoiceID: 5
		}]);
	});

	it('changeOrderChoicesPastCutoff is empty when changeorder choice dp is not past cutoff', () =>
	{
		const state: State = <any>{
			scenario: {
				monotonyAdvisementShown: false,
				tree: {
					treeVersion: {
						groups: [{
							subGroups: [{
								points: [{
									dPointTypeId: 1,
									isPastCutOff: false,
									choices: [{
										id: 5,
										divChoiceCatalogId: 17713,
										quantity: 1,
										overrideNote: null,
										selectedAttributes: [{
											attributeName: 'colorschemeAttribute'
										}]
									}]
								},
								{
									id: 6,
									dPointTypeId: 3,
									isPastCutOff: false,
									choices: [{
										label: 'ColorSchemeLabel',
										divChoiceCatalogId: 18473,
										quantity: 1,
										overrideNote: 'to be determined'
									}]
								}]
							}]
						}]
					}
				}
			},
			changeOrder: {
				isChangingOrder: true,
				currentChangeOrder: {
					jobChangeOrders: [{
						jobChangeOrderTypeDescription: 'Construction',
						jobChangeOrderChoices: [{
							action: 'Add',
							overrideNoteId: null,
							decisionPointChoiceID: 5
						}]
					}]
				},
				changeInput: {
					type: 2
				}
			}
		};

		const result = changeOrderChoicesPastCutoff(state);
		expect(result).toEqual([]);
	});

	it('canCancelSpec is true if construction stage is Configured, build type is Spec and there are no salesAgreementAssocs', () =>
	{
		const state: State = <any>{
			job: {
				constructionStageName: 'Configured',
				jobTypeName: 'Spec',
				jobSalesAgreementAssocs: null
			},
			scenario: {
				buildMode: 'spec'
			},
			lite: {
				isPhdLite: false
			}
		};

		const result = canCancelSpec(state);
		expect(result).toBe(true);
	});

	it('canCancelSpec is false if construction stage is not Configured, build type is Spec and there are no salesAgreementAssocs', () =>
	{
		const state: State = <any>{
			job: {
				constructionStageName: 'build',
				lot: {
					lotBuildTypeDesc: 'Spec'
				},
				jobSalesAgreementAssocs: null
			},
			scenario: {
				buildMode: 'spec'
			},
			lite: {
				isPhdLite: false
			}
		};

		const result = canCancelSpec(state);
		expect(result).toBe(false);
	});

	it('canCancelSpec is false if construction stage is Configured, build type is not Spec and there are no salesAgreementAssocs', () =>
	{
		const state: State = <any>{
			job: {
				constructionStageName: 'Configured',
				lot: {
					lotBuildTypeDesc: 'Dirt'
				},
				jobSalesAgreementAssocs: null
			},
			scenario: {
				buildMode: 'spec'
			},
			lite: {
				isPhdLite: false
			}
		};

		const result = canCancelSpec(state);
		expect(result).toBe(false);
	});

	it('canCancelSpec is false if construction stage is Configured, build type is Spec and there are salesAgreementAssocs', () =>
	{
		const state: State = <any>{
			job: {
				constructionStageName: 'Configured',
				lot: {
					lotBuildTypeDesc: 'Spec'
				},
				jobSalesAgreementAssocs: [{ salesAgreement: 1 }]
			},
			scenario:
			{
				buildMode: 'spec'
			},
			lite: {
				isPhdLite: false
			}
		};

		const result = canCancelSpec(state);
		expect(result).toBe(false);
	});

	it('canCancelSpec is false if construction stage is Configured, build type is Spec and there are no salesAgreementAssocs, but buildMode is buyer', () =>
	{
		const state: State = <any>{
			job: {
				constructionStageName: 'Configured',
				jobTypeName: 'Spec',
				jobSalesAgreementAssocs: null
			},
			scenario: {
				buildMode: 'buyer'
			},
			lite: {
				isPhdLite: false
			}
		};

		const result = canCancelSpec(state);
		expect(result).toBe(false);
	});

	it('showSpinner is true if jobLoading is true', () =>
	{
		const state: State = <any>{
			salesAgreement: {
				salesAgreementLoading: false
			},
			job: {
				jobLoading: true
			}
		};

		const result = showSpinner(state);
		expect(result).toBe(true);
	});

	it('showSpinner is true if salesAgreementLoading is true', () =>
	{
		const state: State = <any>{
			job: {
				jobLoading: false
			},
			salesAgreement: {
				salesAgreementLoading: true
			}
		};

		const result = showSpinner(state);
		expect(result).toBe(true);
	});

	it('showSpinner is false if salesAgreementloading is false and jobLoading is false', () =>
	{
		const state: State = <any>{
			job: {
				jobLoading: false
			},
			salesAgreement: {
				salesAgreementLoading: false
			}
		};

		const result = showSpinner(state);
		expect(result).toBe(false);
	});

});
