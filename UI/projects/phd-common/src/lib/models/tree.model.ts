import { PointStatus } from './point.model';
import { DesignToolAttribute } from './attribute.model';
import { PlanOption } from './option.model';
import { PointRules, ChoiceRules, OptionRule } from './rule.model';
import { JobChoice } from './job.model';
import { ChangeOrderChoice } from './job-change-order.model';

export class Tree
{
	constructor(dto: Tree)
	{
		const { ['treeVersion']: tv, ...rest } = dto;
		Object.assign(this, rest);
		this.treeVersion = new TreeVersion(tv);
	}

	id: number;
	orgId: number;
	marketKey: string;
	planId: number;
	planKey: string;
	communityId: number;
	communityKey: string;
	marketId: number;
	financialCommunityId: number;
	treeVersion: TreeVersion;
}

export class TreeVersion
{
	constructor(dto: TreeVersion)
	{
		const { ['groups']: groups, ...rest } = dto;

		Object.assign(this, rest);

		this.groups = groups.map(g => new Group(g)).filter(g => g.subGroups.length > 0);
	}

	id: number;
	treeId: number;
	planKey: string;
	name: string;
	groups: Array<Group>;
}

export class Group
{
	constructor(dto: Group)
	{
		const { ['subGroups']: subGroups, ...rest } = dto;

		Object.assign(this, rest);

		this.subGroups = subGroups.map(sg => new SubGroup(sg)).filter(sg => sg.points.length > 0);
	}

	id: number;
	groupCatalogId: number;
	treeVersionId: number;
	sortOrder: number;
	label: string;
	subGroups: Array<SubGroup>;
	status: PointStatus;
}

export class SubGroup
{
	constructor(dto: SubGroup)
	{
		const { ['points']: points, ...rest } = dto;

		Object.assign(this, rest);

		this.points = points.map(p => new DecisionPoint(p)).filter(p => p.choices.length > 0);
	}

	id: number;
	groupId: number;
	subGroupCatalogId: number;
	sortOrder: number;
	label: string;
	useInteractiveFloorplan: boolean;
	treeVersionId: number;
	points: Array<DecisionPoint>;
	status: PointStatus;
}

export class DecisionPoint
{
	constructor(dto: DecisionPoint)
	{
		const { ['choices']: choices, ...rest } = dto;

		Object.assign(this, rest);

		this.choices = choices.map(c => new Choice(c));
	}

	id: number;
	hasPointToPointRules: boolean;
	hasPointToChoiceRules: boolean;
	subGroupId: number;
	divPointCatalogId: number;
	pointPickTypeId: PickType;
	pointPickTypeLabel: string;
	sortOrder: number;
	isQuickQuoteItem: boolean;
	isStructuralItem: boolean;
	edhConstructionStageId?: number;
	cutOffDays?: number;
	label: string;
	description: string;
	treeVersionId: number;
	choices: Array<Choice>;
	completed: boolean;
	viewed: boolean;
	enabled: boolean = true;
	disabledBy: Array<PointRules> = [];
	status: PointStatus;
	price: number = 0;
	dPointTypeId: number;
	subGroupCatalogId: number;
	isPastCutOff: boolean = false;
}

export class Choice
{
	constructor(dto: Choice)
	{
		Object.assign(this, dto);
	}

	mappedAttributeGroups: MappedAttributeGroup[] = []; // after rules have been applied
	mappedLocationGroups: MappedLocationGroup[] = []; // after rules have been applied
	attributeGroups: number[]; // before rules
	locationGroups: number[]; // before rules
	choiceMaxQuantity: null;
	description: string;
	disabledBy: Array<ChoiceRules> = [];
	divChoiceCatalogId: number;
	enabled: boolean = true;
	hasChoiceRules: boolean;
	hasOptionRules: boolean;
	id: number;
	imagePath: string;
	hasImage: boolean;
	isDecisionDefault: boolean;
	isSelectable: boolean;
	label: string;
	maxQuantity: number = 1;
	options: PlanOption[] = [];
	overrideNote: string;
	price: number = 0;
	quantity: number = 0;
	selectedAttributes: Array<DesignToolAttribute> = [];
	sortOrder: number;
	treePointId: number;
	treeVersionId: number;
	lockedInOptions: OptionRule[] = [];
	changedDependentChoiceIds: number[] = [];
	lockedInChoice: JobChoice | ChangeOrderChoice = null;
	mappingChanged: boolean = false;
}

export class MappedGroup
{
	id: number;
}

export class MappedAttributeGroup extends MappedGroup
{
	attributeReassignmentFromChoiceId?: number;

	constructor(dto: MappedAttributeGroup)
	{
		super();

		Object.assign(this, dto);
	}
}

export class MappedLocationGroup extends MappedGroup
{
	constructor(dto: MappedLocationGroup)
	{
		super();

		Object.assign(this, dto);
	}
}

export class ChoicePriceRange
{
	choiceId: number;
	min: number;
	max: number;
}

export enum PickType
{
	Pick1 = 1,
	Pick0or1 = 2,
	Pick1ormore = 3,
	Pick0ormore = 4
}

export class OptionImage
{
	optionImageId?: number;
	planOptionID?: number;
	dTreeVersionID?: number;
	imageURL?: string;
	hasDataUri?: boolean = false;
	sortKey?: number;
	hideImage?: boolean;
	integrationKey?: string;
}

export class ChoiceImageAssoc
{
	dpChoiceId: number;
	dpChoiceImageAssocId: number;
	imageUrl: string;
	sortKey: number;
}

export class PlanOptionCommunityImageAssoc
{
	planOptionCommunityId: number;
	imageUrl: string;
	sortOrder: number;
}

export class FloorPlanImage
{
	constructor(dto: FloorPlanImage)
	{
		Object.assign(this, dto);
	}

	floorName?: string;
	floorIndex?: number;
	svg?: string;
}

export class TreeBaseHouseOption
{
	baseHouseOptionID?: number;
	dTreeVersionID?: number;
	planOptionID?: number;
	planOption?: TreePlanOption;
}

export class TreePlanOption
{
	planOptionID?: number;
	planID?: number;
	integrationKey?: string;
}
