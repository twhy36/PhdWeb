import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { distinctUntilChanged, combineLatest, switchMap, withLatestFrom } from 'rxjs/operators';
import { of ,  NEVER as never ,  Observable } from 'rxjs';

import * as fromRoot from '../../../ngrx-store/reducers';
import * as fromJob from '../../../ngrx-store/job/reducer';
import * as fromScenario from '../../../ngrx-store/scenario/reducer';

import * as CommonActions from '../../../ngrx-store/actions';

import * as _ from "lodash";

import { UnsubscribeOnDestroy } from '../../../shared/classes/unsubscribe-on-destroy';
import { convertDateToUtcString } from "../../../shared/classes/date-utils.class";
import { SalesAgreement } from '../../../shared/models/sales-agreement.model';
import { Job } from '../../../shared/models/job.model';
import { Choice } from '../../../shared/models/tree.model.new';
import { ConstructionStageTypes } from '../../../shared/models/point.model';
import { JobService } from '../../../core/services/job.service';

@Component({
	selector: 'app-agreement',
	templateUrl: './agreement.component.html',
	styleUrls: ['./agreement.component.scss']
})
export class AgreementComponent extends UnsubscribeOnDestroy implements OnInit
{
	salesAgreement: SalesAgreement;
	elevationChoice: Choice;
	colorScheme: string;
	job: Job;
	status: string;
	ecoeDate: string;
	signedDate: string;
	approvedDate: string;
	projectedFinalDate: string;
	canSell$: Observable<boolean>;
	scarDateValues: ScarDate[] = [];

	ConstructionStageTypes = ConstructionStageTypes;
	fieldManager: string;
	customerCareManager: string;

	constructor(private activatedRoute: ActivatedRoute, private store: Store<fromRoot.State>, private _jobService: JobService) { super(); }

	ngOnInit()
	{
		/*
		 * LIKELY TEMP WHILE DEV & TEST
		 * If not, we need to add this functionality to
		 * the POS as a whole instead of on each component
		 */
		this.activatedRoute.paramMap
			.pipe(
				combineLatest(this.store.pipe(select(state => state.salesAgreement)), this.store.pipe(select(state => state.scenario.scenario))),
				switchMap(([params, salesAgreementState, scenario]) =>
				{
					if (salesAgreementState.salesAgreementLoading || salesAgreementState.savingSalesAgreement || salesAgreementState.loadError)
					{
						return new Observable<never>();
					}

					// if sales agreement is not in the store and the id has been passed in to the url
					// or the passed in sales agreement id is different than that of the id in the store...
					const salesAgreementId = +params.get('salesAgreementId');

					if (salesAgreementId > 0 && salesAgreementState.id !== salesAgreementId)
					{
						this.store.dispatch(new CommonActions.LoadSalesAgreement(salesAgreementId));

						return new Observable<never>();
					}

					return of(_.pick(salesAgreementState, _.keys(new SalesAgreement())));
				}),
				this.takeUntilDestroyed(),
				distinctUntilChanged()
			)
			.subscribe((salesAgreement: SalesAgreement) =>
			{
				this.salesAgreement = salesAgreement;
				this.status = salesAgreement.status;
				this.ecoeDate = salesAgreement.ecoeDate ? convertDateToUtcString(salesAgreement.ecoeDate) : '';
				this.signedDate = salesAgreement.signedDate ? convertDateToUtcString(salesAgreement.signedDate) : '';
				this.approvedDate = salesAgreement.approvedDate ? convertDateToUtcString(salesAgreement.approvedDate) : '';
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.salesAgreement.status)
		).subscribe(status => this.status = status);

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromJob.jobState),
			withLatestFrom(
				this.store.pipe(select(fromScenario.elevationDP)),
				this.store.pipe(select(fromRoot.agreementColorScheme))
			)
		).subscribe(([job, elevationDp, agreementColorScheme]) =>
		{
			this.job = job;
			this.fieldManager = this.job.lot && this.job.lot.fieldManager.length > 0 ? this.job.lot.fieldManager.map(fm => fm.firstName + ' ' + fm.lastName).join(', ') : '';
			this.customerCareManager = this.job.lot && this.job.lot.customerCareManager ? this.job.lot.customerCareManager.firstName + ' ' + this.job.lot.customerCareManager.lastName : '';
			this.elevationChoice = elevationDp && elevationDp.choices.find(c => c.quantity > 0);
			this.colorScheme = agreementColorScheme;
			this.projectedFinalDate = this.job.projectedFinalDate ? convertDateToUtcString(this.job.projectedFinalDate) : '';
		});

		this.canSell$ = this.store.pipe(select(fromRoot.canSell));
	}

	get isSalesAgreementCancelledOrVoided(): boolean
	{
		return this.status == 'Void' || this.status == 'Cancel';
	}

	get buildType()
	{
		return this.job && this.job.jobTypeName === 'Model' ? 'Model' : this.job && this.job.lot ? this.job.lot.lotBuildTypeDesc : '';
	}

	/**
	 * Toggles the popover displaying the SCAR dates.
	 * @param popover
	 */
	toggleSCARDates(popover: any)
	{
		this.scarDateValues = [];

		if (popover.isOpen())
		{
			popover.close();
		}
		else
		{
			const job = this.job;
			const stageHistories = job.jobConstructionStageHistories;
			const projectedDates = job.projectedDates;

			const stageTypes = Object.keys(ConstructionStageTypes).filter(key => !isNaN(Number(ConstructionStageTypes[key])));

			for (let stageType in stageTypes)
			{
				let stageTypeNumber = (+stageType) + 1;
				let newScarDate = new ScarDate(ConstructionStageTypes[stageTypeNumber]);
				let stageHistory = stageHistories ? stageHistories.find(x => x.constructionStageId == stageTypeNumber) : null;

				// check for completed else look for scheduled dates
				if (stageHistory)
				{
					newScarDate.date = stageHistory.constructionStageStartDate;
				}
				else
				{
					if (projectedDates)
					{
						switch (stageTypeNumber)
						{
							case 3:
								newScarDate.date = projectedDates.projectedStartDate;
								break;
							case 4:
								newScarDate.date = projectedDates.projectedFrameDate;
								break;
							case 5:
								newScarDate.date = projectedDates.projectedSecondDate;
								break;
							case 6:
								newScarDate.date = projectedDates.projectedFinalDate;
								break;
						}
					}
				}

				this.scarDateValues.push(newScarDate);
			}

			popover.open();
		}
	}
}

class ScarDate
{
	label: string;
	date?: Date;

	get displayDate()
	{
		return this.date ? convertDateToUtcString(this.date) : this.date;
	}

	constructor(label?: string, date?: Date)
	{
		this.label = label;
		this.date = date;
	}
}
