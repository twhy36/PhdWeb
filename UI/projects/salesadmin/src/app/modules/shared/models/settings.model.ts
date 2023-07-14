export interface Settings
{
	apiUrl: string;
	clientId: string;
	tenant: string;
	redirectUrl: string;
	cacheLocation: string;
	expireOffsetSeconds: number;
	infiniteScrollThrottle: number;
	infiniteScrollPageSize: number;
}
