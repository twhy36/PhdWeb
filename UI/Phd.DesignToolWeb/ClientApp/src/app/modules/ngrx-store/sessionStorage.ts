import { INIT } from '@ngrx/store';

import { ActionReducer } from '@ngrx/store';

export class RehydrateMap {
	private static featureMap: { [feature: string]: (state: any) => any } = {};

	static onRehydrate<TState>(feature: string, fn: (state: TState) => TState) {
		this.featureMap[feature] = fn;
	}

	static rehydrate(state: any): any {
		if (state) {
			for (let feature of Object.keys(state)) {
				const featureState = state[feature];
				if (this.featureMap[feature]) {
					state[feature] = this.featureMap[feature](featureState);
				}
			}
			return state;
		}
		return null;
	}
}

export function sessionStateReducer(reducer: ActionReducer<any>): ActionReducer<any> {
    return function (state, action): any {
		if (action.type === INIT) {
			let rehydratedState = JSON.parse(sessionStorage.getItem('phd_state'));
			state = Object.assign({}, state, RehydrateMap.rehydrate(rehydratedState));
			return state;
        }

        let nextState = reducer(state, action);
        sessionStorage.setItem('phd_state', JSON.stringify(nextState));
        return nextState;
    };
}
