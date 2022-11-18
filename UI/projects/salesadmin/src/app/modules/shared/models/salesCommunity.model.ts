export interface SalesCommunity
{
	id: number;
	name: string;
	number: string;
	marketId: number;
	isOnlineSalesCommunityEnabled: boolean;
	salesCommunityWebSiteCommunityAssocs?: ISalesCommunityWebSiteCommunityAssoc[];
}

export interface ISalesCommunityWebSiteCommunityAssoc
{
	salesCommunityId: number;
	webSiteCommunity: IWebSiteCommunity;
	webSiteCommunityId: number;
}

export interface IWebSiteCommunity
{
	id: number;
	name: string;
	orgStatusDescription: string;
	webSiteIntegrationKey: string;
}
