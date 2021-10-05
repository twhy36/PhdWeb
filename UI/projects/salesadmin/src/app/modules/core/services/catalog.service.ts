import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { _throw } from "rxjs/observable/throw";
import { catchError, map } from "rxjs/operators";
import { DivChoiceCatalog } from "../../shared/models/choice.model";
import { Settings } from "../../shared/models/settings.model";
import { SettingsService } from "./settings.service";

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class CatalogService
{
	constructor(private _http: HttpClient) { }

	getDivChoiceCatalogsByMarketId(marketId: number): Observable<Array<DivChoiceCatalog>>
	{
		let url = settings.apiUrl;
		const filter = `DivDPointCatalog/Org/EdhMarketID eq ${marketId}`;
		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}`;
		url += `divChoiceCatalogs?${qryStr}`;

		return this._http.get(url).pipe(
			map((response: any) =>
			{
				let returnVal = response.value.map(data =>
				{
					return {
						divChoiceCatalogID: data.divChoiceCatalogID,
						divDPointCatalogID: data.divDpointCatalogID,
						choiceLabel: data.choiceLabel,
						isActive: data.isActive,
						divChoiceSortOrder: data.divChoiceSortOrder,
						isDecisionDefault: data.isDecisionDefault,
						isHiddenFromBuyerView: data.isHiddenFromBuyerView,
						priceHiddenFromBuyerView: data.priceHiddenFromBuyerView,
						mustHave: data.mustHave ?? false,
					} as DivChoiceCatalog
				});
				return returnVal as Array<DivChoiceCatalog>;
			}),
			catchError(this.handleError)
		)
	}

	private handleError(error: Response)
	{
		return _throw(error || 'Server error');
	}
}