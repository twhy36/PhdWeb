export class PresalePayload
{
	financialPlanIntegrationKey: string;
	iss: string;
	planCommunityId: number;

	constructor(dto = null)
	{
		if (dto)
		{
			Object.assign(this, dto);
 		}
	}
}