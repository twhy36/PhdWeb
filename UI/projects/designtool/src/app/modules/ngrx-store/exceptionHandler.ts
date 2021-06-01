import { ActionReducer, MetaReducer } from '@ngrx/store';

import * as fromRoot from './reducers';
import { LoggingService } from '../core/services/logging.service';
import { ErrorAction } from './error.action';

export function exceptionHandlerFactory(loggingService: LoggingService): MetaReducer<fromRoot.State> 
{
	return (reducer: ActionReducer<any>) => (state, action) =>
	{
		try 
		{
			if (action instanceof ErrorAction){
				loggingService.logError(action.error);
			}
			return reducer(state, action);
		} 
		catch (err) 
		{
			console.error(err);
			loggingService.logError(err);
			return { ...state };
		}
	};
}