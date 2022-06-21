export class ESignField
{
	id: number; // ContactFinancialCommunityAuthorizedAgentAssocId
	financialCommunityId: number;
	authorizedAgentFullName: string;
	authorizedAgentEmail: string;

	orgId: number;
	reminderDays: number;
	repeatReminderDays: number;
	expirationDays: number;
	expirationWarnDays: number;
	defaultEmailForSignedCopies: string;
}