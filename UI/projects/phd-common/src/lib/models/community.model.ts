import { IMarket } from "./market";

export interface SalesCommunity
{
	id: number;
	name: string;
	number: string;
	marketId: number;
	financialCommunities: Array<FinancialCommunity>;
	market: IMarket;
}

export interface FinancialCommunity
{
	id: number;
	name: string;
	number: string;
	city: string;
	state: string;
	zip: string;
	financialBrandId: number;
	isPhasedPricingEnabled: boolean;
	isDesignPreviewEnabled: boolean;
	isColorSchemePlanRuleEnabled: boolean;
}

export interface FinancialBrand
{
	id: number;
    key: number;
	name?: string;
}
