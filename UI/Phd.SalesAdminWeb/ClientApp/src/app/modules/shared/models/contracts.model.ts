export class ContractTemplate
{
	templateId?: number;
	parentTemplateId?: number;
	documentName: string;
	displayName: string;
	version?: number;
	marketId: number;
	templateTypeId: number;
	displayOrder?: number;
	effectiveDate?: string;
	expirationDate?: string;
	status?: string;
	templateFinancialCommunityAssocs?: any;
	assignedCommunityIds?: Array<number> = [];
	childContractTemplate?: ContractTemplate;

	constructor(data)
	{
		this.dto = data;
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

export interface ITemplateType
{
	id?: number;
	label?: string;
	value?: string;
}
