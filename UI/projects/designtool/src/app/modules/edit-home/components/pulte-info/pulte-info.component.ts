import { ReplaySubject, Observable, of } from 'rxjs';
import { map, distinctUntilChanged, combineLatest, switchMap } from 'rxjs/operators';

import { UntypedFormGroup, UntypedFormControl, Validators } from '@angular/forms';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store, select } from '@ngrx/store';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as JobActions from '../../../ngrx-store/job/actions';

import { UnsubscribeOnDestroy, ChangeTypeEnum, Job, SpecInformation, PriceBreakdown, SpecDiscountService } from 'phd-common';
import _ from 'lodash';
import { SalesInfoService } from '../../../core/services/sales-info.service';
import { SalesProgram } from '../../../shared/models/sales-program.model';

@Component({
	selector: 'pulte-info',
	templateUrl: './pulte-info.component.html',
	styleUrls: ['./pulte-info.component.scss']
	})
export class PulteInfoComponent extends UnsubscribeOnDestroy implements OnInit
{
	params$ = new ReplaySubject<{ jobId: number }>(1);
	job: Job;
	jobId: number;
	pulteInfoForm: UntypedFormGroup;
	pulteInfo = new SpecInformation();
	qmiSalesProgram = new SalesProgram();
	loadingJob = false;
	loadingInfo = false;

	projectedFinalDate: Date;
	fullBathsDefault: number;
	halfBathsDefault: number;
	bedroomsDefault: number;
	squareFeetDefault: number;
	numberOfGaragesDefault: string;
	availableDates: Array<Date>;
	minDate: Date = new Date();
	pulteInfoSet = false;
	canSell$: Observable<boolean>;
	canEditSpecInfo: boolean = false;
	canCreateSpecOrModel: boolean = false;
	priceBreakdown$: Observable<PriceBreakdown>;
	isChangingOrder$: Observable<boolean>;
	isChangingOrder: boolean;

	get actionBarStatus(): string
	{
		return !((this.pulteInfoForm && this.pulteInfoForm.pristine) || !this.canEdit || (this.pulteInfoForm && this.pulteInfoForm.invalid)) ? 'COMPLETE' : 'INCOMPLETE';
	}

	get canEdit(): boolean
	{
		return !!this.canEditSpecInfo || !!this.canCreateSpecOrModel;
	}

	constructor(
		private store: Store<fromRoot.State>,
		private route: ActivatedRoute,
		private cd: ChangeDetectorRef,
		private salesInfoService: SalesInfoService,
		private specDiscountService: SpecDiscountService,
		private router: Router) { super(); }

