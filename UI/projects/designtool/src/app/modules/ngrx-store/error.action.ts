import { Action } from "@ngrx/store";
import { Observable, ObservableInput } from "rxjs/Observable";
import { OperatorFunction } from "rxjs/interfaces";
import { switchMap, concatMap, mergeMap, catchError } from "rxjs/operators";
import { of } from 'rxjs/observable/of';
import { environment } from "../../../environments/environment";

export class ErrorAction implements Action
{
	type: string;

	constructor(public error: Error, public friendlyMessage?: string) { }
}

export enum MapFunction
{
	switchMap,
	concatMap,
	mergeMap
}

export function tryCatch<T, R, E extends ErrorAction>(project: OperatorFunction<T, R>,
	errorType: { new(error: Error, friendlyMessage: string): E },
	friendlyMessage?: (string | ((error: Error) => string)),
	mapFn: MapFunction = MapFunction.switchMap): OperatorFunction<T, R | E>
{
	return (source: Observable<T>) => source.pipe(
		[switchMap, concatMap, mergeMap][mapFn](data =>
			of(data).pipe(
				project,
				catchError((err: Error) =>
				{
					if (!environment.production)
					{
						console.error(err);
					}

					return of(new errorType(err, friendlyMessage ? (typeof friendlyMessage === 'string' ? friendlyMessage : friendlyMessage(err)) : null))
				})
			)
		)
	);
} 
