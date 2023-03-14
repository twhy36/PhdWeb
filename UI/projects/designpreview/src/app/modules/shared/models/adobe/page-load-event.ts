
export class PageLoadEvent 
{
	event: string = 'Page Load';
	page: Page = new Page;
	contract: Contract = new Contract;
	user: User = new User;
}

export class Page 
{
	pageType: string;
	pageURL: string;
	brandName: string;
	pageName: string;
	group: string;
	subGroup: string;
}

export class Contract 
{
	salesAgreementNumber: number;
	market: string;
	communityNumber: number;
	communityName: string;
	planName: string;
}

export class User 
{
	authType: string = sessionStorage.getItem('authProvider');
	saleStatus: string;
}
