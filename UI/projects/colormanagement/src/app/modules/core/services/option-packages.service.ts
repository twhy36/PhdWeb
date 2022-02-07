import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map } from "rxjs/operators";
import { withSpinner } from "phd-common";
import { Observable, throwError } from "rxjs";
import { environment } from '../../../../environments/environment'
import { IOptionPackage } from "../../shared/models/optionpackage.model";


@Injectable({
    providedIn:"root"
})

export class OptionPackageService {

    constructor( private _http: HttpClient){}

    private pulteApiUrl = `${environment.apiUrl}`;
    private _ds: string = encodeURIComponent('$');

    getCommonPackages(){
        const entity = "commonOptionPackages";
        return withSpinner(this._http)
        .get<any>(`${this.pulteApiUrl}${entity}`).pipe(
            map((response) => {
                return response.value as Array<IOptionPackage>
            })
        );
    }

    getCommunityPackages(communityId?: number){
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
    private handleError(err: any): Observable<never> {
        let errorMessage: string;
        if (err.error instanceof ErrorEvent) {
            // A client-side or network error occurred. Handle it accordingly.
            errorMessage = `An error occurred: ${err.error.message}`;
        } else {
            // The backend returned an unsuccessful response code.
            // The response body may contain clues as to what went wrong,
            errorMessage = `Backend returned code ${err.status}: ${err.body.error}`;
        }
        console.error(err);
            return throwError(errorMessage);
        }
}
