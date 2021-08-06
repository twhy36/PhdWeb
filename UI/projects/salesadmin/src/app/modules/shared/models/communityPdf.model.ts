export class CommunityPdf
{
	marketId: number;
	financialCommunityId: number;
	sortOrder: number;
	linkText: number;
	description: string;
	effectiveDate: string;
	expirationDate: string;
	fileName: string;
	sectionHeader: SectionHeader;
}

export enum SectionHeader
{
	HomeWarranty = 0,
	CommunityAssociation = 1,
	AdditionalDocuments = 2,
}

export interface ISectionHeader
{
	id?: number,
	label?: string,
	value?: string,
}