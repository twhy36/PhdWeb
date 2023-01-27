export class PlanCommunity
{
	planCommunityId: number;
	dTreeVersionId: number;
	planKey: number;
	planName: string;
	communityKey: number;
	communityId: number;
	communityName: string;
	isActive: boolean;
	hasPublishedTree: boolean;
	brandId: number;


	constructor(dto: any)
	{
		this.planCommunityId = dto.id;
		this.dTreeVersionId = dto.dTreeVersionId;
		this.planKey = dto.financialPlanIntegrationKey;
		this.planName = dto.planSalesName;
		this.communityKey = dto.financialIntegrationKey;
		this.communityName = dto.financialCommunityName;
		this.isActive = dto.isActive;
		this.hasPublishedTree = dto.hasPublishedTree;
		this.brandId = dto.financialBrandId;
	}
}