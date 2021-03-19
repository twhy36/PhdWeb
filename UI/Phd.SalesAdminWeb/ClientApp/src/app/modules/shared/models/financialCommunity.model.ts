import { FinancialMarket } from '@shared/models/financialMarket.model';

export interface FinancialCommunity {
    id: number;
    key: string;
    marketId: number;
	name: string;
    salesStatusDescription: "Active" | "New" | "Closed" | "Inactive";
	isPhasedPricingEnabled: boolean;
	market?: FinancialMarket;
	isElevationMonotonyRuleEnabled: boolean;
	isColorSchemeMonotonyRuleEnabled: boolean;
}
