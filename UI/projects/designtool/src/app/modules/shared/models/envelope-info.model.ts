import { SDGroup } from "phd-common";

export interface IEnvelopeInfo
{
	oldHanding: string;
	newHanding: string;
	buildType: string;
	primaryBuyerName: string;
	primaryBuyerTrustName: string;
	salesAgreementNotes: string;
	termsAndConditions: string;
	coBuyers: ICoBuyerInfo[];
	nsoSummary: INsoSummaryInfo[];
	baseHousePrice: number;
	lotPremium: number;
	selectionsPrice: number;
	totalHousePrice: number;
	nonStandardPrice: number;
	salesIncentivePrice: number;
	buyerClosingCosts: number;
	jobBuyerHeaderInfo: JobBuyerHeaderInfo;
	jobAgreementHeaderInfo: JobAgreementHeaderInfo;
	closingCostInformation: any;
	salesIncentiveInformation: any;
}

export class EnvelopeInfo
{
	oldHanding: string;
	newHanding: string;
	buildType: string;
	primaryBuyerName: string;
	primaryBuyerTrustName: string;
	salesAgreementNotes: string;
	termsAndConditions: string;
	coBuyers: ICoBuyerInfo[];
	nsoSummary: INsoSummaryInfo[];
	baseHousePrice: number;
	lotPremium: number;
	selectionsPrice: number;
	totalHousePrice: number;
	nonStandardPrice: number;
	salesIncentivePrice: number;
	buyerClosingCosts: number;
	jobBuyerHeaderInfo: JobBuyerHeaderInfo;
	jobAgreementHeaderInfo: JobAgreementHeaderInfo;
	closingCostInformation: any;
	salesIncentiveInformation: any;

	constructor(dto: IEnvelopeInfo = null)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export interface ICoBuyerInfo
{
	firstName: string;
	lastName: string;
	middleName: string;
	suffix: string;
}

export interface INsoSummaryInfo
{
	nonStandardOptionName: string;
	nonStandardOptionDescription: string;
	nonStandardOptionQuantity: number;
	nonStandardOptionUnitPrice: number;
	nonStandardOptionAction: string;
}

export class SnapShotData
{
	templates: any;
	jioSelections: JIOSelections;
	financialCommunityId: number;
	jobId: number;
	changeOrderGroupId: number;
	salesAgreementId: number;
	salesAgreementStatus: string;
	constructionChangeOrderSelections: any;
	salesChangeOrderSelections: any;
	planChangeOrderSelections: any;
	nonStandardChangeOrderSelections: any;
	lotTransferChangeOrderSelections: any;
	changeOrderInformation: any;
	salesAgreementInfo: any;

	constructor(dto?: any)
	{
		if (dto)
		{
			this.templates = dto.templates;
			this.jioSelections = new JIOSelections(dto.jioSelections);
			this.financialCommunityId = dto.financialCommunityId;
			this.jobId = dto.jobId;
			this.changeOrderGroupId = dto.changeOrderGroupId;
			this.salesAgreementId = dto.salesAgreementId;
			this.salesAgreementStatus = dto.salesAgreementStatus;
			this.constructionChangeOrderSelections = dto.constructionChangeOrderSelections;
			this.salesChangeOrderSelections = dto.salesChangeOrderSelections;
			this.planChangeOrderSelections = dto.planChangeOrderSelections;
			this.nonStandardChangeOrderSelections = dto.nonStandardChangeOrderSelections;
			this.lotTransferChangeOrderSelections = dto.lotTransferChangeOrderSelections;
			this.changeOrderInformation = dto.changeOrderInformation;
			this.salesAgreementInfo = dto.salesAgreementInfo;
		}
	}
}

export class JIOSelections
{
	currentHouseSelections: SDGroup[];
	salesAgreementNotes: string;

	constructor(dto?: JIOSelections)
	{
		if (dto)
		{
			this.currentHouseSelections = dto.currentHouseSelections;
			this.salesAgreementNotes = dto.salesAgreementNotes;
		}
	}
}

export class JobBuyerHeaderInfo
{
	homePhone: string;
	workPhone: string;
	email: string;
	address: string;
	cityStateZip: string;

	constructor(dto?: JobBuyerHeaderInfo)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

export class JobAgreementHeaderInfo
{
	agreementNumber: string;
	agreementCreatedDate: string;
	agreementApprovedDate: string;
	agreementSignedDate: string;
	communityName: string;
	phaseName: string;
	garage: string;
	planName: string;
	planID: string;
	elevation: string;
	lotBlock: string;
	lotAddress: string;
	cityStateZip: string;
	lotBlockFullNumber: string;
	salesAssociate: string;
	salesDescription: string;

	constructor(dto?: JobAgreementHeaderInfo)
	{
		if (dto)
		{
			Object.assign(this, dto);
		}
	}
}

