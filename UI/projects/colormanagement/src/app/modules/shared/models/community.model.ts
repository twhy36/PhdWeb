import { IColorItemDto } from './colorItem.model';
export interface IFinancialCommunity {
	id: number,
	name?: string,
	number?: string,
	salesStatusDescription?: string
}

export interface IMarket {
	companyType?: string,
	financialCommunities?: Array<IFinancialCommunity>
	id: number,
	name: string,
	number: string,
	salesStatusDescription?: string
}

export interface ISalesCommunity {
	financialCommunities: Array<IFinancialCommunity>,
	id: number,
	marketId: number,
	name: string,
	number: string,
	salesStatusDescription: string
}

export interface IPlan {
	id: number;
	planName: string;
	financialPlanIntegrationKey: string;
}

export interface ITreeVersion {
	dTreeVersionId: number;
	dTreeVersionName: string;
	displayName: string;
	publishStartDate: Date;
	publishEndDate: Date;
}

export interface IPlanCommunity {
	id: number;
	planSalesName: string;
}

export interface IOptionCommunity {
	id: number;
	optionSalesName: string;
	optionSubCategoryId: number;
	planOptionCommunities: IPlanOptionCommunity[];
}

export interface IPlanOptionCommunity {
	id: number;
	planId: number;
	isBaseHouse: boolean;
}

export interface IPlanOptionCommunity1 {
	id: number;
	planCommunity: IPlanCommunity;
	optionCommunity: IOptionCommunity;
}

export interface IPlanOptionCommunityDto {
	planOptionId: number;
	isBaseHouse: boolean;
	planCommunity: IPlanCommunity;
	optionCommunityId: number;
	optionSalesName: string;
	colorItem: IColorItemDto;
}

export interface IPlanOptionCommunityGridDto {
	planCommunity: IPlanCommunity[];
	optionCommunityId: number;
	optionSalesName: string;
	colorItem: IColorItemDto[];
}
