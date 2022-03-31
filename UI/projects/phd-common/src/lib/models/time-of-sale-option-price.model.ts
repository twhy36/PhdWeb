export interface ITimeOfSaleOptionPrice
{
	edhJobID: number;
	edhPlanOptionID: number;
	listPrice: number;
	divChoiceCatalogID: number;
	createdBy?: string;
	createdUtcDate?: Date;
	lastModifiedBy?: string;
	lastModifiedUtcDate?: Date;
}

export class TimeOfSaleOptionPrice
{
	edhJobID: number = 0;
	edhPlanOptionID: number = 0;
	listPrice: number = 0;
	divChoiceCatalogID: number = 0;
	createdBy?: string;
	createdUtcDate?: Date;
	lastModifiedBy?: string;
	lastModifiedUtcDate?: Date;

	constructor(dto: ITimeOfSaleOptionPrice = null)
	{
		if (dto)
		{
			this.edhJobID = dto.edhJobID;
			this.edhPlanOptionID = dto.edhPlanOptionID;
			this.listPrice = dto.listPrice;
			this.divChoiceCatalogID = dto.divChoiceCatalogID;
			this.createdBy = dto.createdBy;
			this.createdUtcDate = dto.createdUtcDate;
			this.lastModifiedBy = dto.lastModifiedBy;
			this.lastModifiedUtcDate = dto.lastModifiedUtcDate;
		}
	}
}
