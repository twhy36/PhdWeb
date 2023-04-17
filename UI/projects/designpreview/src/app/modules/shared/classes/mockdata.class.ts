import { DecisionPoint } from 'phd-common';
import { ChoiceExt } from '../models/choice-ext.model';

export const choiceToChoiceMustHaveRuleChoice: ChoiceExt =
{
	mappedAttributeGroups: [
		{
			id: 17941
		},
		{
			id: 17942
		}
	],
	mappedLocationGroups: [],
	myFavoritesChoice: null,
	isFavorite: false,
	favoriteAttributes: null,
	overrideNote: null,
	attributeGroups: [],
	locationGroups: [],
	disabledBy: [
		{
			choiceId: 3494441,
			rules: [
				{
					choices: [
						3494443
					],
					ruleId: 791986,
					ruleType: 1
				}
			],
			executed: true,
		}
	],
	enabled: false,
	maxQuantity: 1,
	options: [
	  {
			id: 3620530,
			name: 'Cabinet Hardware - Level 1 - Whole House - G',
			isActive: true,
			listPrice: 900,
			maxOrderQuantity: 1,
			isBaseHouse: false,
			isBaseHouseElevation: false,
			attributeGroups: [
		  17941,
		  17942
			],
			locationGroups: [],
			financialOptionIntegrationKey: '73298',
			description: 'Select pulls and/or knobs for your cabinet doors and drawers throughout house. All doors must match, all drawers must match.',
			optionImages: [
		  {
					imageURL: 'https://pultegroup.picturepark.com/Go/QLEH95YR/V/369615/15',
					sortKey: 1
		  }
			],
			planId: 12068,
			communityId: 0,
			calculatedPrice: 900
	  }
	],
	price: 900,
	quantity: 0,
	selectedAttributes: [],
	lockedInOptions: [],
	changedDependentChoiceIds: [],
	lockedInChoice: null,
	mappingChanged: false,
	isRequired: false,
	disabledByHomesite: false,
	disabledByReplaceRules: [],
	disabledByBadSetup: false,
	disabledByRelocatedMapping: [],
	choiceImages: [],
	hasChoiceRules: true,
	hasOptionRules: true,
	id: 3494441,
	treePointId: 888218,
	divChoiceCatalogId: 7465,
	sortOrder: 1,
	isSelectable: false,
	isDecisionDefault: false,
	isHiddenFromBuyerView: false,
	priceHiddenFromBuyerView: false,
	label: 'Cabinet Hardware Level 1',
	imagePath: '',
	hasImage: false,
	treeVersionId: 13021,
	choiceMaxQuantity: null,
	description: null,
	choiceStatus: 'Available',
	isPointStructural: false
}

export const choiceToChoiceMustNotHaveRuleChoice: ChoiceExt =
{
	mappedAttributeGroups: [],
	mappedLocationGroups: [],
	myFavoritesChoice: null,
	isFavorite: false,
	favoriteAttributes: null,
	overrideNote: null,
	attributeGroups: [],
	locationGroups: [],
	disabledBy: [
		{
			choiceId: 3494375,
			rules: [
				{
					choices: [
						3494378
					],
					ruleId: 791985,
					ruleType: 2
				}
			],
			executed: true,
		}
	],
	enabled: false,
	maxQuantity: 1,
	options: [],
	price: 0,
	quantity: 0,
	selectedAttributes: [],
	lockedInOptions: [],
	changedDependentChoiceIds: [],
	lockedInChoice: null,
	mappingChanged: false,
	isRequired: false,
	disabledByHomesite: false,
	disabledByReplaceRules: [],
	disabledByBadSetup: false,
	disabledByRelocatedMapping: [],
	choiceImages: [
		{
			dpChoiceId: 3494375,
			imageUrl: 'https://pultegroup.picturepark.com/Go/yE81noae/V/359373/15',
			sortKey: 0
		}
	],
	hasChoiceRules: true,
	hasOptionRules: false,
	id: 3494375,
	treePointId: 888201,
	divChoiceCatalogId: 6263,
	sortOrder: 1,
	isSelectable: false,
	isDecisionDefault: true,
	isHiddenFromBuyerView: false,
	priceHiddenFromBuyerView: false,
	label: 'Included Kitchen Island',
	imagePath: '',
	hasImage: true,
	treeVersionId: 13021,
	choiceMaxQuantity: null,
	description: null,
	choiceStatus: 'Available',
	isPointStructural: true,
}

