export interface TopSalesConsultant
{
	ranking: number;
	salesAssociate: string;
	netSales: number;
	totalSales: number;
	salesConsultantId: number;
}

export interface TopMarket
{
	ranking: number;
	market: string;
	net: number;
	sort: number;
}

export interface TopCommunity
{
	ranking: number;
	market: string;
	community: string;
	brandDesc: string;
	net: number;
	sort: number;
}

export interface AreaSales
{
	area: string;
	division: string;
	areaSort: number;
	divisionSort: number;
	communityName: string;
	salesConsultant: string;
	pending: number;
	currentSignups: number;
	currentCancellations: number;
	currentNet: number;
	mtdSignups: number;
	mtdCancellations: number;
	mtdNet: number;
	currentDaySignups: number;
	previousDaySignups: number;
}

export enum TimeFrame
{
	CurrentWeek = 1,
	MonthToDate = 2,
	YearToDate  = 3
}
