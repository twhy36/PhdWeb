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
	isPhasedPricingEnabled: boolean;
	isDesignPreviewEnabled: boolean;
	isColorSchemePlanRuleEnabled: boolean;
}