export const choiceToChoiceMustHaveRulePoint: DecisionPoint =
{
	enabled: true,
	disabledBy: [],
	price: 0,
	isPastCutOff: false,
	hasPointToPointRules: false,
	hasPointToChoiceRules: false,
	id: 888218,
	subGroupId: 206630,
	divPointCatalogId: 2269,
	pointPickTypeId: 4,
	pointPickTypeLabel: 'Pick 0 or more',
	sortOrder: 8,
	isQuickQuoteItem: false,
	isStructuralItem: false,
	isHiddenFromBuyerView: false,
	edhConstructionStageId: 4,
	cutOffDays: null,
	label: 'Cabinet Additions 2',
	description: '',
	treeVersionId: 13021,
	dPointTypeId: null,
	subGroupCatalogId: 0,
	completed: false,
	status: 4,
	choices: [
		{
			mappedAttributeGroups: [
				{
					id: 17941
				},
				{
					id: 17942
				}
			],
			mappedLocationGroups: [],
			overrideNote: null,
			attributeGroups: [],
			locationGroups: [],
			disabledBy: [
				{
					choiceId: 3494441,
					rules: [
						{
							choices: [
								3494443
							],
							ruleId: 791986,
							ruleType: 1
						}
					],
					executed: true,
				}
			],
			enabled: false,
			maxQuantity: 1,
			options: [
				{
					id: 3620530,
					name: 'Cabinet Hardware - Level 1 - Whole House - G',
					isActive: true,
					listPrice: 900,
					maxOrderQuantity: 1,
					isBaseHouse: false,
					isBaseHouseElevation: false,
					attributeGroups: [
						17941,
						17942
					],
					locationGroups: [],
					financialOptionIntegrationKey: '73298',
					description: 'Select pulls and/or knobs for your cabinet doors and drawers throughout house. All doors must match, all drawers must match.',
					optionImages: [
						{
							imageURL: 'https://pultegroup.picturepark.com/Go/QLEH95YR/V/369615/15',
							sortKey: 1
						}
					],
					planId: 12068,
					communityId: 0,
					calculatedPrice: 900
				}
			],
			price: 900,
			quantity: 0,
			selectedAttributes: [],
			lockedInOptions: [],
			changedDependentChoiceIds: [],
			lockedInChoice: null,
			mappingChanged: false,
			isRequired: false,
			disabledByHomesite: false,
			disabledByReplaceRules: [],
			disabledByBadSetup: false,
			disabledByRelocatedMapping: [],
			choiceImages: [],
			hasChoiceRules: true,
			hasOptionRules: true,
			id: 3494441,
			treePointId: 888218,
			divChoiceCatalogId: 7465,
			sortOrder: 1,
			isSelectable: false,
			isDecisionDefault: false,
			isHiddenFromBuyerView: false,
			priceHiddenFromBuyerView: false,
			label: 'Cabinet Hardware Level 1',
			imagePath: '',
			hasImage: false,
			treeVersionId: 13021,
			choiceMaxQuantity: null,
			description: null
		},
		{
			mappedAttributeGroups: [
				{
					id: 17939
				},
				{
					id: 17940
				}
			],
			mappedLocationGroups: [],
			overrideNote: null,
			attributeGroups: [],
			locationGroups: [],
			disabledBy: [],
			enabled: true,
			maxQuantity: 1,
			options: [
				{
					id: 3620531,
					name: 'Cabinet Hardware - Level 2 - Whole House - G',
					isActive: true,
					listPrice: 1375,
					maxOrderQuantity: 1,
					isBaseHouse: false,
					isBaseHouseElevation: false,
					attributeGroups: [
						17939,
						17940
					],
					locationGroups: [],
					financialOptionIntegrationKey: '73299',
					description: 'Select pulls and/or knobs for your cabinet doors and drawers throughout house. All doors must match, all drawers must match.',
					optionImages: [
						{
							imageURL: 'https://pultegroup.picturepark.com/Go/GxXLPPyI/V/369547/15',
							sortKey: 1
						}
					],
					planId: 12068,
					communityId: 0,
					calculatedPrice: 1375
				}
			],
			price: 1375,
			quantity: 0,
			selectedAttributes: [],
			lockedInOptions: [],
			changedDependentChoiceIds: [],
			lockedInChoice: null,
			mappingChanged: false,
			isRequired: false,
			disabledByHomesite: false,
			disabledByReplaceRules: [],
			disabledByBadSetup: false,
			disabledByRelocatedMapping: [],
			choiceImages: [],
			hasChoiceRules: false,
			hasOptionRules: true,
			id: 3494440,
			treePointId: 888218,
			divChoiceCatalogId: 7466,
			sortOrder: 2,
			isSelectable: false,
			isDecisionDefault: false,
			isHiddenFromBuyerView: false,
			priceHiddenFromBuyerView: false,
			label: 'Cabinet Hardware Level 2',
			imagePath: '',
			hasImage: false,
			treeVersionId: 13021,
			choiceMaxQuantity: null,
			description: null
		},
		{
			mappedAttributeGroups: [],
			mappedLocationGroups: [],
			overrideNote: null,
			attributeGroups: [],
			locationGroups: [],
			disabledBy: [],
			enabled: true,
			maxQuantity: 1,
			options: [
				{
					id: 3622127,
					name: 'Cabinet Crown Molding - L 1 - Whole House',
					isActive: true,
					listPrice: 325,
					maxOrderQuantity: 1,
					isBaseHouse: false,
					isBaseHouseElevation: false,
					attributeGroups: [],
					locationGroups: [],
					financialOptionIntegrationKey: '73220',
					description: 'Installed on all upper cabinets throughout house per plan. Style varies per selected cabinet door style.',
					optionImages: [
						{
							imageURL: 'https://pultegroup.picturepark.com/Go/Nnc1SroS/V/361221/15',
							sortKey: 1
						}
					],
					planId: 12068,
					communityId: 0,
					calculatedPrice: 325
				}
			],
			price: 325,
			quantity: 0,
			selectedAttributes: [],
			lockedInOptions: [],
			changedDependentChoiceIds: [],
			lockedInChoice: null,
			mappingChanged: false,
			isRequired: false,
			disabledByHomesite: false,
			disabledByReplaceRules: [],
			disabledByBadSetup: false,
			disabledByRelocatedMapping: [],
			choiceImages: [],
			hasChoiceRules: false,
			hasOptionRules: true,
			id: 3494439,
			treePointId: 888218,
			divChoiceCatalogId: 7467,
			sortOrder: 3,
			isSelectable: false,
			isDecisionDefault: false,
			isHiddenFromBuyerView: false,
			priceHiddenFromBuyerView: false,
			label: 'Whole House Cabinet Crown Molding Level 1',
			imagePath: '',
			hasImage: false,
			treeVersionId: 13021,
			choiceMaxQuantity: null,
			description: null
		},
		{
			mappedAttributeGroups: [],
			mappedLocationGroups: [],
			overrideNote: null,
			attributeGroups: [],
			locationGroups: [],
			disabledBy: [],
			enabled: true,
			maxQuantity: 1,
			options: [
				{
					id: 3622126,
					name: 'Cabinet Crown Molding - L 2 - Whole House',
					isActive: true,
					listPrice: 650,
					maxOrderQuantity: 1,
					isBaseHouse: false,
					isBaseHouseElevation: false,
					attributeGroups: [],
					locationGroups: [],
					financialOptionIntegrationKey: '73221',
					description: 'Installed on all upper cabinets throughout house per plan. Style varies per selected cabinet door style.',
					optionImages: [
						{
							imageURL: 'https://pultegroup.picturepark.com/Go/YjIo2sQt/V/357486/15',
							sortKey: 1
						}
					],
					planId: 12068,
					communityId: 0,
					calculatedPrice: 650
				}
			],
			price: 650,
			quantity: 0,
			selectedAttributes: [],
			lockedInOptions: [],
			changedDependentChoiceIds: [],
			lockedInChoice: null,
			mappingChanged: false,
			isRequired: false,
			disabledByHomesite: false,
			disabledByReplaceRules: [],
			disabledByBadSetup: false,
			disabledByRelocatedMapping: [],
			choiceImages: [],
			hasChoiceRules: false,
			hasOptionRules: true,
			id: 3494438,
			treePointId: 888218,
			divChoiceCatalogId: 7468,
			sortOrder: 4,
			isSelectable: false,
			isDecisionDefault: false,
			isHiddenFromBuyerView: false,
			priceHiddenFromBuyerView: false,
			label: 'Whole House Cabinet Crown Molding Level 2',
			imagePath: '',
			hasImage: false,
			treeVersionId: 13021,
			choiceMaxQuantity: null,
			description: null
		},
		{
			mappedAttributeGroups: [],
			mappedLocationGroups: [],
			overrideNote: null,
			attributeGroups: [],
			locationGroups: [],
			disabledBy: [],
			enabled: true,
			maxQuantity: 1,
			options: [
				{
					id: 3622125,
					name: 'Cabinet Crown Molding - L 3 - Whole House',
					isActive: true,
					listPrice: 1025,
					maxOrderQuantity: 1,
					isBaseHouse: false,
					isBaseHouseElevation: false,
					attributeGroups: [],
					locationGroups: [],
					financialOptionIntegrationKey: '73222',
					description: 'Installed on all upper cabinets throughout house per plan. Style varies per selected cabinet door style.',
					optionImages: [
						{
							imageURL: 'https://pultegroup.picturepark.com/Go/q26QPhqm/V/355995/15',
							sortKey: 1
						}
					],
					planId: 12068,
					communityId: 0,
					calculatedPrice: 1025
				}
			],
			price: 1025,
			quantity: 0,
			selectedAttributes: [],
			lockedInOptions: [],
			changedDependentChoiceIds: [],
			lockedInChoice: null,
			mappingChanged: false,
			isRequired: false,
			disabledByHomesite: false,
			disabledByReplaceRules: [],
			disabledByBadSetup: false,
			disabledByRelocatedMapping: [],
			choiceImages: [],
			hasChoiceRules: false,
			hasOptionRules: true,
			id: 3494437,
			treePointId: 888218,
			divChoiceCatalogId: 7469,
			sortOrder: 5,
			isSelectable: false,
			isDecisionDefault: false,
			isHiddenFromBuyerView: false,
			priceHiddenFromBuyerView: false,
			label: 'Whole House Cabinet Crown Molding Level 3',
			imagePath: '',
			hasImage: false,
			treeVersionId: 13021,
			choiceMaxQuantity: null,
			description: null
		}
	],
	viewed: false,
}

