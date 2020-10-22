
export class FinancialCommunityESign
{
	id: number;
	isActive: boolean;
	agentFullName?: string;
	agentEmail?: string;
	reminderDays?: number;
	repeatReminderDays?: number;
	expirationDays?: number;
	expirationWarnDays?: number;
	defaultEmailForSignedCopies?: string;

	constructor(dto: IFinancialCommunityESign)
	{
		if (dto)
		{
			this.id = dto.financialCommunityId;
			this.isActive = dto.isActive;
			this.agentFullName = dto.authorizedAgentFullName;
			this.agentEmail = dto.authorizedAgentEmail;
			this.reminderDays = dto.reminderDays;
			this.repeatReminderDays = dto.repeatReminderDays;
			this.expirationDays = dto.expirationDays;
			this.expirationWarnDays = dto.expirationWarnDays;
			this.defaultEmailForSignedCopies = dto.defaultEmailForSignedCopies;
		}
	}
}

export interface IFinancialCommunityESign
{
	financialCommunityId: number;
	isActive: boolean;
	authorizedAgentFullName?: string;
	authorizedAgentEmail?: string;
	reminderDays?: number;
	repeatReminderDays?: number;
	expirationDays?: number;
	expirationWarnDays?: number;
	defaultEmailForSignedCopies?: string;
}

export interface IESignRecipient
{
	id: number;
	name: string;
	email: string;
	role: string;
}

export class ESignRecipient
{
	id: number;
	name: string;
	email: string;
	role: ESignRecipientRoles;
}

export enum ESignRecipientRoles
{
	buyer = 1,
	cobuyer,
	salesConsultant,
	authorizedAgent,
	removedBuyer,
	removedCobuyer,
	realEstateAgent,
	carbonCopyRecipient
}

export class MergeFieldDto
{
	fieldName: string;
	fieldValue: string;
}


export class MergeFieldData
{
	customMergeFields: MergeFieldDto[];
	systemMergeFields: MergeFieldDto[];
}
