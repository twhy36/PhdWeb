export interface SalesCommunity {
	id: number;
	name: string;
	number: string;
	marketId: number;
	salesCommunityWebSiteCommunityAssocs?: Array<{webSiteCommunity: WebSiteCommunity}>;
}

export interface WebSiteCommunity {
	id: number;
	name: string;
	webSiteIntegrationKey: string;
}