import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { Store, ActionsSubject, select } from '@ngrx/store';
import { ofType } from '@ngrx/effects';

import { Observable, throwError as _throw, of } from 'rxjs';
import { combineLatest, map, catchError, withLatestFrom, take, switchMap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromSalesAgreement from '../../ngrx-store/sales-agreement/reducer';
import * as fromChangeOrder from '../../ngrx-store/change-order/reducer';
import * as LotActions from '../../ngrx-store/lot/actions';
import * as SalesAgreementActions from '../../ngrx-store/sales-agreement/actions';
import { Lot, MonotonyRule, LotExt } from '../../shared/models/lot.model';
import { defaultOnNotFound } from '../../shared/classes/default-on-not-found';
import { withSpinner } from 'phd-common/extensions/withSpinner.extension';
import { MonotonyConflict } from '../../shared/models/monotony-conflict.model';
import { DecisionPoint } from '../../shared/models/tree.model.new';

@Injectable()
export class LotService
{
	constructor(private _http: HttpClient, private store: Store<fromRoot.State>, private actions: ActionsSubject, private router: Router) { }

	loadLots(salesCommunityId: number, selectedLot: number, skipSpinner: boolean = true, isModel: boolean = false): Observable<Array<Lot>>
	{
		const expand = `lotHandingAssocs($expand=handing($select=id,name)),planAssociations($select=id,isActive,planId,lotId;$filter=isActive eq true),jobs($select=id,lotId,handing,planId)`;
		const includeSelectedLot = selectedLot ? `or id eq ${selectedLot}` : '';
		let filter = '';

		if (isModel)
		{
			filter = `financialCommunity/salesCommunityId eq ${salesCommunityId} and
			((lotStatusDescription eq 'Available' or lotStatusDescription eq 'Unavailable' or lotStatusDescription eq 'PendingRelease')
			and (lotBuildTypeDesc eq 'Dirt' or lotBuildTypeDesc eq null or lotBuildTypeDesc eq 'Spec')
			${includeSelectedLot}) and isMasterUnit eq false`;
		}
		else
		{
			// get Available lots that are not Models
			filter =
				`financialCommunity/salesCommunityId eq ${salesCommunityId} and ` +
				`(lotStatusDescription eq 'Available' and (lotBuildTypeDesc eq 'Dirt' or lotBuildTypeDesc eq null or lotBuildTypeDesc eq 'Spec') ` +
				`${includeSelectedLot}) and isMasterUnit eq false`;
		}

		const select = `id,lotBlock,premium,lotStatusDescription,foundationType,lotBuildTypeDesc,financialCommunityId,isMasterUnit`;
		const url = `${environment.apiUrl}lots?${encodeURIComponent('$')}expand=${encodeURIComponent(expand)}&${encodeURIComponent('$')}filter=${encodeURIComponent(filter)}&${encodeURIComponent('$')}select=${encodeURIComponent(select)}`;

		return (skipSpinner ? this._http : withSpinner(this._http)).get<any>(url).pipe(
			combineLatest(this.getMonotonyRulesForSalesCommunity(salesCommunityId, false)),
			map(([lotsResponse, monotonyRules]) =>
			{
				let lots = lotsResponse.value.map(l => new Lot(l));

				lots.forEach(l =>
				{
					const rule = monotonyRules.find(r => r.edhLotId === l.id);

					l.monotonyRules = rule ? rule.relatedLotsElevationColorScheme : [];
				});

				return lots;
			}),
			defaultOnNotFound("loadLots", [])
		);
	}

	getMonotonyRulesForSalesCommunity(salesCommunityId: number, skipSpinner: boolean = true): Observable<Array<MonotonyRule>>
	{
		const url = `${environment.apiUrl}GetMonotonyRulesForSalesCommunity(id=${salesCommunityId})`;

		return (skipSpinner ? this._http : withSpinner(this._http)).get<any>(url).pipe(
			map(response =>
			{
				return response.value as Array<MonotonyRule>;
			}),
			defaultOnNotFound("getMonotonyRulesForSalesCommunity", [])
		);
	}

	getLot(lotId: number, skipSpinner?: boolean): Observable<LotExt>
	{
		if (!lotId)
		{
			return of(null);
		}

		const filter = `id eq ${lotId}`;
		const expand = `lotHandingAssocs($expand=handing($select=id,name)),planAssociations($select=id,isActive,planId,lotId;$filter=isActive eq true),jobs($select=id,lotId,handing,planId),financialCommunity($select=id,name,number,city,state,zip,salesCommunityId,isPhasedPricingEnabled),salesPhase($expand=salesPhasePlanPriceAssocs($select=planId,price);$select=id)`;
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

	hasMonotonyConflict(): Observable<MonotonyConflict>
	{
		return this.store.pipe(
			select(state => state.scenario),
			switchMap(scenario =>
			{
				//TODO: check if it's a Job change order
				this.store.dispatch(new LotActions.LoadLots(scenario.salesCommunity.id));

				return this.actions.pipe(
					ofType<LotActions.LotsLoaded>(LotActions.LotActionTypes.LotsLoaded),
					switchMap(() => this.store.pipe(
						select(fromRoot.monotonyConflict)
					)),
					take(1)
				);
			}),
			take(1)
		);
	}

	buildScenario()
	{
		this.store.pipe(
			select(fromSalesAgreement.salesAgreementState),
			withLatestFrom(
				this.store.pipe(select(fromChangeOrder.currentChangeOrder)),
				this.store.pipe(select(state => state.scenario))
			),
			take(1)
		).subscribe(([sag, co, scenario]) =>
		{
			if (!sag.id || co || (scenario.buildMode === 'spec' || scenario.buildMode === 'model'))
			{
				const scenarioId = scenario.scenario.scenarioId;

				if (scenario.buildMode === 'spec' || scenario.buildMode === 'model')
				{
					this.store.dispatch(new SalesAgreementActions.CreateJIOForSpec())
				}
				else if (!sag.id)
				{
					this.store.dispatch(new SalesAgreementActions.CreateSalesAgreementForScenario(scenarioId));
				}
				else
				{
					this.router.navigate(['/point-of-sale', 'people', sag.id])
				}
			}
			else
			{
				this.router.navigate(['/point-of-sale', 'people', sag.id]);
			}
		});
	}

	checkMonotonyConflict(lot: Lot, planId: number, elevationDp: DecisionPoint, colorSchemeDp: DecisionPoint): MonotonyConflict
	{
		let conflict = {
			monotonyConflict: false,
			colorSchemeConflict: false,
			elevationConflict: false,
		} as MonotonyConflict;

		let elevationOverride = elevationDp ? elevationDp.choices.some(choice => !!choice.overrideNote) : false;
		let colorSchemeOverride = colorSchemeDp ? colorSchemeDp.choices.some(choice => !!choice.overrideNote) : false;

		if (elevationDp && (elevationDp.choices.find(x => x.quantity > 0) !== undefined) && !elevationOverride)
		{
			let choice = elevationDp.choices.find(x => x.quantity > 0);

			conflict.elevationConflict = lot.monotonyRules.some(x => x.elevationDivChoiceCatalogId === choice.divChoiceCatalogId && x.edhPlanId === planId);

			if (!colorSchemeDp && choice.selectedAttributes.length > 0)
			{
				lot.monotonyRules.forEach(rule =>
				{
					if (rule.edhPlanId === planId)
					{
						let colorAttributeConflicts = [];

						if (!conflict.colorSchemeConflict)
						{
							choice.selectedAttributes.forEach(x =>
							{
								colorAttributeConflicts.push(rule.colorSchemeAttributeCommunityIds.some(colorAttributeIds => colorAttributeIds === x.attributeId));
							});
						}

						if (!colorAttributeConflicts.some(x => x === false))
						{
							conflict.colorSchemeConflict = true;
						}
					}
				});
			}
		}

		if (colorSchemeDp && (colorSchemeDp.choices.find(x => x.quantity > 0) != undefined) && !colorSchemeOverride)
		{
			let colorChoice = colorSchemeDp.choices.find(x => x.quantity > 0);

			conflict.colorSchemeConflict = lot.monotonyRules.some(x => x.colorSchemeDivChoiceCatalogId === colorChoice.divChoiceCatalogId && x.edhPlanId === planId);
		}

		conflict.monotonyConflict = (conflict.colorSchemeConflict || conflict.elevationConflict);

		return conflict;
	}

}
