import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable, throwError as _throw, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { LotExt, withSpinner } from 'phd-common';

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

		return withSpinner(this._http).get(url).pipe(
			map(response =>
			{
				const lotsDto = (response['value'] as Array<LotExt>);
				lotsDto.forEach(lot =>
				{
					lot.city = lot.city.trim();
					lot.postalCode = lot.postalCode.trim();
					lot.stateProvince = lot.stateProvince.trim();
					lot.streetAddress1 = lot.streetAddress1.trim();
					lot.streetAddress2 = lot.streetAddress2.trim();
				})

				const lotsDtoFormatted = lotsDto;

				return lotsDtoFormatted.length ? new LotExt(lotsDtoFormatted[0]) : null;
			}),
			catchError(error =>
			{
				console.error(error);

				return _throw(error);
			})
		);
	}
}
