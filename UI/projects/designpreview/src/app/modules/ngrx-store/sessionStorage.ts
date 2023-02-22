/* eslint-disable @typescript-eslint/no-explicit-any */
import { INIT } from '@ngrx/store';

import { ActionReducer } from '@ngrx/store';

export class RehydrateMap
{
	private static featureMap: { [feature: string]: (state: any) => any } = {};

	static onRehydrate<TState>(feature: string, fn: (state: TState) => TState)
	{
		this.featureMap[feature] = fn;
	}

	static rehydrate(state: any): any
	{
		if (state)
		{
			for (const feature of Object.keys(state))
			{
				const featureState = state[feature];
				if (this.featureMap[feature])
				{
					state[feature] = this.featureMap[feature](featureState);
				}
			}
			return state;
		}
		return null;
	}
}

export function sessionStateReducer(reducer: ActionReducer<any>): ActionReducer<any>
{
	return function (state, action): any
	{
		if (action.type === INIT)
		{
			const rehydratedState = JSON.parse(sessionStorage.getItem('phd_design_preview_state'));
			state = Object.assign({}, state, RehydrateMap.rehydrate(rehydratedState));
			return state;
		}

		const nextState = reducer(state, action);
		try
		{
			sessionStorage.setItem('phd_design_preview_state', JSON.stringify(nextState));
		}
		catch (e)
		{
			console.error(e);
		}
		return nextState;
	};
}
