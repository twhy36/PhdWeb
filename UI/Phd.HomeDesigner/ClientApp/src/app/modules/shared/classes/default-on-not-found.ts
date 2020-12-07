import { Observable ,  throwError as _throw ,  of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export function defaultOnNotFound<T>(
	operation = 'operation',
	result?: T
): (source: Observable<T>) => Observable<T> {

	return (source: Observable<T>) => source.pipe(
		catchError(error => {
			if (error.status && error.status === 404) {
				// Let the app keep running by returning an empty result.
				return of(result as T);
			}
			else {
				// TODO: send the error to remote logging infrastructure
				console.error(error); // log to console instead

				// TODO: transform error for user consumption
				//this.log(`${operation} failed: ${error.message}`);

				_throw(error);
			}
		})
	);
}
