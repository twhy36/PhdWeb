export interface IESignEnvelope
{
	eSignEnvelopeId?: number;
	envelopeGuid: string;
	edhChangeOrderGroupId: number;
	eSignStatusId?: number;
	eSignTypeId?: number;
	sentDate?: Date;
	completedDate?: Date;
	createdBy?: string;
	createdUtcDate?: Date;
	lastModifiedBy?: string;
	lastModifiedUtcdate?: Date;
}

export class ESignEnvelope
{
	eSignEnvelopeId?: number = 0;
	envelopeGuid: string = '';
	edhChangeOrderGroupId: number = 0;
	eSignStatusId?: number = 0;
	eSignTypeId?: number;
	sentDate?: Date = null;
	completedDate?: Date = null;
	createdBy?: string = '';
	createdUtcDate?: Date = null;
	lastModifiedBy?: string = '';
	lastModifiedUtcdate?: Date = null;

	constructor(dto: IESignEnvelope = null)
	{
		if (dto)
		{
			this.eSignEnvelopeId = dto.eSignEnvelopeId;
			this.completedDate = dto.completedDate;
			this.edhChangeOrderGroupId = dto.edhChangeOrderGroupId;
			this.envelopeGuid = dto.envelopeGuid;
			this.eSignStatusId = dto.eSignStatusId;
			this.eSignTypeId = dto.eSignTypeId;
			this.sentDate = dto.sentDate;
			this.createdBy = dto.createdBy;
			this.createdUtcDate = dto.createdUtcDate;
			this.lastModifiedBy = dto.lastModifiedBy;
			this.lastModifiedUtcdate = dto.lastModifiedUtcdate;
		}
	}
}

export enum ESignStatusEnum
{
	Created = 1,
	Sent,
	Completed,
	Deleted,
	Printed
}

export enum ESignTypeEnum
{
	SalesAgreement = 1,
	ChangeOrder,
	TerminationAgreement
}
