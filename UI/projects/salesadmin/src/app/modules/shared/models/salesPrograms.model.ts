export class SalesProgram
{
	name: string;
	endDate: string;
	financialCommunityId: number;
	id?: number;
	maximumAmount: number;
	salesProgramType: SalesProgramTypeEnum;
	startDate: string;
	createdBy?: string;
	createdUtcDate?: string;
	lastModifiedBy?: string;
	lastModifiedUtcDate?: string;
	isPMCAffiliate?: boolean;
	salesAgreementSalesProgramAssocs: Array<SalesAgreementSalesProgramAssoc> = [];
	isThoEnabled?: boolean;

	constructor(data)
	{
		this.dto = data;
	}

	get availability(): string
	{
		const endDate = new Date(this.endDate).getTime();
		const today = new Date().getTime();

		return today >= endDate ? 'No' : 'Yes';
	}

	get agreementLocked(): boolean {
		return this.salesAgreementSalesProgramAssocs.length > 0;
	}

	get pmcAffiliated(): string
	{
		return this.isPMCAffiliate ? 'Yes' : 'No';
	}

	private _dto: SalesProgram

	set dto(data)
	{
		if (data)
		{
			this._dto = data;

			for (const prop in data)
			{
				if (prop == 'startDate' || prop == 'endDate')
				{
					let newVal = data[prop] && data[prop].length > 0 ? data[prop].split('T')[0] : data[prop]

					this[prop] = newVal;

					prop == 'startDate' ? this._dto.startDate = newVal : this._dto.endDate = newVal;
				}
				else
				{
					this[prop] = data[prop];
				}
			}			
		}
	}

	get dto()
	{
		return this._dto;
	}
}

export enum SalesProgramTypeEnum
{
	BuyersClosingCost = 1,
	DiscountFlatAmount = 2
}

export class SalesAgreementSalesProgramAssoc {
	salesAgreementId: number;
	salesProgramId: number;
}
