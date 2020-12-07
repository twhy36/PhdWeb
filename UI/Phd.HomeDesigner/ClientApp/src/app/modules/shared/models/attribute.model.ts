export interface LocationGroup
{
	id: number;
	label: string;
	locations: Location[];
	name: string;
}

export interface Location
{
	id: number;
	name: string;
}

export interface AttributeGroup
{
	attributes: Attribute[];
	choiceId: number;
	id: number;
	label: string;
	name: string;
	sortOrder: number;
}

export interface Attribute
{
	id: number;
	imageUrl: string;
	manufacturer: string;
	monotonyConflict: boolean;
	name: string;
	selected?: boolean,
	sku: string;
}

export interface HomeDesignerAttribute
{
	attributeGroupId: number;
	attributeGroupLabel: string;
	attributeGroupName: string;
	attributeId: number;
	attributeImageUrl: string;
	attributeName: string;
	manufacturer: string;
	sku: string;
	locationGroupId: number;
	locationGroupLabel: string;
	locationGroupName: string;
	locationId: number;
	locationName: string;
	locationQuantity: number;	
	scenarioChoiceLocationId: number;
	scenarioChoiceLocationAttributeId: number;
	selected?: boolean;
	action?: string;
	attributeReassignmentFromChoiceId?: number;
}
