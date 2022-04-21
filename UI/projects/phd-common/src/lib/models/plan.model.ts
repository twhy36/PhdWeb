export class Plan
{
	id: number;
	title: string;
	subtitle: string;
	feature: string;
	description: string;
	price: number;
	salesName: string;
	numBed: number;
	numFullBath: number;
	numHalfBath: number;
	squareFeet: number;
	communityId: number;
	foundation: string;
	garageConfiguration: string;
	masterBedLocation: string;
	productConfiguration: string;
	productType: string;
	integrationKey: number;
	salesDescription: string;
	treeVersionId: number;
	marketingPlanId: number[];
	baseHouseElevationImageUrl: string;
	lotAssociations: number[];
}

export class JobPlan
{
	bedrooms: number;
	financialCommunityId: number;
	financialPlanIntegrationKey: string;
	footPrintDepth: number;
	footPrintWidth: number
	foundation: string;
	fullBaths: number
	garageConfiguration: string;
	halfBaths: number;
	id: number
	isActive: boolean;
	isCommonPlan: boolean;
	masterBedLocation: string;
	masterPlanNumber: string;
	npcNumber: string;
	planSalesDescription: string;
	planSalesName: string;
	productConfiguration: string;
	productType: string;
	revisionNumber: string;
	specLevel: string;
	squareFeet: number
	tcg: string;
	versionNumber: string;
}
