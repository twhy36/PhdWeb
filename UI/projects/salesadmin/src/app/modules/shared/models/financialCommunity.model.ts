import { FinancialMarket } from './financialMarket.model';

export interface FinancialCommunity
{
	id: number;
	key: string;
	marketId: number;
	name: string;
	salesStatusDescription: "Active" | "New" | "Closed" | "Inactive";
	isPhasedPricingEnabled: boolean;
	market?: FinancialMarket;
	isElevationMonotonyRuleEnabled: boolean;
	isColorSchemeMonotonyRuleEnabled: boolean;
	isDesignPreviewEnabled: boolean;
	salesCommunityId: number;
	isColorSchemePlanRuleEnabled: boolean;
}

export class FinancialCommunityInfo
{
	financialCommunityId: number;
	defaultECOEMonths?: number;
	earnestMoneyAmount?: number;
	thoBuyerClosingCostId?: number; // DELETEME when THO columns are migrated to EDH
	thoDiscountFlatAmountId?: number; // DELETEME when THO columns are migrated to EDH
	createdBy?: string;
	createdUtcDate?: Date;
	lastModifiedBy?: string;
	lastModifiedUtcDate?: Date;

	constructor(data?: FinancialCommunityInfo)
	{
		this.financialCommunityId = data.financialCommunityId;
		this.defaultECOEMonths = data.defaultECOEMonths;
		this.earnestMoneyAmount = data.earnestMoneyAmount;
		this.thoBuyerClosingCostId = data.thoBuyerClosingCostId; // DELETEME when THO columns are migrated to EDH
		this.thoDiscountFlatAmountId = data.thoDiscountFlatAmountId; // DELETEME when THO columns are migrated to EDH
		this.createdBy = data.createdBy;
		this.createdUtcDate = new Date(data.createdUtcDate);
		this.lastModifiedBy = data.lastModifiedBy;
		this.lastModifiedUtcDate = new Date(data.lastModifiedUtcDate);
	}
}
