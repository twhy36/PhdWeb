import { PhdEntityDto } from "./api-dtos.model";

export interface IPlan
{
    id: number;
    financialPlanIntegrationKey: string;
    planSalesName: string;
    bedrooms: number;
    fullBaths: number;
    halfBaths: number;
    squareFeet: number;
    isActive?: boolean;

	// not pulled from plans
    commKey: string;
	marketKey: string;

	hasChoices?: boolean;
}

export interface IPlanOptionResult extends PhdEntityDto.IPlanDto
{
	choicesExist?: boolean;
}

export interface IPlanOptionCommunityResult 
{
	planID: number;
	financialCommunityId: number;
	financialPlanIntegrationKey: string;
	planSalesName: string;
}
