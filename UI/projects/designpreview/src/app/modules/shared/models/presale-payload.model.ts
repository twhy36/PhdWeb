export class PresalePayload
{
	dTreeId: number;
	financialPlanIntegrationKey: string;
	iss: string;
	planCommunityId: number;

	constructor(dto: any)
	{
		this.dTreeId = dto.dTreeId;
		this.financialPlanIntegrationKey = dto.financialPlanIntegrationKey;
		this.iss = dto.iss;
		this.planCommunityId = dto.planCommunityId;
	}
}