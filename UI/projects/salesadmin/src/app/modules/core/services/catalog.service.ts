import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { withSpinner } from "phd-common";
import { Observable } from "rxjs";
import { _throw } from "rxjs/observable/throw";
import { catchError, map } from "rxjs/operators";
import { DivisionalCatalog, DivDChoice, DivDGroup, DivDSubGroup, DivDPoint } from "../../shared/models/divisionalCatalog.model";
import { Settings } from "../../shared/models/settings.model";
import { SettingsService } from "./settings.service";

const settings: Settings = new SettingsService().getSettings();

@Injectable()
export class CatalogService
{
	constructor(private _http: HttpClient) { }

	getDivisionalCatalog(marketId: number): Observable<DivisionalCatalog>
	{
		let url = settings.apiUrl;

		url += `GetDivisionalCatalog(marketId=${marketId})`;

		return withSpinner(this._http).get<DivisionalCatalog>(url).pipe(
			map(dto =>
			{
				return this.buildDivisionalCatalog(dto.groups);
			})
		);
	}

	getDivChoiceCatalogsByMarketId(marketId: number): Observable<Array<DivDChoice>>
	{
		let url = settings.apiUrl;
		const filter = `DivDPointCatalog/Org/EdhMarketID eq ${marketId} and isActive eq false`;
		const qryStr = `${encodeURIComponent("$")}filter=${encodeURIComponent(filter)}`;
		url += `divChoiceCatalogs?${qryStr}`;

		return this._http.get(url).pipe(
			map((response: any) =>
			{
				let returnVal = response.value.map(data =>
				{
					return {
						divChoiceCatalogID: data.divChoiceCatalogID,
						choiceLabel: data.choiceLabel,
						isActive: data.isActive,
						mustHave: data.mustHave ?? false,
					} as DivDChoice
				});
				return returnVal as Array<DivDChoice>;
			}),
			catchError(this.handleError)
		)
	}

	private buildDivisionalCatalog(groups: DivDGroup[]): DivisionalCatalog
	{
		let catGroups = null;

		catGroups = groups.map(g =>
		{
			const group = {
				dGroupCatalogID: g.dGroupCatalogID,
				dGroupLabel: g.dGroupLabel,
				isActive: g.isActive,
				subGroups: [],
				matched: false,
				open: true
			} as DivDGroup

			group.subGroups = g.subGroups.map(sg =>
			{
				const subGroup = {
					dSubGroupCatalogID: sg.dSubGroupCatalogID,
					dSubGroupLabel: sg.dSubGroupLabel,
					isActive: sg.isActive,
					points: [],
					matched: false,
					open: true,
				} as DivDSubGroup;

				subGroup.points = sg.points.map(p =>
				{
					const point = {
						dPointCatalogID: p.dPointCatalogID,
						dPointLabel: p.dPointLabel,
						isActive: p.isActive,
						choices: [],
						matched: false,
						open: true,
					} as DivDPoint;

					point.choices = p.choices.map(c =>
					{
						const choice = {
							divChoiceCatalogID: c.divChoiceCatalogID,
							choiceLabel: c.choiceLabel,
							isActive: sg.isActive,
							matched: false,
							open: true,
						} as DivDChoice

						return choice;
					});

					return point;
				});

				return subGroup;
			});

			return group;
		});

		return {
			groups: catGroups
		} as DivisionalCatalog;
	}

	private handleError(error: Response)
	{
		return _throw(error || 'Server error');
	}
}