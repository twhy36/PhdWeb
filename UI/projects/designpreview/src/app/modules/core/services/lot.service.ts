import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable ,  throwError as _throw ,  of } from 'rxjs';
import { combineLatest, map, catchError } from 'rxjs/operators';

import { defaultOnNotFound, withSpinner, Lot, MonotonyRule, LotExt } from 'phd-common';

import { environment } from '../../../../environments/environment';

@Injectable()
export class LotService
{
	constructor(private _http: HttpClient) { }

	loadLots(salesCommunityId: number, selectedLot: number, skipSpinner: boolean = true): Observable<Array<Lot>>
	{
		const expand = `lotHandingAssocs($expand=handing($select=id,name)),planAssociations($select=id,isActive,planId,lotId),jobs($select=id,lotId,handing,planId)`;
		const includeSelectedLot = selectedLot ? `or id eq ${selectedLot}` : '';

		// get Available lots that are not Models
		const filter =
			`financialCommunity/salesCommunityId eq ${salesCommunityId} and ` +
			`(lotStatusDescription eq 'Available' and (lotBuildTypeDesc eq 'Dirt' or lotBuildTypeDesc eq null or lotBuildTypeDesc eq 'Spec') ` +
			`${includeSelectedLot}) and isMasterUnit eq false`;

		const select = `id,lotBlock,premium,lotStatusDescription,foundationType,lotBuildTypeDesc,financialCommunityId,isMasterUnit`;
		const url = `${environment.apiUrl}lots?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return (skipSpinner ? this._http : withSpinner(this._http)).get<any>(url).pipe(
			map((lotsResponse) =>
			{
				let lots = lotsResponse.value.map(l => new Lot(l));

				return lots;
			}),
			defaultOnNotFound("loadLots", [])
		);
	}

	getLot(lotId: number): Observable<LotExt>
	{
		if (!lotId)
		{
			return of(null);
		}

		const filter = `id eq ${lotId}`;
		const expand = `lotHandingAssocs($expand=handing($select=id,name)),planAssociations($select=id,isActive,planId,lotId),jobs($select=id,lotId,handing,planId),financialCommunity($select=id,name,number,city,state,zip,salesCommunityId),salesPhase($expand=salesPhasePlanPriceAssocs($select=planId,price);$select=id)`;
		const select = `id,lotBlock,premium,lotStatusDescription,streetAddress1,streetAddress2,city,stateProvince,postalCode,facing,foundationType,lotBuildTypeDesc,unitNumber,salesBldgNbr,alternateLotBlock,constructionPhaseNbr,closeOfEscrow`;
		const url = `${environment.apiUrl}lots?${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}&${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}`;

		return this._http.get(url).pipe(
			map(response =>
			{
				const lotsDto = (response['value'] as Array<LotExt>);

				return lotsDto.length ? new LotExt(lotsDto[0]) : null;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}

}
