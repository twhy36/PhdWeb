import { FinancialMarket } from './financialMarket.model';

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

export class FinancialCommunityInfo {
	financialCommunityId: number;
	defaultECOEMonths?: number;
	earnestMoneyAmount?: number;
	thoBuyerClosingCostId?: number;
	thoDiscountFlatAmountId?: number;
	createdBy?: string;
	createdUtcDate?: Date;
	lastModifiedBy?: string;
	lastModifiedUtcDate?: Date;

	constructor(data?: FinancialCommunityInfo) {
		this.financialCommunityId = data.financialCommunityId;
		this.defaultECOEMonths = data.defaultECOEMonths;
		this.earnestMoneyAmount = data.earnestMoneyAmount;
		this.thoBuyerClosingCostId = data.thoBuyerClosingCostId;
		this.thoDiscountFlatAmountId = data.thoDiscountFlatAmountId;
		this.createdBy = data.createdBy;
		this.createdUtcDate = new Date(data.createdUtcDate);
		this.lastModifiedBy = data.lastModifiedBy;
		this.lastModifiedUtcDate = new Date(data.lastModifiedUtcDate);
	}
}
