export class DivisionalCatalog
{
	groups: Array<DivDGroup>;
}

export class DivDGroup
{
	dGroupCatalogID: number;
	dGroupLabel: string;
	isActive: boolean;
	subGroups: Array<DivDSubGroup>;
	matched: boolean;
	open: boolean;
}

export class DivDSubGroup
{
	dSubGroupCatalogID: number;
	dSubGroupLabel: string;
	isActive: boolean;
	points: Array<DivDPoint>;
	matched: boolean;
	open: boolean;
}

export class DivDPoint
{
	dPointCatalogID: number;
	dPointLabel: string;
	isActive: boolean;
	choices: Array<DivDChoice>
	matched: boolean;
	open: boolean;
}

export class DivDChoice
{
	divChoiceCatalogID: number;
	choiceLabel: string;
	isActive: boolean;
	matched: boolean;
	open: boolean;
	mustHave?: boolean;
}