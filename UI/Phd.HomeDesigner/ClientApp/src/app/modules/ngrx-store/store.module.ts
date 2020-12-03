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
import { CommonEffects } from './effects';

@NgModule({
	imports: [
		NgrxStoreModule.forRoot(reducers, { metaReducers: [exceptionHandler, sessionStateReducer, stopwatchReducer, stateReset] }),
		environment.production ? [] : StoreDevtoolsModule.instrument({
			name: 'PHD Home Designer Store DevTools',
			logOnly: false
		}),

		EffectsModule.forRoot([
			LotEffects,
			PlanEffects,
			CommonEffects
		])
	]
})
export class StoreModule { }
