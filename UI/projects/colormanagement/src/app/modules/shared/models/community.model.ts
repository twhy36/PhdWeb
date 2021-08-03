export interface IFinancialCommunity
{
  id: number,
  name?: string,
  number?: string,
  salesStatusDescription?: string
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
