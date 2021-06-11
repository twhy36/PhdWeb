export class TreeVersionRules
{
	choiceRules: Array<ChoiceRules>;
	optionRules: Array<OptionRule>;
	pointRules: Array<PointRules>;
}

export class ChoiceRules
{
	choiceId: number;
	rules: Array<ChoiceRule>;
	executed: boolean = false;
}

export class ChoiceRule
{
	ruleId: number;
	ruleType: number;
	choices: Array<number>;
}

export class OptionRule
{
	ruleId: number;
	optionId: string;
	choices: OptionRuleChoice[];
	replaceOptions: Array<string>;
}

export class OptionRuleChoice
{
	id: number;
	mustHave: boolean;
	attributeReassignments: OptionRuleAttributeReassignment[];
}

export class OptionRuleAttributeReassignment
{
	id: number;
	choiceId: number;
	attributeGroupId: number;
	divChoiceCatalogId: number;
}

export class PointRules
{
	pointId: number;
	rules: Array<PointRule>;
	executed: boolean = false;
}

export class PointRule
{
	ruleId: number;
	ruleType: number;
	choices: Array<number>;
	points: Array<number>;
}
