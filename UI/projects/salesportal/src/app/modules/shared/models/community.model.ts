export interface IFinancialCommunity
{
  id: number,
  name?: string,
  number?: string,
  salesStatusDescription?: string,
  isDesignPreviewEnabled?: boolean
}

export interface IMarket
{
  companyType?: string,
  financialCommunities?: Array<IFinancialCommunity>
  id: number,
  name: string,
  number: string,
  salesStatusDescription?: string
}

export interface ISalesCommunity
{
  financialCommunities: Array<IFinancialCommunity>,
  id: number,
  marketId: number,
  name: string,
  number: string,
  salesStatusDescription: string
}

export interface ISalesCommunityWebSiteCommunityAssoc {
  salesCommunityId: number,
  webSiteCommunity: IWebSiteCommunity,
  webSiteCommunityId: number
}

export interface IWebSiteCommunity {
  id: number,
  name: string,
  orgStatusDescription: string,
  webSiteIntegrationKey: number
}

export interface IPlan
{
	id: number;
	planName: string;
	financialPlanIntegrationKey: string;
}

export interface ITreeVersion
{
	dTreeVersionId: number;
	dTreeVersionName: string;
	displayName: string;
	publishStartDate: Date;
	publishEndDate: Date;
}
