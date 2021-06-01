import { ActionReducer } from '@ngrx/store';
import { AppInsights } from "applicationinsights-js";

export function Stopwatch(stopAt: string[]) {
	return function <T extends { new(...args: any[]): {} }>(constructor: T) {
		return class extends constructor {
			timeUntil = stopAt;
		};
	};
}

export function stopwatchReducer(reducer: ActionReducer<any>): ActionReducer<any> {
	let timers: { action: string, stopAt: string[] }[] = [];

	return function (state, action): any {
		if (action.hasOwnProperty('timeUntil')) {
			timers.push({ action: action.type, stopAt: (<any>action).timeUntil });
			AppInsights.startTrackEvent(action.type);
		}

		let matchedTimer = timers.findIndex(t => t.stopAt.some(a => a === action.type));
		if (matchedTimer !== -1) {
			const timer = timers.splice(matchedTimer, 1)[0];
			AppInsights.stopTrackEvent(timer.action);
		}

		return reducer(state, action);
	};
}