	ngOnInit()
	{
		this.canSell$ = this.store.pipe(select(fromRoot.canSell));
		this.priceBreakdown$ = this.store.pipe(select(fromRoot.priceBreakdown));

		this.isChangingOrder$ = this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.changeOrder),
			map(changeOrder =>
			{
				this.isChangingOrder = (changeOrder.changeInput
					&& (changeOrder.changeInput.type === ChangeTypeEnum.CONSTRUCTION
						|| changeOrder.changeInput.type === ChangeTypeEnum.PLAN))
					? changeOrder.isChangingOrder
					: false;

				return this.isChangingOrder;
			})
		);
		this.route.paramMap.pipe(
			this.takeUntilDestroyed(),
			map(params => ({ jobId: +params.get('jobId') })),
			distinctUntilChanged()
		).subscribe(params => this.params$.next(params));

		this.route.queryParamMap.pipe(
			this.takeUntilDestroyed(),
			map(params => params.get('redirectUrl'))
		).subscribe(redirectUrl =>
		{
			if (redirectUrl === 'scenario-summary')
			{
				this.router.navigate(['/scenario-summary']);
			}
		});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(state => state.job),
			combineLatest(this.store.pipe(select(fromRoot.canEditSpecInfo)), this.store.pipe(select(fromRoot.canCreateSpecOrModel)),
				this.params$, this.store.pipe(select(state => state.job.specInformation))),
			switchMap(([job, canEditSpecInfo, canCreateSpecOrModel, params, pulteInfo]) =>
			{
				const getSalesPrograms = !!job?.financialCommunityId ? this.salesInfoService.getSalesPrograms(job.financialCommunityId) : of([]);
				return getSalesPrograms.pipe(
					map(programs =>
					{
						return { job, canEditSpecInfo, canCreateSpecOrModel, params, pulteInfo, programs };
					})
				);
			})
		).subscribe(({ job, canEditSpecInfo, canCreateSpecOrModel, params, pulteInfo, programs }) =>
		{
			this.canEditSpecInfo = canEditSpecInfo;
			this.canCreateSpecOrModel = canCreateSpecOrModel;

			if (job.plan)
			{
				this.job = job;
				this.jobId = job.id;
				this.projectedFinalDate = job.projectedFinalDate && !isNaN(new Date(job.projectedFinalDate).getTime()) ? new Date(job.projectedFinalDate) : null;
				this.fullBathsDefault = this.job.plan.fullBaths;
				this.halfBathsDefault = this.job.plan.halfBaths;
				this.bedroomsDefault = this.job.plan.bedrooms;
				this.squareFeetDefault = this.job.plan.squareFeet;
				this.numberOfGaragesDefault = this.job.plan.garageConfiguration;
			}
			else if (!this.loadingJob)
			{
				this.jobId = params.jobId;
				this.loadingJob = true;
				this.store.dispatch(new JobActions.LoadJobForJob(this.jobId));
			}

			if (pulteInfo)
			{
				if (pulteInfo.jobId)
				{
					this.getMonthList();

					this.pulteInfo = new SpecInformation(pulteInfo);
					this.pulteInfo.discountExpirationDate = this.formatDate(this.pulteInfo.discountExpirationDate);

					const minDate = new Date();
					this.minDate = new Date(minDate.setDate(minDate.getDate() + 1));

					const date = new Date();
					date.setHours(0, 0, 0, 0);

					if (this.pulteInfo.discountExpirationDate < date)
					{
						this.pulteInfo.discountAmount = 0;
					}
				}

				this.qmiSalesProgram = programs.find(x => this.specDiscountService.checkIfSpecDiscount(x.name));
				this.loadingInfo = false;
				this.pulteInfoSet = true;
				this.createForm();
			}
			else if (job.id && !this.loadingInfo)
			{
				this.loadingInfo = true;
				this.store.dispatch(new JobActions.LoadPulteInfo(job.id));
			}
		});
	}

	createForm()
	{
		this.pulteInfoForm = new UntypedFormGroup({
			'tagLines': new UntypedFormControl(this.pulteInfo.webSiteDescription),
			'displayOnPulte': new UntypedFormControl(this.pulteInfo.isPublishOnWebSite),
			'discountAmount': new UntypedFormControl(this.pulteInfo.discountAmount, [Validators.min(0), Validators.max(this?.qmiSalesProgram?.maximumAmount)]),
			'discountExpirationDate': new UntypedFormControl(this.pulteInfo.discountExpirationDate),
			'hotHome': new UntypedFormControl(this.pulteInfo.isHotHomeActive),
			'keySellingPoint1': new UntypedFormControl(this.pulteInfo.hotHomeBullet1),
			'keySellingPoint2': new UntypedFormControl(this.pulteInfo.hotHomeBullet2),
			'keySellingPoint3': new UntypedFormControl(this.pulteInfo.hotHomeBullet3),
			'keySellingPoint4': new UntypedFormControl(this.pulteInfo.hotHomeBullet4),
			'keySellingPoint5': new UntypedFormControl(this.pulteInfo.hotHomeBullet5),
			'keySellingPoint6': new UntypedFormControl(this.pulteInfo.hotHomeBullet6),
			'fullBaths': new UntypedFormControl(this.pulteInfo.numberFullBathOverride, [Validators.min(0), Validators.max(255)]),
			'halfBaths': new UntypedFormControl(this.pulteInfo.numberHalfBathOverride, [Validators.min(0), Validators.max(255)]),
			'bedrooms': new UntypedFormControl(this.pulteInfo.numberBedOverride, [Validators.min(0), Validators.max(255)]),
			'squareFeet': new UntypedFormControl(this.pulteInfo.squareFeetOverride, [Validators.min(0), Validators.max(32000)]),
			'numberOfGarages': new UntypedFormControl(this.pulteInfo.numberGarageOverride, [Validators.min(0), Validators.max(255)])
		});

		this.toggleFormControls();
	}

	toggleFormControls()
	{
		this.cd.detectChanges();

		for (const control in this.pulteInfoForm.controls)
		{
			if (!this.canEdit)
			{
				this.pulteInfoForm.controls[control].disable();
			}
			else
			{
				this.pulteInfoForm.controls[control].enable();
			}
		}
	}

	savePulteInformation()
	{
		const clonePulteInfo = _.cloneDeep(this.pulteInfo);

		clonePulteInfo.jobId = this.jobId;
		clonePulteInfo.webSiteDescription = this.pulteInfoForm.controls['tagLines'].value;
		clonePulteInfo.isPublishOnWebSite = this.pulteInfoForm.controls['displayOnPulte'].value ? this.pulteInfoForm.controls['displayOnPulte'].value : false;
		clonePulteInfo.discountAmount = +this.pulteInfoForm.controls['discountAmount'].value;
		clonePulteInfo.discountExpirationDate = this.pulteInfoForm.controls['discountExpirationDate'].value;
		clonePulteInfo.isHotHomeActive = this.pulteInfoForm.controls['hotHome'].value ? this.pulteInfoForm.controls['hotHome'].value : false;
		clonePulteInfo.hotHomeBullet1 = this.pulteInfoForm.controls['keySellingPoint1'].value;
		clonePulteInfo.hotHomeBullet2 = this.pulteInfoForm.controls['keySellingPoint2'].value;
		clonePulteInfo.hotHomeBullet3 = this.pulteInfoForm.controls['keySellingPoint3'].value;
		clonePulteInfo.hotHomeBullet4 = this.pulteInfoForm.controls['keySellingPoint4'].value;
		clonePulteInfo.hotHomeBullet5 = this.pulteInfoForm.controls['keySellingPoint5'].value;
		clonePulteInfo.hotHomeBullet6 = this.pulteInfoForm.controls['keySellingPoint6'].value;
		clonePulteInfo.numberFullBathOverride = this.pulteInfoForm.controls['fullBaths'].value;
		clonePulteInfo.numberHalfBathOverride = this.pulteInfoForm.controls['halfBaths'].value;
		clonePulteInfo.numberBedOverride = this.pulteInfoForm.controls['bedrooms'].value;
		clonePulteInfo.squareFeetOverride = this.pulteInfoForm.controls['squareFeet'].value;
		clonePulteInfo.numberGarageOverride = this.pulteInfoForm.controls['numberOfGarages'].value;
		clonePulteInfo.specPrice = this.pulteInfo.specPrice;
		clonePulteInfo.webSiteAvailableDate = this.pulteInfo.webSiteAvailableDate;

		this.pulteInfoForm.markAsPristine();
		this.store.dispatch(new JobActions.SavePulteInfo(clonePulteInfo));
	}

	getMonthList()
	{
		this.availableDates = [];
		this.availableDates.push(null);
		for (let i = 0; i < 15; i++)
		{
			const currentDate = new Date();
			currentDate.setDate(1);
			this.availableDates.push(currentDate);
			currentDate.setMonth(currentDate.getMonth() + i);
		}
	}

	getAvailableDate(date: string)
	{
		if (date && date.length > 0)
		{
			const newDate = date.split('/');
			return new Date(+newDate[1], +newDate[0], 1);
		}
		else
		{
			return null;
		}
	}

	formatDate(date: Date)
	{
		const dateToFormat = new Date(date);

		const month = dateToFormat.getUTCMonth() + 1;
		const day = dateToFormat.getUTCDate();
		const year = dateToFormat.getUTCFullYear();

		return new Date(month + '/' + day + '/' + year);
	}

	allowNavigation(): boolean
	{
		return !this.pulteInfoForm?.dirty;
	}
}
