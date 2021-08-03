export class CommunityPdf
{
	marketId: number;
	financialCommunityId: number;
	sortOrder: number;
	linkText: number;
	description: string;
	effectiveDate: Date;
	expirationDate: Date;
	fileName: string;
	sectionHeader: SectionHeader;
	url: string;
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