export const choiceToChoiceMustNotHaveRulePoint: DecisionPoint =
{
	enabled: true,
	disabledBy: [],
	price: 0,
	isPastCutOff: false,
	hasPointToPointRules: false,
	hasPointToChoiceRules: false,
	id: 888201,
	subGroupId: 206629,
	divPointCatalogId: 2237,
	pointPickTypeId: 1,
	pointPickTypeLabel: 'Pick 1',
	sortOrder: 8,
	isQuickQuoteItem: true,
	isStructuralItem: true,
	isHiddenFromBuyerView: false,
	edhConstructionStageId: null,
	cutOffDays: -14,
	label: 'Interior Features 1',
	description: '',
	treeVersionId: 13021,
	dPointTypeId: null,
	subGroupCatalogId: 0,
	completed: false,
	status: 0,
	choices: [
		{
			mappedAttributeGroups: [],
			mappedLocationGroups: [],
			attributeGroups: [],
			locationGroups: [],
			disabledBy: [
				{
					choiceId: 3494375,
					rules: [
						{
							choices: [
								3494378
							],
							ruleId: 791985,
							ruleType: 2
						}
					],
					executed: true
				}
			],
			enabled: false,
			maxQuantity: 1,
			options: [],
			price: 0,
			quantity: 0,
			selectedAttributes: [],
			lockedInOptions: [],
			changedDependentChoiceIds: [],
			lockedInChoice: null,
			mappingChanged: false,
			isRequired: false,
			disabledByHomesite: false,
			disabledByReplaceRules: [],
			disabledByBadSetup: false,
			disabledByRelocatedMapping: [],
			choiceImages: [
				{
					dpChoiceId: 3494375,
					imageUrl: 'https://pultegroup.picturepark.com/Go/yE81noae/V/359373/15',
					sortKey: 0
				}
			],
			hasChoiceRules: true,
			hasOptionRules: false,
			id: 3494375,
			treePointId: 888201,
			divChoiceCatalogId: 6263,
			sortOrder: 1,
			isSelectable: false,
			isDecisionDefault: true,
			isHiddenFromBuyerView: false,
			priceHiddenFromBuyerView: false,
			label: 'Included Kitchen Island',
			imagePath: '',
			hasImage: true,
			treeVersionId: 13021,
			choiceMaxQuantity: null,
			description: null,
			overrideNote: null
		},
		{
			mappedAttributeGroups: [],
			mappedLocationGroups: [],
			attributeGroups: [],
			locationGroups: [],
			disabledBy: [],
			enabled: true,
			maxQuantity: 1,
			options: [
				{
					id: 3620331,
					name: 'Kitchen Island - Tiered',
					isActive: true,
					listPrice: 8850,
					maxOrderQuantity: 1,
					isBaseHouse: false,
					isBaseHouseElevation: false,
					attributeGroups: [
						22098
					],
					locationGroups: [],
					financialOptionIntegrationKey: '70292',
					description: 'Reconfigures kitchen island with a lowered countertop seating area and waterfall edge per plan. Cabinet style/finish and Countertop material(s) can differ from main kitchen areas.  (Opt. 75175-75176 for cabinets and Opt. 75299-75302 for countertop, Opt. 75393-75396 for seating area countertop)',
					optionImages: [
						{
							imageURL: 'https://pultegroup.picturepark.com/Go/dwhII4iY/V/359343/15',
							sortKey: 1
						}
					],
					planId: 12068,
					communityId: 0,
					calculatedPrice: 8850
				}
			],
			price: 8850,
			quantity: 0,
			selectedAttributes: [],
			lockedInOptions: [],
			changedDependentChoiceIds: [],
			lockedInChoice: null,
			mappingChanged: false,
			isRequired: false,
			disabledByHomesite: false,
			disabledByReplaceRules: [],
			disabledByBadSetup: false,
			disabledByRelocatedMapping: [],
			choiceImages: [],
			hasChoiceRules: false,
			hasOptionRules: true,
			id: 3494374,
			treePointId: 888201,
			divChoiceCatalogId: 6268,
			sortOrder: 2,
			isSelectable: false,
			isDecisionDefault: false,
			isHiddenFromBuyerView: false,
			priceHiddenFromBuyerView: false,
			label: 'Tiered Island at Kitchen',
			imagePath: '',
			hasImage: false,
			treeVersionId: 13021,
			choiceMaxQuantity: null,
			description: null,
			overrideNote: null,
		}
	],
	viewed: false,
}

