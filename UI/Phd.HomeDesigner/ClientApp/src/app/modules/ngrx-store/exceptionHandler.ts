import { ActionReducer } from '@ngrx/store';

export function exceptionHandler(reducer: ActionReducer<any>): ActionReducer<any>
{
	return function (state, action): any {
		try {
			return reducer(state, action);
		} catch (err) {
			console.error(err);
			return { ...state };
		}
	}; 
}
