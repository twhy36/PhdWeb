import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { throwError as _throw } from 'rxjs';

@Injectable()
export class SpecDiscountService
{
	constructor(private _http: HttpClient) { }

	//Spec Discount Hardcoded Name
	specDiscountName: string = 'Quick Move-In Incentive';
	//Spec Discount Hardcoded Expiration Date
	specDiscountExpDate: Date = new Date('12/31/9999');

	checkIfSpecDiscount(name: string): boolean
	{
		return name.toLowerCase() === this.specDiscountName.toLowerCase();
	}
}
