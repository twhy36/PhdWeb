export interface IRule
{
	id: number;
	parentId: number;
	treeVersionId: number;
	typeId: number;
	ruleItems: Array<IRuleItem>;
}

export interface IRuleItem
{
	id: number;
	itemId: number;
	label: string;
	typeId: number;
	treeVersionId: number;
}

export type RuleType = "choice" | "point";
