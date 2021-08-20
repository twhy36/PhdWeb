import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { withSpinner } from 'phd-common';
import { catchError, map } from 'rxjs/operators';
import { Observable, throwError as _throw } from 'rxjs';
import { IColor } from '../../shared/models/color.model';

@Injectable()
export class ColorService {
	constructor(private _http: HttpClient) {}
	private _ds: string = encodeURIComponent('$');
	/**
	 * Gets the colors for the specified financial community
	 */
	getColors(
		communityId?: number,
		colorName?: string,
		subcategoryId?: number,
		topRows?: number,
		skipRows?: number,
		isActive?: boolean
	): Observable<IColor[]> {
		const entity = `colors`;
		let filter = `(EdhFinancialCommunityId eq ${communityId})`;
		const select = `colorId,name,sku,isActive,edhOptionSubcategoryId`;
		const orderBy = `name`;
		if (colorName) {
			filter += `and contains(name,'${colorName}')`;
		}

		if (isActive != null) {
			filter += `and (isActive eq ${isActive})`;
		}

		if (subcategoryId != null) {
			filter += `and (EdhOptionSubcategoryId eq ${subcategoryId})`;
		}

		let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${
			this._ds
		}select=${encodeURIComponent(select)}&${
			this._ds
		}orderBy=${encodeURIComponent(orderBy)}`;

		if (topRows) {
			qryStr += `&${this._ds}top=${topRows}`;
		}

		if (skipRows) {
			qryStr += `&${this._ds}skip=${skipRows}`;
		}

		const endpoint = `${environment.apiUrl}${entity}?${qryStr}`;

		return (skipRows ? this._http : withSpinner(this._http))
			.get<any>(endpoint)
			.pipe(
				map((response) => {
					return response.value as Array<IColor>;
				}),
				catchError(this.handleError)
			);
	}
	private handleError(error: Response) {
		// In the future, we may send the server to some remote logging infrastructure
		console.error(error);

		return _throw(error || 'Server error');
	}
}
