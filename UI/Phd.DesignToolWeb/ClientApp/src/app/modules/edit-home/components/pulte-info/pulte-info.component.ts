import { ChangeTypeEnum } from './../../../shared/models/job-change-order.model';
import { ReplaySubject } from 'rxjs';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Store, select } from '@ngrx/store';
import { map, distinctUntilChanged, combineLatest } from 'rxjs/operators';
import * as fromRoot from '../../../ngrx-store/reducers';
import * as JobActions from '../../../ngrx-store/job/actions';
import { UnsubscribeOnDestroy } from 'phd-common/utils/unsubscribe-on-destroy';
import { Job, SpecInformation } from './../../../shared/models/job.model';
import { PriceBreakdown } from '../../../shared/models/scenario.model';

@Component({
    selector: 'pulte-info',
    templateUrl: './pulte-info.component.html',
    styleUrls: ['./pulte-info.component.scss']
})
export class PulteInfoComponent extends UnsubscribeOnDestroy implements OnInit {
    params$ = new ReplaySubject<{ jobId: number, changeOrder: string }>(1);
    job: Job;
    jobId: number;
    pulteInfoForm: FormGroup;
    pulteInfo = new SpecInformation();
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
    canEdit: boolean;

    canSell$: Observable<boolean>;
	priceBreakdown$: Observable<PriceBreakdown>;
    isChangingOrder$: Observable<boolean>;
    isChangingOrder: boolean;
    navChangeOrder = false;
    
    get actionBarStatus(): string {
        return !((this.pulteInfoForm && this.pulteInfoForm.pristine) || !this.canEdit || this.pulteInfoForm.invalid) ? 'COMPLETE' : 'INCOMPLETE';
    }
    constructor(
        private store: Store<fromRoot.State>,
		private router: Router,
        private route: ActivatedRoute) { super(); }

    ngOnInit() {
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
            map(params => ({ jobId: +params.get('jobId'), changeOrder: params.get('changeOrder')})),
            distinctUntilChanged()
        ).subscribe(params => this.params$.next(params));

        this.store.pipe(
			this.takeUntilDestroyed(),
            select(state => state.job),
            combineLatest(this.params$)).subscribe(([job, params]) => {
                if (job.plan) {
                    this.job = job;
                    this.jobId = job.id;
                    this.projectedFinalDate = job.projectedFinalDate && !isNaN(job.projectedFinalDate.getTime()) ? job.projectedFinalDate : null;
                    this.fullBathsDefault = this.job.plan.fullBaths;
                    this.halfBathsDefault = this.job.plan.halfBaths;
                    this.bedroomsDefault = this.job.plan.bedrooms;
                    this.squareFeetDefault = this.job.plan.squareFeet;
                    this.numberOfGaragesDefault = this.job.plan.garageConfiguration;
                } else if (!this.loadingJob) {
                    this.jobId = params.jobId;
                    this.loadingJob = true;
                    this.store.dispatch(new JobActions.LoadJobForJob(this.jobId));
                    if (params.changeOrder)
                    {
                        this.navChangeOrder = true;
                        this.router.navigate(['/change-orders']);
                    }
                }
            });

        this.store.pipe(
            this.takeUntilDestroyed(),
            select(state => state.job.specInformation),
            combineLatest(this.store.pipe(select(state => state.job.id)))).subscribe(([pulteInfo, jobId]) => {
                if (pulteInfo) {
                    if (pulteInfo.jobId) {
                        this.getMonthList();
                        this.pulteInfo = new SpecInformation(pulteInfo);
                        this.pulteInfo.discountExpirationDate = this.pulteInfo.discountExpirationDate ? new Date(this.pulteInfo.discountExpirationDate) : null;
                        if (!this.pulteInfo.discountExpirationDate || this.pulteInfo.discountExpirationDate.getFullYear() > 9000 ) {
                            this.pulteInfo.discountExpirationDate = null;
                        }
                    }
                    this.pulteInfoSet = true;
                    this.createForm();
                } else {
                    if (jobId && !this.loadingInfo) {
                        this.loadingInfo = true;
                        this.store.dispatch(new JobActions.LoadPulteInfo(jobId));
                    }
                }
			});

