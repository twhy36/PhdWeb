export interface IPlanDto 
{
    isActive: boolean;
    marketId: number;
    communityId: number;
    id: number;
    integrationKey: string;
    salesName: string;
    numBed: number;
    numFullBath: number;
    numHalfBath: number;
    squareFeet: number;
}

export class PlanDto implements IPlanDto {
	isActive: boolean = false;
	marketId: number = 0;
	communityId: number = 0;
	id: number = 0;
	integrationKey: string = '';
	salesName: string = '';
	numBed: number = 0;
	numFullBath: number = 0;
	numHalfBath: number = 0;
	squareFeet: number = 0;
}

export class Plan
{
    planID: number;
    communityID: number;
    integrationKey: string;
}
