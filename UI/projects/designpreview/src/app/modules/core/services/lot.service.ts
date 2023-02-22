import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { LotExt } from 'phd-common';

import { environment } from '../../../../environments/environment';

@Injectable()
export class LotService
{
	constructor(private _http: HttpClient) { }

	getLot(lotId: number): Observable<LotExt>
	{
		if (!lotId)
		{
			return of(null);
		}

		const filter = `id eq ${lotId}`;
		const expand = 'lotHandingAssocs($expand=handing($select=id,name)),planAssociations($select=id,isActive,planId,lotId),jobs($select=id,lotId,handing,planId),financialCommunity($select=id,name,number,city,state,zip,salesCommunityId),salesPhase($expand=salesPhasePlanPriceAssocs($select=planId,price);$select=id)';
		const select = 'id,lotBlock,premium,lotStatusDescription,streetAddress1,streetAddress2,city,stateProvince,postalCode,facing,foundationType,lotBuildTypeDesc,unitNumber,salesBldgNbr,alternateLotBlock,constructionPhaseNbr,closeOfEscrow';
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
