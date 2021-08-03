export interface Settings
{
	apiUrl: string;
	appInsightsKey: string;
	clientId: string;
	tenant: string;
	redirectUrl: string;
	authQueryParams: string;
	cacheLocation: string;
	extraQueryParameter: string;
	expireOffsetSeconds: number;
	designToolUrl: string;
	designPreviewUrl: string,
	pictureParkAssetUrl: string;
	infiniteScrollThrottle: number;
	infiniteScrollPageSize: number;
	production: boolean;
}
