
export function isCommunityMergeField(dto: MergeField | CommunityMergeField): dto is CommunityMergeField
{
	if ((dto as CommunityMergeField).customFieldFinancialCommunityId)
	{
		return true;
	}
}

export class MergeField
{
	customFieldMarketId?: number;
	marketId: number;
	fieldName: string;
	fieldValue: string;
	isActive: boolean;
	communityIds?: number[] = [];
	customFieldFinancialCommunities?: CommunityMergeField[] = [];
}

export class CommunityMergeField
{
	customFieldFinancialCommunityId: number;
	customFieldMarketId: number;
	financialCommunityId: number;
	fieldName: string;
	fieldValue: string;
	isActive: boolean;
	marketFieldValue: string;
}