export const dpToDpRulesPoint: DecisionPoint =
{
	choices: [
		{
			attributeGroups: [],
			changedDependentChoiceIds: [],
			choiceImages: [],
			choiceMaxQuantity: null,
			description: null,
			disabledBy: [],
			disabledByBadSetup: false,
			disabledByHomesite: false,
			disabledByRelocatedMapping: [],
			disabledByReplaceRules: [],
			divChoiceCatalogId: 7403,
			enabled: false,
			hasChoiceRules: false,
			hasImage: false,
			hasOptionRules: true,
			id: 3494555,
			imagePath: '',
			isDecisionDefault: false,
			isHiddenFromBuyerView: false,
			isRequired: false,
			isSelectable: false,
			label: 'Single Wi-Fi Speaker',
			locationGroups: [],
			lockedInChoice: null,
			lockedInOptions: [],
			mappedAttributeGroups: [],
			mappedLocationGroups: [],
			mappingChanged: false,
			maxQuantity: 20,
			options: [
				{
					attributeGroups: [],
					calculatedPrice: 250,
					communityId: 0,
					description: 'Sonos - Component will not be installed or fully operational at closing. After closing and activation of internet service with a provider of buyers\' choosing, the component(s) will be installed and configured by a third-party service company. See structured wiring agent for additional information.',
					financialOptionIntegrationKey: '75635',
					id: 3620670,
					isActive: true,
					isBaseHouse: false,
					isBaseHouseElevation: false,
					listPrice: 250,
					locationGroups: [],
					maxOrderQuantity: 20,
					name: 'Wi-Fi Speaker - Single',
					optionImages: [
						{
							imageURL: 'https://pultegroup.picturepark.com/Go/3OYaHRGh/V/355983/15',
							sortKey: 1,
						},
					],
					planId: 12068,
				},
			],
			overrideNote: null,
			price: 250,
			priceHiddenFromBuyerView: false,
			quantity: 0,
			selectedAttributes: [],
			sortOrder: 1,
			treePointId: 888260,
			treeVersionId: 13021
		}
	],
	completed: false,
	cutOffDays: null,
	dPointTypeId: null,
	description: '',
	disabledBy: [
		{
			executed: true,
			pointId: 888260,
			rules: [
				{
					choices: [],
					points: [888261],
					ruleId: 233821,
					ruleType: 1,
				}
			]
		}
	],
	divPointCatalogId: 2822,
	edhConstructionStageId: 4,
	enabled: false,
	hasPointToChoiceRules: false,
	hasPointToPointRules: true,
	id: 888260,
	isHiddenFromBuyerView: false,
	isPastCutOff: false,
	isQuickQuoteItem: false,
	isStructuralItem: false,
	label: 'Smart Home Additions',
	pointPickTypeId: 2,
	pointPickTypeLabel: 'Pick 0 or 1',
	price: 0,
	sortOrder: 2,
	status: 2,
	subGroupCatalogId: 0,
	subGroupId: 206635,
	treeVersionId: 13021,
	viewed: false,
}

