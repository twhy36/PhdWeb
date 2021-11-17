import { Injector } from '@angular/core';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

import { ActionReducer, MetaReducer } from '@ngrx/store';
import * as fromRoot from './reducers';

export function Stopwatch(stopAt: string[]) {
	return function <T extends { new(...args: any[]): {} }>(constructor: T) {
		return class extends constructor {
			timeUntil = stopAt;
		};
	};
}

export function stopwatchReducerFactory(injector: Injector): MetaReducer<fromRoot.State>
{
	return (reducer: ActionReducer<any>): ActionReducer<any> =>
	{
		let timers: { action: string, stopAt: string[] }[] = [];
		const appInsights = injector.get(ApplicationInsights);

		return function (state, action): any {
			if (action.hasOwnProperty('timeUntil')) {
				timers.push({ action: action.type, stopAt: (<any>action).timeUntil });
				appInsights.startTrackEvent(action.type);
			}

			let matchedTimer = timers.findIndex(t => t.stopAt.some(a => a === action.type));
			if (matchedTimer !== -1) {
				const timer = timers.splice(matchedTimer, 1)[0];
				appInsights.stopTrackEvent(timer.action);
			}

			return reducer(state, action);
		};
	};
}
