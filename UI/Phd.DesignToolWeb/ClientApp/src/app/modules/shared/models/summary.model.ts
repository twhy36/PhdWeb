import { PriceBreakdown } from "./scenario.model";

import { DesignToolAttribute } from "./attribute.model";
import { PlanOption } from "./option.model";
import { Choice, DecisionPoint, SubGroup, Group } from "./tree.model.new";

export interface SummaryData
{
	title: string;
	images: SDImage[];
	hasHomesite: boolean;
	buyerInfo: BuyerInfo;
	priceBreakdown: PriceBreakdown;
	priceBreakdownTypes: string[];
	includeImages: boolean;
	allowEstimates: boolean;
	groups: SDGroup[];
}

export interface BuyerInfo
{
	communityName: string;
	planName: string;
	homesite: string;
	address: string;
}

export enum SummaryReportType
{
	SELECTIONS = 'Selections',
	SELECTIONS_IMAGES = 'Selections w/Images',
	OPTION_DETAILS = 'Option Details',
	OPTION_DETAILS_IMAGES = 'Option Details w/Images',
	FLOOR_PLAN = 'Floor Plan',
	CHOICE_LIST = 'Choice List',
	DESIGN_CHOICE_LIST = 'Design Choice List'
}

export class SDGroup
{
	id: number;
	label: string;
	subGroups: Array<SDSubGroup>;

	constructor(g: Group)
	{
		this.id = g.id;
		this.label = g.label;
		this.subGroups = [];
	}
}

export class SDSubGroup
{
	id: number;
	label: string;
	useInteractiveFloorplan: boolean;
	points: Array<SDPoint>;

	constructor(sg: SubGroup)
	{
		this.id = sg.id;
		this.label = sg.label;
		this.useInteractiveFloorplan = sg.useInteractiveFloorplan;
		this.points = [];
	}
}

export class SDPoint
{
	id: number;
	label: string;
	choices: Array<SDChoice>;
	completed: boolean;
	status: string;
	price: number = 0;
	dPointTypeId: number;
	groupName: string;
	subGroupName: string;

	constructor(p: DecisionPoint)
	{
		this.id = p.id;
		this.label = p.label;
		this.completed = p.completed;
		this.status = p.status.toString();
		this.price = p.price || 0;
		this.choices = [];
		this.dPointTypeId = p.dPointTypeId;
		this.groupName = null;
		this.subGroupName = null;
	}
}

export class SDChoice
{
	id: number;
	divChoiceCatalogId?: number;
	label: string;
	imagePath: string;
	quantity: number = 0;
	maxQuantity: number = 1;
	price: number = 0;
	selectedAttributes: Array<DesignToolAttribute> = [];
	options: PlanOption[] = [];
	hasChoiceRules: boolean;
	hasOptionRules: boolean;
	hasAttributes: boolean = false;
	hasLocations: boolean = false;
	isElevationChoice?: boolean = false;
	minPrice?: number;
	maxPrice?: number;
	description?: string;
	attributeReassignments: SDAttributeReassignment[] = []

	constructor(c: Choice, priceRange?: { choiceId: number, min: number, max: number })
	{
		this.id= c.id;
		this.divChoiceCatalogId = c.divChoiceCatalogId;
		this.hasChoiceRules= c.hasChoiceRules;
		this.hasOptionRules= c.hasOptionRules;
		this.label= c.label;
		this.imagePath= c.imagePath;
		this.quantity= c.quantity;
		this.maxQuantity= c.maxQuantity;
		this.price= c.price;
		this.selectedAttributes = c.selectedAttributes.map(x =>
		{
			let fromChoiceId = null;

			if (c.mappedAttributeGroups && c.mappedAttributeGroups.length > 0)
			{
				let group = c.mappedAttributeGroups.find(ag => ag.id === x.attributeGroupId);

				fromChoiceId = group ? group.attributeReassignmentFromChoiceId : null;
			}

			return <DesignToolAttribute>{
				attributeGroupId: x.attributeGroupId,
				attributeGroupLabel: x.attributeGroupLabel ? x.attributeGroupLabel : null,
				attributeGroupName: x.attributeGroupName ? x.attributeGroupName : null,
				attributeId: x.attributeId,
				attributeImageUrl: x.attributeImageUrl ? x.attributeImageUrl : null,
				attributeName: x.attributeName ? x.attributeName : null,
				manufacturer: x.manufacturer ? x.manufacturer : null,
				sku: x.sku ? x.sku : null,
				locationGroupId: x.locationGroupId ? x.locationGroupId : null,
				locationGroupLabel: x.locationGroupLabel ? x.locationGroupLabel : null,
				locationGroupName: x.locationGroupName ? x.locationGroupName : null,
				locationId: x.locationId ? x.locationId : null,
				locationName: x.locationName ? x.locationName : null,
				locationQuantity: x.locationQuantity ? x.locationQuantity : null,
				scenarioChoiceLocationId: x.scenarioChoiceLocationId ? x.scenarioChoiceLocationId : null,
				scenarioChoiceLocationAttributeId: x.scenarioChoiceLocationAttributeId ? x.scenarioChoiceLocationAttributeId : null,
				action: x.action ? x.action : null,
				attributeReassignmentFromChoiceId: fromChoiceId || null
			}
		});
		this.options= c.options;
		this.hasAttributes = c.mappedAttributeGroups && c.mappedAttributeGroups.length > 0;
		this.hasLocations = c.mappedLocationGroups && c.mappedLocationGroups.length > 0;
		this.description = c.description;
		this.minPrice = priceRange ? priceRange.min : null;
		this.maxPrice = priceRange ? priceRange.max : null;
	}
}

export class SDAttributeReassignment
{
	id: number;
	label: string;
}

export class SDImage
{
	imageUrl: string;
	hasDataUri?: boolean = false;
	floorIndex?: number;
	floorName?: string;
}
