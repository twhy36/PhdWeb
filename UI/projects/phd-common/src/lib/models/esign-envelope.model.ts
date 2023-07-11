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
	eSignRecipientEnvelopeEvents?: ESignRecipientEnvelope[];
}

export interface IESignRecipientEnvelope 
{
	eSignRecipientEnvelopeEventId?: number;
	eSignEnvelopeId?: number;
	recipientUserName: string;
	eSignRecipientStatusId?: number;
	lastModifiedStatusUtcDate?: Date;
	autoRespondedErrorMessage?: string;
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
	eSignRecipientEnvelopeEvents?: ESignRecipientEnvelope[] = [];

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
			this.eSignRecipientEnvelopeEvents = dto.eSignRecipientEnvelopeEvents;
		}
	}
}

export class ESignRecipientEnvelope
{
	eSignRecipientEnvelopeEventId?: number = 0
	eSignEnvelopeId?: number = 0;
	recipientUserName: string = '';
	eSignRecipientStatusId?: number = 0;
	lastModifiedStatusUtcDate?: Date = null;
	autoRespondedErrorMessage?: string = ''; // Optional field. Will be used in the UI once WI 402217 goes in. 

	constructor(dto: IESignRecipientEnvelope = null)
	{
		if (dto)
		{
			this.eSignRecipientEnvelopeEventId = dto.eSignRecipientEnvelopeEventId
			this.eSignEnvelopeId = dto.eSignEnvelopeId;
			this.recipientUserName = dto.recipientUserName;
			this.eSignRecipientStatusId = dto.eSignRecipientStatusId;
			this.lastModifiedStatusUtcDate = dto.lastModifiedStatusUtcDate;
			this.autoRespondedErrorMessage = dto.autoRespondedErrorMessage;
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

export enum ESignRecipientStatusEnum
{
	Created = 1,
	Sent, 
	Delivered, 
    Completed,
	AutoResponded, 
	Declined
}

export enum ESignTypeEnum
{
	SalesAgreement = 1,
	ChangeOrder,
	TerminationAgreement
}
