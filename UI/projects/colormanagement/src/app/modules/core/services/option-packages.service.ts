import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map } from "rxjs/operators";
import { withSpinner } from "phd-common";
import { Observable, of, throwError } from "rxjs";
import { environment } from '../../../../environments/environment'
import { IOptionPackage, OptionPackageDto } from "../../shared/models/optionpackage.model";


@Injectable({
	providedIn:"root"
})

export class OptionPackageService {

	constructor( private _http: HttpClient){}

	private pulteApiUrl = `${environment.apiUrl}`;
	private _ds: string = encodeURIComponent('$');

	getCommonPackages()
	{
		const entity = "commonOptionPackages";
		return withSpinner(this._http)
		.get<any>(`${this.pulteApiUrl}${entity}`).pipe(
			map((response) => {
				return response.value as Array<IOptionPackage>
			})
		);
	}

	getOptionPackage(bundleId: number)
	{
		const entity = "optionPackages";
		let filter = `BundleId eq ${bundleId}`
		const select = `bundleId,bundleCommonId,name,isCommon,presentationOrder,edhFinancialCommunityId`;
		let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}`;
		const endpoint = `${this.pulteApiUrl}${entity}?${qryStr}`;
		
		return withSpinner(this._http)
		.get<any>(`${endpoint}`).pipe(
			map((response) => {
				return response.value[0] as IOptionPackage;
			}),
			catchError(this.handleError)
		);
	}

	getCommunityPackages(communityId?: number)
	{
		const entity = "optionPackages";
		let filter = `edhFinancialCommunityId eq ${communityId}`;
		const select = `bundleId,bundleCommonId,name,isCommon,presentationOrder,edhFinancialCommunityId`;
		const orderBy = `presentationOrder`;

		//we want to filter in edhfinancialcommunityid
		//select just the fields we want
		//order by presentationorder
		let qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}orderBy=${encodeURIComponent(orderBy)}`

		//build the endpoint
		const endpoint = `${this.pulteApiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http)
		.get<any>(`${endpoint}`).pipe(
			map((response) => {
				return response.value as Array<IOptionPackage>
			}),
			catchError(this.handleError)
		)
	}

	saveOptionPackage(optionPackage: IOptionPackage)
	{
		const action = `optionPackages`;
		const endpoint = `${environment.apiUrl}${action}`;
		
		const optionPackageDto: Partial<OptionPackageDto> = {
			name: optionPackage.name,
			edhFinancialCommunityId: optionPackage.edhFinancialCommunityId,
			isCommon: !!optionPackage.isCommon,
			presentationOrder: optionPackage.presentationOrder
		};

		return withSpinner(this._http).post<any>(endpoint, optionPackageDto, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response.value;
			}),
			catchError(this.handleError)
		);
	}

	updateOptionPackage(optionPackage: IOptionPackage)
	{
		const action = `optionPackages(${optionPackage.bundleId})`;
		const endpoint = `${environment.apiUrl}${action}`;
		
		const optionPackageDto: Partial<OptionPackageDto> = {
			name: optionPackage.name,
			edhFinancialCommunityId: optionPackage.edhFinancialCommunityId,
			isCommon: !!optionPackage.isCommon,
			presentationOrder: optionPackage.presentationOrder
		};

		return withSpinner(this._http).patch<any>(endpoint, optionPackageDto, { headers: { 'Prefer': 'return=representation' } }).pipe(
			map(response =>
			{
				return response.value;
			}),
			catchError(this.handleError)
		);
	}

	isOptionNameTaken(optionPackageName: string, edhFinancialCommunityId: number)
	{
		optionPackageName = optionPackageName.replace(/'/g, "''");

		const entity = `optionPackages`;
		const filter = `edhFinancialCommunityId eq ${edhFinancialCommunityId} and tolower(name) eq tolower('${optionPackageName}')`;
		const select = `bundleId,name`;

		const qryStr = `${this._ds}filter=${encodeURIComponent(filter)}&${this._ds}select=${encodeURIComponent(select)}&${this._ds}top=1`;

		const url = `${environment.apiUrl}${entity}?${qryStr}`;

		return withSpinner(this._http).get<any>(url).pipe(
			map(response =>
			{
				const count = response.value.length as number;

				return count > 0;
			}),
			catchError(this.handleError)
		);
	}

	private handleError(err: any): Observable<never>
	{
		let errorMessage: string;
		if (err?.error instanceof ErrorEvent) {
			// A client-side or network error occurred. Handle it accordingly.
			errorMessage = `An error occurred: ${err?.error?.message}`;
		} else {
			// The backend returned an unsuccessful response code.
			// The response body may contain clues as to what went wrong,
			errorMessage = `Backend returned code ${err?.status}: ${err?.body?.error}`;
		}
		console.error(err);
			return throwError(errorMessage);
		}
}
