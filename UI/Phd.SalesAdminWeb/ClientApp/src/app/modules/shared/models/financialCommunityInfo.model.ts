import { Org } from './org.model'
export class FinancialCommunityInfo {
    financialCommunityId: number;
    financialCommunityName: string;
    isColorSchemeMonotonyRuleEnabled: boolean;
    isElevationMonotonyRuleEnabled: boolean;
    org: Org;
}
