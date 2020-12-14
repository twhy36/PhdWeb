export interface ISalesAgreement
{
	id?: number;
	salesAgreementNumber?: string;
	salesAgreementName?: string;
	status?: string;
	statusUtcDate?: Date;
	salePrice?: number;
	jobSalesAgreementAssocs?: Array<JobSalesAgreementAssoc>;
}

export class SalesAgreement
{
	id?: number = 0;
	salesAgreementNumber: string = null;
	salesAgreementName: string = null;
	status: string = '';
	statusUtcDate: Date = null;
	salePrice: number = 0;
	jobSalesAgreementAssocs: Array<JobSalesAgreementAssoc> = [];

	constructor(dto: ISalesAgreement | SalesAgreement = null)
	{
		if (dto)
		{
			this.id = dto.id;
			this.salesAgreementNumber = dto.salesAgreementNumber;
			this.salesAgreementName = dto.salesAgreementName;
			this.status = dto.status;
			this.statusUtcDate = dto.statusUtcDate;
			this.salePrice = dto.salePrice;			

			if (dto.jobSalesAgreementAssocs)
			{
				this.jobSalesAgreementAssocs = dto.jobSalesAgreementAssocs.map(a => new JobSalesAgreementAssoc(a));
			}
		}
	}
}

export class JobSalesAgreementAssoc
{
	jobId: number;
	isActive: boolean;

	constructor(dto?: JobSalesAgreementAssoc)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}
