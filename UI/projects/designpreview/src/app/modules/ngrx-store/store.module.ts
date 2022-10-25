import { NgModule, Injector } from '@angular/core';
import { StoreModule as NgrxStoreModule, META_REDUCERS } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { environment } from '../../../environments/environment';
import { reducers } from './reducers';

// meta-reducers
import { stopwatchReducerFactory } from './stopwatch';
import { sessionStateReducer } from './sessionStorage';
import { stateReset } from './state-reset';
import { exceptionHandler } from './exceptionHandler';

import { FavoriteEffects } from './favorite/effects';
import { PlanEffects } from './plan/effects';
import { ScenarioEffects } from './scenario/effects';
import { CommonEffects } from './effects';

@NgModule({
	imports: [
		NgrxStoreModule.forRoot(reducers, { metaReducers: [exceptionHandler, sessionStateReducer, stateReset] }),
		environment.production ? [] : StoreDevtoolsModule.instrument({
			name: 'PHD Design Preview Store DevTools',
			logOnly: false
		}),

		EffectsModule.forRoot([
			FavoriteEffects,
			PlanEffects,
			ScenarioEffects,
			CommonEffects
		])
	],
	providers: [
		{
			provide: META_REDUCERS,
			deps: [Injector],
			useFactory: stopwatchReducerFactory,
			multi: true
		}
	]
})
export class StoreModule { }
