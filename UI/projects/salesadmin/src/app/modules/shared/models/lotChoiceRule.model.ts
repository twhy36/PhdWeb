export interface LotChoiceRuleAssoc {
	lotChoiceRuleAssocId: number;
	edhLotId: number;
	planId: number;
	divChoiceCatalogId: number;
	mustHave: boolean;
}

export interface LotChoiceRuleAssocView {
	associatedLotChoiceRules: LotChoiceRuleAssoc[];
	edhLotId: number;
	planIdDisplay: string; // String representation for display in table
	divChoiceCatalogId: number;
	mustHave: boolean;
}