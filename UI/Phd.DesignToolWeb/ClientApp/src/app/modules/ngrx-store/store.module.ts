import { NgModule } from '@angular/core';
import { StoreModule as NgrxStoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { environment } from '../../../environments/environment';
import { reducers } from './reducers';

// meta-reducers
import { stopwatchReducer } from './stopwatch';
import { sessionStateReducer } from './sessionStorage';
import { stateReset } from './state-reset';
import { exceptionHandler } from './exceptionHandler';

import { LotEffects } from './lot/effects';
import { PlanEffects } from './plan/effects';
import { ScenarioEffects } from './scenario/effects';
import { NavEffects } from './nav/effects';
import { OpportunityEffects } from './opportunity/effects';
import { OrgEffects } from './org/effects';
import { SummaryEffects } from './summary/effects';
import { SalesAgreementEffects } from './sales-agreement/effects';
import { JobEffects } from './job/effects';
import { ChangeOrderEffects } from './change-order/effects';
import { ContractEffects } from './contract/effects';
import { CommonEffects } from './effects';
import { UserEffects } from './user/effects';

@NgModule({
	imports: [
		NgrxStoreModule.forRoot(reducers, { metaReducers: [exceptionHandler, sessionStateReducer, stopwatchReducer, stateReset] }),
		environment.production ? [] : StoreDevtoolsModule.instrument({
			name: 'PHD Store DevTools',
			logOnly: false
		}),

		EffectsModule.forRoot([
			LotEffects,
			PlanEffects,
			ScenarioEffects,
			NavEffects,
			OpportunityEffects,
			OrgEffects,
			SummaryEffects,
			SalesAgreementEffects,
			JobEffects,
			ChangeOrderEffects,
			ContractEffects,
			CommonEffects,
			UserEffects]
		)
	]
})
export class StoreModule { }
