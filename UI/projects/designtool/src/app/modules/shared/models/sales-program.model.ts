
export class SalesProgram
{
	name: string;
	endDate: string;
	financialCommunityId: number;
	id?: number;
	maximumAmount: number;
	salesProgramType: 'DiscountFlatAmount' | 'BuyersClosingCost';
	startDate: string;
	createdBy?: string;
	createdUtcDate?: string;
	lastModifiedBy?: string;
	lastModifiedUtcDate?: string;
	isPMCAffiliate?: boolean;

	constructor(data?)
	{
		this.dto = data || null;
	}

	get availability(): string
	{
		const endDate = new Date(this.endDate).getTime();
		const today = new Date().getTime();

		return today >= endDate ? 'No' : 'Yes';
	}

	set dto(data)
	{
		if (data)
		{
			for (const prop in data)
			{
				this[prop] = data[prop];
			}
		}
	}
}
