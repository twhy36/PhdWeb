export class BlockedByItemList
{
	andPoints?: BlockedByItem[];
	andChoices?: BlockedByItem[];
	orPoints?: BlockedByItem[];
	orChoices?: BlockedByItem[];	

	constructor(dto = null) 
	{
		if (dto) 
		{
			Object.assign(this, dto);
 		}
	}	
}

export class BlockedByItem
{
	label: string;
	pointId?: number;
	choiceId?: number;
	ruleType: number;

	constructor(dto = null) 
	{
		if (dto) 
		{
			Object.assign(this, dto);
 		}
	}
}