		this.store.pipe(
			this.takeUntilDestroyed(),
			select(fromRoot.canConfigure)
        ).subscribe(canConfigure => this.canEdit = canConfigure);
    }

    createForm() {
        this.pulteInfoForm = new FormGroup({
            'tagLines': new FormControl(this.pulteInfo.webSiteDescription),
            'displayOnPulte': new FormControl(this.pulteInfo.isPublishOnWebSite ),
            'discountAmount': new FormControl(this.pulteInfo.discountAmount, [Validators.min(0)]),
            'discountExpirationDate': new FormControl(this.pulteInfo.discountExpirationDate),
            'hotHome': new FormControl(this.pulteInfo.isHotHomeActive),
            'keySellingPoint1': new FormControl(this.pulteInfo.hotHomeBullet1),
            'keySellingPoint2': new FormControl(this.pulteInfo.hotHomeBullet2),
            'keySellingPoint3': new FormControl(this.pulteInfo.hotHomeBullet3),
            'keySellingPoint4': new FormControl(this.pulteInfo.hotHomeBullet4),
            'keySellingPoint5': new FormControl(this.pulteInfo.hotHomeBullet5),
            'keySellingPoint6': new FormControl(this.pulteInfo.hotHomeBullet6),
            'fullBaths': new FormControl(this.pulteInfo.numberFullBathOverride, [Validators.min(0), Validators.max(255)]),
            'halfBaths': new FormControl(this.pulteInfo.numberHalfBathOverride, [Validators.min(0), Validators.max(255)]),
            'bedrooms': new FormControl(this.pulteInfo.numberBedOverride, [Validators.min(0), Validators.max(255)]),
            'squareFeet': new FormControl(this.pulteInfo.squareFeetOverride, [Validators.min(0), Validators.max(32000)]),
            'numberOfGarages': new FormControl(this.pulteInfo.numberGarageOverride, [Validators.min(0), Validators.max(255)])
        });
    }

    savePulteInformation() {
         this.pulteInfo.webSiteDescription = this.pulteInfoForm.controls['tagLines'].value;
         this.pulteInfo.isPublishOnWebSite = this.pulteInfoForm.controls['displayOnPulte'].value;
         this.pulteInfo.discountAmount = +this.pulteInfoForm.controls['discountAmount'].value;
         this.pulteInfo.discountExpirationDate = this.pulteInfoForm.controls['discountExpirationDate'].value ? this.pulteInfoForm.controls['discountExpirationDate'].value : null;
         this.pulteInfo.isHotHomeActive = this.pulteInfoForm.controls['hotHome'].value;
         this.pulteInfo.hotHomeBullet1 = this.pulteInfoForm.controls['keySellingPoint1'].value;
         this.pulteInfo.hotHomeBullet2 = this.pulteInfoForm.controls['keySellingPoint2'].value;
         this.pulteInfo.hotHomeBullet3 = this.pulteInfoForm.controls['keySellingPoint3'].value;
         this.pulteInfo.hotHomeBullet4 = this.pulteInfoForm.controls['keySellingPoint4'].value;
         this.pulteInfo.hotHomeBullet5 = this.pulteInfoForm.controls['keySellingPoint5'].value;
         this.pulteInfo.hotHomeBullet6 = this.pulteInfoForm.controls['keySellingPoint6'].value;
         this.pulteInfo.numberFullBathOverride = this.pulteInfoForm.controls['fullBaths'].value;
         this.pulteInfo.numberHalfBathOverride = this.pulteInfoForm.controls['halfBaths'].value;
         this.pulteInfo.numberBedOverride = this.pulteInfoForm.controls['bedrooms'].value;
         this.pulteInfo.squareFeetOverride = this.pulteInfoForm.controls['squareFeet'].value;
         this.pulteInfo.numberGarageOverride = this.pulteInfoForm.controls['numberOfGarages'].value;
         this.pulteInfoForm.markAsPristine();
         this.store.dispatch(new JobActions.SavePulteInfo(this.pulteInfo));
    }

    getMonthList() {
        this.availableDates = [];
        this.availableDates.push(null);
        for (let i = 0; i < 15; i++) {
            const currentDate = new Date();
            currentDate.setDate(1);
            this.availableDates.push(currentDate);
            currentDate.setMonth(currentDate.getMonth() + i);
         }
    }

    getAvailableDate(date: string) {
        if (date && date.length > 0) {
        const newDate = date.split('/');
        return new Date(+newDate[1], +newDate[0], 1);
        } else {
            return null;
        }
    }

    allowNavigation(): boolean {
        return (this.pulteInfoForm && !this.pulteInfoForm.dirty) || this.navChangeOrder;
    }
}
