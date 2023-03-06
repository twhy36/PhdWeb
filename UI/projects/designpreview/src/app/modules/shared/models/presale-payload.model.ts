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

export class PresaleAuthToken
{
	token: string;
	type: string;
}

export class PresaleAuthTokenBody
{
	code: string;
	source: string;
}