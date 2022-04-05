import { Injectable } from '@angular/core';

import { combineLatest } from 'rxjs/operators';

import { select, Store } from '@ngrx/store';

import * as fromRoot from '../../ngrx-store/reducers';
import * as fromPlan from '../../ngrx-store/plan/reducer';

import { UnsubscribeOnDestroy } from 'phd-common';

import { BrandService } from './brand.service';
import { PageLoadEvent } from '../../shared/models/adobe/page-load-event';
import { environment } from '../../../../environments/environment';

@Injectable()
export class AdobeService extends UnsubscribeOnDestroy {
	environment = environment;

	constructor(
        private store: Store<fromRoot.State>,
		private brandService: BrandService) {
            super();
	    }

    setPageLoadEvent(adobeLoadInitialized: boolean, pageType: string, 
        pageName: string, groupName: string, subGroupName: string) {
        window['appEventData'] = window['appEventData'] || [];
        this.store.pipe(
            this.takeUntilDestroyed(),
            select(state => state.org),
            combineLatest(
                this.store.pipe(select(fromRoot.financialCommunityName)), 
                this.store.pipe(select(fromRoot.financialCommunityId)), 
                this.store.pipe(select(fromPlan.selectedPlanData)),
                this.store.pipe(select(state => state.salesAgreement.id)),
                this.store.pipe(select(fromRoot.isBuyerMode))
                )
        ).subscribe(([org, communityName, communityId, planData, sagId, isBuyerMode]) => {
            if (isBuyerMode && !adobeLoadInitialized && org?.salesCommunity?.market?.name && communityName && communityId && planData && sagId) {
                let pageLoadEvent = new PageLoadEvent();
                let baseUrl = window.location.host;
    
                pageLoadEvent.page.pageType = pageType;
                pageLoadEvent.page.pageURL = baseUrl + window.location.pathname;
                pageLoadEvent.page.pageName = pageName;
                pageLoadEvent.page.brandName = this.brandService.getBrandName(environment.brandMap, baseUrl);;
                pageLoadEvent.page.group = groupName;
                pageLoadEvent.page.subGroup = subGroupName;
    
                pageLoadEvent.contract.communityName = communityName; 
                pageLoadEvent.contract.communityNumber = communityId; 
                pageLoadEvent.contract.planName = planData && planData.salesName; 
                pageLoadEvent.contract.market = org?.salesCommunity?.market?.name;
                pageLoadEvent.contract.salesAgreementNumber = sagId;
    
                adobeLoadInitialized = true;
    
                window['appEventData'].push(pageLoadEvent);
            }
        });
    }
}
