
export class SalesProgram {
	name: string;
	endDate: string;
	financialCommunityId: number;
	id?: number;
	maximumAmount: number;
	salesProgramType: SalesProgramTypeEnum;
	startDate: string;
	createdBy?: string;
	createdUtcDate?: string;
	lastModifiedBy?: string;
	lastModifiedUtcDate?: string;
	isPMCAffiliate?: boolean;

	constructor( data? ) {
		this.dto = data || null;
	}

	get availability(): string {
			const endDate = new Date( this.endDate ).getTime();
			const now = new Date();
			const todayStr = ( now.getMonth() + 1 ) + '/' + now.getDate() + '/' + now.getFullYear();
			const today = new Date().getTime();
			return today >= endDate ? "No" : "Yes";
	}

	set dto( data ) {
			if ( data ) {
					for ( const prop in data ) {
							this[prop] = data[prop];
					}
			}
	}
}

export enum SalesProgramTypeEnum {
		BuyersClosingCost = 1,
		DiscountFlatAmount = 2
}
