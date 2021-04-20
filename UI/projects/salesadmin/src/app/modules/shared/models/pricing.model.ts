import { IPlanDto } from './plan.model';

export interface ISalesPhasePlan {
    plan: IPlanDto;
	listPrice: number;
}

export interface ILot {
	id: number;
	salesPhaseId: number;
	lotBlock: string;
	lotStatusDescription: string;
	lotBuildTypeDescription: string;
}

export interface ISalesPhase {
    id: number;
	salesPhaseName: string;
	lots: ILot[];
	phasePlans: ISalesPhasePlan[];
}
