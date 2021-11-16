import { Injector, NgModule } from '@angular/core';
import { META_REDUCERS, StoreModule as NgrxStoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { environment } from '../../../environments/environment';
import { reducers } from './reducers';

// meta-reducers
import { LoggingEffects } from 'phd-common';
import { sessionStateReducer } from './sessionStorage';
import { stateReset } from './state-reset';
import { exceptionHandlerFactory } from './exceptionHandler';

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
import { FavoriteEffects } from './favorite/effects';
import { LiteEffects } from './lite/effects';
import { LoggingService } from '../core/services/logging.service';

@NgModule({
	imports: [
		NgrxStoreModule.forRoot(reducers, { metaReducers: [sessionStateReducer, stateReset] }),
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
			UserEffects,
			FavoriteEffects,
			LiteEffects,
			LoggingEffects
		]
		)
	],
	providers: [
		{
			provide: META_REDUCERS,
			deps: [LoggingService],
			useFactory: exceptionHandlerFactory,
			multi: true
		}
	]
})
export class StoreModule { }
